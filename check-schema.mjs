import { getDb } from './server/db.ts';

async function checkSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  try {
    const result = await db.execute(`DESCRIBE hub_members`);
    console.log('Hub Members Table Schema:');
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
