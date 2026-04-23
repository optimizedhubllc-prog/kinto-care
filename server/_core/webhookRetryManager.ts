import { getDb } from "../db";
import { webhookEvents, webhookLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import eventBus from "./eventBus";

/**
 * Webhook Retry Manager
 * 
 * Handles failed webhook deliveries with exponential backoff retry logic.
 * 
 * Retry Strategy:
 * - Max 5 retry attempts
 * - Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
 * - Failed events are marked with failure reason and timestamp
 * - Successful retries update status to "delivered"
 */

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
};

// In-memory retry queue to prevent duplicate retry scheduling
const retryQueue = new Map<string, NodeJS.Timeout>();

/**
 * Calculate exponential backoff delay
 * Formula: min(baseDelay * 2^attempt, maxDelay)
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Mark webhook event as failed with reason
 */
export async function markWebhookFailed(
  eventId: string,
  failureReason: string,
  attempt: number = 0
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[WebhookRetry] Database not available");
    return;
  }

  try {
    await db
      .update(webhookEvents)
      .set({
        status: "failed",
        failureReason: `Attempt ${attempt}: ${failureReason}`,
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, eventId));

    console.log(`[WebhookRetry] Event ${eventId} marked as failed: ${failureReason}`);
  } catch (error) {
    console.error("[WebhookRetry] Failed to mark event as failed:", error);
  }
}

/**
 * Mark webhook event as delivered
 */
export async function markWebhookDelivered(eventId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[WebhookRetry] Database not available");
    return;
  }

  try {
    await db
      .update(webhookEvents)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, eventId));

    console.log(`[WebhookRetry] Event ${eventId} marked as delivered`);
  } catch (error) {
    console.error("[WebhookRetry] Failed to mark event as delivered:", error);
  }
}

/**
 * Schedule a retry for a failed webhook event
 * Uses exponential backoff to prevent overwhelming the system
 */
export function scheduleRetry(
  eventId: string,
  attempt: number = 1,
  config: RetryConfig = DEFAULT_CONFIG
): void {
  // Check if max retries exceeded
  if (attempt > config.maxRetries) {
    console.log(`[WebhookRetry] Event ${eventId} exceeded max retries (${config.maxRetries})`);
    markWebhookFailed(eventId, "Max retries exceeded", attempt);
    return;
  }

  // Prevent duplicate retries for same event
  if (retryQueue.has(eventId)) {
    console.log(`[WebhookRetry] Event ${eventId} already scheduled for retry`);
    return;
  }

  const delay = calculateBackoffDelay(attempt, config);
  console.log(
    `[WebhookRetry] Scheduling retry for event ${eventId} in ${delay}ms (attempt ${attempt}/${config.maxRetries})`
  );

  const timeout = setTimeout(async () => {
    retryQueue.delete(eventId);
    await retryWebhookEvent(eventId, attempt, config);
  }, delay);

  retryQueue.set(eventId, timeout);
}

/**
 * Retry a failed webhook event
 * Attempts to re-emit the event to subscribers
 */
export async function retryWebhookEvent(
  eventId: string,
  attempt: number = 1,
  config: RetryConfig = DEFAULT_CONFIG
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[WebhookRetry] Database not available");
    scheduleRetry(eventId, attempt + 1, config);
    return;
  }

  try {
    // Fetch the event from database
    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.id, eventId));

    if (events.length === 0) {
      console.error(`[WebhookRetry] Event ${eventId} not found`);
      return;
    }

    const event = events[0];

    // Skip if already delivered or exceeded max retries
    if (event.status === "delivered") {
      console.log(`[WebhookRetry] Event ${eventId} already delivered, skipping retry`);
      return;
    }

    if (attempt > config.maxRetries) {
      console.log(`[WebhookRetry] Event ${eventId} exceeded max retries`);
      await markWebhookFailed(eventId, "Max retries exceeded", attempt);
      return;
    }

    console.log(
      `[WebhookRetry] Retrying event ${eventId} (attempt ${attempt}/${config.maxRetries})`
    );

    // Re-emit event to subscribers
    const eventKey = `webhook:hub:${event.hubId}`;
    const retryEvent = {
      ...event,
      retryAttempt: attempt,
    };

    eventBus.emit(eventKey, retryEvent);
    console.log(`[WebhookRetry] Event ${eventId} re-emitted to subscribers`);

    // Log retry attempt
    await db.insert(webhookLogs).values({
      id: crypto.randomUUID(),
      webhookEventId: eventId,
      statusCode: 200,
      responseMessage: `Retry attempt ${attempt}/${config.maxRetries}`,
      ipAddress: "retry-manager",
      userAgent: "Kinto-RetryManager",
    });

    // Mark as delivered after successful re-emission
    await markWebhookDelivered(eventId);
  } catch (error) {
    console.error(`[WebhookRetry] Error retrying event ${eventId}:`, error);

    // Schedule next retry
    const nextAttempt = attempt + 1;
    if (nextAttempt <= config.maxRetries) {
      scheduleRetry(eventId, nextAttempt, config);
    } else {
      await markWebhookFailed(
        eventId,
        `Retry failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        attempt
      );
    }
  }
}

/**
 * Cancel a scheduled retry
 */
export function cancelRetry(eventId: string): void {
  const timeout = retryQueue.get(eventId);
  if (timeout) {
    clearTimeout(timeout);
    retryQueue.delete(eventId);
    console.log(`[WebhookRetry] Cancelled scheduled retry for event ${eventId}`);
  }
}

/**
 * Get retry queue status
 * Useful for monitoring and debugging
 */
export function getRetryQueueStatus(): {
  queueSize: number;
  eventIds: string[];
} {
  return {
    queueSize: retryQueue.size,
    eventIds: Array.from(retryQueue.keys()),
  };
}

/**
 * Clear all pending retries (use with caution)
 */
export function clearRetryQueue(): void {
  retryQueue.forEach((timeout) => clearTimeout(timeout));
  retryQueue.clear();
  console.log("[WebhookRetry] Cleared all pending retries");
}
