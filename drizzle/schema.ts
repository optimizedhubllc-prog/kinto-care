import {
  pgTable, pgEnum, text, varchar, boolean,
  timestamp, date, uuid, integer, jsonb, uniqueIndex
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Enums
// ============================================================================
export const userRoleEnum = pgEnum("user_role", [
  "user", "admin", "family_admin", "family_member", "caregiver",
]);
export const hubMemberRoleEnum = pgEnum("hub_member_role", [
  "family_admin", "family_viewer", "caregiver",
]);
export const webhookStatusEnum = pgEnum("webhook_status", [
  "pending", "delivered", "failed",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed"]);

// ============================================================================
// Users — anchored to Supabase auth.users UUID
// ============================================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // FK to auth.users(id)
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: userRoleEnum("role").default("user").notNull(),
  languagePreference: varchar("language_preference", { length: 5 }).default("en").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// Patient Hubs
// ============================================================================
export const patientHubs = pgTable("patient_hubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientName: text("patient_name").notNull(),
  patientDob: date("patient_dob"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type PatientHub = typeof patientHubs.$inferSelect;
export type InsertPatientHub = typeof patientHubs.$inferInsert;

// ============================================================================
// Hub Members
// ============================================================================
export const hubMembers = pgTable("hub_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: hubMemberRoleEnum("role").default("family_viewer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniqueHubUser: uniqueIndex("unique_hub_user").on(t.hubId, t.userId) }));
export type HubMember = typeof hubMembers.$inferSelect;
export type InsertHubMember = typeof hubMembers.$inferInsert;

// ============================================================================
// Hub Invites — token-based, redeemed via the redeem_invite() Postgres RPC
// ============================================================================
export const hubInvites = pgTable("hub_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  role: hubMemberRoleEnum("role").default("family_viewer").notNull(),
  token: text("token").notNull(),
  invitedEmail: varchar("invited_email", { length: 320 }),
  createdBy: uuid("created_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  redeemedBy: uuid("redeemed_by").references(() => users.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type HubInvite = typeof hubInvites.$inferSelect;
export type InsertHubInvite = typeof hubInvites.$inferInsert;

// ============================================================================
// Medical Contacts
// ============================================================================
export const medicalContacts = pgTable("medical_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  specialty: text("specialty"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type MedicalContact = typeof medicalContacts.$inferSelect;

// ============================================================================
// Medications (Seer Engine extended fields)
// ============================================================================
export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  instructions: text("instructions"),
  isActive: boolean("is_active").default(true).notNull(),
  prescriber: text("prescriber"),
  quantity: text("quantity"),
  pharmacyName: text("pharmacy_name"),
  pharmacyPhone: text("pharmacy_phone"),
  confidence: varchar("confidence", { length: 20 }).default("medium"),
  rawLabelImageUrl: text("raw_label_image_url"),
  reviewed: boolean("reviewed").default(false),
  reviewNotes: text("review_notes"),
  extractedAt: timestamp("extracted_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type Medication = typeof medications.$inferSelect;

// ============================================================================
// Appointments
// ============================================================================
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  medicalContactId: uuid("medical_contact_id").references(() => medicalContacts.id, { onDelete: "set null" }),
  doctorName: text("doctor_name"),
  specialty: text("specialty"),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  location: text("location"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type Appointment = typeof appointments.$inferSelect;

// ============================================================================
// Care Logistics
// ============================================================================
export const careLogistics = pgTable("care_logistics", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  caregiverId: uuid("caregiver_id").references(() => users.id, { onDelete: "set null" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  taskNotes: text("task_notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type CareLogistic = typeof careLogistics.$inferSelect;

// ============================================================================
// Webhook Events & Logs
// ============================================================================
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  payload: text("payload"),
  status: webhookStatusEnum("status").default("pending").notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookEventId: uuid("webhook_event_id").notNull().references(() => webhookEvents.id, { onDelete: "cascade" }),
  statusCode: integer("status_code").notNull(),
  responseMessage: text("response_message"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// Medication Audit Trail
// ============================================================================
export const medicationAuditTrail = pgTable("medication_audit_trail", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicationId: uuid("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id),
  changedBy: uuid("changed_by").references(() => users.id),
  changeType: text("change_type").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// Tasks
// ============================================================================
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  status: taskStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ============================================================================
// Contacts (International Routing)
// ============================================================================
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  countryCode: varchar("country_code", { length: 2 }).default("US").notNull(),
  languagePreference: varchar("language_preference", { length: 5 }).default("en").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type Contact = typeof contacts.$inferSelect;

// ============================================================================
// API Keys (for n8n)
// ============================================================================
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").notNull().references(() => patientHubs.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  permissions: varchar("permissions", { length: 255 }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;

// ============================================================================
// Relations
// ============================================================================
export const patientHubsRelations = relations(patientHubs, ({ many, one }) => ({
  members: many(hubMembers),
  medications: many(medications),
  appointments: many(appointments),
  careLogistics: many(careLogistics),
  medicalContacts: many(medicalContacts),
  webhookEvents: many(webhookEvents),
  tasks: many(tasks),
  contacts: many(contacts),
  creator: one(users, { fields: [patientHubs.createdBy], references: [users.id] }),
}));

export const hubMembersRelations = relations(hubMembers, ({ one }) => ({
  hub: one(patientHubs, { fields: [hubMembers.hubId], references: [patientHubs.id] }),
  user: one(users, { fields: [hubMembers.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  hub: one(patientHubs, { fields: [tasks.hubId], references: [patientHubs.id] }),
  assignee: one(users, { fields: [tasks.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [tasks.createdBy], references: [users.id] }),
}));
