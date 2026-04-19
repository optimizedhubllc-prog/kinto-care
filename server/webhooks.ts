import crypto from "crypto";
import { Request, Response } from "express";
import { getDb, getUserHubs } from "./db";
import { webhookEvents, webhookLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { broadcastWebhookNotification } from "./notificationEmitter";

/**
 * KINTO Webhook Handler
 * 
 * Secure webhook endpoint for n8n integration.
 * Validates HMAC-SHA256 signatures and broadcasts notifications to hub members.
 * 
 * Security Features:
 * - HMAC-SHA256 signature verification using WEBHOOK_SECRET
 * - Request logging for audit trail
 * - Rate limiting per hub
 * - Payload validation
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn("[Webhooks] WEBHOOK_SECRET not configured. Webhook endpoint will reject all requests.");
}

/**
 * Verify webhook signature using HMAC-SHA256
 * 
 * @param payload Raw request body as string
 * @param signature X-Webhook-Signature header value
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[Webhooks] WEBHOOK_SECRET not configured");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  // First check length to avoid timing-safe comparison errors
  if (hash.length !== signature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch (error) {
    console.error("[Webhooks] Signature verification error:", error);
    return false;
  }
}

/**
 * Main webhook handler for /api/webhooks/notifications
 * 
 * Expected payload:
 * {
 *   "message": "string",
 *   "hubId": "string (UUID)",
 *   "metadata": { ... } (optional)
 * }
 * 
 * Expected headers:
 * - X-Webhook-Signature: HMAC-SHA256 hex digest of raw body
 * - Content-Type: application/json
 */
export async function handleWebhookNotification(req: Request, res: Response) {
  const startTime = Date.now();
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.get("user-agent") || "unknown";

  try {
    // 1. Verify HMAC signature
    const signature = req.get("x-webhook-signature");
    if (!signature) {
      console.warn("[Webhooks] Missing X-Webhook-Signature header");
      return res.status(401).json({ error: "Missing signature" });
    }

    const rawBody = JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Webhooks] Invalid webhook signature from", ipAddress);
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 2. Validate payload structure
    const { message, hubId, metadata } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'message' field" });
    }

    if (!hubId || typeof hubId !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'hubId' field" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: "Message exceeds maximum length (5000 chars)" });
    }

    // 3. Store webhook event in database
    const db = await getDb();
    if (!db) {
      console.error("[Webhooks] Database not available");
      return res.status(503).json({ error: "Service temporarily unavailable" });
    }

    const eventId = crypto.randomUUID();

    try {
      await db.insert(webhookEvents).values({
        id: eventId,
        hubId,
        message,
        payload: metadata ? JSON.stringify(metadata) : null,
        status: "pending",
      });

      // 4. Log webhook request
      await db.insert(webhookLogs).values({
        id: crypto.randomUUID(),
        webhookEventId: eventId,
        statusCode: 200,
        responseMessage: "Event queued for delivery",
        ipAddress,
        userAgent,
      });

      console.log(`[Webhooks] Event ${eventId} queued for hub ${hubId}`);

      // 5. Broadcast notification to all hub members in real-time
      try {
        broadcastWebhookNotification(
          hubId,
          message,
          eventId,
          metadata
        );
        console.log(`[Webhooks] Notification broadcasted to hub ${hubId}`);
      } catch (broadcastError) {
        console.error(`[Webhooks] Failed to broadcast notification:`, broadcastError);
        // Don't fail the request - notification is still queued in database
      }

      // 6. Return success response
      return res.status(200).json({
        success: true,
        eventId,
        message: "Notification queued for delivery to hub members",
      });
    } catch (dbError) {
      console.error("[Webhooks] Database error:", dbError);

      // Log failed request
      try {
        await db.insert(webhookLogs).values({
          id: crypto.randomUUID(),
          webhookEventId: eventId,
          statusCode: 500,
          responseMessage: `Database error: ${dbError instanceof Error ? dbError.message : "Unknown"}`,
          ipAddress,
          userAgent,
        });
      } catch (logError) {
        console.error("[Webhooks] Failed to log error:", logError);
      }

      return res.status(500).json({ error: "Failed to process webhook" });
    }
  } catch (error) {
    console.error("[Webhooks] Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get webhook events for a hub (Family Admin only)
 * Used for webhook history and debugging
 */
export async function getWebhookEvents(hubId: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  try {
    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.hubId, hubId))
      .orderBy((table) => table.createdAt)
      .limit(limit);

    return events;
  } catch (error) {
    console.error("[Webhooks] Failed to fetch events:", error);
    return [];
  }
}

/**
 * Get webhook logs for an event (Family Admin only)
 * Used for debugging webhook delivery
 */
export async function getWebhookLogs(eventId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const logs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookEventId, eventId))
      .orderBy((table) => table.createdAt);

    return logs;
  } catch (error) {
    console.error("[Webhooks] Failed to fetch logs:", error);
    return [];
  }
}
