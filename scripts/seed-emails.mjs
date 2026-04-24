#!/usr/bin/env node

/**
 * Seed script to populate placeholder emails for Jaquez family users.
 * 
 * This script adds placeholder email addresses to existing users in the database.
 * Emails follow the format: firstname@kintocare.test
 * 
 * Users to seed:
 * - Pedro (family_admin, Tampa)
 * - Ysel (family_admin, Dominican Republic)
 * - Alberto (family_member, Washington DC)
 * - Kevin (family_member, Tampa)
 * - Pedro Alberto (family_member, Tampa)
 * - Gloria (caregiver)
 */

import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'kinto',
  port: process.env.DATABASE_PORT || 3306,
});

const emailMappings = [
  { name: 'Pedro', email: 'pedro@kintocare.test' },
  { name: 'Ysel', email: 'ysel@kintocare.test' },
  { name: 'Alberto', email: 'alberto@kintocare.test' },
  { name: 'Kevin', email: 'kevin@kintocare.test' },
  { name: 'Pedro Alberto', email: 'pedroalberto@kintocare.test' },
  { name: 'Gloria', email: 'gloria@kintocare.test' },
];

console.log('🌱 Seeding placeholder emails for Jaquez family users...\n');

for (const mapping of emailMappings) {
  try {
    const [result] = await connection.execute(
      'UPDATE users SET email = ? WHERE name = ? AND email IS NULL',
      [mapping.email, mapping.name]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✓ ${mapping.name}: ${mapping.email} (${result.affectedRows} row updated)`);
    } else {
      console.log(`⚠ ${mapping.name}: No matching user found or email already set`);
    }
  } catch (error) {
    console.error(`✗ ${mapping.name}: ${error.message}`);
  }
}

console.log('\n✅ Email seeding complete!');
await connection.end();
