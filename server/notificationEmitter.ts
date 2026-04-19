/**
 * Real-Time Notification Emitter
 * 
 * In-memory event emitter for broadcasting webhook notifications to all hub members
 * in real-time. Uses Node.js EventEmitter pattern for efficient pub/sub messaging.
 * 
 * When a webhook is received, this emitter broadcasts the notification to all
 * connected clients listening for that hub's events.
 */

import { EventEmitter } from "events";

interface HubNotification {
  hubId: string;
  message: string;
  eventId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Global notification emitter instance
 * Persists across all requests in the same process
 */
class NotificationEmitter extends EventEmitter {
  private hubSubscribers: Map<string, Set<string>> = new Map();

  /**
   * Broadcast a notification to all members of a hub
   * @param notification - The notification to broadcast
   */
  broadcastToHub(notification: HubNotification): void {
    const channel = `hub:${notification.hubId}`;
    this.emit(channel, notification);
  }

  /**
   * Subscribe a client to hub notifications
   * @param hubId - The hub to subscribe to
   * @param clientId - Unique identifier for the client connection
   * @returns Unsubscribe function
   */
  subscribeToHub(hubId: string, clientId: string): () => void {
    const channel = `hub:${hubId}`;
    
    // Track subscribers for debugging/stats
    if (!this.hubSubscribers.has(hubId)) {
      this.hubSubscribers.set(hubId, new Set());
    }
    this.hubSubscribers.get(hubId)!.add(clientId);

    // Return unsubscribe function
    return () => {
      this.hubSubscribers.get(hubId)?.delete(clientId);
      if (this.hubSubscribers.get(hubId)?.size === 0) {
        this.hubSubscribers.delete(hubId);
      }
    };
  }

  /**
   * Get active subscriber count for a hub
   * @param hubId - The hub ID
   * @returns Number of active subscribers
   */
  getSubscriberCount(hubId: string): number {
    return this.hubSubscribers.get(hubId)?.size ?? 0;
  }

  /**
   * Get all hubs with active subscribers
   * @returns Array of hub IDs with subscribers
   */
  getActiveHubs(): string[] {
    return Array.from(this.hubSubscribers.keys());
  }

  /**
   * Clear all subscribers (for testing/cleanup)
   */
  clearAllSubscribers(): void {
    this.hubSubscribers.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const notificationEmitter = new NotificationEmitter();

/**
 * Helper function to broadcast webhook notification to hub members
 * @param hubId - The hub receiving the notification
 * @param message - The notification message
 * @param eventId - Webhook event ID for tracking
 * @param metadata - Optional additional data
 */
export function broadcastWebhookNotification(
  hubId: string,
  message: string,
  eventId: string,
  metadata?: Record<string, any>
): void {
  notificationEmitter.broadcastToHub({
    hubId,
    message,
    eventId,
    timestamp: Date.now(),
    metadata,
  });
}
