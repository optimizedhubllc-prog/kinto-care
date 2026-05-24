import crypto from "crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export function generateApiKey(): { key: string; hash: string } {
  const key = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string): Promise<{ hubId: string; permissions: string[] } | null> {
  const hash = hashApiKey(key);
  const result = await db.select({ hubId: apiKeys.hubId, permissions: apiKeys.permissions, isActive: apiKeys.isActive, expiresAt: apiKeys.expiresAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!result[0]) return null;
  if (result[0].expiresAt && new Date(result[0].expiresAt) < new Date()) return null;

  return {
    hubId: result[0].hubId,
    permissions: result[0].permissions.split(",").map((p: string) => p.trim()).filter(Boolean),
  };
}

export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}

export async function createApiKey(hubId: string, name: string, permissions: string[], createdBy: string, expiresAt?: Date) {
  const id = crypto.randomUUID();
  const { key, hash } = generateApiKey();
  await db.insert(apiKeys).values({ id, hubId, name, keyHash: hash, permissions: permissions.join(","), createdBy, expiresAt, isActive: true });
  return { id, key };
}
