#!/usr/bin/env node

/**
 * Seed Script: Jaquez Family Hub
 * 
 * This script creates the Jaquez family hub and related user records for beta testing.
 * 
 * Creates:
 * - 1 Patient Hub (Jaquez Family Hub)
 * - 5 Users (2 family admins, 2 family members, 1 caregiver)
 * - 5 Hub Member relationships
 * 
 * Usage: node scripts/seed-jaquez-hub.mjs
 * 
 * Output: Displays hub ID and user IDs for API key generation
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { URL } from 'url';

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[Seed] ✗ DATABASE_URL environment variable not set');
  process.exit(1);
}

const url = new URL(databaseUrl);
const DB_HOST = url.hostname;
const DB_USER = url.username;
const DB_PASSWORD = url.password;
const DB_NAME = url.pathname.substring(1); // Remove leading slash
const DB_PORT = url.port || 4000;

/**
 * Generate a unique openId for Manus OAuth
 * Format: manus-oauth-<random>
 */
function generateOpenId() {
  return `manus-oauth-${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Generate a unique email for testing
 */
function generateEmail(name) {
  const domain = 'kintocare.test';
  return `${name.toLowerCase()}@${domain}`;
}

/**
 * Main seed function
 */
async function seedJaquezHub() {
  let connection;
  
  try {
    // Connect to database
    console.log(`[Seed] Connecting to database: ${DB_HOST}/${DB_NAME}`);
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('[Seed] ✓ Connected to database');

    // Generate hub ID
    const hubId = crypto.randomUUID();
    console.log(`\n[Seed] Creating hub: Jaquez Family Hub`);
    console.log(`[Seed] Hub ID: ${hubId}`);

    // Insert patient hub
    const hubInsertQuery = `
      INSERT INTO patient_hubs (id, patient_name, patient_dob, created_by, created_at, updated_at)
      VALUES (?, ?, ?, NULL, NOW(), NOW())
    `;
    
    await connection.execute(hubInsertQuery, [
      hubId,
      'Jaquez Family Patient',
      null, // No DOB for now
    ]);
    
    console.log('[Seed] ✓ Hub created');

    // Define users to create
    const usersToCreate = [
      {
        name: 'Pedro',
        role: 'family_admin',
        countryCode: 'US',
        languagePreference: 'en',
      },
      {
        name: 'Ysel',
        role: 'family_admin',
        countryCode: 'DO',
        languagePreference: 'es',
      },
      {
        name: 'Alberto',
        role: 'family_viewer',
        countryCode: 'US',
        languagePreference: 'en',
      },
      {
        name: 'Kevin',
        role: 'family_viewer',
        countryCode: 'US',
        languagePreference: 'en',
      },
      {
        name: 'Gloria',
        role: 'caregiver',
        countryCode: 'DO',
        languagePreference: 'es',
      },
    ];

    // Insert users and hub members
    const userIds = [];
    
    for (const userConfig of usersToCreate) {
      const openId = generateOpenId();
      const email = generateEmail(userConfig.name);
      
      console.log(`\n[Seed] Creating user: ${userConfig.name} (${userConfig.role})`);
      
      // Insert user
      const userInsertQuery = `
        INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `;
      
      const [userResult] = await connection.execute(userInsertQuery, [
        openId,
        userConfig.name,
        email,
        'oauth',
        'user', // All are regular users, role is determined by hub membership
      ]);
      
      const userId = userResult.insertId;
      userIds.push({
        id: userId,
        name: userConfig.name,
        role: userConfig.role,
        email: email,
      });
      
      console.log(`[Seed] ✓ User created (ID: ${userId}, Email: ${email})`);
      
      // Insert hub member relationship
      const hubMemberId = crypto.randomUUID();
      const hubMemberInsertQuery = `
        INSERT INTO hub_members (id, hub_id, user_id, hub_member_role, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;
      
      await connection.execute(hubMemberInsertQuery, [
        hubMemberId,
        hubId,
        userId,
        userConfig.role,
      ]);
      
      console.log(`[Seed] ✓ Hub member relationship created`);
    }

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('[Seed] ✓ JAQUEZ FAMILY HUB SEEDED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`\nHub ID: ${hubId}`);
    console.log(`\nUsers created:`);
    
    userIds.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Email: ${user.email}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('[Seed] Next steps:');
    console.log(`\n1. Generate API key for n8n:`);
    console.log(`   node scripts/generate-n8n-api-key.mjs ${hubId} 1`);
    console.log(`\n2. Use hub ID for API key generation and n8n configuration`);
    console.log('='.repeat(60) + '\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('[Seed] ✗ Error:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the seed script
seedJaquezHub();
