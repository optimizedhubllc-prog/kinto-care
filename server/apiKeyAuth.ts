import crypto from "crypto";
import { getDb } from "./db";
import { apiKeys } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Generate a new API key for external services (n8n, webhooks, etc.)
 * Returns the plain key (only shown once) and the hash for storage
 */
export function generateApiKey(): { key: string; hash: string } {
  // Generate a 32-byte random key and encode as hex
  const key = crypto.randomBytes(32).toString("hex");
  // SHA-256 hash for storage
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key and return the associated hub ID and permissions
 */
export async function validateApiKey(
  key: string
): Promise<{ hubId: string; permissions: string[] } | null> {
  const db = await getDb();
  if (!db) return null;

  const hash = hashApiKey(key);

  const result = await db
    .select({
      hubId: apiKeys.hubId,
      permissions: apiKeys.permissions,
      isActive: apiKeys.isActive,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;

  const apiKey = result[0];

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return null;
  }

  // Parse permissions (comma-separated string)
  const permissions = apiKey.permissions
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    hubId: apiKey.hubId,
    permissions,
  };
}

/**
 * Check if an API key has a specific permission
 */
export function hasPermission(
  permissions: string[],
  requiredPermission: string
): boolean {
  return permissions.includes(requiredPermission);
}

/**
 * Create a new API key for a hub
 */
export async function createApiKey(
  hubId: string,
  name: string,
  permissions: string[],
  createdBy: number,
  expiresAt?: Date
): Promise<{ id: string; key: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const id = crypto.randomUUID();
  const { key, hash } = generateApiKey();

  await db.insert(apiKeys).values({
    id,
    hubId,
    name,
    keyHash: hash,
    permissions: permissions.join(","),
    createdBy,
    expiresAt,
    isActive: true,
  });

  return { id, key };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(eq(apiKeys.id, keyId));

  return true;
}

/**
 * List API keys for a hub (without showing the actual keys)
 */
export async function listApiKeys(hubId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isActive: apiKeys.isActive,
    })
    .from(apiKeys)
    .where(eq(apiKeys.hubId, hubId));
}
