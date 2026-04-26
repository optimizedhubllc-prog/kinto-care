import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  console.log('Applying migration: Add auth columns to users table...');
  
  await connection.execute(
    'ALTER TABLE `users` ADD COLUMN `hub_member_role` varchar(32) DEFAULT "family_member"'
  );
  console.log('✓ Added hub_member_role column');
  
  await connection.execute(
    'ALTER TABLE `users` ADD COLUMN `hub_id` varchar(36)'
  );
  console.log('✓ Added hub_id column');
  
  await connection.execute(
    'ALTER TABLE `users` ADD COLUMN `language_preference` varchar(5) DEFAULT "en" NOT NULL'
  );
  console.log('✓ Added language_preference column');
  
  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log('⚠️  Columns already exist - skipping migration');
  } else {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
} finally {
  await connection.end();
}
