import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", dosage: "", frequency: "", instructions: "" });
  const [showCamera, setShowCamera] = useState(false);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const medicationsQuery = trpc.medications.list.useQuery({ hubId });
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const createMutation = trpc.medications.create.useMutation();
  const updateMutation = trpc.medications.update.useMutation();
  const deleteMutation = trpc.medications.delete.useMutation();
  const extractFromImageMutation = trpc.medications.extractFromImage.useMutation();

  const hub = hubQuery.data;
  const isFamilyAdmin = hub?.members?.some(m => m.userId === user?.id && m.role === 'family_admin');

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
    setShowCamera(false);
    setScannedData(null);
    setIsDialogOpen(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      toast.error("Failed to access camera");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsScanningOCR(true);
      const context = canvasRef.current.getContext("2d");
      if (!context) throw new Error("Canvas context not available");

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const imageBase64 = canvasRef.current.toDataURL("image/jpeg").split(",")[1];

      const result = await extractFromImageMutation.mutateAsync({
        hubId,
        imageBase64,
      });

      setScannedData(result);
      setFormData({
        name: result.name || "",
        dosage: result.dosage || "",
        frequency: result.frequency || "",
        instructions: result.instructions || "",
      });

      stopCamera();
      toast.success("Medication label scanned successfully");
    } catch (error) {
      toast.error("Failed to extract medication information from image");
    } finally {
      setIsScanningOCR(false);
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
      setScannedData(null);
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

  if (medicationsQuery.isLoading || hubQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const medications = medicationsQuery.data || [];

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBF0] to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Medications</h1>
              <p className="text-slate-600 mt-2">Manage active and inactive medications</p>
            </div>
            {isFamilyAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} size="lg" className="bg-[#0D9488] hover:bg-[#0a7a6f]">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Medication
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Edit" : "Add"} Medication</DialogTitle>
                    <DialogDescription>
                      Enter the medication details below. You can also scan a medication label using your camera.
                    </DialogDescription>
                  </DialogHeader>

                  {showCamera ? (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full"
                        />
                      </div>
                      <canvas ref={canvasRef} className="hidden" />

                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        <p className="font-semibold">⚠️ Safety Notice</p>
                        <p className="mt-1">Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional.</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={captureAndScan}
                          disabled={isScanningOCR}
                          className="flex-1 bg-[#0D9488] hover:bg-[#0a7a6f]"
                        >
                          {isScanningOCR ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Camera className="mr-2 h-4 w-4" />
                              Capture Label
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : scannedData ? (
                    <div className="space-y-4">
                      {/* Hybrid Heart Verified Badge - Seer Engine Extraction */}
                      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-[#0D9488] rounded-lg p-4 flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0D9488] text-white font-bold text-sm">
                            KC
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-[#1A2B3C]">Seer Engine Verified</p>
                            <span className="inline-block px-2 py-1 bg-[#0D9488] text-white text-xs font-bold rounded-full">Extracted</span>
                          </div>
                          <p className="text-sm text-[#1A2B3C] opacity-75">Medication label scanned and verified. Please review the extracted information below and make any corrections before confirming.</p>
                        </div>
                      </div>

                      {/* Soft Linen container for extracted data - Hybrid Heart design */}
                      <form onSubmit={handleSubmit} className="space-y-4 bg-[#FDF8F2] p-4 rounded-[2rem] border border-[#E5D4C1]">
                        <div>
                          <Label htmlFor="name">Medication Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Aspirin"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dosage">Dosage</Label>
                          <Input
                            id="dosage"
                            value={formData.dosage}
                            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div>
                          <Label htmlFor="frequency">Frequency</Label>
                          <Input
                            id="frequency"
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            placeholder="e.g., Twice daily"
                          />
                        </div>
                        <div>
                          <Label htmlFor="instructions">Instructions</Label>
                          <Input
                            id="instructions"
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            placeholder="e.g., Take with food"
                          />
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                          <p className="font-semibold">⚠️ Safety Notice</p>
                          <p className="mt-1">Kinto is a logistics tool. Verify all scanned dosages with a healthcare professional.</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="flex-1 bg-[#0D9488] hover:bg-[#0a7a6f]"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm & Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setScannedData(null);
                              setFormData({ name: "", dosage: "", frequency: "", instructions: "" });
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Medication Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Aspirin"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dosage">Dosage</Label>
                        <Input
                          id="dosage"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="e.g., 500mg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequency">Frequency</Label>
                        <Input
                          id="frequency"
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          placeholder="e.g., Twice daily"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instructions">Instructions</Label>
                        <Input
                          id="instructions"
                          value={formData.instructions}
                          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                          placeholder="e.g., Take with food"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="flex-1 bg-[#0D9488] hover:bg-[#0a7a6f]"
                        >
                          {editingId ? "Update" : "Add"} Medication
                        </Button>
                        {!editingId && (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={startCamera}
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Scan Label
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>

          {medications.length === 0 ? (
            <Card className="rounded-[32px]">
              <CardContent className="pt-12 text-center">
                <p className="text-slate-600">No medications yet. {isFamilyAdmin && "Add one to get started."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {medications.map((med) => (
                <Card key={med.id} className="rounded-[32px] hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{med.name}</CardTitle>
                        {med.dosage && <p className="text-sm text-slate-600 mt-1">{med.dosage}</p>}
                      </div>
                      {isFamilyAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(med)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(med.id)}
                          >
                            <Trash2 className="h-4 w-4 text-[#F87171]" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {med.frequency && (
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Frequency:</span> {med.frequency}
                      </p>
                    )}
                    {med.instructions && (
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Instructions:</span> {med.instructions}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
