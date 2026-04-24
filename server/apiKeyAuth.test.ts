import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  validateApiKey,
  hasPermission,
  createApiKey,
  revokeApiKey,
  listApiKeys,
} from "./apiKeyAuth";
import * as db from "./db";

// Mock the database
beforeEach(() => {
  vi.spyOn(db, "getDb").mockResolvedValue(null);
});

describe("API Key Authentication", () => {
  describe("generateApiKey", () => {
    it("should generate a valid API key and hash", () => {
      const { key, hash } = generateApiKey();

      expect(key).toBeDefined();
      expect(hash).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
      expect(hash.length).toBe(64); // SHA-256 hex length
    });

    it("should generate different keys each time", () => {
      const { key: key1 } = generateApiKey();
      const { key: key2 } = generateApiKey();

      expect(key1).not.toBe(key2);
    });

    it("should generate consistent hash for the same key", () => {
      const key = "test-key-12345";
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);

      expect(hash1).toBe(hash2);
    });
  });

  describe("hashApiKey", () => {
    it("should produce a 64-character hex string (SHA-256)", () => {
      const hash = hashApiKey("test-key");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce different hashes for different keys", () => {
      const hash1 = hashApiKey("key1");
      const hash2 = hashApiKey("key2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hasPermission", () => {
    it("should return true if permission exists", () => {
      const permissions = ["users:read", "webhooks:write"];

      expect(hasPermission(permissions, "users:read")).toBe(true);
      expect(hasPermission(permissions, "webhooks:write")).toBe(true);
    });

    it("should return false if permission does not exist", () => {
      const permissions = ["users:read"];

      expect(hasPermission(permissions, "webhooks:write")).toBe(false);
    });

    it("should handle empty permissions array", () => {
      const permissions: string[] = [];

      expect(hasPermission(permissions, "users:read")).toBe(false);
    });

    it("should be case-sensitive", () => {
      const permissions = ["users:read"];

      expect(hasPermission(permissions, "users:READ")).toBe(false);
    });
  });

  describe("validateApiKey", () => {
    it("should return null for invalid key", async () => {
      const result = await validateApiKey("invalid-key");

      expect(result).toBeNull();
    });

    it("should return null when database is unavailable", async () => {
      vi.spyOn(db, "getDb").mockResolvedValueOnce(null);

      const result = await validateApiKey("some-key");

      expect(result).toBeNull();
    });
  });

  describe("createApiKey", () => {
    it("should throw error when database is unavailable", async () => {
      vi.spyOn(db, "getDb").mockResolvedValueOnce(null);

      try {
        await createApiKey(
          "hub-123",
          "test-key",
          ["users:read"],
          1
        );
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toContain("Database connection failed");
      }
    });
  });

  describe("revokeApiKey", () => {
    it("should return false when database is unavailable", async () => {
      vi.spyOn(db, "getDb").mockResolvedValueOnce(null);

      const result = await revokeApiKey("key-id");

      expect(result).toBe(false);
    });
  });

  describe("listApiKeys", () => {
    it("should return empty array when database is unavailable", async () => {
      vi.spyOn(db, "getDb").mockResolvedValueOnce(null);

      const result = await listApiKeys("hub-123");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("API Key Generation Workflow", () => {
    it("should generate key, hash, and validate consistently", () => {
      const { key, hash } = generateApiKey();
      const computedHash = hashApiKey(key);

      expect(computedHash).toBe(hash);
    });

    it("should support multiple permissions", () => {
      const permissions = ["users:read", "webhooks:write", "logs:read"];

      expect(hasPermission(permissions, "users:read")).toBe(true);
      expect(hasPermission(permissions, "webhooks:write")).toBe(true);
      expect(hasPermission(permissions, "logs:read")).toBe(true);
      expect(hasPermission(permissions, "admin:all")).toBe(false);
    });
  });

  describe("API Key Format", () => {
    it("should generate keys in hex format", () => {
      const { key } = generateApiKey();

      expect(key).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate keys with sufficient entropy", () => {
      const { key } = generateApiKey();

      // 32 bytes = 64 hex characters
      expect(key.length).toBe(64);
    });
  });
});
