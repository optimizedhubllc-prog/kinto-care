import crypto from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

/**
 * Generate API Key for n8n
 * 
 * This script generates a new API key for n8n to call the users.getByRoleWithApiKey endpoint.
 * The key is stored in the database with the "users:read" permission for the Jaquez family hub.
 * 
 * Uses Drizzle ORM for database operations (same as the rest of the codebase).
 * 
 * Usage: node scripts/generate-n8n-api-key.mjs <hubId> [createdBy]
 * 
 * Example: node scripts/generate-n8n-api-key.mjs 2534cf03-1854-4b33-9f03-35875ea01ab2 1
 */

// Import schema
import { apiKeys } from "../drizzle/schema.js";

function generateApiKey() {
  const key = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

async function main() {
  const hubId = process.argv[2];
  const createdBy = parseInt(process.argv[3] || "1", 10);

  if (!hubId) {
    console.error("Usage: node scripts/generate-n8n-api-key.mjs <hubId> [createdBy]");
    console.error("Example: node scripts/generate-n8n-api-key.mjs 2534cf03-1854-4b33-9f03-35875ea01ab2 1");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  try {
    // Create connection pool using DATABASE_URL
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Generate the API key
    const { key, hash } = generateApiKey();
    const keyId = crypto.randomUUID();
    const now = new Date();

    // Insert into api_keys table using Drizzle ORM
    await db.insert(apiKeys).values({
      id: keyId,
      hubId,
      name: "n8n-notifications",
      keyHash: hash,
      permissions: "users:read",
      createdBy,
      isActive: true,
    });

    await connection.end();

    console.log("✅ API Key Generated Successfully\n");
    console.log("Key ID:", keyId);
    console.log("Hub ID:", hubId);
    console.log("Name: n8n-notifications");
    console.log("Permissions: users:read");
    console.log("Created By User ID:", createdBy);
    console.log("\n🔑 API KEY (save this securely, it will not be shown again):");
    console.log(key);
    console.log("\n📋 Configuration for n8n:");
    console.log("Authorization Header: Bearer " + key);
    console.log("Endpoint: /api/trpc/users.getByRoleWithApiKey");
    console.log("\n✅ API key has been stored in the database and is ready to use.");
  } catch (error) {
    console.error("Error:", error.message);
    if (error.code === "ER_DUP_ENTRY") {
      console.error("Error: This API key already exists in the database");
    }
    process.exit(1);
  }
}

main();
