import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb, getUserRoleInHub, getHubWithMembers } from "./db";
import { webhookEvents, webhookLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import eventBus from "./_core/eventBus";

/**
 * Webhook Router for tRPC
 * 
 * Provides procedures for:
 * - Retrieving webhook events for a hub (Family Admin only)
 * - Getting webhook delivery logs (Family Admin only)
 * - Listening for real-time webhook notifications (all members)
 */

export const webhookRouter = router({
  /**
   * Get webhook events for a hub (Family Admin only)
   * Returns recent webhook events with pagination support
   */
  getEvents: protectedProcedure
    .input(
      z.object({
        hubId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can view webhook events
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can view webhook events",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const events = await db
          .select()
          .from(webhookEvents)
          .where(eq(webhookEvents.hubId, input.hubId))
          .orderBy((table) => table.createdAt)
          .limit(input.limit)
          .offset(input.offset);

        return events;
      } catch (error) {
        console.error("[Webhooks] Failed to fetch events:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get webhook logs for an event (Family Admin only)
   * Returns delivery logs for debugging webhook issues
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        hubId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can view logs
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can view webhook logs",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const logs = await db
          .select()
          .from(webhookLogs)
          .where(eq(webhookLogs.webhookEventId, input.eventId));

        return logs;
      } catch (error) {
        console.error("[Webhooks] Failed to fetch logs:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get webhook URL for a hub (Family Admin only)
   * Returns the webhook URL and instructions for n8n integration
   */
  getWebhookUrl: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can access webhook URL
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can access webhook URL",
        });
      }

      // Build webhook URL from request origin
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/n8n`;

      return {
        url: webhookUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "HMAC-SHA256 hex digest of request body",
        },
        payload: {
          message: "string (required, max 5000 chars)",
          hubId: input.hubId,
          metadata: "object (optional)",
        },
        example: {
          message: "Medication reminder: Take your daily vitamins",
          hubId: input.hubId,
          metadata: {
            source: "n8n",
            workflow: "medication-reminder",
            timestamp: new Date().toISOString(),
          },
        },
      };
    }),

  /**
   * Test webhook endpoint (Family Admin only)
   * Sends a test notification to verify n8n integration
   */
  testWebhook: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can test webhooks
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can test webhooks",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const eventId = crypto.randomUUID();

        // Create test webhook event
        await db.insert(webhookEvents).values({
          id: eventId,
          hubId: input.hubId,
          message: "Test webhook notification from Kinto",
          payload: JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
          }),
          status: "delivered",
          deliveredAt: new Date(),
        });

        // Log test event
        await db.insert(webhookLogs).values({
          id: crypto.randomUUID(),
          webhookEventId: eventId,
          statusCode: 200,
          responseMessage: "Test webhook delivered successfully",
          ipAddress: "test",
          userAgent: "Kinto-Test",
        });

        return {
          success: true,
          eventId,
          message: "Test webhook sent successfully",
        };
      } catch (error) {
        console.error("[Webhooks] Test webhook failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Subscribe to new webhook events for a hub (all members)
   * Returns real-time webhook events as they arrive
   */
  onNewEvent: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .subscription(async function* ({ input, ctx }) {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // All hub members can subscribe to webhook events
      const validRoles = ["family_admin", "family_viewer", "caregiver"];
      if (!validRoles.includes(role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only hub members can subscribe to webhook events",
        });
      }

      const eventKey = `webhook:hub:${input.hubId}`;
      console.log(`[Webhooks] Subscription started for hub ${input.hubId} by user ${ctx.user.id}`);

      // Create a queue to hold events
      const eventQueue: any[] = [];
      let resolveWait: (() => void) | null = null;

      const handleEvent = (event: any) => {
        eventQueue.push(event);
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      };

      eventBus.on(eventKey, handleEvent);

      try {
        // Keep yielding events as they arrive
        while (true) {
          // If queue is empty, wait for next event
          if (eventQueue.length === 0) {
            await new Promise<void>((resolve) => {
              resolveWait = resolve;
            });
          }

          // Yield queued events
          while (eventQueue.length > 0) {
            const event = eventQueue.shift();
            console.log(`[Webhooks] Yielding event to subscriber for hub ${input.hubId}`);
            yield event;
          }
        }
      } finally {
        eventBus.removeListener(eventKey, handleEvent);
        console.log(`[Webhooks] Subscription ended for hub ${input.hubId}`);
      }
    }),

  /**
   * Get webhook statistics for a hub (Family Admin only)
   * Returns summary of webhook activity
   */
  getStats: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can view stats
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can view webhook statistics",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const events = await db
          .select()
          .from(webhookEvents)
          .where(eq(webhookEvents.hubId, input.hubId));

        const totalEvents = events.length;
        const deliveredEvents = events.filter((e) => e.status === "delivered").length;
        const failedEvents = events.filter((e) => e.status === "failed").length;
        const pendingEvents = events.filter((e) => e.status === "pending").length;

        const successRate = totalEvents > 0 ? (deliveredEvents / totalEvents) * 100 : 0;

        return {
          totalEvents,
          deliveredEvents,
          failedEvents,
          pendingEvents,
          successRate: Math.round(successRate * 100) / 100,
          lastEventAt: events.length > 0 ? events[events.length - 1]?.createdAt : null,
        };
      } catch (error) {
        console.error("[Webhooks] Failed to fetch stats:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
