import { getDb } from './server/db.ts';
import * as fs from 'fs';

async function applyMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // Read the migration SQL
    const sql = fs.readFileSync('./drizzle/0007_wandering_oracle.sql', 'utf-8');
    
    // Split by statement-breakpoint and execute each statement
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.execute(statement);
      console.log('✓ Statement executed');
    }
    
    console.log('✓ Migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
