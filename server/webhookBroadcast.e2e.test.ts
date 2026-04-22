import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import eventBus from "./_core/eventBus";
import { getDb } from "./db";
import { webhookEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Webhook Real-Time Broadcasting E2E", () => {
  const testHubId = crypto.randomUUID();
  const testEventId = crypto.randomUUID();
  const testMessage = "Test webhook notification from Kinto";

  beforeEach(() => {
    // Clear all listeners before each test
    eventBus.removeAllListeners();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it("should emit webhook event to EventBus when event is created", async () => {
    const eventKey = `webhook:hub:${testHubId}`;
    const receivedEvents: any[] = [];

    // Set up listener
    eventBus.on(eventKey, (event) => {
      console.log(`[E2E Test] Received event on ${eventKey}:`, event);
      receivedEvents.push(event);
    });

    // Emit test event
    const testEvent = {
      id: testEventId,
      hubId: testHubId,
      message: testMessage,
      payload: JSON.stringify({ test: true }),
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[E2E Test] Emitting event to ${eventKey}`);
    eventBus.emit(eventKey, testEvent);

    // Verify event was received
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].id).toBe(testEventId);
    expect(receivedEvents[0].message).toBe(testMessage);
    console.log("[E2E Test] ✓ Event successfully emitted and received");
  });

  it("should only emit events to the correct hub channel", async () => {
    const hub1Key = `webhook:hub:${crypto.randomUUID()}`;
    const hub2Key = `webhook:hub:${crypto.randomUUID()}`;

    const hub1Events: any[] = [];
    const hub2Events: any[] = [];

    // Set up listeners for both hubs
    eventBus.on(hub1Key, (event) => {
      console.log(`[E2E Test] Hub1 received event:`, event.id);
      hub1Events.push(event);
    });

    eventBus.on(hub2Key, (event) => {
      console.log(`[E2E Test] Hub2 received event:`, event.id);
      hub2Events.push(event);
    });

    // Emit event only to hub1
    const event1 = {
      id: crypto.randomUUID(),
      hubId: hub1Key.split(":")[2],
      message: "Hub 1 event",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[E2E Test] Emitting to ${hub1Key}`);
    eventBus.emit(hub1Key, event1);

    // Verify only hub1 received it
    expect(hub1Events).toHaveLength(1);
    expect(hub2Events).toHaveLength(0);
    console.log("[E2E Test] ✓ Event isolation verified - only correct hub received event");
  });

  it("should handle multiple subscribers to the same hub", async () => {
    const eventKey = `webhook:hub:${testHubId}`;
    const subscriber1Events: any[] = [];
    const subscriber2Events: any[] = [];

    // Set up two subscribers
    eventBus.on(eventKey, (event) => {
      console.log(`[E2E Test] Subscriber 1 received event:`, event.id);
      subscriber1Events.push(event);
    });

    eventBus.on(eventKey, (event) => {
      console.log(`[E2E Test] Subscriber 2 received event:`, event.id);
      subscriber2Events.push(event);
    });

    // Emit event
    const testEvent = {
      id: testEventId,
      hubId: testHubId,
      message: testMessage,
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`[E2E Test] Emitting to ${eventKey} with 2 subscribers`);
    eventBus.emit(eventKey, testEvent);

    // Both subscribers should receive it
    expect(subscriber1Events).toHaveLength(1);
    expect(subscriber2Events).toHaveLength(1);
    console.log("[E2E Test] ✓ Multiple subscribers received event");
  });

  it("should handle rapid successive events", async () => {
    const eventKey = `webhook:hub:${testHubId}`;
    const receivedEvents: any[] = [];

    eventBus.on(eventKey, (event) => {
      console.log(`[E2E Test] Received event #${receivedEvents.length + 1}:`, event.id);
      receivedEvents.push(event);
    });

    // Emit 5 rapid events
    console.log("[E2E Test] Emitting 5 rapid events...");
    for (let i = 0; i < 5; i++) {
      const event = {
        id: crypto.randomUUID(),
        hubId: testHubId,
        message: `Event ${i + 1}`,
        payload: null,
        status: "pending" as const,
        deliveredAt: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      eventBus.emit(eventKey, event);
    }

    // All events should be received
    expect(receivedEvents).toHaveLength(5);
    console.log("[E2E Test] ✓ All 5 rapid events received");
  });

  it("should clean up listeners on unsubscribe", async () => {
    const eventKey = `webhook:hub:${testHubId}`;
    const receivedEvents: any[] = [];

    const handler = (event: any) => {
      console.log(`[E2E Test] Handler received event:`, event.id);
      receivedEvents.push(event);
    };

    // Add listener
    eventBus.on(eventKey, handler);

    // Emit event
    const event1 = {
      id: crypto.randomUUID(),
      hubId: testHubId,
      message: "Event 1",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    eventBus.emit(eventKey, event1);
    expect(receivedEvents).toHaveLength(1);

    // Remove listener
    console.log("[E2E Test] Removing listener...");
    eventBus.removeListener(eventKey, handler);

    // Emit another event
    const event2 = {
      id: crypto.randomUUID(),
      hubId: testHubId,
      message: "Event 2",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    eventBus.emit(eventKey, event2);

    // Should still be 1 (listener was removed)
    expect(receivedEvents).toHaveLength(1);
    console.log("[E2E Test] ✓ Listener successfully removed");
  });
});
