# Task Webhook Payloads & n8n Integration

## Overview

The Kinto Task Management API emits three webhook events through the EventBus:
- `task.created` - When a new task is created
- `task.updated` - When a task's status changes
- `task.assigned` - When a task is assigned to a user

These events are broadcast to n8n via the webhook handler at `/api/webhooks/notifications`.

---

## Webhook Event Payloads

### 1. task.created

**When:** A new task is created in a hub.

**Payload Structure:**
```json
{
  "hub_id": "string (UUID)",
  "event_type": "task.created",
  "task_id": "string (UUID)",
  "task_title": "string",
  "assigned_to": "number (user ID) | null",
  "priority": "low | medium | high",
  "timestamp": "ISO 8601 datetime string"
}
```

**Example:**
```json
{
  "hub_id": "2e6a69ef-c3f6-4834-9c63-beec48aaf418",
  "event_type": "task.created",
  "task_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "task_title": "Schedule doctor appointment",
  "assigned_to": 2,
  "priority": "high",
  "timestamp": "2026-04-26T19:00:00.000Z"
}
```

**n8n Action:** Send email to the assigned user (if assigned_to is not null).

---

### 2. task.updated

**When:** A task's status changes (pending → in_progress → completed).

**Payload Structure:**
```json
{
  "hub_id": "string (UUID)",
  "event_type": "task.updated",
  "task_id": "string (UUID)",
  "task_title": "string",
  "old_status": "pending | in_progress | completed",
  "new_status": "pending | in_progress | completed",
  "timestamp": "ISO 8601 datetime string"
}
```

**Example:**
```json
{
  "hub_id": "2e6a69ef-c3f6-4834-9c63-beec48aaf418",
  "event_type": "task.updated",
  "task_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "task_title": "Schedule doctor appointment",
  "old_status": "in_progress",
  "new_status": "completed",
  "timestamp": "2026-04-26T19:30:00.000Z"
}
```

**n8n Action:** When status is "completed", send email to the task creator confirming completion.

---

### 3. task.assigned

**When:** A task is assigned to a user (or reassigned).

**Payload Structure:**
```json
{
  "hub_id": "string (UUID)",
  "event_type": "task.assigned",
  "task_id": "string (UUID)",
  "task_title": "string",
  "assigned_to": "number (user ID)",
  "timestamp": "ISO 8601 datetime string"
}
```

**Example:**
```json
{
  "hub_id": "2e6a69ef-c3f6-4834-9c63-beec48aaf418",
  "event_type": "task.assigned",
  "task_id": "a1b2c3d4-e5f6-4789-abcd-ef1234567890",
  "task_title": "Schedule doctor appointment",
  "assigned_to": 3,
  "timestamp": "2026-04-26T19:15:00.000Z"
}
```

**n8n Action:** Send email to the newly assigned user.

---

## Webhook Endpoint Configuration

### URL
```
POST https://<KINTO_HOST>/api/webhooks/notifications
```

### Authentication Header
```
X-Webhook-Signature: <HMAC-SHA256 hex digest>
```

The signature is computed as:
```
HMAC-SHA256(raw_request_body, WEBHOOK_SECRET)
```

### Request Headers
```
Content-Type: application/json
X-Webhook-Signature: <signature>
```

### Example curl Command
```bash
# Generate signature
PAYLOAD='{"hub_id":"2e6a69ef-c3f6-4834-9c63-beec48aaf418","event_type":"task.created","task_id":"a1b2c3d4-e5f6-4789-abcd-ef1234567890","task_title":"Schedule doctor appointment","assigned_to":2,"priority":"high","timestamp":"2026-04-26T19:00:00.000Z"}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

curl -X POST https://your-kinto-host.com/api/webhooks/notifications \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## n8n Workflow Integration

### Webhook Trigger Configuration

In n8n, the Webhook Trigger node should be configured as:

**Method:** POST  
**Path:** `kinto-notifications`  
**Full URL:** `https://your-n8n-instance.com/webhook/kinto-notifications`

### Event Routing Logic

The n8n workflow should route events based on `event_type`:

| Event Type | Recipient | Email Purpose |
|-----------|-----------|---------------|
| `task.created` | User in `assigned_to` field | Notify of new task assignment |
| `task.assigned` | User in `assigned_to` field | Notify of task reassignment |
| `task.updated` (status: completed) | Task creator | Confirm task completion |

### Recipient Lookup

For all events, use the `users.getByRoleWithApiKey` endpoint to fetch user emails:

**Endpoint:** `POST https://<KINTO_HOST>/api/trpc/users.getByRoleWithApiKey`

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "roleFilter": ["family_admin", "family_viewer", "caregiver"]
}
```

**Response:**
```json
{
  "users": [
    {
      "id": 2,
      "name": "Ysel",
      "email": "ysel@kintocare.test",
      "role": "family_admin"
    },
    {
      "id": 3,
      "name": "Gloria",
      "email": "gloria@kintocare.test",
      "role": "caregiver"
    }
  ]
}
```

---

## Email Templates

All emails must include the compliance footer:

```
Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
```

### task.created Email

**Subject:** New Task: [task_title]

**Body:**
```
Hi [assigned_user_name],

You have been assigned a new task in Kinto Care:

Task: [task_title]
Priority: [priority]
Created: [timestamp]

Please log in to Kinto Care to view details and update the status.

---
Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
```

### task.assigned Email

**Subject:** Task Reassigned: [task_title]

**Body:**
```
Hi [assigned_user_name],

A task has been assigned to you in Kinto Care:

Task: [task_title]
Assigned: [timestamp]

Please log in to Kinto Care to view details and begin working on this task.

---
Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
```

### task.updated (completed) Email

**Subject:** Task Completed: [task_title]

**Body:**
```
Hi [creator_name],

A task you created has been marked as completed:

Task: [task_title]
Completed: [timestamp]

Log in to Kinto Care to review the completed task.

---
Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
```

---

## n8n Workflow Steps

1. **Webhook Trigger** - Receives POST request with task event
2. **Extract Payload** - Parse event_type, task_id, assigned_to, etc.
3. **Event Router** - Branch based on event_type
4. **For task.created & task.assigned:**
   - Get assigned user email via API key endpoint
   - Send email to assigned user
5. **For task.updated (completed):**
   - Get task creator email via API key endpoint
   - Send completion confirmation email

---

## Security Notes

- **API Key:** Store in n8n environment variable `KINTO_API_KEY`
- **Webhook Secret:** Store in Kinto environment variable `WEBHOOK_SECRET`
- **Signature Verification:** Always validate `X-Webhook-Signature` header
- **HTTPS Only:** All webhook URLs must use HTTPS in production

---

**Last Updated:** 2026-04-26  
**Version:** 1.0  
**Status:** Ready for n8n v3 Workflow Implementation
