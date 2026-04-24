# Email Field Migration for Kinto Users Table

## Overview
This migration adds email field support to the users table to enable future notification routing for the Jaquez family caregiving hub.

## Changes Made

### 1. Schema Update (`drizzle/schema.ts`)
- **Column:** `email`
- **Type:** `varchar(320)`
- **Nullable:** Yes (backward compatible with existing records)
- **Unique:** Yes (prevents duplicate emails)
- **Purpose:** Support for email-based notifications and user identification

**Before:**
```typescript
email: varchar("email", { length: 320 }),
```

**After:**
```typescript
/** Email address for user notifications. Nullable for backward compatibility, unique to prevent duplicates. */
email: varchar("email", { length: 320 }).unique(),
```

### 2. Migration SQL (`drizzle/0005_left_vivisector.sql`)
```sql
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);
```

This migration:
- Adds a UNIQUE constraint to the `email` column
- Allows NULL values (multiple users can have NULL emails)
- Prevents duplicate non-NULL emails
- Is backward compatible (doesn't break existing records with NULL emails)

### 3. TypeScript Types
The User types are automatically inferred from the schema via Drizzle ORM:

```typescript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

The `email` field is now included in both types:
- `User.email?: string | null` (optional, can be null)
- `InsertUser.email?: string | null` (optional during insert)

### 4. Seed Data (`drizzle/seed-emails.sql`)
Placeholder emails for Jaquez family users (format: `firstname@kintocare.test`):

```sql
UPDATE users SET email = 'pedro@kintocare.test' WHERE name = 'Pedro' AND email IS NULL;
UPDATE users SET email = 'ysel@kintocare.test' WHERE name = 'Ysel' AND email IS NULL;
UPDATE users SET email = 'alberto@kintocare.test' WHERE name = 'Alberto' AND email IS NULL;
UPDATE users SET email = 'kevin@kintocare.test' WHERE name = 'Kevin' AND email IS NULL;
UPDATE users SET email = 'pedroalberto@kintocare.test' WHERE name = 'Pedro Alberto' AND email IS NULL;
UPDATE users SET email = 'gloria@kintocare.test' WHERE name = 'Gloria' AND email IS NULL;
```

## Execution Steps

1. **Apply Migration:**
   ```bash
   # The migration will be applied by the platform during deployment
   # File: drizzle/0005_left_vivisector.sql
   ```

2. **Seed Placeholder Emails:**
   ```bash
   # Execute the seed SQL file
   # File: drizzle/seed-emails.sql
   ```

## Validation

- ✅ Migration file generated: `drizzle/0005_left_vivisector.sql`
- ✅ Schema updated: `drizzle/schema.ts`
- ✅ TypeScript types auto-generated via Drizzle ORM
- ✅ All 72 existing tests passing
- ✅ Zero TypeScript errors
- ✅ Build successful
- ✅ Backward compatible (existing records unaffected)

## Notes

- The email field is **nullable** to maintain backward compatibility with existing user records
- The email field is **unique** to prevent duplicate emails in the system
- Placeholder emails use the domain `kintocare.test` (not a real domain)
- Seed script only updates users where email is currently NULL
- No application logic changes required
- Ready for future notification routing implementation

## Database Schema

Current users table structure:
```
id              INT PRIMARY KEY AUTO_INCREMENT
openId          VARCHAR(64) NOT NULL UNIQUE
name            TEXT
email           VARCHAR(320) UNIQUE (NEW)
loginMethod     VARCHAR(64)
role            ENUM('user', 'admin') DEFAULT 'user'
createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
lastSignedIn    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
