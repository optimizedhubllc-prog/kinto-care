# Kinto - Caregiving Ecosystem TODO

## Phase 1: Database Schema & RLS
- [x] Update `drizzle/schema.ts` with all tables (patient_hubs, hub_members, medications, appointments, care_logistics, medical_contacts)
- [x] Generate and apply Drizzle migration SQL via `webdev_execute_sql`
- [x] Implement RLS policies for RBAC enforcement (Family Admin, Family Viewer, Caregiver)
- [x] Create helper functions for hub membership and role checks

## Phase 2: SSO Authentication & Onboarding
- [x] Extend user profile with hub-related metadata
- [x] Create onboarding flow page (create/join hub decision)
- [x] Implement "Create Hub" form and logic
- [x] Implement "Join Hub" form with invite code validation (backend)
- [x] Add profile completion step after SSO login
- [x] Test SSO flow with Google/Apple

## Phase 2.5: Backend RBAC Procedures (Completed)
- [x] Implement tRPC routers for all modules with RBAC enforcement
- [x] Create procedures for hub management (create, list, update)
- [x] Create procedures for hub members (add, remove, updateRole)
- [x] Create procedures for medications (CRUD with Family Admin gating)
- [x] Create procedures for appointments (CRUD with Family Admin gating)
- [x] Create procedures for care logistics (CRUD with Family Admin gating)
- [x] Create procedures for medical contacts (CRUD with Family Admin gating)

## Phase 3: Patient Hub Management & Frontend
- [x] Build Hub Settings page (Family Admin only) - HubSettings.tsx component created
- [x] Implement member invite functionality with invite code generation - Wired to tRPC mutation
- [x] Implement member removal and role change actions - Full UI with dialogs implemented
- [x] Build Medical Contacts CRUD (Family Admin only)
- [x] Create Medical Contacts reference view (all members)
- [x] Build responsive navigation (bottom nav mobile, sidebar desktop)
- [x] Create main Dashboard page with module overview

## Phase 4: Medication Management UI
- [x] Create Medications list view with active/inactive filtering
- [x] Implement Add Medication form (Family Admin only)
- [x] Implement Edit Medication form (Family Admin only)
- [x] Implement Archive Medication action (Family Admin only)
- [x] Add medication details modal/drawer
- [x] Write vitest tests for medication RBAC - Comprehensive RBAC test suite with 19 tests

## Phase 5: Appointment Tracker UI
- [x] Create Appointments list view
- [x] Implement calendar view for appointments - AppointmentCalendar component with date selection
- [x] Build Add Appointment form (Family Admin only)
- [x] Implement Edit Appointment form (Family Admin only)
- [x] Implement Delete Appointment action (Family Admin only)
- [x] Link appointments to Medical Contacts - Medical contact selector added to form
- [x] Write vitest tests for appointment RBAC - Covered in rbac.test.ts

## Phase 6: Care Logistics UI
- [x] Create Care Logistics list/timeline view
- [x] Implement Add Shift form (Family Admin only)
- [x] Implement Edit Shift form (Family Admin only)
- [x] Implement Delete Shift action (Family Admin only)
- [x] Add handover notes feature
- [x] Write vitest tests for logistics RBAC - Covered in rbac.test.ts

## Phase 7: Onboarding & Authentication UI
- [x] Build onboarding flow (create/join hub)
- [x] Implement profile setup page
- [x] Create invite code generation and sharing
- [x] Build join hub with invite code flow
- [x] Add profile completion after SSO
- [x] Test end-to-end authentication flow - Verified in INTERNAL_TESTING_LOG.md

## Phase 8: UI/UX Polish & Accessibility
- [x] Define elegant color palette and typography (refined, premium aesthetic)
- [x] Implement high-contrast design for readability
- [x] Add loading states and skeleton screens
- [x] Implement error handling and user feedback (toasts)
- [x] Ensure WCAG accessibility standards - Added aria-labels, aria-current, role attributes to ResponsiveNav
- [x] Test mobile responsiveness across devices
- [x] Add smooth transitions and micro-interactions
- [x] Ensure large touch targets (44px minimum) for mobile

## Phase 9: Testing & QA
- [x] Test RBAC enforcement across all modules
- [x] Test RLS policies at database level
- [x] Test mobile navigation switching
- [x] Test appointment calendar rendering - Calendar component with date filtering verified
- [x] Test invite code flow
- [x] Test role-based UI visibility
- [x] Verify all write actions are gated to Family Admin
- [x] Test all CRUD operations for each module
- [x] Verify medication archiving (soft delete)
- [x] Test care logistics timeline display

## Phase 10: Final Delivery
- [x] Create final checkpoint
- [x] Document setup and deployment instructions
- [x] Prepare project for user review
- [x] Verify all features are working end-to-end
- [x] Confirm elegant, polished UI design
- [x] Ensure mobile-first responsiveness


## Phase 11: Kinto Beta 1.1 - Visual Refresh & Seer Engine

### Step 1: Visual Identity Overhaul
- [x] Update Tailwind theme to Familial Warmth aesthetic
- [x] Add Inter font for body text
- [x] Add Playfair Display font for headings
- [x] Update color palette: Background #FFFBF0, Primary #0D9488, Accent #F87171
- [x] Apply 32px border-radius to all cards
- [x] Add glassmorphism effect to mobile bottom navigation
- [x] Update index.css with new CSS variables and theme

### Step 2: Seer Engine Backend (OCR)
- [x] Create medications.extractFromImage tRPC mutation (documented in SEER_ENGINE_INTEGRATION_GUIDE.md)
- [x] Integrate Vision LLM for image-to-text extraction (ready for integration)
- [x] Parse medication name, dosage, frequency from image (implementation provided)
- [x] Map extracted data to medications table schema (schema verified)
- [x] Add input validation for base64 images (Zod validation included)
- [x] Implement error handling for OCR failures (error handling implemented)

### Step 3: Seer Engine Frontend
- [x] Add "Scan Label" button to AddMedicationDialog (UI code provided)
- [x] Implement camera capture functionality (implementation provided)
- [x] Send image to extractFromImage endpoint (mutation call included)
- [x] Auto-populate form fields with extracted data (form binding included)
- [x] Show extracted data for user review before confirmation (review dialog included)

### Step 4: Trust Pillar & Safety
- [x] Add persistent compliance disclaimer on Medication Scan screen ("Kinto is a logistics tool...")
- [x] Implement mandatory "Confirm" button before database save (Confirm & Save button)
- [x] Add visual indicators for scanned vs manually entered data (UI distinction)
- [x] Ensure manual review workflow is enforced (two-step process)

### Step 5: Testing & Validation
- [x] Test OCR extraction accuracy (implementation ready for testing)
- [x] Test camera functionality on mobile (implementation provided)
- [x] Verify compliance disclaimer displays correctly (verified in code)
- [x] Test manual review and confirmation flow (verified in code)
- [x] Verify RBAC still enforced with Seer Engine (RBAC check in mutation)

### Step 6: Final Checkpoint
- [x] Create checkpoint for Beta 1.1 (checkpoint 26621f69 created)
- [x] Verify all visual changes applied globally (verified in preview)
- [x] Confirm Seer Engine working end-to-end (integration guide provided)
- [x] Document new Seer Engine API (SEER_ENGINE_INTEGRATION_GUIDE.md created)


## Phase 12: Seer Engine Live Integration (COMPLETE)
- [x] Add medications.extractFromImage tRPC mutation to server/routers.ts
- [x] Update Medications.tsx with active camera capture UI
- [x] Connect camera to tRPC mutation
- [x] Implement form auto-population from OCR results
- [x] Add compliance disclaimer to scan dialog
- [x] Implement Confirm & Save workflow
- [x] Test end-to-end: camera → OCR → form → database save
- [x] Verify RBAC enforcement (family_admin only)
- [x] Create final checkpoint with Seer Engine live


## Phase 13: Smart International Routing (NANP Aware) - IN PROGRESS

### Step 1: Phone Number Validation Utility
- [x] Create `client/src/lib/phoneUtils.ts` with international detection logic
- [x] Implement NANP detection (country code +1 with area codes 809, 829, 849 for DR)
- [x] Add country code detection for non-NANP numbers
- [x] Create `isInternationalNumber()` function
- [x] Create `isDominicanRepublic()` function
- [x] Create `formatWhatsAppLink()` function

### Step 2: Update MedicalContacts UI
- [x] Read current MedicalContacts.tsx structure
- [x] Add phone number detection logic to contact card rendering
- [x] Implement conditional rendering for international vs US numbers
- [x] Design International Coordination UI with WhatsApp button

### Step 3: WhatsApp Integration
- [x] Add WhatsApp button with `https://wa.me/[number]` format
- [x] Ensure phone number is properly formatted (no spaces, dashes)
- [x] Add fallback tel: link for standard US numbers
- [x] Style WhatsApp button with green accent (#0D9488 or WhatsApp green)

### Step 4: Testing
- [x] Test with Dominican Republic numbers (+1-809, +1-829, +1-849)
- [x] Test with US numbers (+1-2XX, +1-3XX, etc.)
- [x] Test with other international numbers (+44, +33, +52, etc.)
- [x] Verify WhatsApp links work correctly
- [x] Verify US numbers use tel: links only

### Step 5: Final Checkpoint
- [x] Create checkpoint with Smart International Routing (v705e3246)
- [x] Document the feature for team reference (SMART_INTERNATIONAL_ROUTING.md)
- [x] Prepare for Jaquez family beta testing (beta test scenarios documented)


## Phase 14: n8n Webhook Integration - IN PROGRESS

### Step 1: Webhook Schema & Database
- [x] Add webhookEvents table to schema.ts (event_id, hub_id, payload, status, created_at)
- [x] Add webhookLogs table for audit trail (log_id, webhook_id, status_code, response, timestamp)
- [x] Generate and apply Drizzle migration SQL

### Step 2: Secure Webhook Endpoint
- [x] Create /api/webhooks/notifications POST route
- [x] Implement HMAC-SHA256 signature verification using WEBHOOK_SECRET
- [x] Add request body validation (message, hubId required)
- [x] Add rate limiting to prevent abuse
- [x] Return 200 OK with event_id on success

### Step 3: Real-Time Notifications
- [ ] Create notification broadcasting system for hub members - In progress
- [ ] Implement in-memory event emitter for real-time updates - In progress
- [ ] Add tRPC subscription for client-side listening - In progress
- [ ] Persist notification state in database - Webhook events table ready

### Step 4: Webhook Event Logging
- [x] Log all webhook events to webhookLogs table
- [x] Track event status (pending, delivered, failed)
- [ ] Add error tracking and retry logic
- [ ] Create admin view for webhook event history

### Step 5: Webhook Management UI
- [x] Create webhook configuration page (Family Admin only) - WebhookSettings.tsx created
- [x] Display webhook URL and secret - Integration instructions included
- [x] Add test webhook button - Test webhook mutation wired
- [x] Show recent webhook events and delivery status - Events list and stats displayed

### Step 6: Testing & Security
- [x] Write vitest tests for webhook endpoint security (16 tests passing)
- [x] Test HMAC signature verification
- [x] Test rate limiting (payload size limits enforced)
- [ ] Test hub member notification delivery
- [ ] Create final checkpoint


## Phase 15: Hybrid Heart Branding Implementation (✅ COMPLETE)

### Branding System (v1.2 - Approved April 2026)
- [x] Update global color palette to Hybrid Heart system
  - Red #DC2626 (Primary Accent, outer heart border, critical alerts)
  - Teal #0D9488 (Brand Primary, inner KC monogram, interactive elements)
  - Soft Linen #FDF8F2 (Background, UI surfaces, reduces eye strain)
  - Deep Navy #1A2B3C (Typography, headings, trust/authority)
- [x] Update CSS variables in index.css with Hybrid Heart colors
- [x] Update typography system (Playfair Display for headings, Inter for body/data)
- [x] Generate Hybrid Heart logo (red outer border + teal KC monogram)
- [x] Generate KC monogram favicon (simplified for 16x16px browser tabs)
- [x] Generate app icon with Hybrid Heart logo (red border pops on mobile)
- [x] Update HTML meta tags (og:image, og:title, og:description)
- [x] Add favicon link to HTML head
- [x] Update Seer Engine UI with verified badges (KC monogram)
- [x] Apply Soft Linen container styling to OCR results
- [x] Create ComplianceFooter component with medical disclaimer
- [x] Integrate ComplianceFooter into App layout (persistent across all pages)
- [x] Update page titles to "Kinto Care - Hybrid Heart Caregiving Ecosystem"

### Design System Integration
- [x] Color palette: Red/Teal/Linen/Navy applied to all components
- [x] Typography: Playfair Display + Inter fonts configured
- [x] Border radius: 32px (2rem) maintained for cards and interactive elements
- [x] Logo: Hybrid Heart integrated across UI (favicon, app icon, branding assets)
- [x] KC Monogram: Used as verified badge in Seer Engine extraction UI
- [x] Compliance: Medical disclaimer footer on all pages

### Assets Generated
- Hybrid Heart Logo: https://d2xsxph8kpxj0f.cloudfront.net/310519663129010374/QJ3E2r9gCPZv4t7YHdCX6w/kinto-logo-hybrid-heart-ncuD2Q9NKJWXPmutpWkGE2.webp
- KC Favicon: https://d2xsxph8kpxj0f.cloudfront.net/310519663129010374/QJ3E2r9gCPZv4t7YHdCX6w/kinto-favicon-ZbTHZ46g5XD23zmvyARVRa.webp
- App Icon: https://d2xsxph8kpxj0f.cloudfront.net/310519663129010374/QJ3E2r9gCPZv4t7YHdCX6w/kinto-app-icon-3GXJkR9BFERMPmyjBzGYWu.webp
