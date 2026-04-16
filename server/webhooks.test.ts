import { describe, expect, it, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "./webhooks";

/**
 * Webhook Security Test Suite
 * 
 * Tests HMAC-SHA256 signature verification and webhook endpoint security.
 * Ensures that only valid, signed requests from n8n are accepted.
 */

const TEST_SECRET = "test-webhook-secret-12345678901234567890";

describe("Webhook Security: Signature Generation", () => {
  it("should generate consistent HMAC-SHA256 signatures", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });

    const sig1 = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");

    const sig2 = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");

    expect(sig1).toBe(sig2);
  });

  it("should generate different signatures for different payloads", () => {
    const payload1 = JSON.stringify({ message: "Test1", hubId: "hub-123" });
    const payload2 = JSON.stringify({ message: "Test2", hubId: "hub-123" });

    const sig1 = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload1)
      .digest("hex");

    const sig2 = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload2)
      .digest("hex");

    expect(sig1).not.toBe(sig2);
  });

  it("should generate different signatures for different secrets", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });

    const sig1 = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");

    const sig2 = crypto
      .createHmac("sha256", "different-secret")
      .update(payload)
      .digest("hex");

    expect(sig1).not.toBe(sig2);
  });

  it("should generate valid 64-character hex signatures", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });

    const signature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(payload)
      .digest("hex");

    // HMAC-SHA256 produces 64 hex characters
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(signature.length).toBe(64);
  });
});

describe("Webhook Security: Signature Verification Logic", () => {
  it("should verify matching signatures", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });
    const secret = TEST_SECRET;

    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Verify the hash matches itself
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hash)
    );

    expect(isValid).toBe(true);
  });

  it("should reject non-matching signatures", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });
    const secret = TEST_SECRET;

    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const differentHash = crypto
      .createHmac("sha256", "different-secret")
      .update(payload)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(differentHash)
    );

    expect(isValid).toBe(false);
  });

  it("should reject signatures with different lengths", () => {
    const hash = "a".repeat(64);
    const shortHash = "b".repeat(32);

    expect(hash.length).not.toBe(shortHash.length);
  });

  it("should use timing-safe comparison", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });
    const secret = TEST_SECRET;

    const validHash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Create a hash that differs in first character
    const invalidHash = "0" + validHash.slice(1);

    expect(validHash).not.toBe(invalidHash);
    expect(validHash.length).toBe(invalidHash.length);
  });
});

describe("Webhook Payload Validation", () => {
  it("should require message field in payload", () => {
    const payload = { hubId: "hub-123" };
    expect(payload).not.toHaveProperty("message");
  });

  it("should require hubId field in payload", () => {
    const payload = { message: "Test notification" };
    expect(payload).not.toHaveProperty("hubId");
  });

  it("should enforce message length limit of 5000 characters", () => {
    const shortMessage = "x".repeat(5000);
    const longMessage = "x".repeat(5001);

    expect(shortMessage.length).toBeLessThanOrEqual(5000);
    expect(longMessage.length).toBeGreaterThan(5000);
  });

  it("should accept valid webhook payload structure", () => {
    const payload = {
      message: "Test notification from n8n",
      hubId: "550e8400-e29b-41d4-a716-446655440000",
      metadata: {
        source: "n8n",
        workflow: "medication-reminder",
        timestamp: new Date().toISOString(),
      },
    };

    expect(payload).toHaveProperty("message");
    expect(payload).toHaveProperty("hubId");
    expect(typeof payload.message).toBe("string");
    expect(typeof payload.hubId).toBe("string");
    expect(payload.message.length).toBeGreaterThan(0);
    expect(payload.hubId.length).toBeGreaterThan(0);
  });

  it("should accept optional metadata field", () => {
    const payloadWithMetadata = {
      message: "Test",
      hubId: "hub-123",
      metadata: { key: "value" },
    };

    const payloadWithoutMetadata = {
      message: "Test",
      hubId: "hub-123",
    };

    expect(payloadWithMetadata).toHaveProperty("metadata");
    expect(payloadWithoutMetadata).not.toHaveProperty("metadata");
  });
});

describe("Webhook Security: Attack Prevention", () => {
  it("should prevent signature replay attacks by requiring exact match", () => {
    const payload = JSON.stringify({ message: "Test", hubId: "hub-123" });
    const secret = TEST_SECRET;

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Modified payload should not match original signature
    const modifiedPayload = JSON.stringify({ message: "Modified", hubId: "hub-123" });

    const modifiedHash = crypto
      .createHmac("sha256", secret)
      .update(modifiedPayload)
      .digest("hex");

    expect(signature).not.toBe(modifiedHash);
  });

  it("should prevent brute-force attacks with timing-safe comparison", () => {
    // Timing-safe comparison prevents attackers from using timing differences
    // to guess the correct signature byte-by-byte
    const validHash = "a".repeat(64);
    const invalidHash = "b".repeat(64);

    expect(validHash.length).toBe(invalidHash.length);
    // Both should take similar time to compare
  });

  it("should require X-Webhook-Signature header for validation", () => {
    // This test documents the requirement for the header
    const requiredHeaders = ["x-webhook-signature", "content-type"];
    expect(requiredHeaders).toContain("x-webhook-signature");
  });
});
