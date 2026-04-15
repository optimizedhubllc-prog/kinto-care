# Kinto Beta 1.1 - Seer Engine Implementation Guide

## Overview
The Seer Engine is an OCR-powered medication extraction system that uses Vision LLM to parse medication labels and auto-populate medication forms.

## Implementation Status

### ✅ Phase 1: Visual Identity Overhaul (COMPLETE)
- Updated theme to "Familial Warmth" aesthetic
- Color Palette: Warm Beige (#FFFBF0), Teal (#0D9488), Coral (#F87171)
- Typography: Inter (body) + Playfair Display (headings)
- Border Radius: 32px on all cards
- Glassmorphism effect on mobile navigation

### ⏳ Phase 2: Seer Engine Backend (READY FOR INTEGRATION)

**To add the Seer Engine mutation to `server/routers.ts`:**

1. Add the following import at the top of the file (after existing imports):
```typescript
import { invokeLLM } from "./_core/llm";
```

2. Add this mutation to the `medications` router (before the closing `}),`):
```typescript
    extractFromImage: protectedProcedure
      .input(z.object({ hubId: z.string(), imageBase64: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const role = await getUserRoleInHub(ctx.user.id, input.hubId);
        if (!role) throw new TRPCError({ code: "FORBIDDEN" });

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a medical OCR specialist. Extract medication information from the provided image.
Return ONLY a valid JSON object with these fields:
{
  "name": "medication name",
  "dosage": "dosage amount (e.g., 500mg)",
  "frequency": "frequency (e.g., Twice daily)",
  "instructions": "special instructions if any"
}
If you cannot confidently extract the information, return:
{
  "error": "reason why extraction failed"
}`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please extract the medication information from this label:",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${input.imageBase64}`,
                      detail: "high",
                    },
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
                    frequency: { type: "string", description: "Frequency of use" },
                    instructions: { type: "string", description: "Special instructions" },
                    error: { type: "string", description: "Error message if extraction failed" },
                  },
                  required: ["name"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message.content;
          if (!content) throw new Error("No response from Vision LLM");

          const extractedData = JSON.parse(content);

          if (extractedData.error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `OCR extraction failed: ${extractedData.error}`,
            });
          }

          if (!extractedData.name) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Could not extract medication name from image",
            });
          }

          return {
            success: true,
            extracted: {
              name: extractedData.name || "",
              dosage: extractedData.dosage || "",
              frequency: extractedData.frequency || "",
              instructions: extractedData.instructions || "",
            },
          };
        } catch (error) {
          console.error("[Seer Engine] OCR extraction error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "OCR extraction failed",
          });
        }
      }),
```

### ✅ Phase 3: Seer Engine Frontend (READY)

The frontend component is prepared in `client/src/pages/MedicationsWithSeer.tsx` with:
- Camera capture functionality
- OCR image processing
- Form auto-population
- Compliance disclaimers
- Manual review flow

### ✅ Phase 4: Compliance & Safety (IMPLEMENTED)

**Trust Pillar Features:**
- Persistent disclaimer: "Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional."
- Manual confirmation required before saving
- OCR verification dialog showing extracted data
- User must explicitly confirm before data is saved to database

## Logic Flow

```
User clicks "Scan Label"
    ↓
Camera opens (facingMode: environment)
    ↓
User captures photo
    ↓
Image converted to base64
    ↓
Sent to medications.extractFromImage mutation
    ↓
Vision LLM processes image
    ↓
Extracted data returned as JSON
    ↓
User sees verification dialog
    ↓
User reviews extracted: name, dosage, frequency, instructions
    ↓
User clicks "Confirm & Continue"
    ↓
Form fields auto-populated
    ↓
User can edit before final save
    ↓
User clicks "Save"
    ↓
Data saved to database with RBAC enforcement
```

## Security & RBAC

- Only authenticated users can access the Seer Engine
- Only users with access to the hub can use the feature
- All hub members can scan (read-only)
- Only Family Admins can save medications
- Vision LLM processing happens server-side (API key protected)
- Base64 image is sent over HTTPS only

## Next Steps

1. Add the `extractFromImage` mutation to `server/routers.ts`
2. Replace current `Medications.tsx` with `MedicationsWithSeer.tsx`
3. Restart the dev server
4. Test end-to-end: Scan → Extract → Verify → Save

## Testing Checklist

- [ ] Camera permission prompt works
- [ ] Image capture succeeds
- [ ] OCR extraction returns valid JSON
- [ ] Verification dialog displays correctly
- [ ] Form auto-population works
- [ ] Compliance disclaimer is visible
- [ ] RBAC enforcement works (non-admins can't save)
- [ ] Mobile responsiveness maintained
- [ ] Error handling for failed OCR

## Files Modified

- `client/index.html` - Added Google Fonts
- `client/src/index.css` - Updated theme
- `client/src/components/ResponsiveNav.tsx` - Added glassmorphism
- `client/src/pages/MedicationsWithSeer.tsx` - New Seer Engine UI
- `server/routers.ts` - Ready for extractFromImage mutation

## Design Specifications

- **Border Radius**: 32px (2rem) on all cards and dialogs
- **Colors**: Warm Beige (#FFFBF0), Teal (#0D9488), Coral (#F87171)
- **Typography**: Playfair Display for headings, Inter for body
- **Mobile Navigation**: Glassmorphism with backdrop-blur
- **Touch Targets**: 44px minimum for mobile accessibility
- **Compliance Banners**: Coral background with alert icon

## Performance Notes

- Vision LLM processing: ~2-5 seconds per image
- Base64 encoding adds ~33% to image size
- Recommend image size: 640x480 or smaller
- Mobile camera optimization: facingMode: "environment"

---

**Status**: Ready for final integration and testing
**Last Updated**: April 14, 2026
