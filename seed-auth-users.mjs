/**
 * Seed Script: Create Supabase Auth Users for Kinto Care
 * 
 * Creates 5 test users for the Jaquez family:
 * - Pedro: family_admin
 * - Ysel: family_admin
 * - Alberto: family_member
 * - Kevin: family_member
 * - Gloria: caregiver (Spanish preference)
 * 
 * Temporary password: KintoCare2024!
 * (Family will reset on first login)
 */

import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tempPassword = 'KintoCare2024!';

// Test users to seed
const testUsers = [
  {
    name: 'Pedro Jaquez',
    email: 'pedro@kinto.care',
    role: 'family_admin',
    hubMemberRole: 'family_admin',
    languagePreference: 'en',
  },
  {
    name: 'Ysel Jaquez',
    email: 'ysel@kinto.care',
    role: 'family_admin',
    hubMemberRole: 'family_admin',
    languagePreference: 'en',
  },
  {
    name: 'Alberto Jaquez',
    email: 'alberto@kinto.care',
    role: 'user',
    hubMemberRole: 'family_member',
    languagePreference: 'en',
  },
  {
    name: 'Kevin Jaquez',
    email: 'kevin@kinto.care',
    role: 'user',
    hubMemberRole: 'family_member',
    languagePreference: 'en',
  },
  {
    name: 'Gloria',
    email: 'gloria@kinto.care',
    role: 'user',
    hubMemberRole: 'caregiver',
    languagePreference: 'es',
  },
];

async function seedAuthUsers() {
  try {
    console.log('🌱 Seeding Kinto Care test users...\n');

    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize MySQL connection
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✓ Connected to Supabase and MySQL\n');

    // Create each test user
    for (const user of testUsers) {
      try {
        // 1. Create Supabase Auth user
        console.log(`Creating auth user: ${user.email}...`);
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
        });

        if (authError) {
          if (authError.message.includes('already exists')) {
            console.log(`  ⚠️  User already exists in Supabase`);
          } else {
            throw authError;
          }
        } else {
          console.log(`  ✓ Auth user created: ${authUser.user.id}`);
        }

        // 2. Create or update users table record
        console.log(`Linking to users table...`);
        const [existingUsers] = await dbConnection.execute(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );

        let userId;
        if (existingUsers.length > 0) {
          // Update existing user
          userId = existingUsers[0].id;
          await dbConnection.execute(
            'UPDATE users SET hub_member_role = ?, language_preference = ? WHERE id = ?',
            [user.hubMemberRole, user.languagePreference, userId]
          );
          console.log(`  ✓ Updated existing user record (ID: ${userId})`);
        } else {
          // Create new user record
          const openId = `auth-${user.email.replace('@', '-').replace('.', '-')}`;
          const result = await dbConnection.execute(
            'INSERT INTO users (openId, name, email, role, hub_member_role, language_preference, loginMethod) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [openId, user.name, user.email, user.role, user.hubMemberRole, user.languagePreference, 'email']
          );
          userId = result[0].insertId;
          console.log(`  ✓ Created new user record (ID: ${userId})`);
        }

        console.log(`✅ ${user.name} (${user.email}) - Role: ${user.hubMemberRole}\n`);
      } catch (error) {
        console.error(`❌ Error seeding ${user.email}:`, error.message);
      }
    }

    console.log('\n✅ Seeding complete!\n');
    console.log('Test Credentials:');
    console.log('================');
    testUsers.forEach((user) => {
      console.log(`${user.email} / ${tempPassword}`);
    });
    console.log('\n⚠️  Users must reset password on first login');

    await dbConnection.end();
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedAuthUsers();
