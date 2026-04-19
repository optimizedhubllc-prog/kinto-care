import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb, getUserRoleInHub, getHubWithMembers } from "./db";
import { webhookEvents, webhookLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import crypto from "crypto";
import { notificationEmitter } from "./notificationEmitter";

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
   * Returns the unique webhook URL for n8n integration
   */
  getWebhookUrl: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verify user has access to hub
      const role = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (!role) throw new TRPCError({ code: "FORBIDDEN" });

      // Only Family Admin can view webhook URL
      if (role !== "family_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Family Admin can view webhook configuration",
        });
      }

      // Return webhook URL (construct from environment)
      const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000";
      const webhookUrl = `${baseUrl}/api/webhooks/notifications`;

      return {
        url: webhookUrl,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": "[HMAC-SHA256 of raw body]",
        },
        payload: {
          message: "string (required, max 5000 chars)",
          hubId: input.hubId,
          metadata: "object (optional)",
        },
      };
    }),

  /**
   * Test webhook endpoint (Family Admin only)
   * Sends a test notification to verify webhook is working
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
          message: "Test webhook notification - Kinto Care",
          payload: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
          status: "pending",
        });

        // Broadcast test notification
        notificationEmitter.broadcastToHub({
          hubId: input.hubId,
          message: "Test webhook notification - Kinto Care",
          eventId,
          timestamp: Date.now(),
          metadata: { test: true },
        });

        return {
          success: true,
          eventId,
          message: "Test notification sent to all hub members",
        };
      } catch (error) {
        console.error("[Webhooks] Test webhook failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  /**
   * Subscribe to real-time webhook notifications for a hub
   * All hub members can listen for notifications
   * Broadcasts notifications as they arrive from webhooks
   */
  subscribe: protectedProcedure
    .input(z.object({ hubId: z.string().uuid() }))
    .subscription(({ input, ctx }) => {
      return observable((emit) => {
        // Verify user is member of hub
        getUserRoleInHub(ctx.user.id, input.hubId).then((role) => {
          if (!role) {
            emit.error(new TRPCError({ code: "FORBIDDEN" }));
            return;
          }

          // Generate unique client ID for this subscription
          const clientId = `${ctx.user.id}-${Date.now()}-${Math.random()}`;

          // Subscribe to hub notifications
          const unsubscribe = notificationEmitter.subscribeToHub(input.hubId, clientId);

          // Listen for notifications on this hub
          const handler = (notification: any) => {
            emit.next(notification);
          };

          notificationEmitter.on(`hub:${input.hubId}`, handler);

          // Cleanup on disconnect
          return () => {
            notificationEmitter.removeListener(`hub:${input.hubId}`, handler);
            unsubscribe();
          };
        });
      });
    }),
});
