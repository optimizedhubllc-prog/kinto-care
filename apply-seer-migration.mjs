import mysql from 'mysql2/promise';
import { URL } from 'url';

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: 'Amazon RDS',
});

const sql = `
ALTER TABLE \`medications\` ADD \`prescriber\` text;
ALTER TABLE \`medications\` ADD \`refill_date\` timestamp;
ALTER TABLE \`medications\` ADD \`quantity\` text;
ALTER TABLE \`medications\` ADD \`pharmacy_name\` text;
ALTER TABLE \`medications\` ADD \`pharmacy_phone\` text;
ALTER TABLE \`medications\` ADD \`confidence\` varchar(20) DEFAULT 'medium';
ALTER TABLE \`medications\` ADD \`raw_label_image_url\` text;
ALTER TABLE \`medications\` ADD \`reviewed\` boolean DEFAULT false;
ALTER TABLE \`medications\` ADD \`review_notes\` text;
ALTER TABLE \`medications\` ADD \`extracted_at\` timestamp;
`;

try {
  await connection.query(sql);
  console.log('✓ Seer Engine columns added to medications table');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('✓ Columns already exist, skipping');
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

await connection.end();
