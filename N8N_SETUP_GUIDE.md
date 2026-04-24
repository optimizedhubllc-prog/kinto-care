# Kinto Gmail Notifications — n8n Setup Guide

## Overview

This guide walks you through importing and configuring the Kinto Gmail notification workflow in n8n cloud.

## Workflow Summary

**File:** `n8n-kinto-gmail-notifications.json`

The workflow listens for Kinto task events via webhook and routes them to appropriate recipients:

### Event Routing Logic

| Event Type | Recipients | Email Type |
|---|---|---|
| `task.created` | All family_admin + family_member users | Broadcast |
| `task.claimed` | All family_admin + family_member users | Broadcast |
| `task.completed` | All family_admin + family_member users | Broadcast |
| `task.assigned` | Only the assigned caregiver | Direct assignment |

### Workflow Architecture

```
Webhook Trigger
    ↓
Extract Payload (normalize event data)
    ↓
Event Router (branch on event type)
    ├─ Broadcast Path (task.created, task.claimed, task.completed)
    │  ├─ Get Broadcast Recipients (call trpc.users.getByRole)
    │  └─ Send Broadcast Emails (Gmail)
    │
    └─ Assignment Path (task.assigned)
       ├─ Get Assigned Caregiver (call trpc.users.getByRole)
       ├─ Filter Assignee (match assignee_id)
       └─ Send Assignment Email (Gmail)
```

## Setup Steps

### Step 1: Prepare Your Credentials

Before importing, gather:

1. **Kinto API Host**
   - Your Kinto deployment URL (e.g., `kinto.example.com` or `3000-xxx.manus.computer`)
   - This will be set as environment variable: `KINTO_API_HOST`

2. **Sender Email Address**
   - Email address to send notifications from (e.g., `notifications@example.com`)
   - This will be set as environment variable: `KINTO_SENDER_EMAIL`

3. **LLC Gmail Credential ID**
   - In n8n cloud, go to: **Credentials** → Find your LLC Gmail credential
   - Click on it and copy the credential ID from the URL or settings
   - You'll use this to replace the placeholder in Step 3

### Step 2: Import the Workflow

1. In n8n cloud, go to **Workflows** → **Create New**
2. Click **Import from file** or **Import from JSON**
3. Select or paste the contents of `n8n-kinto-gmail-notifications.json`
4. Click **Import**
5. The workflow will be created in inactive state

### Step 3: Replace Gmail Credential Placeholder

**CRITICAL:** The workflow contains a placeholder credential reference that must be replaced.

**Find and Replace:**
- **Find:** `PLACEHOLDER_LLC_GMAIL_CREDENTIAL`
- **Replace with:** Your actual LLC Gmail credential ID

**Where to find it:**
1. In n8n cloud, go to **Credentials**
2. Find your LLC Gmail credential
3. Click on it
4. The credential ID is in the URL or can be copied from settings
5. Format: Usually a long alphanumeric string (e.g., `cred_abc123xyz789`)

**How to replace:**
1. Open the workflow in the editor
2. Click on either **Send Broadcast Emails** or **Send Assignment Email** node
3. In the credentials field, select your LLC Gmail credential from the dropdown
4. Repeat for both email nodes

Alternatively, edit the JSON directly:
- Find all instances of `"credentialsType": "PLACEHOLDER_LLC_GMAIL_CREDENTIAL"`
- Replace with `"credentialsType": "cred_YOUR_ACTUAL_ID"`

### Step 4: Set Environment Variables

In n8n cloud, set these environment variables:

```bash
KINTO_API_HOST=your-kinto-host.com
KINTO_SENDER_EMAIL=notifications@your-domain.com
```

**How to set:**
1. In n8n cloud, go to **Settings** → **Environment Variables**
2. Add `KINTO_API_HOST` with your Kinto deployment URL
3. Add `KINTO_SENDER_EMAIL` with your sender email address
4. Save

### Step 5: Configure Webhook Trigger

1. Open the workflow and click on the **Webhook Trigger** node
2. Copy the webhook URL
3. In Kinto, add this webhook URL to your webhook settings:
   - **Endpoint:** The webhook URL from n8n
   - **Events:** Select `task.created`, `task.claimed`, `task.completed`, `task.assigned`
   - **Active:** Enable

### Step 6: Test the Workflow

1. In Kinto, trigger a test event (e.g., create a new task)
2. Watch the n8n workflow execution in real-time
3. Check the recipient's email for the notification
4. Verify the email contains:
   - Event type in subject
   - Task title
   - Task status
   - Timestamp

### Step 7: Activate the Workflow

1. Once testing is complete, click **Activate** in the workflow editor
2. The workflow is now live and will process all incoming events

## Webhook Payload Format

Kinto should send events in this format:

```json
{
  "event_type": "task.created|task.claimed|task.completed|task.assigned",
  "task_id": "uuid",
  "task_title": "string",
  "timestamp": "ISO 8601 datetime",
  "status": "pending|in_progress|completed",
  "assignee_id": "number (only for task.assigned events)",
  "hub_id": "uuid"
}
```

## Troubleshooting

### Issue: "Credential not found"
- **Solution:** Verify the credential ID is correct and the Gmail credential is active in n8n

### Issue: "HTTP 401 Unauthorized from Kinto"
- **Solution:** Verify `KINTO_API_HOST` is correct and includes the protocol (https://)

### Issue: "Email not sent"
- **Solution:** Check that the sender email matches the Gmail account's authorized sender address

### Issue: "Recipients list is empty"
- **Solution:** Verify the hub has users with non-null emails in the database

## Monitoring

Monitor workflow executions in n8n:

1. Go to **Workflows** → **Kinto Gmail Notifications**
2. Click **Executions** tab
3. View success/failure status for each event
4. Click on an execution to see detailed logs

## Future Enhancements

Potential improvements to the workflow:

1. **Email Templates** - Create HTML email templates with branding
2. **Event History** - Log all sent emails to a database
3. **Rate Limiting** - Add delays between emails to prevent spam
4. **Retry Logic** - Automatically retry failed email sends
5. **Unsubscribe Links** - Add unsubscribe functionality
6. **SMS Fallback** - Send SMS if email fails
7. **Slack Integration** - Send Slack messages in addition to email

## Support

For issues or questions:

1. Check n8n workflow logs for error details
2. Verify all environment variables are set correctly
3. Test the Kinto API endpoint manually using curl or Postman
4. Review the webhook payload format matches expectations

## Files Reference

- **Workflow JSON:** `n8n-kinto-gmail-notifications.json`
- **Kinto Endpoint:** `POST /api/trpc/users.getByRole`
- **Webhook Trigger:** `POST /webhook/kinto-notifications`

---

**Last Updated:** 2026-04-24
**Version:** 1.0
**Status:** Ready for production
