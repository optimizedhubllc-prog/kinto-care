import mysql from 'mysql2/promise';
import { URL } from 'url';

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 4000,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
    ssl: { rejectUnauthorized: false }
  });
  
  const [rows] = await conn.execute('DESCRIBE api_keys');
  console.table(rows);
  await conn.end();
}

main().catch(console.error);
