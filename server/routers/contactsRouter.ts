import { z } from "zod";
import crypto from "crypto";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb, getUserRoleInHub } from "./db";
import { contacts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Contacts Router - International Routing & Communication
 * 
 * Handles CRUD operations for hub contacts with smart routing logic.
 * - US contacts: Standard tel: links
 * - International contacts: WhatsApp + VoIP deep links
 * - E.164 phone format for deep link compatibility
 */

export const contactsRouter = router({
  /**
   * List all contacts for a hub
   * Visible to all hub members
   */
  list: protectedProcedure
    .input(z.object({ hubId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db.select().from(contacts).where(eq(contacts.hubId, input.hubId));

      return result.map((contact: any) => ({
        ...contact,
        isInternational: contact.countryCode !== "US",
        isDominicanRepublic: contact.countryCode === "DO",
        countryFlag: getCountryFlag(contact.countryCode),
        whatsappUrl: contact.countryCode !== "US" ? `https://wa.me/${contact.phone}` : null,
      }));
    }),

  /**
   * Create a new contact
   * Only family_admin can create contacts
   */
  create: protectedProcedure
    .input(
      z.object({
        hubId: z.string(),
        name: z.string().min(1, "Name is required"),
        role: z.enum(["family_member", "caregiver", "medical_facility", "pharmacy", "other"]),
        phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
        countryCode: z.string().length(2).default("US"),
        languagePreference: z.enum(["en", "es"]).default("en"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify user is family_admin
      const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (userRole !== "family_admin") {
        throw new Error("Only family admins can create contacts");
      }

      // Ensure phone is in E.164 format
      let phone = input.phone;
      if (!phone.startsWith("+")) {
        phone = `+${phone}`;
      }

      const contactId = crypto.randomUUID();
      await db.insert(contacts).values({
        hubId: input.hubId,
        name: input.name,
        role: input.role,
        phone,
        countryCode: input.countryCode,
        languagePreference: input.languagePreference,
        notes: input.notes || null,
        createdBy: ctx.user.id,
      });

      return {
        id: contactId,
        ...input,
        phone,
        isInternational: input.countryCode !== "US",
        isDominicanRepublic: input.countryCode === "DO",
        countryFlag: getCountryFlag(input.countryCode),
        whatsappUrl: input.countryCode !== "US" ? `https://wa.me/${phone}` : null,
      };
    }),

  /**
   * Update an existing contact
   * Only family_admin can update contacts
   */
  update: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        hubId: z.string(),
        name: z.string().min(1).optional(),
        role: z.enum(["family_member", "caregiver", "medical_facility", "pharmacy", "other"]).optional(),
        phone: z.string().optional(),
        countryCode: z.string().length(2).optional(),
        languagePreference: z.enum(["en", "es"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify user is family_admin
      const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (userRole !== "family_admin") {
        throw new Error("Only family admins can update contacts");
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.role) updateData.role = input.role;
      if (input.phone) {
        let phone = input.phone;
        if (!phone.startsWith("+")) phone = `+${phone}`;
        updateData.phone = phone;
      }
      if (input.countryCode) updateData.countryCode = input.countryCode;
      if (input.languagePreference) updateData.languagePreference = input.languagePreference;
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db.update(contacts).set(updateData).where(eq(contacts.id, input.contactId));

      return { success: true };
    }),

  /**
   * Delete a contact
   * Only family_admin can delete contacts
   */
  delete: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        hubId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verify user is family_admin
      const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
      if (userRole !== "family_admin") {
        throw new Error("Only family admins can delete contacts");
      }

      await db.delete(contacts).where(eq(contacts.id, input.contactId));

      return { success: true };
    }),
});

/**
 * Helper: Get country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
