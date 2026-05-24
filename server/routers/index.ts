import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure, apiKeyProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { hasPermission } from "@/server/apiKeyAuth";
import {
  users, patientHubs, hubMembers, medicalContacts,
  medications, appointments, careLogistics, webhookEvents, webhookLogs, tasks, contacts, apiKeys,
} from "@/drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// RBAC Helpers
// ============================================================================
async function getUserRoleInHub(userId: string, hubId: string) {
  const membership = await db.select({ role: hubMembers.role })
    .from(hubMembers)
    .where(and(eq(hubMembers.userId, userId), eq(hubMembers.hubId, hubId)))
    .limit(1);
  return membership[0]?.role ?? null;
}

async function isUserFamilyAdmin(userId: string, hubId: string): Promise<boolean> {
  const role = await getUserRoleInHub(userId, hubId);
  return role === "family_admin";
}

// ============================================================================
// App Router
// ============================================================================
export const appRouter = router({
  // Auth
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (error) throw new TRPCError({ code: "UNAUTHORIZED", message: error.message });
        return { user: data.user };
      }),

    logout: publicProcedure.mutation(async () => {
      const supabase = await createClient();
      await supabase.auth.signOut();
      return { success: true };
    }),
  }),

  // Hubs
  hubs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.select({ hub: patientHubs, role: hubMembers.role })
        .from(hubMembers)
        .innerJoin(patientHubs, eq(hubMembers.hubId, patientHubs.id))
        .where(eq(hubMembers.userId, ctx.user.id));
    }),

    getById: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        const hub = await db.select().from(patientHubs).where(eq(patientHubs.id, input.hubId)).limit(1);
        if (!hub[0]) throw new TRPCError({ code: "NOT_FOUND" });
        const members = await db.select().from(hubMembers).where(eq(hubMembers.hubId, input.hubId));
        return { ...hub[0], members };
      }),

    create: protectedProcedure
      .input(z.object({ patientName: z.string().min(1), patientDob: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const hubId = crypto.randomUUID();
        await db.insert(patientHubs).values({
          id: hubId,
          patientName: input.patientName,
          patientDob: input.patientDob,
          createdBy: ctx.user.id,
        });
        await db.insert(hubMembers).values({ hubId, userId: ctx.user.id, role: "family_admin" });
        return { hubId };
      }),

    update: protectedProcedure
      .input(z.object({ hubId: z.string(), patientName: z.string().min(1).optional(), patientDob: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const data: Record<string, unknown> = {};
        if (input.patientName) data.patientName = input.patientName;
        if (input.patientDob) data.patientDob = input.patientDob;
        await db.update(patientHubs).set(data).where(eq(patientHubs.id, input.hubId));
        return { success: true };
      }),

    generateInviteCode: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return { inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(), hubId: input.hubId };
      }),

    joinWithCode: protectedProcedure
      .input(z.object({ inviteCode: z.string().length(6), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await db.insert(hubMembers).values({ hubId: input.hubId, userId: ctx.user.id, role: "family_viewer" });
        return { success: true, hubId: input.hubId };
      }),
  }),

  // Hub Members
  hubMembers: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(hubMembers).where(eq(hubMembers.hubId, input.hubId));
      }),

    add: protectedProcedure
      .input(z.object({ hubId: z.string(), userId: z.string(), role: z.enum(["family_admin", "family_viewer", "caregiver"]) }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.insert(hubMembers).values({ hubId: input.hubId, userId: input.userId, role: input.role });
        return { success: true };
      }),

    updateRole: protectedProcedure
      .input(z.object({ hubId: z.string(), userId: z.string(), newRole: z.enum(["family_admin", "family_viewer", "caregiver"]) }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(hubMembers).set({ role: input.newRole }).where(and(eq(hubMembers.hubId, input.hubId), eq(hubMembers.userId, input.userId)));
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ hubId: z.string(), userId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(hubMembers).where(and(eq(hubMembers.hubId, input.hubId), eq(hubMembers.userId, input.userId)));
        return { success: true };
      }),
  }),

  // Medical Contacts
  medicalContacts: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(medicalContacts).where(eq(medicalContacts.hubId, input.hubId)).orderBy(asc(medicalContacts.name));
      }),

    create: protectedProcedure
      .input(z.object({ hubId: z.string(), name: z.string().min(1), specialty: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(), address: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const id = crypto.randomUUID();
        await db.insert(medicalContacts).values({ id, ...input, createdBy: ctx.user.id });
        return { contactId: id };
      }),

    update: protectedProcedure
      .input(z.object({ contactId: z.string(), hubId: z.string(), name: z.string().optional(), specialty: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const { contactId, hubId, ...data } = input;
        await db.update(medicalContacts).set(data).where(eq(medicalContacts.id, contactId));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ contactId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(medicalContacts).where(eq(medicalContacts.id, input.contactId));
        return { success: true };
      }),
  }),

  // Medications
  medications: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(medications).where(eq(medications.hubId, input.hubId)).orderBy(desc(medications.createdAt));
      }),

    create: protectedProcedure
      .input(z.object({ hubId: z.string(), name: z.string().min(1), dosage: z.string().optional(), frequency: z.string().optional(), instructions: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const id = crypto.randomUUID();
        await db.insert(medications).values({ id, ...input, createdBy: ctx.user.id });
        return { medicationId: id };
      }),

    update: protectedProcedure
      .input(z.object({ medicationId: z.string(), hubId: z.string(), name: z.string().optional(), dosage: z.string().optional(), frequency: z.string().optional(), instructions: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const { medicationId, hubId, ...data } = input;
        await db.update(medications).set(data).where(eq(medications.id, medicationId));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ medicationId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(medications).where(eq(medications.id, input.medicationId));
        return { success: true };
      }),

    // Seer Engine — OCR medication label via Claude Vision API
    extractFromImage: protectedProcedure
      .input(z.object({ hubId: z.string(), imageBase64: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 1024,
              system: "You are a medication label OCR assistant. Extract medication information from images. Return ONLY valid JSON with fields: name (string), dosage (string), frequency (string), instructions (string). If any field cannot be determined, use null. Kinto Care is a logistics tool only — do not provide medical advice.",
              messages: [{
                role: "user",
                content: [
                  { type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.imageBase64 } },
                  { type: "text", text: "Extract the medication name, dosage, frequency, and instructions from this label. Return as JSON only." },
                ],
              }],
            }),
          });
          const data = await response.json();
          const content = data.content?.[0]?.text;
          if (!content) throw new Error("No response from Claude");
          const extracted = JSON.parse(content.replace(/```json|```/g, "").trim());
          return { name: extracted.name || "", dosage: extracted.dosage || "", frequency: extracted.frequency || "", instructions: extracted.instructions || "" };
        } catch (err) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to extract medication from image" });
        }
      }),
  }),

  // Appointments
  appointments: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(appointments).where(eq(appointments.hubId, input.hubId)).orderBy(asc(appointments.dateTime));
      }),

    create: protectedProcedure
      .input(z.object({ hubId: z.string(), medicalContactId: z.string().optional(), doctorName: z.string().optional(), specialty: z.string().optional(), dateTime: z.string(), location: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const id = crypto.randomUUID();
        await db.insert(appointments).values({ id, ...input, dateTime: new Date(input.dateTime), createdBy: ctx.user.id });
        return { appointmentId: id };
      }),

    update: protectedProcedure
      .input(z.object({ appointmentId: z.string(), hubId: z.string(), doctorName: z.string().optional(), specialty: z.string().optional(), dateTime: z.string().optional(), location: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const { appointmentId, hubId, dateTime, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (dateTime) data.dateTime = new Date(dateTime);
        await db.update(appointments).set(data).where(eq(appointments.id, appointmentId));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ appointmentId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(appointments).where(eq(appointments.id, input.appointmentId));
        return { success: true };
      }),
  }),

  // Care Logistics
  careLogistics: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(careLogistics).where(eq(careLogistics.hubId, input.hubId)).orderBy(desc(careLogistics.startTime));
      }),

    create: protectedProcedure
      .input(z.object({ hubId: z.string(), caregiverId: z.string().optional(), startTime: z.string(), endTime: z.string(), taskNotes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const id = crypto.randomUUID();
        await db.insert(careLogistics).values({ id, ...input, startTime: new Date(input.startTime), endTime: new Date(input.endTime), createdBy: ctx.user.id });
        return { logisticId: id };
      }),

    delete: protectedProcedure
      .input(z.object({ logisticId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.delete(careLogistics).where(eq(careLogistics.id, input.logisticId));
        return { success: true };
      }),
  }),

  // Users (for n8n)
  users: router({
    getByRole: protectedProcedure
      .input(z.object({ hubId: z.string(), roleFilter: z.array(z.enum(["family_admin", "family_viewer", "caregiver"])).optional() }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        const members = await db.select({ id: users.id, name: users.name, email: users.email, role: hubMembers.role })
          .from(hubMembers)
          .innerJoin(users, eq(hubMembers.userId, users.id))
          .where(eq(hubMembers.hubId, input.hubId));
        const filtered = input.roleFilter ? members.filter(m => input.roleFilter!.includes(m.role)) : members;
        return { users: filtered.filter(m => m.email) };
      }),

    getByRoleWithApiKey: apiKeyProcedure
      .input(z.object({ roleFilter: z.array(z.enum(["family_admin", "family_member", "caregiver"])).optional() }))
      .query(async ({ input, ctx }) => {
        if (!hasPermission(ctx.apiKey.permissions, "users:read")) throw new TRPCError({ code: "FORBIDDEN" });
        const members = await db.select({ id: users.id, name: users.name, email: users.email, role: hubMembers.role })
          .from(hubMembers)
          .innerJoin(users, eq(hubMembers.userId, users.id))
          .where(eq(hubMembers.hubId, ctx.apiKey.hubId));
        return { users: members.filter(m => m.email) };
      }),
  }),

  // Webhook Events
  webhooks: router({
    listEvents: protectedProcedure
      .input(z.object({ hubId: z.string(), limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        if (!await getUserRoleInHub(ctx.user.id, input.hubId)) throw new TRPCError({ code: "FORBIDDEN" });
        return db.select().from(webhookEvents).where(eq(webhookEvents.hubId, input.hubId)).orderBy(desc(webhookEvents.createdAt)).limit(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
