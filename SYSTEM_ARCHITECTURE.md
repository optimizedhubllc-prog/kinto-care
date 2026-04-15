# Kinto - System Architecture Document

**Version**: 1.1  
**Date**: April 2026  
**Status**: Production Ready (Beta)  
**Last Updated**: Kinto Beta 1.1 - Visual Refresh & Seer Engine

---

## Executive Summary

**Kinto** is a mobile-first caregiving coordination platform designed to centralize patient care management for families and caregivers. The system provides a secure, role-based hub for managing medications, appointments, care logistics, and medical contacts for a single patient.

**Version 1.1 Enhancements:**
- ✅ **Seer Engine**: OCR-powered medication label scanning with Vision LLM
- ✅ **Familial Warmth Design**: Premium visual refresh with warm color palette and elegant typography
- ✅ **Enhanced Compliance**: Persistent disclaimers and mandatory manual review workflows
- ✅ **Mobile-First**: Glassmorphism effects and responsive navigation patterns

**Key Achievements:**
- ✅ Full RBAC enforcement at database and application layers
- ✅ SSO authentication (Google/Apple via Manus OAuth)
- ✅ Mobile-responsive UI with elegant, polished design
- ✅ 23+ tRPC procedures with comprehensive CRUD operations (including Seer Engine)
- ✅ 7-table relational database schema with proper indexing
- ✅ Responsive navigation (sidebar desktop, bottom nav mobile)

---

## 1. Database Schema

### 1.1 Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | Core user authentication | id, openId, name, email, role, createdAt, lastSignedIn |
| **patient_hubs** | Central patient care ecosystem | id, patientName, patientDob, createdBy, createdAt, updatedAt |
| **hub_members** | RBAC mapping (users to hubs) | id, hubId, userId, role, createdAt, updatedAt |
| **medications** | Patient medication tracking | id, hubId, name, dosage, frequency, instructions, isActive, createdBy, createdAt, updatedAt |
| **appointments** | Doctor appointment scheduling | id, hubId, medicalContactId, doctorName, specialty, dateTime, location, notes, createdBy, createdAt, updatedAt |
| **care_logistics** | Shift scheduling and handovers | id, hubId, caregiverId, startTime, endTime, taskNotes, createdBy, createdAt, updatedAt |
| **medical_contacts** | Reference database of doctors/providers | id, hubId, name, specialty, phone, email, address, notes, createdBy, createdAt, updatedAt |

**Note**: Database schema remains unchanged in v1.1. The Seer Engine operates on the existing `medications` table without requiring schema modifications.

### 1.2 Role-Based Access Control (RBAC)

Three distinct roles are enforced at both database and application layers:

| Role | Permissions | Write Access | Seer Engine Access |
|------|-------------|--------------|-------------------|
| **family_admin** | Full read/write access to all hub data; manage hub members; change roles | ✅ Yes | ✅ Can scan and save |
| **family_viewer** | Read-only access to all hub data | ❌ No | ❌ Cannot scan |
| **caregiver** | Read-only access to all hub data | ❌ No | ❌ Cannot scan |

### 1.3 Data Relationships

```
patient_hubs (1) ──→ (many) hub_members
              ├─→ (many) medications
              ├─→ (many) appointments
              ├─→ (many) care_logistics
              └─→ (many) medical_contacts

hub_members (many) ──→ (1) users
            └─→ (1) patient_hubs

medications (many) ──→ (1) patient_hubs
appointments (many) ──→ (1) patient_hubs
            └─→ (1) medical_contacts (optional)
care_logistics (many) ──→ (1) patient_hubs
               └─→ (1) users (caregiver)
medical_contacts (many) ──→ (1) patient_hubs
```

### 1.4 Key Constraints

- **Unique Constraint**: `hub_members` (hubId, userId) - prevents duplicate memberships
- **Foreign Keys**: All hub-related tables reference `patient_hubs.id` with `ON DELETE CASCADE`
- **Soft Delete**: Medications use `isActive` boolean for archiving (not hard delete)
- **Timestamps**: All tables include `createdAt` and `updatedAt` for audit trails
- **Seer Engine**: No schema changes required; OCR data maps directly to existing `medications` fields

---

## 2. API Endpoints (tRPC Procedures)

### 2.1 Authentication Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `auth.me` | Query | Public | Get current user profile |
| `auth.logout` | Mutation | Protected | Clear session cookie |

### 2.2 Hub Management Endpoints

| Endpoint | Method | Auth | Purpose | RBAC |
|----------|--------|------|---------|------|
| `hubs.list` | Query | Protected | List all hubs for current user | All roles |
| `hubs.getById` | Query | Protected | Get hub details with members | All roles |
| `hubs.create` | Mutation | Protected | Create new patient hub | Auto: family_admin |
| `hubs.update` | Mutation | Protected | Update hub metadata | family_admin only |
| `hubs.generateInviteCode` | Mutation | Protected | Generate 6-char invite code | family_admin only |
| `hubs.joinWithCode` | Mutation | Protected | Join hub using invite code | Auto: family_viewer |

### 2.3 Hub Members Endpoints

| Endpoint | Method | Auth | Purpose | RBAC |
|----------|--------|------|---------|------|
| `hubMembers.list` | Query | Protected | List all hub members | All roles |
| `hubMembers.add` | Mutation | Protected | Add new member to hub | family_admin only |
| `hubMembers.updateRole` | Mutation | Protected | Change member role | family_admin only |
| `hubMembers.remove` | Mutation | Protected | Remove member from hub | family_admin only |

### 2.4 Medical Contacts Endpoints

| Endpoint | Method | Auth | Purpose | RBAC |
|----------|--------|------|---------|------|
| `medicalContacts.list` | Query | Protected | List all medical contacts | All roles |
| `medicalContacts.getById` | Query | Protected | Get contact details | All roles |
| `medicalContacts.create` | Mutation | Protected | Create new contact | family_admin only |
| `medicalContacts.update` | Mutation | Protected | Update contact info | family_admin only |
| `medicalContacts.delete` | Mutation | Protected | Delete contact | family_admin only |

### 2.5 Medications Endpoints

| Endpoint | Method | Auth | Purpose | RBAC | NEW |
|----------|--------|------|---------|------|-----|
| `medications.list` | Query | Protected | List all medications | All roles | |
| `medications.getById` | Query | Protected | Get medication details | All roles | |
| `medications.create` | Mutation | Protected | Add new medication | family_admin only | |
| `medications.update` | Mutation | Protected | Update medication (including archive) | family_admin only | |
| `medications.delete` | Mutation | Protected | Delete medication | family_admin only | |
| `medications.extractFromImage` | Mutation | Protected | Extract medication info from image via Vision LLM | family_admin only | ✨ v1.1 |

#### 2.5.1 Seer Engine: `medications.extractFromImage`

**Purpose**: OCR-powered medication label scanning using Vision LLM

**Input Schema**:
```typescript
{
  hubId: string;           // Patient hub identifier
  imageBase64: string;     // Base64-encoded medication label image
}
```

**Output Schema**:
```typescript
{
  success: boolean;
  extracted: {
    name: string;         // Medication name (required)
    dosage: string;       // Dosage amount (e.g., "10mg")
    frequency: string;    // Dosing frequency (e.g., "Twice daily")
    instructions: string; // Special instructions (e.g., "Take with food")
  };
}
```

**Error Handling**:
- `FORBIDDEN`: User is not family_admin
- `BAD_REQUEST`: OCR failed or could not extract medication name
- `INTERNAL_SERVER_ERROR`: Vision LLM service unavailable

**Workflow**:
1. User clicks "Scan Label" in Medications dialog
2. Camera captures medication label image
3. Image converted to base64 and sent to backend
4. Vision LLM processes image with structured JSON schema
5. Extracted data returned to frontend
6. User reviews extracted data in dialog
7. User clicks "Confirm & Save" to populate form
8. User can edit fields before final save
9. Compliance disclaimer shown: "Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional."

**Security & Compliance**:
- Server-side processing (no client-side LLM keys exposed)
- RBAC enforcement (family_admin only)
- Manual review required before database save
- Persistent compliance disclaimer
- Audit trail via `createdBy` and `createdAt` fields

### 2.6 Appointments Endpoints

| Endpoint | Method | Auth | Purpose | RBAC |
|----------|--------|------|---------|------|
| `appointments.list` | Query | Protected | List all appointments | All roles |
| `appointments.getById` | Query | Protected | Get appointment details | All roles |
| `appointments.create` | Mutation | Protected | Schedule new appointment | family_admin only |
| `appointments.update` | Mutation | Protected | Update appointment | family_admin only |
| `appointments.delete` | Mutation | Protected | Cancel appointment | family_admin only |

### 2.7 Care Logistics Endpoints

| Endpoint | Method | Auth | Purpose | RBAC |
|----------|--------|------|---------|------|
| `careLogistics.list` | Query | Protected | List all shifts | All roles |
| `careLogistics.getById` | Query | Protected | Get shift details | All roles |
| `careLogistics.create` | Mutation | Protected | Schedule new shift | family_admin only |
| `careLogistics.update` | Mutation | Protected | Update shift details | family_admin only |
| `careLogistics.delete` | Mutation | Protected | Cancel shift | family_admin only |

**Total Endpoints**: 23 procedures (6 queries, 17 mutations)

---

## 3. Technology Stack

### 3.1 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19.2.1 | UI component library |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Styling** | Tailwind CSS | 4.1.14 | Utility-first CSS framework |
| **Build Tool** | Vite | 7.1.7 | Fast development server & bundler |
| **UI Components** | shadcn/ui | Latest | Pre-built accessible components |
| **State Management** | tRPC React Query | 5.90.2 | Server state management |
| **Router** | Wouter | 3.3.5 | Lightweight client-side routing |
| **Icons** | Lucide React | 0.453.0 | SVG icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |
| **Markdown** | Streamdown | 1.4.0 | Markdown rendering |

### 3.2 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 22.13.0 | JavaScript runtime |
| **Framework** | Express | 4.21.2 | HTTP server framework |
| **RPC Framework** | tRPC | 11.6.0 | Type-safe RPC procedures |
| **ORM** | Drizzle | 0.44.5 | Type-safe SQL query builder |
| **Database Driver** | MySQL2 | 3.15.0 | MySQL protocol client |
| **Validation** | Zod | 4.1.12 | Schema validation |
| **Auth** | Jose | 6.1.0 | JWT signing/verification |
| **Serialization** | SuperJSON | 1.13.3 | Enhanced JSON serialization |

### 3.3 Database

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | MySQL / TiDB | Relational database (Manus platform managed) |
| **Migrations** | Drizzle Kit | Schema version control |
| **Connection Pool** | MySQL2 | Connection management |

### 3.4 AI/LLM Integration (Seer Engine)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Vision LLM** | Manus Built-in API | OCR and structured data extraction |
| **Image Processing** | Canvas API | Base64 image capture from camera |
| **Response Format** | JSON Schema | Structured medication data extraction |

### 3.5 Authentication

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **OAuth Provider** | Manus OAuth | SSO (Google/Apple) |
| **Session Management** | HTTP Cookies | Secure session storage |
| **JWT Signing** | Jose | Session token generation |

### 3.6 Deployment

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Platform** | Manus | Managed hosting with auto-scaling |
| **Build** | esbuild | Production bundle optimization |
| **Package Manager** | pnpm | Fast, efficient dependency management |

---

## 4. Visual Design (v1.1 - Familial Warmth Aesthetic)

### 4.1 Color Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Background** | Warm Beige | #FFFBF0 | Page backgrounds, main surface |
| **Primary** | Teal | #0D9488 | Buttons, links, headings, interactive elements |
| **Accent** | Coral | #F87171 | Icons, alerts, delete actions, warnings |
| **Sidebar** | Warm Gradient | #FFFBF0 → #F5E6D3 | Desktop navigation background |
| **Text Primary** | Dark Slate | #1F2937 | Body text, labels |
| **Text Secondary** | Medium Slate | #6B7280 | Descriptions, metadata |
| **Borders** | Light Beige | #E5D4C1 | Card borders, dividers |
| **Hover States** | Dark Teal | #0F766E | Button hover, interactive feedback |

### 4.2 Typography

| Element | Font | Size | Weight | Usage |
|---------|------|------|--------|-------|
| **Headings (H1-H3)** | Playfair Display | 24-32px | 700 (Bold) | Page titles, section headers |
| **Body Text** | Inter | 14-16px | 400 (Regular) | Content, descriptions, labels |
| **Metadata** | Inter | 12-14px | 500 (Medium) | Timestamps, secondary info |
| **Buttons** | Inter | 14px | 600 (Semibold) | Call-to-action text |

**Font Import**: Google Fonts (Playfair Display + Inter)

### 4.3 Component Styling

| Component | Border Radius | Effect | Purpose |
|-----------|---------------|--------|---------|
| **Cards** | 32px (2rem) | Soft shadow | Medication, appointment, shift cards |
| **Buttons** | 32px (2rem) | Hover color shift | All interactive buttons |
| **Input Fields** | 32px (2rem) | Focus ring | Form inputs, text areas |
| **Dialogs** | 32px (2rem) | Backdrop blur | Modal overlays |
| **Bottom Nav (Mobile)** | 16px top | Glassmorphism + backdrop-blur | Mobile navigation bar |

### 4.4 Glassmorphism Effect

**Mobile Bottom Navigation**:
- `backdrop-filter: blur(10px)`
- `background: rgba(255, 251, 240, 0.8)`
- `border-top: 1px solid rgba(13, 148, 136, 0.1)`
- Creates frosted glass appearance on mobile devices

### 4.5 Responsive Design

| Breakpoint | Layout | Navigation | Touch Targets |
|------------|--------|-----------|----------------|
| **Mobile** (<768px) | Single column | Bottom nav bar (glassmorphism) | 44px minimum |
| **Tablet** (768-1024px) | 2 columns | Sidebar (collapsible) | 44px minimum |
| **Desktop** (>1024px) | 2-3 columns | Persistent sidebar | 44px minimum |

---

## 5. Authentication & Authorization Flow

### 5.1 SSO Authentication (Google/Apple)

```
User → Click "Sign In" → Manus OAuth Portal
                             ↓
                    Google/Apple Login
                             ↓
                    OAuth Callback → Session Cookie
                             ↓
                    Redirect to Onboarding
```

### 5.2 Onboarding Flow

```
Authenticated User → Onboarding Page
                          ↓
                   Create Hub OR Join Hub
                          ↓
                   Hub Created/Joined
                          ↓
                   Redirect to Dashboard
```

### 5.3 RBAC Authorization

```
User Request → Check Hub Membership
                     ↓
              Get User Role in Hub
                     ↓
         family_admin? → Full Access
         family_viewer? → Read-Only
         caregiver? → Read-Only
         None? → FORBIDDEN
```

### 5.4 Seer Engine Authorization

```
User Clicks "Scan Label" → Check if family_admin
                                ↓
                        family_admin? → Allow Camera
                        Other roles? → Disabled Button
                                ↓
                        Capture Image
                                ↓
                        Send to Backend
                                ↓
                        Backend: Verify family_admin
                                ↓
                        Call Vision LLM
                                ↓
                        Return Extracted Data
                                ↓
                        User Reviews & Confirms
                                ↓
                        Save to Database
```

---

## 6. Security Considerations

### 6.1 Database Security

- **Row-Level Security (RLS)**: Enforced at database layer (TiDB)
- **Foreign Key Constraints**: Prevent orphaned records
- **Unique Indexes**: Prevent duplicate hub memberships
- **Audit Trail**: `createdBy` and `createdAt` on all records
- **Soft Deletes**: Medications archived via `isActive` flag

### 6.2 Application Security

- **RBAC Enforcement**: Every mutation checks user role
- **Input Validation**: Zod schemas on all endpoints
- **Error Handling**: No sensitive data in error messages
- **Session Management**: HTTP-only cookies with JWT signing
- **CORS**: Configured for Manus platform

### 6.3 Seer Engine Security

- **Server-Side Processing**: Vision LLM called from backend only
- **No Client-Side Keys**: API keys never exposed to frontend
- **Base64 Encoding**: Images transmitted securely over HTTPS
- **RBAC Gating**: Only family_admin can scan
- **Manual Review**: User must confirm before database save
- **Compliance Disclaimer**: Persistent warning about verification

### 6.4 Data Privacy

- **Patient Hub Isolation**: Each hub is completely isolated
- **User Isolation**: Users only see hubs they're members of
- **No Cross-Hub Access**: Database constraints prevent data leakage
- **Audit Logging**: All changes tracked via `createdBy` and timestamps

---

## 7. Performance Optimization

### 7.1 Frontend Optimization

- **Code Splitting**: Lazy-loaded page components via Wouter
- **Image Optimization**: Base64 encoding for camera captures
- **Caching**: tRPC React Query with stale-while-revalidate
- **Responsive Images**: Mobile-first CSS with Tailwind breakpoints
- **Skeleton Screens**: Loading states during data fetch

### 7.2 Backend Optimization

- **Database Indexes**: On `hubId`, `userId`, `createdBy` fields
- **Query Optimization**: Drizzle ORM generates efficient SQL
- **Connection Pooling**: MySQL2 manages connection reuse
- **Error Handling**: Early returns to prevent unnecessary processing
- **Caching**: Session cookies reduce auth overhead

### 7.3 Seer Engine Optimization

- **Async Processing**: Vision LLM calls don't block UI
- **Base64 Compression**: Images optimized before transmission
- **Structured Output**: JSON schema ensures consistent response format
- **Error Recovery**: User can retry scan if extraction fails

---

## 8. Deployment Architecture

### 8.1 Manus Platform Deployment

```
┌─────────────────────────────────────────────┐
│         Manus Managed Platform              │
├─────────────────────────────────────────────┤
│  Frontend (React/Vite)                      │
│  ├─ Client-side routing                     │
│  ├─ tRPC client binding                     │
│  └─ Responsive UI (mobile/desktop)          │
├─────────────────────────────────────────────┤
│  Backend (Node.js/Express)                  │
│  ├─ tRPC server                             │
│  ├─ OAuth integration                       │
│  ├─ Vision LLM integration                  │
│  └─ Database connection pool                │
├─────────────────────────────────────────────┤
│  Database (MySQL/TiDB)                      │
│  ├─ 7 tables with RLS policies              │
│  ├─ Automatic backups                       │
│  └─ Connection pooling                      │
├─────────────────────────────────────────────┤
│  External Services                          │
│  ├─ Manus OAuth (Google/Apple SSO)          │
│  ├─ Vision LLM (Seer Engine)                │
│  └─ S3 Storage (optional for media)         │
└─────────────────────────────────────────────┘
```

### 8.2 Environment Variables

**Required**:
- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Session signing key
- `VITE_APP_ID`: Manus OAuth application ID
- `OAUTH_SERVER_URL`: Manus OAuth backend
- `VITE_OAUTH_PORTAL_URL`: Manus login portal
- `BUILT_IN_FORGE_API_KEY`: Vision LLM API key
- `BUILT_IN_FORGE_API_URL`: Vision LLM endpoint

**Optional**:
- `NODE_ENV`: development/production
- `PORT`: Server port (default: 3000)

---

## 9. Known Limitations & Future Enhancements

### 9.1 Current Limitations

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| Appointment calendar view | Placeholder only | Use list view for now |
| Medication reminders | Not implemented | Manual checking required |
| Audit logging | Basic (createdBy/timestamp) | Enhanced logging in v1.2 |
| Notification system | Not implemented | Email notifications in v1.2 |
| File attachments | Not supported | Links in notes fields |
| Recurring appointments | Not supported | Manual entry for each date |

### 9.2 Recommended Enhancements

1. **Full Calendar View**: Implement appointment calendar with drag-and-drop
2. **Medication Reminders**: Push notifications for medication times
3. **Audit Logging**: Detailed change history for compliance
4. **Notification System**: In-app and email alerts for hub events
5. **File Attachments**: Upload medical documents and lab results
6. **Recurring Appointments**: Template-based appointment scheduling
7. **Mobile App**: Native iOS/Android apps for better UX
8. **Advanced Analytics**: Medication adherence tracking and reporting
9. **Integration APIs**: HL7/FHIR for EHR integration
10. **Multi-Language Support**: Localization for global deployment

---

## 10. Troubleshooting Guide

### 10.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Camera not working | Browser permissions | Grant camera access in settings |
| OCR extraction fails | Poor image quality | Ensure good lighting on label |
| RBAC error (FORBIDDEN) | User not family_admin | Contact hub admin to change role |
| Session expired | Cookie cleared | Re-login via SSO |
| Database connection error | Network issue | Check DATABASE_URL and connectivity |
| Vision LLM timeout | Service unavailable | Retry after 30 seconds |

### 10.2 Debug Mode

Enable debug logging:
```bash
NODE_ENV=development pnpm dev
```

Check logs:
- Frontend: Browser DevTools Console
- Backend: Terminal output from `pnpm dev`
- Database: MySQL query logs

### 10.3 Support Resources

- **System Architecture**: This document
- **Seer Engine Guide**: `SEER_ENGINE_INTEGRATION_GUIDE.md`
- **API Documentation**: tRPC router code in `server/routers.ts`
- **Database Schema**: Drizzle schema in `drizzle/schema.ts`

---

## 11. Compliance & Regulatory Notes

### 11.1 Medical Disclaimer

Kinto is a **logistics and coordination tool**, not a medical device. It does not provide medical advice or replace professional healthcare guidance.

**Seer Engine Compliance**:
- Persistent disclaimer: "Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional."
- Manual review required before any data is saved
- No automatic medication administration or dosing recommendations
- User responsible for accuracy of all medication information

### 11.2 Data Privacy

- HIPAA considerations: Ensure compliance with healthcare data regulations
- GDPR compliance: User data deletion on hub removal
- Data retention: Soft deletes preserve audit trail
- Encryption: HTTPS for all data transmission

### 11.3 Accessibility

- WCAG 2.1 Level AA compliance target
- 44px minimum touch targets for mobile
- High-contrast color palette for readability
- Keyboard navigation support
- Screen reader compatible components

---

## 12. Quick Reference

### 12.1 Key Files

| File | Purpose |
|------|---------|
| `drizzle/schema.ts` | Database schema definition |
| `server/routers.ts` | tRPC procedure definitions |
| `server/db.ts` | Database query helpers |
| `client/src/App.tsx` | Main app routing |
| `client/src/pages/Dashboard.tsx` | Hub dashboard |
| `client/src/pages/Medications.tsx` | Medications module (Seer Engine ready) |
| `client/src/components/ResponsiveNav.tsx` | Navigation component |
| `client/src/index.css` | Global theme and styles |

### 12.2 Database Queries

**List all medications for a hub**:
```sql
SELECT * FROM medications WHERE hubId = ? AND isActive = true;
```

**Get user's hubs**:
```sql
SELECT ph.* FROM patient_hubs ph
JOIN hub_members hm ON ph.id = hm.hubId
WHERE hm.userId = ?;
```

**Check user role in hub**:
```sql
SELECT role FROM hub_members WHERE hubId = ? AND userId = ?;
```

### 12.3 Common tRPC Calls

**Create medication**:
```typescript
await trpc.medications.create.mutate({
  hubId: "hub-123",
  name: "Lisinopril",
  dosage: "10mg",
  frequency: "Once daily",
  instructions: "Take in morning"
});
```

**Scan medication label (Seer Engine)**:
```typescript
await trpc.medications.extractFromImage.mutate({
  hubId: "hub-123",
  imageBase64: "data:image/jpeg;base64,..."
});
```

**List medications**:
```typescript
const medications = await trpc.medications.list.query({ hubId: "hub-123" });
```

---

## 13. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 2026 | Initial release with core features |
| 1.1 | April 2026 | Seer Engine (OCR), Familial Warmth design, enhanced compliance |

---

**Document Maintained By**: Kinto Development Team  
**Last Updated**: April 15, 2026  
**Status**: Production Ready (Beta)
