import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { webhookRouter } from "./webhookRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getUserHubs,
  getHubWithMembers,
  getUserRoleInHub,
  isUserFamilyAdmin,
  addHubMember,
  updateHubMemberRole,
  removeHubMember,
  getHubMedications,
  getMedicationById,
  getHubAppointments,
  getAppointmentById,
  getHubCareLogistics,
  getCareLogisticById,
  getHubMedicalContacts,
  getMedicalContactById,
  getDb,
  getUsersByRole,
} from "./db";
import {
  patientHubs,
  hubMembers,
  medications,
  appointments,
  careLogistics,
  medicalContacts,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const appRouter = router({
  system: systemRouter,
  webhooks: webhookRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================================================
  // KINTO: Hub Management
  // ============================================================================
  hubs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserHubs(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubWithMembers(input.hubId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          patientName: z.string().min(1),
          patientDob: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const hubId = crypto.randomUUID();

        await db.insert(patientHubs).values({
          id: hubId,
          patientName: input.patientName,
          patientDob: input.patientDob ? new Date(input.patientDob) : undefined,
          createdBy: ctx.user.id,
        });

        await db.insert(hubMembers).values({
          hubId,
          userId: ctx.user.id,
          role: "family_admin",
        });

        return { hubId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          patientName: z.string().min(1).optional(),
          patientDob: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.patientName !== undefined) updateData.patientName = input.patientName;
        if (input.patientDob !== undefined) updateData.patientDob = new Date(input.patientDob);

        await db
          .update(patientHubs)
          .set(updateData)
          .where(eq(patientHubs.id, input.hubId));

        return { success: true };
      }),

    generateInviteCode: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        return { inviteCode, hubId: input.hubId };
      }),

    joinWithCode: protectedProcedure
      .input(z.object({ inviteCode: z.string().length(6), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await addHubMember(input.hubId, ctx.user.id, "family_viewer");
          return { success: true, hubId: input.hubId };
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to join hub" });
        }
      }),

  }),

  // ============================================================================
  // KINTO: Hub Members (RBAC Management)
  // ============================================================================
  hubMembers: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubWithMembers(input.hubId);
      }),

    add: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          userId: z.number(),
          role: z.enum(["family_admin", "family_viewer", "caregiver"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        try {
          await addHubMember(input.hubId, input.userId, input.role);
          return { success: true };
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to add member",
          });
        }
      }),

    updateRole: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          userId: z.number(),
          newRole: z.enum(["family_admin", "family_viewer", "caregiver"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        await updateHubMemberRole(input.hubId, input.userId, input.newRole);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ hubId: z.string(), userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        await removeHubMember(input.hubId, input.userId);
        return { success: true };
      }),
  }),

  // ============================================================================
  // KINTO: Medical Contacts
  // ============================================================================
  medicalContacts: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubMedicalContacts(input.hubId);
      }),

    getById: protectedProcedure
      .input(z.object({ contactId: z.string(), hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getMedicalContactById(input.contactId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          name: z.string().min(1),
          specialty: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const contactId = crypto.randomUUID();

        await db.insert(medicalContacts).values({
          id: contactId,
          hubId: input.hubId,
          name: input.name,
          specialty: input.specialty,
          phone: input.phone,
          email: input.email,
          address: input.address,
          notes: input.notes,
          createdBy: ctx.user.id,
        });

        return { contactId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          contactId: z.string(),
          hubId: z.string(),
          name: z.string().min(1).optional(),
          specialty: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.specialty !== undefined) updateData.specialty = input.specialty;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.address !== undefined) updateData.address = input.address;
        if (input.notes !== undefined) updateData.notes = input.notes;

        await db
          .update(medicalContacts)
          .set(updateData)
          .where(eq(medicalContacts.id, input.contactId));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ contactId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.delete(medicalContacts).where(eq(medicalContacts.id, input.contactId));

        return { success: true };
      }),
  }),

  // ============================================================================
  // KINTO: Medications
  // ============================================================================
  medications: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubMedications(input.hubId);
      }),

    getById: protectedProcedure
      .input(z.object({ medicationId: z.string(), hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getMedicationById(input.medicationId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          name: z.string().min(1),
          dosage: z.string().optional(),
          frequency: z.string().optional(),
          instructions: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const medicationId = crypto.randomUUID();

        await db.insert(medications).values({
          id: medicationId,
          hubId: input.hubId,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          instructions: input.instructions,
          createdBy: ctx.user.id,
        });

        return { medicationId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          medicationId: z.string(),
          hubId: z.string(),
          name: z.string().min(1).optional(),
          dosage: z.string().optional(),
          frequency: z.string().optional(),
          instructions: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.dosage !== undefined) updateData.dosage = input.dosage;
        if (input.frequency !== undefined) updateData.frequency = input.frequency;
        if (input.instructions !== undefined) updateData.instructions = input.instructions;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await db
          .update(medications)
          .set(updateData)
          .where(eq(medications.id, input.medicationId));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ medicationId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.delete(medications).where(eq(medications.id, input.medicationId));

        return { success: true };
      }),

    extractFromImage: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          imageBase64: z.string().min(1, "Image data is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        try {
          const { invokeLLM } = await import("./_core/llm");

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a medication label OCR assistant. Extract medication information from images. Return ONLY valid JSON with fields: name (string), dosage (string), frequency (string), instructions (string). If any field cannot be determined, use null.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${input.imageBase64}`,
                    },
                  },
                  {
                    type: "text",
                    text: "Extract the medication name, dosage, frequency, and instructions from this label. Return as JSON.",
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "medication_extraction",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Medication name" },
                    dosage: { type: "string", description: "Dosage amount" },
                    frequency: { type: "string", description: "Dosing frequency" },
                    instructions: { type: "string", description: "Special instructions" },
                  },
                  required: ["name"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from LLM");

          const contentStr = typeof content === "string" ? content : JSON.stringify(content);
          const extracted = JSON.parse(contentStr);

          return {
            name: extracted.name || "",
            dosage: extracted.dosage || "",
            frequency: extracted.frequency || "",
            instructions: extracted.instructions || "",
          };
        } catch (error) {
          console.error("[Seer Engine] OCR Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to extract medication information from image",
          });
        }
      }),
  }),

  // ============================================================================
  // KINTO: Appointments
  // ============================================================================
  appointments: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubAppointments(input.hubId);
      }),

    getById: protectedProcedure
      .input(z.object({ appointmentId: z.string(), hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getAppointmentById(input.appointmentId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          medicalContactId: z.string().optional(),
          doctorName: z.string().optional(),
          specialty: z.string().optional(),
          dateTime: z.string(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const appointmentId = crypto.randomUUID();

        await db.insert(appointments).values({
          id: appointmentId,
          hubId: input.hubId,
          medicalContactId: input.medicalContactId,
          doctorName: input.doctorName,
          specialty: input.specialty,
          dateTime: new Date(input.dateTime),
          location: input.location,
          notes: input.notes,
          createdBy: ctx.user.id,
        });

        return { appointmentId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          appointmentId: z.string(),
          hubId: z.string(),
          medicalContactId: z.string().optional(),
          doctorName: z.string().optional(),
          specialty: z.string().optional(),
          dateTime: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.medicalContactId !== undefined) updateData.medicalContactId = input.medicalContactId;
        if (input.doctorName !== undefined) updateData.doctorName = input.doctorName;
        if (input.specialty !== undefined) updateData.specialty = input.specialty;
        if (input.dateTime !== undefined) updateData.dateTime = new Date(input.dateTime);
        if (input.location !== undefined) updateData.location = input.location;
        if (input.notes !== undefined) updateData.notes = input.notes;

        await db
          .update(appointments)
          .set(updateData)
          .where(eq(appointments.id, input.appointmentId));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ appointmentId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.delete(appointments).where(eq(appointments.id, input.appointmentId));

        return { success: true };
      }),
  }),

  // ============================================================================
  // KINTO: Care Logistics
  // ============================================================================
  careLogistics: router({
    list: protectedProcedure
      .input(z.object({ hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getHubCareLogistics(input.hubId);
      }),

    getById: protectedProcedure
      .input(z.object({ logisticId: z.string(), hubId: z.string() }))
      .query(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        return getCareLogisticById(input.logisticId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          caregiverId: z.number().optional(),
          startTime: z.string(),
          endTime: z.string(),
          taskNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const logisticId = crypto.randomUUID();

        await db.insert(careLogistics).values({
          id: logisticId,
          hubId: input.hubId,
          caregiverId: input.caregiverId,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          taskNotes: input.taskNotes,
          createdBy: ctx.user.id,
        });

        return { logisticId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          logisticId: z.string(),
          hubId: z.string(),
          caregiverId: z.number().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          taskNotes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, unknown> = {};
        if (input.caregiverId !== undefined) updateData.caregiverId = input.caregiverId;
        if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
        if (input.endTime !== undefined) updateData.endTime = new Date(input.endTime);
        if (input.taskNotes !== undefined) updateData.taskNotes = input.taskNotes;

        await db
          .update(careLogistics)
          .set(updateData)
          .where(eq(careLogistics.id, input.logisticId));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ logisticId: z.string(), hubId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const isFamilyAdmin = await isUserFamilyAdmin(ctx.user.id, input.hubId);
        if (!isFamilyAdmin) throw new TRPCError({ code: "FORBIDDEN" });

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.delete(careLogistics).where(eq(careLogistics.id, input.logisticId));

        return { success: true };
      }),
  }),

  // ============================================================================
  // KINTO: Users (for external services like n8n)
  // ============================================================================
  users: router({
    getByRole: protectedProcedure
      .input(
        z.object({
          hubId: z.string(),
          roleFilter: z.array(z.enum(["family_admin", "family_member", "caregiver"])).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        // Verify user has access to this hub
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });
        
        const users = await getUsersByRole(input.hubId, input.roleFilter);
        return { users };
      }),
  }),
});

export type AppRouter = typeof appRouter;
