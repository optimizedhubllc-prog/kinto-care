import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, datetime, boolean, uniqueIndex } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import crypto from "crypto";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  /** Email address for user notifications. Nullable for backward compatibility, unique to prevent duplicates. */
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// KINTO: Patient Hub & RBAC Tables
// ============================================================================

/**
 * Role enum for hub members.
 * - family_admin: Full access, can manage members and all data
 * - family_viewer: Read-only access to all data
 * - caregiver: Read-only access to all data
 */
export const hubMemberRoleEnum = mysqlEnum("hub_member_role", [
  "family_admin",
  "family_viewer",
  "caregiver",
]);

/**
 * Patient Hubs: The central entity representing a patient's care ecosystem.
 * Each hub has a patient name, date of birth, and is created by a Family Admin.
 */
export const patientHubs = mysqlTable("patient_hubs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  patientName: text("patient_name").notNull(),
  patientDob: date("patient_dob"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PatientHub = typeof patientHubs.$inferSelect;
export type InsertPatientHub = typeof patientHubs.$inferInsert;

/**
 * Hub Members: Links users to patient hubs with specific roles.
 * Enforces RBAC via row-level security policies.
 */
export const hubMembers = mysqlTable(
  "hub_members",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    hubId: varchar("hub_id", { length: 36 })
      .notNull()
      .references(() => patientHubs.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: hubMemberRoleEnum.default("family_viewer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    uniqueHubUser: uniqueIndex("unique_hub_user").on(table.hubId, table.userId),
  })
);

export type HubMember = typeof hubMembers.$inferSelect;
export type InsertHubMember = typeof hubMembers.$inferInsert;

/**
 * Medical Contacts: Reference database of doctors and medical professionals.
 * Managed by Family Admins, viewable by all hub members.
 */
export const medicalContacts = mysqlTable("medical_contacts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hubId: varchar("hub_id", { length: 36 })
    .notNull()
    .references(() => patientHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  specialty: text("specialty"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MedicalContact = typeof medicalContacts.$inferSelect;
export type InsertMedicalContact = typeof medicalContacts.$inferInsert;

/**
 * Medications: List of active and inactive medications for the patient.
 * Add/edit/archive restricted to Family Admins via RLS.
 */
export const medications = mysqlTable("medications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hubId: varchar("hub_id", { length: 36 })
    .notNull()
    .references(() => patientHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"), // e.g., "Twice daily", "Every 8 hours"
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

/**
 * Appointments: Doctor appointments and medical visits.
 * Can be linked to Medical Contacts. Add/edit/delete restricted to Family Admins via RLS.
 */
export const appointments = mysqlTable("appointments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hubId: varchar("hub_id", { length: 36 })
    .notNull()
    .references(() => patientHubs.id, { onDelete: "cascade" }),
  medicalContactId: varchar("medical_contact_id", { length: 36 }).references(
    () => medicalContacts.id,
    { onDelete: "set null" }
  ),
  doctorName: text("doctor_name"), // Fallback if not linked to a contact
  specialty: text("specialty"),
  dateTime: datetime("date_time").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Care Logistics: Shared scheduling log for who is caring for the patient and when.
 * Includes shift start/end times and handover notes.
 * Add/edit/delete restricted to Family Admins via RLS.
 */
export const careLogistics = mysqlTable("care_logistics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hubId: varchar("hub_id", { length: 36 })
    .notNull()
    .references(() => patientHubs.id, { onDelete: "cascade" }),
  caregiverId: int("caregiver_id").references(() => users.id, { onDelete: "set null" }),
  startTime: datetime("start_time").notNull(),
  endTime: datetime("end_time").notNull(),
  taskNotes: text("task_notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CareLogistic = typeof careLogistics.$inferSelect;
export type InsertCareLogistic = typeof careLogistics.$inferInsert;

// ============================================================================
// Relations (for type inference)
// ============================================================================

export const patientHubsRelations = relations(patientHubs, ({ many, one }) => ({
  members: many(hubMembers),
  medications: many(medications),
  appointments: many(appointments),
  careLogistics: many(careLogistics),
  medicalContacts: many(medicalContacts),
  creator: one(users, {
    fields: [patientHubs.createdBy],
    references: [users.id],
  }),
}));

export const hubMembersRelations = relations(hubMembers, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [hubMembers.hubId],
    references: [patientHubs.id],
  }),
  user: one(users, {
    fields: [hubMembers.userId],
    references: [users.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [medications.hubId],
    references: [patientHubs.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [appointments.hubId],
    references: [patientHubs.id],
  }),
  medicalContact: one(medicalContacts, {
    fields: [appointments.medicalContactId],
    references: [medicalContacts.id],
  }),
}));

export const careLogisticsRelations = relations(careLogistics, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [careLogistics.hubId],
    references: [patientHubs.id],
  }),
  caregiver: one(users, {
    fields: [careLogistics.caregiverId],
    references: [users.id],
  }),
}));

export const medicalContactsRelations = relations(medicalContacts, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [medicalContacts.hubId],
    references: [patientHubs.id],
  }),
}));

// ============================================================================
// KINTO: Webhook Integration (n8n)
// ============================================================================

/**
 * Webhook Events: Stores incoming webhook payloads from n8n.
 * Used for audit trail and event history.
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  hubId: varchar("hub_id", { length: 36 })
    .notNull()
    .references(() => patientHubs.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  payload: text("payload"),
  status: mysqlEnum("status", ["pending", "delivered", "failed"]).default("pending").notNull(),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * Webhook Logs: Audit trail for all webhook requests.
 * Tracks request/response details for debugging and compliance.
 */
export const webhookLogs = mysqlTable("webhook_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  webhookEventId: varchar("webhook_event_id", { length: 36 })
    .notNull()
    .references(() => webhookEvents.id, { onDelete: "cascade" }),
  statusCode: int("status_code").notNull(),
  responseMessage: text("response_message"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

/**
 * Webhook Relations
 */
export const webhookEventsRelations = relations(webhookEvents, ({ one, many }) => ({
  hub: one(patientHubs, {
    fields: [webhookEvents.hubId],
    references: [patientHubs.id],
  }),
  logs: many(webhookLogs),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  event: one(webhookEvents, {
    fields: [webhookLogs.webhookEventId],
    references: [webhookEvents.id],
  }),
}));


// ============================================================================
// KINTO: API Keys for External Services (n8n, webhooks, etc.)
// ============================================================================

/**
 * API Keys table for external service authentication.
 * Used by n8n and other external services to call protected endpoints.
 * Each API key is scoped to a hub and has specific permissions.
 */
export const apiKeys = mysqlTable("api_keys", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  hubId: varchar("hub_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "n8n-notifications"
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of the key
  permissions: varchar("permissions", { length: 255 }).notNull(), // Comma-separated: "users:read", "webhooks:write"
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"), // Optional expiration
  isActive: boolean("is_active").default(true).notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * API Key Relations
 */
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  hub: one(patientHubs, {
    fields: [apiKeys.hubId],
    references: [patientHubs.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));
