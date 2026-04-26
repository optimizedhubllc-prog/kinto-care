import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const sql = `
CREATE TABLE IF NOT EXISTS \`contacts\` (
  \`id\` varchar(36) NOT NULL,
  \`hub_id\` varchar(36) NOT NULL,
  \`name\` text NOT NULL,
  \`role\` text NOT NULL,
  \`phone\` text NOT NULL,
  \`country_code\` varchar(2) NOT NULL DEFAULT 'US',
  \`language_preference\` varchar(5) NOT NULL DEFAULT 'en',
  \`notes\` text,
  \`created_by\` int NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`hub_id\` (\`hub_id\`),
  KEY \`created_by\` (\`created_by\`),
  CONSTRAINT \`contacts_hub_id_fk\` FOREIGN KEY (\`hub_id\`) REFERENCES \`patient_hubs\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`contacts_created_by_fk\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
);
`;

await connection.execute(sql);
console.log('✓ Contacts table created');
await connection.end();
