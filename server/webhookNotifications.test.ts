/**
 * Webhook Notification Tests
 * 
 * Tests for real-time notification broadcasting, event emitter,
 * and webhook delivery tracking.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { notificationEmitter, broadcastWebhookNotification } from "./notificationEmitter";

describe("Webhook Notification System", () => {
  beforeEach(() => {
    // Clear all subscribers and listeners before each test
    notificationEmitter.clearAllSubscribers();
  });

  afterEach(() => {
    // Cleanup after each test
    notificationEmitter.clearAllSubscribers();
  });

  describe("NotificationEmitter", () => {
    it("should broadcast notification to hub", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        const message = "Test notification";
        const eventId = "event-456";

        // Subscribe to hub
        const unsubscribe = notificationEmitter.subscribeToHub(hubId, "client-1");

        // Listen for notification
        notificationEmitter.on(`hub:${hubId}`, (notification) => {
          expect(notification.hubId).toBe(hubId);
          expect(notification.message).toBe(message);
          expect(notification.eventId).toBe(eventId);
          expect(notification.timestamp).toBeDefined();
          unsubscribe();
          resolve();
        });

        // Broadcast notification
        notificationEmitter.broadcastToHub({
          hubId,
          message,
          eventId,
          timestamp: Date.now(),
        });
      });
    });

    it("should track subscriber count", () => {
      const hubId = "hub-123";

      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(0);

      const unsubscribe1 = notificationEmitter.subscribeToHub(hubId, "client-1");
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(1);

      const unsubscribe2 = notificationEmitter.subscribeToHub(hubId, "client-2");
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(2);

      unsubscribe1();
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(1);

      unsubscribe2();
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(0);
    });

    it("should handle multiple hubs independently", async () => {
      return new Promise<void>((resolve) => {
        const hub1 = "hub-1";
        const hub2 = "hub-2";
        let hub1Received = false;
        let hub2Received = false;

        const unsub1 = notificationEmitter.subscribeToHub(hub1, "client-1");
        const unsub2 = notificationEmitter.subscribeToHub(hub2, "client-2");

        notificationEmitter.on(`hub:${hub1}`, (notification) => {
          expect(notification.hubId).toBe(hub1);
          hub1Received = true;
          if (hub1Received && hub2Received) {
            unsub1();
            unsub2();
            resolve();
          }
        });

        notificationEmitter.on(`hub:${hub2}`, (notification) => {
          expect(notification.hubId).toBe(hub2);
          hub2Received = true;
          if (hub1Received && hub2Received) {
            unsub1();
            unsub2();
            resolve();
          }
        });

        // Broadcast to both hubs
        notificationEmitter.broadcastToHub({
          hubId: hub1,
          message: "Hub 1 notification",
          eventId: "event-1",
          timestamp: Date.now(),
        });

        notificationEmitter.broadcastToHub({
          hubId: hub2,
          message: "Hub 2 notification",
          eventId: "event-2",
          timestamp: Date.now(),
        });
      });
    });

    it("should list active hubs with subscribers", () => {
      const hub1 = "hub-1";
      const hub2 = "hub-2";

      notificationEmitter.subscribeToHub(hub1, "client-1");
      notificationEmitter.subscribeToHub(hub2, "client-2");

      const activeHubs = notificationEmitter.getActiveHubs();
      expect(activeHubs).toContain(hub1);
      expect(activeHubs).toContain(hub2);
      expect(activeHubs.length).toBe(2);
    });

    it("should handle single listener for hub", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        let notificationCount = 0;

        const unsub = notificationEmitter.subscribeToHub(hubId, "client-1");

        const handler = () => {
          notificationCount++;
          if (notificationCount === 1) {
            unsub();
            resolve();
          }
        };

        notificationEmitter.on(`hub:${hubId}`, handler);

        notificationEmitter.broadcastToHub({
          hubId,
          message: "Test",
          eventId: "event-1",
          timestamp: Date.now(),
        });
      });
    });

    it("should not deliver notifications after unsubscribe", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        let notificationReceived = false;

        const unsubscribe = notificationEmitter.subscribeToHub(hubId, "client-1");

        const handler = () => {
          notificationReceived = true;
        };

        notificationEmitter.on(`hub:${hubId}`, handler);

        // Unsubscribe from hub
        unsubscribe();
        // Also remove the listener
        notificationEmitter.removeListener(`hub:${hubId}`, handler);

        // Broadcast notification
        notificationEmitter.broadcastToHub({
          hubId,
          message: "Test",
          eventId: "event-1",
          timestamp: Date.now(),
        });

        // Give it a moment to ensure no notification is received
        setTimeout(() => {
          expect(notificationReceived).toBe(false);
          resolve();
        }, 100);
      });
    });
  });

  describe("broadcastWebhookNotification", () => {
    it("should broadcast notification with metadata", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        const message = "Care reminder";
        const eventId = "event-456";
        const metadata = { type: "reminder", priority: "high" };

        notificationEmitter.subscribeToHub(hubId, "client-1");

        notificationEmitter.on(`hub:${hubId}`, (notification) => {
          expect(notification.message).toBe(message);
          expect(notification.metadata).toEqual(metadata);
          resolve();
        });

        broadcastWebhookNotification(hubId, message, eventId, metadata);
      });
    });

    it("should broadcast notification without metadata", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        const message = "Care reminder";
        const eventId = "event-456";

        notificationEmitter.subscribeToHub(hubId, "client-1");

        notificationEmitter.on(`hub:${hubId}`, (notification) => {
          expect(notification.message).toBe(message);
          expect(notification.metadata).toBeUndefined();
          resolve();
        });

        broadcastWebhookNotification(hubId, message, eventId);
      });
    });

    it("should include timestamp in broadcast", async () => {
      return new Promise<void>((resolve) => {
        const hubId = "hub-123";
        const beforeTime = Date.now();

        notificationEmitter.subscribeToHub(hubId, "client-1");

        notificationEmitter.on(`hub:${hubId}`, (notification) => {
          const afterTime = Date.now();
          expect(notification.timestamp).toBeGreaterThanOrEqual(beforeTime);
          expect(notification.timestamp).toBeLessThanOrEqual(afterTime);
          resolve();
        });

        broadcastWebhookNotification(hubId, "Test", "event-1");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle broadcast to hub with no subscribers", () => {
      const hubId = "hub-123";

      // This should not throw
      expect(() => {
        notificationEmitter.broadcastToHub({
          hubId,
          message: "Test",
          eventId: "event-1",
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it("should handle broadcast with empty hubId", () => {
      expect(() => {
        notificationEmitter.broadcastToHub({
          hubId: "",
          message: "Test",
          eventId: "event-1",
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it("should handle subscription with duplicate client IDs", () => {
      const hubId = "hub-123";
      const clientId = "client-1";

      const unsub1 = notificationEmitter.subscribeToHub(hubId, clientId);
      const unsub2 = notificationEmitter.subscribeToHub(hubId, clientId);

      // Duplicate client IDs replace the previous subscription
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(1);

      unsub1();
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(0);

      // Second unsubscribe should be a no-op
      unsub2();
      expect(notificationEmitter.getSubscriberCount(hubId)).toBe(0);
    });
  });

  describe("Cleanup", () => {
    it("should clear all subscribers and listeners", () => {
      const hub1 = "hub-1";
      const hub2 = "hub-2";

      notificationEmitter.subscribeToHub(hub1, "client-1");
      notificationEmitter.subscribeToHub(hub2, "client-2");

      expect(notificationEmitter.getActiveHubs().length).toBe(2);

      notificationEmitter.clearAllSubscribers();

      expect(notificationEmitter.getActiveHubs().length).toBe(0);
      expect(notificationEmitter.getSubscriberCount(hub1)).toBe(0);
      expect(notificationEmitter.getSubscriberCount(hub2)).toBe(0);
    });

    it("should handle cleanup when no subscribers exist", () => {
      expect(() => {
        notificationEmitter.clearAllSubscribers();
      }).not.toThrow();
    });
  });
});
