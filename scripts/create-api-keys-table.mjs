import mysql from 'mysql2/promise';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 4000,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });

  console.log('[Create] Creating api_keys table...');

  const sql = `
    CREATE TABLE IF NOT EXISTS \`api_keys\` (
      \`id\` varchar(36) NOT NULL PRIMARY KEY,
      \`hub_id\` varchar(36) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`key_hash\` varchar(64) NOT NULL UNIQUE,
      \`permissions\` varchar(255) NOT NULL,
      \`created_by\` int NOT NULL,
      \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      \`last_used_at\` timestamp NULL DEFAULT NULL,
      \`expires_at\` timestamp NULL DEFAULT NULL,
      \`is_active\` boolean DEFAULT true NOT NULL,
      FOREIGN KEY (\`hub_id\`) REFERENCES \`patient_hubs\` (\`id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS \`idx_api_keys_hub_id\` ON \`api_keys\` (\`hub_id\`);
    CREATE INDEX IF NOT EXISTS \`idx_api_keys_key_hash\` ON \`api_keys\` (\`key_hash\`);
  `;

  try {
    await conn.query(sql);
    console.log('[Create] ✓ api_keys table created successfully');
  } catch (error) {
    console.error('[Create] ✗ Error:', error.message);
    process.exit(1);
  }

  await conn.end();
}

main().catch(console.error);
