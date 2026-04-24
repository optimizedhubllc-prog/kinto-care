# API Key Authentication & n8n Integration Guide

## Overview

This guide explains how to set up API key authentication for external services like n8n to call the `users.getByRoleWithApiKey` endpoint.

## Architecture

### New Endpoint

**Endpoint:** `POST /api/trpc/users.getByRoleWithApiKey`

**Authentication:** API Key (Bearer token in Authorization header)

**Input:**
```json
{
  "roleFilter": ["family_admin", "family_member", "caregiver"]  // Optional
}
```

**Output:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Pedro",
      "email": "pedro@kintocare.test",
      "role": "family_admin"
    }
  ]
}
```

**Permissions Required:** `users:read`

### How It Works

1. **API Key Generation** → Create a new key in the `api_keys` table
2. **Bearer Token** → n8n sends the key in the Authorization header: `Authorization: Bearer <key>`
3. **Validation** → The `validateApiKey()` function hashes the key and looks it up in the database
4. **Hub Scoping** → The API key is scoped to a specific hub, so it only returns users from that hub
5. **Permission Check** → The endpoint verifies the key has `users:read` permission

## Step 1: Generate API Key

### Option A: Using the Script (Recommended)

```bash
# Generate and store API key in database
node scripts/generate-n8n-api-key.mjs <HUB_ID> <CREATED_BY_USER_ID>

# Example:
node scripts/generate-n8n-api-key.mjs 2534cf03-1854-4b33-9f03-35875ea01ab2 1
```

The script will output:
- Key ID (for reference)
- **API Key** (save this securely!)
- Configuration for n8n

### Option B: Manual Database Insert

```sql
INSERT INTO api_keys (id, hub_id, name, key_hash, permissions, created_by, created_at, is_active)
VALUES (
  UUID(),
  '2534cf03-1854-4b33-9f03-35875ea01ab2',  -- Your hub ID
  'n8n-notifications',
  SHA2('your-api-key-here', 256),           -- Hash the key
  'users:read',
  1,                                         -- User ID who created it
  NOW(),
  true
);
```

## Step 2: Configure n8n Workflow

### Update the n8n Workflow JSON

In the `n8n-kinto-gmail-notifications.json` file, update the HTTP request nodes:

**For "Get Broadcast Recipients" node:**
```json
{
  "method": "POST",
  "url": "https://YOUR_KINTO_HOST/api/trpc/users.getByRoleWithApiKey",
  "authentication": "genericCredentialType",
  "genericCredentialType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer YOUR_API_KEY_HERE"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "input",
        "value": "={\n  \"roleFilter\": [\"family_admin\", \"family_member\"]\n}"
      }
    ]
  }
}
```

**For "Get Assigned Caregiver" node:**
```json
{
  "method": "POST",
  "url": "https://YOUR_KINTO_HOST/api/trpc/users.getByRoleWithApiKey",
  "authentication": "genericCredentialType",
  "genericCredentialType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer YOUR_API_KEY_HERE"
      },
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "input",
        "value": "={\n  \"roleFilter\": [\"caregiver\"]\n}"
      }
    ]
  }
}
```

### Key Changes from Previous Workflow

**Old endpoint (OAuth-based):**
```
POST /api/trpc/users.getByRole
Input: { hubId: "...", roleFilter: [...] }
```

**New endpoint (API key-based):**
```
POST /api/trpc/users.getByRoleWithApiKey
Input: { roleFilter: [...] }
Header: Authorization: Bearer <API_KEY>
```

The hub ID is now implicit in the API key context, so you don't need to pass it.

## Step 3: Test the Endpoint

### Using curl

```bash
curl -X POST https://your-kinto-host.com/api/trpc/users.getByRoleWithApiKey \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"roleFilter": ["family_admin", "family_member"]}'
```

### Expected Response

```json
{
  "users": [
    {
      "id": 1,
      "name": "Pedro",
      "email": "pedro@kintocare.test",
      "role": "family_admin"
    },
    {
      "id": 2,
      "name": "Ysel",
      "email": "ysel@kintocare.test",
      "role": "family_admin"
    }
  ]
}
```

## Step 4: Import Updated Workflow into n8n

1. In n8n cloud, go to **Workflows** → **Import from JSON**
2. Paste the updated `n8n-kinto-gmail-notifications.json`
3. Configure the HTTP nodes with your API key (see Step 2)
4. Test the workflow with sample events
5. Activate when ready

## API Key Management

### List API Keys for a Hub

```sql
SELECT id, name, permissions, created_at, last_used_at, is_active
FROM api_keys
WHERE hub_id = '2534cf03-1854-4b33-9f03-35875ea01ab2';
```

### Revoke an API Key

```sql
UPDATE api_keys
SET is_active = false
WHERE id = 'key-id-here';
```

### Set Expiration Date

```sql
UPDATE api_keys
SET expires_at = DATE_ADD(NOW(), INTERVAL 90 DAY)
WHERE id = 'key-id-here';
```

## Security Best Practices

1. **Store Keys Securely** - Never commit API keys to version control
2. **Rotate Regularly** - Generate new keys every 90 days and revoke old ones
3. **Use Minimal Permissions** - Only grant `users:read` if that's all n8n needs
4. **Monitor Usage** - Check `last_used_at` to detect unused keys
5. **Scope to Hub** - Each API key is scoped to a specific hub
6. **Use Environment Variables** - Store keys in n8n environment variables, not hardcoded

## Example: n8n Environment Variable Setup

In n8n cloud, create these environment variables:

```
KINTO_API_KEY=2bf0cdddfe8609737d4eea52c439c06b7aaf2d5a5e70928c242ea0b6caef84e7
KINTO_API_HOST=your-kinto-host.com
KINTO_SENDER_EMAIL=notifications@your-domain.com
```

Then reference them in the workflow:

```
Authorization: Bearer {{ $env.KINTO_API_KEY }}
URL: https://{{ $env.KINTO_API_HOST }}/api/trpc/users.getByRoleWithApiKey
```

## Troubleshooting

### "Invalid or missing API key"

- Verify the API key is correct
- Check the Authorization header format: `Bearer <key>`
- Ensure the key is active in the database (`is_active = true`)
- Check if the key has expired (`expires_at` is in the past)

### "API key lacks users:read permission"

- The API key exists but doesn't have the required permission
- Update the key: `UPDATE api_keys SET permissions = 'users:read' WHERE id = '...'`

### "No users returned"

- Verify the hub ID in the API key matches the hub with users
- Check that users have non-null email addresses
- Verify the role filter matches existing roles in the hub

### "401 Unauthorized"

- The API key hash doesn't match any key in the database
- Regenerate the API key and update n8n

## Files Reference

- **API Key Auth:** `server/apiKeyAuth.ts`
- **Context Setup:** `server/_core/context.ts`
- **tRPC Procedures:** `server/_core/trpc.ts`
- **Users Router:** `server/routers.ts` (users.getByRoleWithApiKey)
- **API Key Generation Script:** `scripts/generate-n8n-api-key.mjs`
- **Tests:** `server/apiKeyAuth.test.ts`

## Next Steps

1. Generate API key using the script
2. Update n8n workflow with the API key
3. Test the endpoint with curl
4. Import workflow into n8n cloud
5. Configure environment variables
6. Test with sample events
7. Activate the workflow

---

**Last Updated:** 2026-04-24
**Version:** 1.0
**Status:** Production Ready
