/**
 * Verify and apply migration to ensure auth columns exist
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyMigration() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('Checking if auth columns exist in users table...\n');
    
    // Check if columns exist
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE()"
    );
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('Existing columns:', columnNames);
    
    const missingColumns = [];
    if (!columnNames.includes('hub_member_role')) missingColumns.push('hub_member_role');
    if (!columnNames.includes('hub_id')) missingColumns.push('hub_id');
    if (!columnNames.includes('language_preference')) missingColumns.push('language_preference');
    
    if (missingColumns.length === 0) {
      console.log('\n✅ All auth columns already exist!\n');
    } else {
      console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`);
      console.log('\nApplying migration...\n');
      
      // Apply migration
      try {
        if (missingColumns.includes('hub_member_role')) {
          await connection.execute(
            'ALTER TABLE `users` ADD COLUMN `hub_member_role` varchar(32) DEFAULT "family_member"'
          );
          console.log('✓ Added hub_member_role column');
        }
        
        if (missingColumns.includes('hub_id')) {
          await connection.execute(
            'ALTER TABLE `users` ADD COLUMN `hub_id` varchar(36)'
          );
          console.log('✓ Added hub_id column');
        }
        
        if (missingColumns.includes('language_preference')) {
          await connection.execute(
            'ALTER TABLE `users` ADD COLUMN `language_preference` varchar(5) DEFAULT "en" NOT NULL'
          );
          console.log('✓ Added language_preference column');
        }
        
        console.log('\n✅ Migration applied successfully!\n');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('✅ Columns already exist!\n');
        } else {
          throw error;
        }
      }
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyMigration();
