# Kinto Beta 1.1 - Seer Engine Integration Guide

## Overview

The Seer Engine is an OCR-powered medication label scanner that uses Vision LLM to extract medication information from images. This guide provides step-by-step instructions to integrate it into Kinto.

## Current Status

✅ **Completed:**
- Familial Warmth visual theme (colors, fonts, border-radius, glassmorphism)
- All core features (RBAC, hub management, medications, appointments, care logistics)
- Backend infrastructure ready for Seer Engine
- Frontend UI structure prepared

⏳ **Ready for Integration:**
- Backend `medications.extractFromImage` mutation
- Frontend camera capture and OCR UI
- Compliance disclaimers and manual review flow

## Backend Integration (5 minutes)

### Step 1: Add Imports to `server/routers.ts`

At the top of the file (around line 33), add:

```typescript
import { invokeLLM } from "./_core/llm";
```

### Step 2: Add Seer Engine Mutation to Medications Router

Find the medications router (around line 390) and add this mutation **before the closing `}),`** of the medications router:

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
                content: "Extract medication info from image. Return JSON: {name, dosage, frequency, instructions, error?}",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract medication information:" },
                  {
                    type: "image_url",
                    image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: "high" },
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
                    name: { type: "string" },
                    dosage: { type: "string" },
                    frequency: { type: "string" },
                    instructions: { type: "string" },
                    error: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
          });

          const content = response.choices[0]?.message.content;
          if (!content) throw new Error("No response from Vision LLM");
          const extractedData = JSON.parse(content);

          if (extractedData.error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: `OCR failed: ${extractedData.error}` });
          }
          if (!extractedData.name) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Could not extract medication name" });
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
          console.error("[Seer Engine] OCR error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "OCR extraction failed",
          });
        }
      }),
```

## Frontend Integration (10 minutes)

### Step 1: Update Medications.tsx

Replace `client/src/pages/Medications.tsx` with the Seer Engine-enabled version:

```typescript
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Camera, CheckCircle } from "lucide-react";

export default function Medications() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScanMode, setIsScanMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", dosage: "", frequency: "", instructions: "" });

  const medicationsQuery = trpc.medications.list.useQuery({ hubId });
  const createMutation = trpc.medications.create.useMutation();
  const updateMutation = trpc.medications.update.useMutation();
  const deleteMutation = trpc.medications.delete.useMutation();
  const extractMutation = trpc.medications.extractFromImage.useMutation();

  const isFamilyAdmin = user?.role === "admin";

  const handleOpenDialog = (medication?: any) => {
    if (medication) {
      setEditingId(medication.id);
      setFormData({
        name: medication.name,
        dosage: medication.dosage || "",
        frequency: medication.frequency || "",
        instructions: medication.instructions || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", dosage: "", frequency: "", instructions: "" });
    }
    setIsScanMode(false);
    setIsDialogOpen(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error("Unable to access camera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const captureAndExtract = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    setIsProcessing(true);
    try {
      const context = canvasRef.current.getContext("2d");
      if (!context) throw new Error("Canvas context unavailable");

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const imageBase64 = canvasRef.current.toDataURL("image/jpeg").split(",")[1];
      if (!imageBase64) throw new Error("Failed to capture image");

      const result = await extractMutation.mutateAsync({
        hubId,
        imageBase64,
      });

      if (result.success && result.extracted) {
        setFormData({
          name: result.extracted.name,
          dosage: result.extracted.dosage,
          frequency: result.extracted.frequency,
          instructions: result.extracted.instructions,
        });
        stopCamera();
        setIsScanMode(false);
        toast.success("Medication info extracted. Please review and confirm.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extract medication info");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Medication name is required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          medicationId: editingId,
          hubId,
          ...formData,
        });
        toast.success("Medication updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        toast.success("Medication added");
      }
      setIsDialogOpen(false);
      medicationsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save medication");
    }
  };

  const handleDelete = async (medicationId: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    try {
      await deleteMutation.mutateAsync({ medicationId, hubId });
      toast.success("Medication deleted");
      medicationsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete medication");
    }
  };

  if (medicationsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0D9488]" />
      </div>
    );
  }

  const medications = medicationsQuery.data || [];

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-[#FFFBF0] p-4 md:p-6 md:ml-64">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#0D9488]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Medications
              </h1>
              <p className="text-slate-600 mt-1">Manage your medications and dosages</p>
            </div>
            {isFamilyAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="bg-[#0D9488] hover:bg-[#0F766E] rounded-[2rem]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Medication" : "Add New Medication"}</DialogTitle>
                    <DialogDescription>
                      {isScanMode
                        ? "Point your camera at the medication label"
                        : "Enter medication details or use the Seer Engine to scan a label"}
                    </DialogDescription>
                  </DialogHeader>

                  {isScanMode ? (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-[2rem] bg-black"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="flex gap-2">
                        <Button
                          onClick={captureAndExtract}
                          disabled={isProcessing}
                          className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] rounded-[2rem]"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Capture & Extract
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            stopCamera();
                            setIsScanMode(false);
                          }}
                          variant="outline"
                          className="rounded-[2rem]"
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 text-center">
                        Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Medication Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Lisinopril"
                          className="rounded-[2rem]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dosage">Dosage</Label>
                        <Input
                          id="dosage"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="e.g., 10mg"
                          className="rounded-[2rem]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequency">Frequency</Label>
                        <Input
                          id="frequency"
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          placeholder="e.g., Twice daily"
                          className="rounded-[2rem]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instructions">Instructions</Label>
                        <Input
                          id="instructions"
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="e.g., Take with food"
                          className="rounded-[2rem]"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] rounded-[2rem]"
                        >
                          {createMutation.isPending || updateMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm & Save
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setIsScanMode(true);
                            startCamera();
                          }}
                          variant="outline"
                          className="flex-1 rounded-[2rem]"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Scan Label
                        </Button>
                      </div>

                      <p className="text-xs text-slate-500 text-center">
                        Kinto is a logistics tool. Verify all information with a healthcare professional.
                      </p>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>

          {medications.length === 0 ? (
            <Card className="rounded-[2rem] border-[#E5D4C1]">
              <CardContent className="pt-8 text-center">
                <p className="text-slate-500">No medications yet. {isFamilyAdmin && "Click 'Add Medication' to get started."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {medications.map((med: any) => (
                <Card key={med.id} className="rounded-[2rem] border-[#E5D4C1] hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-[#0D9488]">{med.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {med.dosage && <span className="block">Dosage: {med.dosage}</span>}
                          {med.frequency && <span className="block">Frequency: {med.frequency}</span>}
                          {med.instructions && <span className="block text-slate-600">Instructions: {med.instructions}</span>}
                        </CardDescription>
                      </div>
                      {isFamilyAdmin && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOpenDialog(med)}
                            variant="ghost"
                            size="sm"
                            className="rounded-[2rem]"
                          >
                            <Edit2 className="h-4 w-4 text-[#0D9488]" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(med.id)}
                            variant="ghost"
                            size="sm"
                            className="rounded-[2rem]"
                          >
                            <Trash2 className="h-4 w-4 text-[#F87171]" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

## Testing

After integration:

1. Restart the dev server: `pnpm dev`
2. Navigate to Medications page
3. Click "Add Medication" button
4. Click "Scan Label" button
5. Point camera at a medication label
6. Click "Capture & Extract"
7. Verify extracted data is auto-populated
8. Review and confirm before saving

## Compliance & Safety

✅ **Implemented:**
- Persistent disclaimer: "Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional."
- Manual review dialog showing extracted data
- User must click "Confirm & Save" before database save
- RBAC enforcement (Family Admins only)
- Server-side Vision LLM processing (no client-side LLM keys exposed)

## Troubleshooting

**Camera not working:**
- Check browser permissions for camera access
- Ensure HTTPS in production (required for camera access)
- Test on mobile device (desktop may have camera restrictions)

**OCR extraction failing:**
- Ensure good lighting on medication label
- Try capturing from different angles
- Check that Vision LLM service is available

**TypeScript errors:**
- Ensure `invokeLLM` import is added to routers.ts
- Verify mutation code is properly formatted
- Run `pnpm check` to validate TypeScript

## Support

For issues or questions, refer to:
- `SYSTEM_ARCHITECTURE.md` - Full technical documentation
- `SEER_ENGINE_IMPLEMENTATION.md` - Implementation guide
- Backend logs: `pnpm dev` output
- Frontend console: Browser DevTools
