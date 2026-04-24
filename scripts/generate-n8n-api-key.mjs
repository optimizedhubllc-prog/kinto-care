import crypto from "crypto";
import mysql from "mysql2/promise";

/**
 * Generate API Key for n8n
 * 
 * This script generates a new API key for n8n to call the users.getByRoleWithApiKey endpoint.
 * The key is stored in the database with the "users:read" permission for the Jaquez family hub.
 * 
 * Usage: node scripts/generate-n8n-api-key.mjs <hubId> <createdBy>
 * 
 * Example: node scripts/generate-n8n-api-key.mjs 2534cf03-1854-4b33-9f03-35875ea01ab2 1
 */

function generateApiKey() {
  const key = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

async function main() {
  const hubId = process.argv[2];
  const createdBy = process.argv[3] || 1;

  if (!hubId) {
    console.error("Usage: node scripts/generate-n8n-api-key.mjs <hubId> [createdBy]");
    console.error("Example: node scripts/generate-n8n-api-key.mjs 2534cf03-1854-4b33-9f03-35875ea01ab2 1");
    process.exit(1);
  }

  try {
    const pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    const conn = await pool.getConnection();

    // Generate the API key
    const { key, hash } = generateApiKey();
    const keyId = crypto.randomUUID();
    const now = new Date();

    // Insert into api_keys table
    await conn.execute(
      `INSERT INTO api_keys (id, hub_id, name, key_hash, permissions, created_by, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [keyId, hubId, "n8n-notifications", hash, "users:read", createdBy, now, true]
    );

    conn.release();
    await pool.end();

    console.log("✅ API Key Generated Successfully\n");
    console.log("Key ID:", keyId);
    console.log("Hub ID:", hubId);
    console.log("Name: n8n-notifications");
    console.log("Permissions: users:read");
    console.log("\n🔑 API KEY (save this securely, it will not be shown again):");
    console.log(key);
    console.log("\n📋 Configuration for n8n:");
    console.log("Authorization Header: Bearer " + key);
    console.log("Endpoint: /api/trpc/users.getByRoleWithApiKey");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
