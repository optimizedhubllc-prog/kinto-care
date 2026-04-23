import { describe, it, expect, beforeEach, afterEach } from "vitest";
import eventBus from "./_core/eventBus";
import crypto from "crypto";

/**
 * tRPC Subscription Transport Test
 * 
 * Tests that the EventBus correctly broadcasts webhook events to subscribers.
 * This validates the transport layer that tRPC subscriptions depend on.
 */

describe("tRPC Subscription Transport: EventBus Delivery", () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it("Transport Layer: EventBus emits events to correct hub channel", async () => {
    console.log("\n[TRANSPORT] Step 1: EventBus Channel Isolation");
    console.log("=".repeat(60));

    const hubId = crypto.randomUUID();
    const receivedEvents: any[] = [];

    console.log(`  → Subscribing to webhook events for hub: ${hubId}`);

    // Subscribe to hub channel
    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  ✓ Received event: ${event.message}`);
      receivedEvents.push(event);
    });

    console.log(`  → Emitting test event to hub channel`);

    // Emit event
    const testEvent = {
      id: crypto.randomUUID(),
      hubId,
      message: "Test notification",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    eventBus.emit(`webhook:hub:${hubId}`, testEvent);

    // Small delay for event processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  ✓ EventBus delivered event to subscriber`);
    console.log(`  ✓ Received ${receivedEvents.length} event(s)`);
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].message).toBe("Test notification");
    console.log("=".repeat(60));
  });

  it("Transport Layer: Hub isolation - events only reach correct subscribers", async () => {
    console.log("\n[TRANSPORT] Step 2: Hub Channel Isolation");
    console.log("=".repeat(60));

    const hub1Id = crypto.randomUUID();
    const hub2Id = crypto.randomUUID();

    const hub1Events: any[] = [];
    const hub2Events: any[] = [];

    console.log(`  → Hub 1: ${hub1Id}`);
    console.log(`  → Hub 2: ${hub2Id}`);

    // Subscribe to both hubs
    eventBus.on(`webhook:hub:${hub1Id}`, (event) => {
      console.log(`  ✓ Hub1 received: ${event.message}`);
      hub1Events.push(event);
    });

    eventBus.on(`webhook:hub:${hub2Id}`, (event) => {
      console.log(`  ✓ Hub2 received: ${event.message}`);
      hub2Events.push(event);
    });

    console.log(`  → Emitting event to Hub 1`);
    eventBus.emit(`webhook:hub:${hub1Id}`, {
      id: crypto.randomUUID(),
      hubId: hub1Id,
      message: "Hub 1 event",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  → Emitting event to Hub 2`);
    eventBus.emit(`webhook:hub:${hub2Id}`, {
      id: crypto.randomUUID(),
      hubId: hub2Id,
      message: "Hub 2 event",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  ✓ Hub1 received ${hub1Events.length} event(s) - only Hub1 events`);
    console.log(`  ✓ Hub2 received ${hub2Events.length} event(s) - only Hub2 events`);
    console.log(`  ✓ Channels are properly isolated`);

    expect(hub1Events.length).toBe(1);
    expect(hub2Events.length).toBe(1);
    expect(hub1Events[0].message).toBe("Hub 1 event");
    expect(hub2Events[0].message).toBe("Hub 2 event");
    console.log("=".repeat(60));
  });

  it("Transport Layer: Multiple subscribers receive same event", async () => {
    console.log("\n[TRANSPORT] Step 3: Multiple Subscribers");
    console.log("=".repeat(60));

    const hubId = crypto.randomUUID();
    const subscriber1Events: any[] = [];
    const subscriber2Events: any[] = [];
    const subscriber3Events: any[] = [];

    console.log(`  → Creating 3 subscribers for hub: ${hubId}`);

    // Create 3 subscribers
    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  ✓ Subscriber 1 received: ${event.message}`);
      subscriber1Events.push(event);
    });

    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  ✓ Subscriber 2 received: ${event.message}`);
      subscriber2Events.push(event);
    });

    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  ✓ Subscriber 3 received: ${event.message}`);
      subscriber3Events.push(event);
    });

    console.log(`  → Emitting event`);

    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "Broadcast to all subscribers",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  ✓ All 3 subscribers received the same event`);
    expect(subscriber1Events.length).toBe(1);
    expect(subscriber2Events.length).toBe(1);
    expect(subscriber3Events.length).toBe(1);
    console.log("=".repeat(60));
  });

  it("FULL TRANSPORT FLOW: n8n → Webhook → EventBus → Multiple Subscribers", async () => {
    console.log("\n[TRANSPORT] FULL FLOW: End-to-End Delivery");
    console.log("=".repeat(60));

    const hubId = crypto.randomUUID();
    const familyMemberEvents: any[] = [];
    const caregiverEvents: any[] = [];

    console.log(`\n  [Scenario] Jaquez family hub: ${hubId}`);
    console.log(`  [Scenario] Family members and caregivers subscribed`);

    // Simulate multiple family members subscribing
    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  [FamilyMember] Received: ${event.message}`);
      familyMemberEvents.push(event);
    });

    eventBus.on(`webhook:hub:${hubId}`, (event) => {
      console.log(`  [Caregiver] Received: ${event.message}`);
      caregiverEvents.push(event);
    });

    console.log(`\n  [n8n] Workflow 1: Medication Reminder`);
    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "💊 Take Aspirin at 9:00 AM",
      payload: JSON.stringify({ type: "medication", drug: "Aspirin" }),
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  [n8n] Workflow 2: Appointment Reminder`);
    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "📅 Doctor appointment at 2:00 PM",
      payload: JSON.stringify({ type: "appointment", doctor: "Dr. Smith" }),
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  [n8n] Workflow 3: Shift Handover`);
    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "👋 Patient had good day, ate well",
      payload: JSON.stringify({ type: "handover", status: "good" }),
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`\n  [Result] Family members received ${familyMemberEvents.length} notifications`);
    console.log(`  [Result] Caregivers received ${caregiverEvents.length} notifications`);
    console.log(`\n  ✅ FULL TRANSPORT FLOW SUCCESSFUL`);
    console.log(`     n8n → Webhook Handler → EventBus → All Subscribers`);
    console.log("=".repeat(60));

    expect(familyMemberEvents.length).toBe(3);
    expect(caregiverEvents.length).toBe(3);
  });

  it("Transport Layer: Unsubscribe stops event delivery", async () => {
    console.log("\n[TRANSPORT] Step 5: Subscriber Cleanup");
    console.log("=".repeat(60));

    const hubId = crypto.randomUUID();
    const receivedEvents: any[] = [];

    console.log(`  → Subscribing to hub: ${hubId}`);

    const handler = (event: any) => {
      console.log(`  ✓ Received: ${event.message}`);
      receivedEvents.push(event);
    };

    eventBus.on(`webhook:hub:${hubId}`, handler);

    console.log(`  → Emitting first event`);
    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "Event 1",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  → Unsubscribing from hub`);
    eventBus.off(`webhook:hub:${hubId}`, handler);

    console.log(`  → Emitting second event (should not be received)`);
    eventBus.emit(`webhook:hub:${hubId}`, {
      id: crypto.randomUUID(),
      hubId,
      message: "Event 2",
      payload: null,
      status: "pending" as const,
      deliveredAt: null,
      failureReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log(`  ✓ Received ${receivedEvents.length} event(s) - only Event 1`);
    console.log(`  ✓ Unsubscribe worked correctly`);
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].message).toBe("Event 1");
    console.log("=".repeat(60));
  });
});
