import mysql from 'mysql2/promise';
import crypto from 'crypto';

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

// Jaquez family hub ID (from previous seeding)
const HUB_ID = 'd7dd12a1-ed80-4429-96fd-cf5d7fc16c0e';

// Get user IDs for Ysel and Gloria
const [users] = await connection.execute(
  'SELECT id, name FROM users WHERE name IN ("Ysel", "Gloria")'
);

const yselId = users.find(u => u.name === 'Ysel')?.id;
const gloriaId = users.find(u => u.name === 'Gloria')?.id;

if (!yselId || !gloriaId) {
  throw new Error('Ysel or Gloria not found in users table');
}

// Insert contacts
const contacts = [
  {
    id: crypto.randomUUID(),
    hub_id: HUB_ID,
    name: 'Ysel',
    role: 'family_admin',
    phone: '+18095551001', // E.164 format
    country_code: 'DO',
    language_preference: 'es',
    notes: 'Family admin - Dominican Republic',
    created_by: yselId,
  },
  {
    id: crypto.randomUUID(),
    hub_id: HUB_ID,
    name: 'Gloria',
    role: 'caregiver',
    phone: '+18095551002', // E.164 format
    country_code: 'DO',
    language_preference: 'es',
    notes: 'Primary caregiver - Dominican Republic',
    created_by: gloriaId,
  },
];

for (const contact of contacts) {
  await connection.execute(
    `INSERT INTO contacts (id, hub_id, name, role, phone, country_code, language_preference, notes, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contact.id,
      contact.hub_id,
      contact.name,
      contact.role,
      contact.phone,
      contact.country_code,
      contact.language_preference,
      contact.notes,
      contact.created_by,
    ]
  );
  console.log(`✓ Contact created: ${contact.name} (${contact.country_code})`);
}

await connection.end();
console.log('✓ Jaquez family contacts seeded successfully');
