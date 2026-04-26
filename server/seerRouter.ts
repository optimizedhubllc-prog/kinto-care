import { z } from "zod";
import { protectedProcedure } from "./_core/trpc";
import { getUserRoleInHub } from "./db";
import { medications } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { TRPCError } from "@trpc/server";

/**
 * Seer Engine: OCR Medication Label Extractor
 * Uses Claude Vision API to extract structured data from medication label photos
 * with compliance disclaimers and confidence scoring
 */

// Extracted medication data structure
const MedicationExtractionSchema = z.object({
  medication_name: z.string().nullable(),
  dosage: z.string().nullable(),
  frequency: z.string().nullable(),
  prescriber: z.string().nullable(),
  refill_date: z.string().nullable(), // ISO 8601
  quantity: z.string().nullable(),
  pharmacy_name: z.string().nullable(),
  pharmacy_phone: z.string().nullable(),
});

type MedicationExtraction = z.infer<typeof MedicationExtractionSchema>;

// Response structure with compliance metadata
const SeerResponseSchema = z.object({
  extracted: MedicationExtractionSchema,
  confidence: z.enum(["high", "medium", "low"]),
  disclaimer: z.string(),
  extracted_at: z.string(), // ISO 8601
  hub_id: z.string().uuid(),
});

type SeerResponse = z.infer<typeof SeerResponseSchema>;

/**
 * Calculate confidence level based on extracted fields
 * - high: all required fields extracted cleanly
 * - medium: 1-2 fields are null
 * - low: 3+ fields are null — flag for manual review
 */
function calculateConfidence(extracted: MedicationExtraction): "high" | "medium" | "low" {
  const nullCount = Object.values(extracted).filter((v) => v === null).length;
  if (nullCount === 0) return "high";
  if (nullCount <= 2) return "medium";
  return "low";
}

/**
 * Extract medication data from label image using Claude Vision API
 * Input: base64-encoded image
 * Output: structured medication data with confidence score
 */
export const seerExtractLabel = protectedProcedure
  .input(
    z.object({
      imageBase64: z.string().min(100).max(5242880), // 5MB max
      hubId: z.string().uuid(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
  )
  .mutation(async (opts: any) => {
    const { ctx, input } = opts;
    // Verify user has access to this hub
    const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
    if (!userRole || !["family_admin", "family_viewer", "caregiver"].includes(userRole)) {
      throw new Error("Unauthorized: No access to this hub");
    }

    // Call Claude Vision API to extract medication data
    const systemPrompt = `You are a medication label OCR specialist. Extract ONLY these fields from the medication label image:
- medication_name: The name of the medication
- dosage: The strength/dose (e.g., "500mg", "10ml")
- frequency: How often to take (e.g., "Twice daily", "Every 8 hours")
- prescriber: The doctor's name who prescribed it
- refill_date: The refill date if visible (ISO 8601 format)
- quantity: The number of pills/amount in bottle
- pharmacy_name: The pharmacy name
- pharmacy_phone: The pharmacy phone number

CRITICAL RULES:
1. Return ONLY valid JSON with these exact field names
2. If a field is not visible on the label, return null for that field
3. NEVER infer or guess values not visible on the label
4. NEVER provide medical advice or dosage guidance
5. Do not include any prose, markdown, or explanation - only JSON

Return format:
{
  "medication_name": "...",
  "dosage": "...",
  "frequency": "...",
  "prescriber": "...",
  "refill_date": "...",
  "quantity": "...",
  "pharmacy_name": "...",
  "pharmacy_phone": "..."
}`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract the medication information from this label image.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      });

      // Parse the response
      let responseText = "";
      const content = response.choices[0].message.content;
      if (typeof content === "string") {
        responseText = content;
      } else if (Array.isArray(content)) {
        responseText = JSON.stringify(content);
      }

      // Extract JSON from response (handle potential markdown wrapping)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const extracted = MedicationExtractionSchema.parse(JSON.parse(jsonStr));
      const confidence = calculateConfidence(extracted);

      // Upload the original image to S3
      const imageKey = `medications/${input.hubId}/${Date.now()}-label.${input.mimeType.split("/")[1]}`;
      const { url: imageUrl } = await storagePut(
        imageKey,
        Buffer.from(input.imageBase64, "base64"),
        input.mimeType
      );

      const result: SeerResponse = {
        extracted,
        confidence,
        disclaimer:
          "This data was extracted for logistics coordination only. Verify all medication information with a licensed pharmacist or physician. Kinto Care does not provide medical diagnoses.",
        extracted_at: new Date().toISOString(),
        hub_id: input.hubId,
      };

      // Store extraction metadata (not raw image)
      const database = await getDb();
      if (!database) throw new Error("Database connection failed");
      await database.insert(medications).values({
        id: `med-${Date.now()}` as string,
        hubId: input.hubId,
        name: extracted.medication_name || "Unknown",
        dosage: extracted.dosage || undefined,
        frequency: extracted.frequency || undefined,
        prescriber: extracted.prescriber || undefined,
        refillDate: extracted.refill_date ? new Date(extracted.refill_date) : undefined,
        quantity: extracted.quantity || undefined,
        pharmacyName: extracted.pharmacy_name || undefined,
        pharmacyPhone: extracted.pharmacy_phone || undefined,
        confidence,
        rawLabelImageUrl: imageUrl,
        extractedAt: new Date(),
        createdBy: ctx.user.id,
        reviewed: confidence === "high", // Auto-review high confidence extractions
      });

      return result;
    } catch (error) {
      console.error("Seer extraction error:", error);
      throw new Error(
        `Failed to extract medication data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

/**
 * Save extracted medication to hub after manual review
 * Used when confidence is low and requires admin confirmation
 */
export const seerSaveMedication = protectedProcedure
  .input(
    z.object({
      medicationId: z.string(),
      hubId: z.string().uuid(),
      reviewNotes: z.string().optional(),
    })
  )
  .mutation(async (opts: any) => {
    const { ctx, input } = opts;
    // Only family_admin can save low-confidence extractions
    const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
    if (userRole !== "family_admin") {
      throw new Error("Unauthorized: Only family admins can confirm medication saves");
    }

    // Update medication record
    const database = await getDb();
    if (!database) throw new Error("Database connection failed");
    const result = await database
      .update(medications)
      .set({
        reviewed: true,
        reviewNotes: input.reviewNotes,
        updatedAt: new Date(),
      })
      .where(and(eq(medications.id, input.medicationId), eq(medications.hubId, input.hubId)));

    return { success: true };
  });

/**
 * Get extraction history for a hub
 * Shows all scanned medication labels with extraction results
 */
export const seerGetExtractionHistory = protectedProcedure
  .input(
    z.object({
      hubId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    })
  )
  .query(async (opts: any) => {
    const { ctx, input } = opts;
    // Verify access
    const userRole = await getUserRoleInHub(ctx.user.id, input.hubId);
    if (!userRole) {
      throw new Error("Unauthorized: No access to this hub");
    }

    const database = await getDb();
    if (!database) throw new Error("Database connection failed");
    const history = await database
      .select()
      .from(medications)
      .where(eq(medications.hubId, input.hubId))
      .limit(input.limit)
      .offset(input.offset);

    return history;
  });
