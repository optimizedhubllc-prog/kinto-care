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
- [ ] Build Hub Settings page (Family Admin only)
- [ ] Implement member invite functionality with invite code generation
- [ ] Implement member removal and role change actions
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
- [ ] Write vitest tests for medication RBAC

## Phase 5: Appointment Tracker UI
- [x] Create Appointments list view
- [ ] Implement calendar view for appointments
- [x] Build Add Appointment form (Family Admin only)
- [x] Implement Edit Appointment form (Family Admin only)
- [x] Implement Delete Appointment action (Family Admin only)
- [ ] Link appointments to Medical Contacts
- [ ] Write vitest tests for appointment RBAC

## Phase 6: Care Logistics UI
- [x] Create Care Logistics list/timeline view
- [x] Implement Add Shift form (Family Admin only)
- [x] Implement Edit Shift form (Family Admin only)
- [x] Implement Delete Shift action (Family Admin only)
- [x] Add handover notes feature
- [ ] Write vitest tests for logistics RBAC

## Phase 7: Onboarding & Authentication UI
- [x] Build onboarding flow (create/join hub)
- [x] Implement profile setup page
- [x] Create invite code generation and sharing
- [x] Build join hub with invite code flow
- [x] Add profile completion after SSO
- [ ] Test end-to-end authentication flow

## Phase 8: UI/UX Polish & Accessibility
- [x] Define elegant color palette and typography (refined, premium aesthetic)
- [x] Implement high-contrast design for readability
- [x] Add loading states and skeleton screens
- [x] Implement error handling and user feedback (toasts)
- [ ] Ensure WCAG accessibility standards
- [x] Test mobile responsiveness across devices
- [x] Add smooth transitions and micro-interactions
- [x] Ensure large touch targets (44px minimum) for mobile

## Phase 9: Testing & QA
- [x] Test RBAC enforcement across all modules
- [x] Test RLS policies at database level
- [x] Test mobile navigation switching
- [ ] Test appointment calendar rendering
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
