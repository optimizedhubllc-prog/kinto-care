/**
 * Webhook Retry & Error Tracking System
 * 
 * Manages failed webhook deliveries with exponential backoff retry logic.
 * Tracks error history for debugging and monitoring webhook health.
 */

import { getDb } from "./db";
import { webhookEvents, webhookLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 5000, // 5 seconds
  MAX_DELAY_MS: 300000, // 5 minutes
  BACKOFF_MULTIPLIER: 2,
};

interface RetryableError {
  eventId: string;
  hubId: string;
  error: Error;
  attempt: number;
  nextRetryAt?: Date;
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Log webhook error to database
 * @param eventId - Webhook event ID
 * @param statusCode - HTTP status code
 * @param errorMessage - Error message
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 */
export async function logWebhookError(
  eventId: string,
  statusCode: number,
  errorMessage: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Webhooks] Database not available for error logging");
    return;
  }

  try {
    await db.insert(webhookLogs).values({
      id: crypto.randomUUID(),
      webhookEventId: eventId,
      statusCode,
      responseMessage: errorMessage,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("[Webhooks] Failed to log webhook error:", error);
  }
}

/**
 * Mark webhook event as failed and schedule retry
 * @param eventId - Webhook event ID
 * @param error - The error that occurred
 */
export async function handleWebhookFailure(
  eventId: string,
  error: Error
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Webhooks] Database not available for failure handling");
    return;
  }

  try {
    // Get current event to check retry count
    const event = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, eventId))
      .then((rows) => rows[0]);

    if (!event) {
      console.warn(`[Webhooks] Event ${eventId} not found`);
      return;
    }

    // Get retry count from logs
    const logs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.webhookEventId, eventId));

    const retryCount = logs.length - 1; // -1 because first attempt is not a retry

    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      // Schedule retry
      const nextDelay = calculateBackoffDelay(retryCount);
      const nextRetryAt = new Date(Date.now() + nextDelay);

      console.log(
        `[Webhooks] Scheduling retry for event ${eventId} in ${nextDelay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`
      );

      // Log retry attempt
      await db.insert(webhookLogs).values({
        id: crypto.randomUUID(),
        webhookEventId: eventId,
        statusCode: 0, // 0 indicates pending retry
        responseMessage: `Retry scheduled: ${error.message}`,
        ipAddress: "internal",
        userAgent: "webhook-retry-system",
      });
    } else {
      // Max retries exceeded, mark as failed
      console.error(
        `[Webhooks] Event ${eventId} failed after ${RETRY_CONFIG.MAX_RETRIES} retries`
      );

      // Update event status to failed
      try {
        await db
          .update(webhookEvents)
          .set({ status: "failed" })
          .where(eq(webhookEvents.id, eventId));
      } catch (updateError) {
        console.error("[Webhooks] Failed to update event status:", updateError);
      }

      // Log final failure
      await db.insert(webhookLogs).values({
        id: crypto.randomUUID(),
        webhookEventId: eventId,
        statusCode: 0,
        responseMessage: `Final failure after ${RETRY_CONFIG.MAX_RETRIES} retries: ${error.message}`,
        ipAddress: "internal",
        userAgent: "webhook-retry-system",
      });
    }
  } catch (error) {
    console.error("[Webhooks] Error handling webhook failure:", error);
  }
}

/**
 * Mark webhook event as successfully delivered
 * @param eventId - Webhook event ID
 */
export async function markWebhookDelivered(eventId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Webhooks] Database not available for delivery confirmation");
    return;
  }

  try {
    await db
      .update(webhookEvents)
      .set({ status: "delivered" })
      .where(eq(webhookEvents.id, eventId));

    console.log(`[Webhooks] Event ${eventId} marked as delivered`);
  } catch (error) {
    console.error("[Webhooks] Failed to mark event as delivered:", error);
  }
}

/**
 * Get retry statistics for a hub
 * @param hubId - Hub ID
 * @returns Retry statistics
 */
export async function getRetryStats(hubId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.hubId, hubId));

    const failedEvents = events.filter((e) => e.status === "failed");
    const pendingRetries = events.filter((e) => e.status === "pending");

    return {
      totalFailed: failedEvents.length,
      totalPending: pendingRetries.length,
      failureRate: events.length > 0 ? (failedEvents.length / events.length) * 100 : 0,
      recentFailures: failedEvents.slice(-5),
    };
  } catch (error) {
    console.error("[Webhooks] Failed to get retry stats:", error);
    return null;
  }
}
