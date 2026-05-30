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
// ============================================================================
// TASK MANAGEMENT API
// Add this router block inside the appRouter in server/routers/index.ts
// Place after the existing "users" router block
// ============================================================================
//
// ALSO ADD these imports at the top of index.ts if not already present:
// import { tasks } from "@/drizzle/schema"; // already imported
// import eventBus from "@/server/eventBus";  // add this if eventBus exists
//
// ============================================================================

  // Tasks
  tasks: router({
    /**
     * tasks.list
     * List tasks in a hub with role-based filtering.
     * RBAC:
     * - family_admin: sees all tasks
     * - family_viewer / caregiver: sees only tasks assigned to them
     */
    list: protectedProcedure
      .input(z.object({
        hubId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });

        const conditions: any[] = [eq(tasks.hubId, input.hubId)];

        // Non-admins only see tasks assigned to them
        if (role !== "family_admin") {
          conditions.push(eq(tasks.assignedTo, ctx.user.id));
        }

        if (input.status) {
          conditions.push(eq(tasks.status, input.status));
        }

        const taskList = await db
          .select()
          .from(tasks)
          .where(and(...conditions))
          .orderBy(desc(tasks.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return { tasks: taskList, total: taskList.length };
      }),

    /**
     * tasks.create
     * Create a new task in a hub.
     * Fires webhook: task.created
     * RBAC: family_admin only
     */
    create: protectedProcedure
      .input(z.object({
        hubId: z.string().uuid(),
        title: z.string().min(1, "Title is required").max(255),
        description: z.string().max(2000).optional(),
        dueDate: z.string().optional(), // ISO string, converted to Date
        assignedTo: z.string().uuid().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only family admins can create tasks",
          });
        }

        // If assignedTo provided, verify they are a hub member
        if (input.assignedTo) {
          const member = await db
            .select()
            .from(hubMembers)
            .where(and(
              eq(hubMembers.userId, input.assignedTo),
              eq(hubMembers.hubId, input.hubId)
            ))
            .limit(1);

          if (!member[0]) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Assigned user is not a member of this hub",
            });
          }
        }

        const taskId = crypto.randomUUID();
        await db.insert(tasks).values({
          id: taskId,
          hubId: input.hubId,
          title: input.title,
          description: input.description ?? null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          assignedTo: input.assignedTo ?? null,
          createdBy: ctx.user.id,
          priority: input.priority,
          status: "pending",
        });

        const created = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1);

        if (!created[0]) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create task" });
        }

        // Fire webhook event for n8n
        try {
          await fetch(process.env.N8N_WEBHOOK_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "task.created",
              taskTitle: created[0].title,
              priority: created[0].priority,
              timestamp: new Date().toISOString(),
              assignedUserId: created[0].assignedTo ?? null,
            }),
          });
        } catch (_) {
          // Webhook failure is non-blocking — task still created
        }

        return created[0];
      }),

    /**
     * tasks.update
     * Update a task's status.
     * Fires webhook: task.updated (on completion)
     * RBAC: family_admin (any task), family_viewer/caregiver (assigned tasks only)
     */
    update: protectedProcedure
      .input(z.object({
        taskId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        dueDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        const task = taskRows[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        const role = await getUserRoleInHub(ctx.user.id, task.hubId);

        // Non-admins can only update tasks assigned to them
        if (role !== "family_admin" && task.assignedTo !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update tasks assigned to you",
          });
        }

        // Validate status transitions
        if (input.status) {
          const validTransitions: Record<string, string[]> = {
            pending: ["in_progress", "completed", "cancelled"],
            in_progress: ["completed", "pending", "cancelled"],
            completed: ["pending"],
            cancelled: ["pending"],
          };

          if (!validTransitions[task.status]?.includes(input.status)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot transition from ${task.status} to ${input.status}`,
            });
          }
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.status) updateData.status = input.status;
        if (input.title) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.dueDate) updateData.dueDate = new Date(input.dueDate);
        if (input.priority) updateData.priority = input.priority;

        await db.update(tasks).set(updateData).where(eq(tasks.id, input.taskId));

        const updated = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        if (!updated[0]) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update task" });
        }

        // Fire webhook on status change
        if (input.status && input.status !== task.status) {
          try {
            await fetch(process.env.N8N_WEBHOOK_URL!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "task.updated",
                taskTitle: updated[0].title,
                timestamp: new Date().toISOString(),
                oldStatus: task.status,
                newStatus: input.status,
              }),
            });
          } catch (_) {
            // Non-blocking
          }
        }

        return updated[0];
      }),

    /**
     * tasks.claim
     * Caregiver or family member self-assigns an unassigned task.
     * Fires webhook: task.assigned
     * RBAC: family_admin, family_viewer, caregiver
     */
    claim: protectedProcedure
      .input(z.object({
        taskId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        const task = taskRows[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        const role = await getUserRoleInHub(ctx.user.id, task.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this hub" });

        if (task.assignedTo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task is already assigned. Use assign to reassign.",
          });
        }

        await db
          .update(tasks)
          .set({ assignedTo: ctx.user.id, updatedAt: new Date() })
          .where(eq(tasks.id, input.taskId));

        const updated = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        if (!updated[0]) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to claim task" });
        }

        // Fire webhook
        try {
          await fetch(process.env.N8N_WEBHOOK_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "task.assigned",
              taskTitle: updated[0].title,
              timestamp: new Date().toISOString(),
              assignedUserId: ctx.user.id,
            }),
          });
        } catch (_) {
          // Non-blocking
        }

        return updated[0];
      }),

    /**
     * tasks.release
     * Release a claimed task back to unassigned/pending.
     * RBAC: family_admin (any task), assignee (own tasks only)
     */
    release: protectedProcedure
      .input(z.object({
        taskId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        const task = taskRows[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        const role = await getUserRoleInHub(ctx.user.id, task.hubId);

        // Only family_admin or the assigned user can release
        if (role !== "family_admin" && task.assignedTo !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only release tasks assigned to you",
          });
        }

        if (!task.assignedTo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task is not currently assigned",
          });
        }

        await db
          .update(tasks)
          .set({ assignedTo: null, status: "pending", updatedAt: new Date() })
          .where(eq(tasks.id, input.taskId));

        const updated = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        if (!updated[0]) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to release task" });
        }

        return updated[0];
      }),

    /**
     * tasks.assign
     * Admin assigns a task to a specific hub member.
     * Fires webhook: task.assigned
     * RBAC: family_admin only
     */
    assign: protectedProcedure
      .input(z.object({
        taskId: z.string().uuid(),
        assignedTo: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskRows = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        const task = taskRows[0];
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

        if (!await isUserFamilyAdmin(ctx.user.id, task.hubId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only family admins can assign tasks" });
        }

        // Verify assignee is a hub member
        const member = await db
          .select()
          .from(hubMembers)
          .where(and(
            eq(hubMembers.userId, input.assignedTo),
            eq(hubMembers.hubId, task.hubId)
          ))
          .limit(1);

        if (!member[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assignee is not a member of this hub",
          });
        }

        await db
          .update(tasks)
          .set({ assignedTo: input.assignedTo, updatedAt: new Date() })
          .where(eq(tasks.id, input.taskId));

        const updated = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, input.taskId))
          .limit(1);

        if (!updated[0]) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to assign task" });
        }

        // Fire webhook
        try {
          await fetch(process.env.N8N_WEBHOOK_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "task.assigned",
              taskTitle: updated[0].title,
              timestamp: new Date().toISOString(),
              assignedUserId: input.assignedTo,
            }),
          });
        } catch (_) {
          // Non-blocking
        }

        return updated[0];
      }),

    /**
     * tasks.delete
     * Delete a task permanently.
     * RBAC: family_admin only
     */
    delete: protectedProcedure
      .input(z.object({
        taskId: z.string().uuid(),
        hubId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!await isUserFamilyAdmin(ctx.user.id, input.hubId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only family admins can delete tasks" });
        }

        await db.delete(tasks).where(eq(tasks.id, input.taskId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
