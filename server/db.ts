import { eq, and, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  patientHubs,
  hubMembers,
  medications,
  appointments,
  careLogistics,
  medicalContacts,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// KINTO: Hub & RBAC Queries
// ============================================================================

/**
 * Get all hubs a user is a member of.
 */
export async function getUserHubs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      hub: patientHubs,
      role: hubMembers.role,
    })
    .from(hubMembers)
    .innerJoin(patientHubs, eq(hubMembers.hubId, patientHubs.id))
    .where(eq(hubMembers.userId, userId));
}

/**
 * Get a specific hub with all members.
 */
export async function getHubWithMembers(hubId: string) {
  const db = await getDb();
  if (!db) return null;

  const hub = await db
    .select()
    .from(patientHubs)
    .where(eq(patientHubs.id, hubId))
    .limit(1);

  if (hub.length === 0) return null;

  const members = await db
    .select()
    .from(hubMembers)
    .where(eq(hubMembers.hubId, hubId));

  return {
    ...hub[0],
    members,
  };
}

/**
 * Get user's role in a specific hub.
 */
export async function getUserRoleInHub(userId: number, hubId: string) {
  const db = await getDb();
  if (!db) return null;

  const membership = await db
    .select({ role: hubMembers.role })
    .from(hubMembers)
    .where(and(eq(hubMembers.userId, userId), eq(hubMembers.hubId, hubId)))
    .limit(1);

  return membership.length > 0 ? membership[0].role : null;
}

/**
 * Check if user is a Family Admin in a hub.
 */
export async function isUserFamilyAdmin(userId: number, hubId: string): Promise<boolean> {
  const role = await getUserRoleInHub(userId, hubId);
  return role === "family_admin";
}

/**
 * Add a member to a hub.
 */
export async function addHubMember(
  hubId: string,
  userId: number,
  role: "family_admin" | "family_viewer" | "caregiver"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(hubMembers).values({
    hubId,
    userId,
    role,
  });
}

/**
 * Update a member's role in a hub.
 */
export async function updateHubMemberRole(
  hubId: string,
  userId: number,
  newRole: "family_admin" | "family_viewer" | "caregiver"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(hubMembers)
    .set({ role: newRole })
    .where(and(eq(hubMembers.hubId, hubId), eq(hubMembers.userId, userId)));
}

/**
 * Remove a member from a hub.
 */
export async function removeHubMember(hubId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(hubMembers)
    .where(and(eq(hubMembers.hubId, hubId), eq(hubMembers.userId, userId)));
}

// ============================================================================
// KINTO: Medications Queries
// ============================================================================

/**
 * Get all medications for a hub.
 */
export async function getHubMedications(hubId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(medications)
    .where(eq(medications.hubId, hubId))
    .orderBy(desc(medications.createdAt));
}

/**
 * Get a single medication by ID.
 */
export async function getMedicationById(medicationId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(medications)
    .where(eq(medications.id, medicationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// KINTO: Appointments Queries
// ============================================================================

/**
 * Get all appointments for a hub.
 */
export async function getHubAppointments(hubId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.hubId, hubId))
    .orderBy(asc(appointments.dateTime));
}

/**
 * Get a single appointment by ID.
 */
export async function getAppointmentById(appointmentId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// KINTO: Care Logistics Queries
// ============================================================================

/**
 * Get all care logistics for a hub.
 */
export async function getHubCareLogistics(hubId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(careLogistics)
    .where(eq(careLogistics.hubId, hubId))
    .orderBy(desc(careLogistics.startTime));
}

/**
 * Get a single care logistic entry by ID.
 */
export async function getCareLogisticById(logisticId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(careLogistics)
    .where(eq(careLogistics.id, logisticId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============================================================================
// KINTO: Medical Contacts Queries
// ============================================================================

/**
 * Get all medical contacts for a hub.
 */
export async function getHubMedicalContacts(hubId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(medicalContacts)
    .where(eq(medicalContacts.hubId, hubId))
    .orderBy(asc(medicalContacts.name));
}

/**
 * Get a single medical contact by ID.
 */
export async function getMedicalContactById(contactId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(medicalContacts)
    .where(eq(medicalContacts.id, contactId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
