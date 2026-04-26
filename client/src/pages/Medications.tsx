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
import { Loader2, Plus, Edit2, Trash2, Camera, CheckCircle, Phone } from "lucide-react";
import { WebhookNotificationListener } from "@/components/WebhookNotificationListener";
import { MedicationLabelUpload } from "@/components/MedicationLabelUpload";
import { SeerResultCard } from "@/components/SeerResultCard";
import { MedicationReviewModal } from "@/components/MedicationReviewModal";

/**
 * MedicationsPage - Complete Seer Engine Integration
 * 
 * Features:
 * - Medications list with refill tracking
 * - Scan Label button (OCR via Claude Vision API)
 * - Extraction history with filtering (admin only)
 * - Manual review workflow for low-confidence extractions
 * - Real-time review queue badge
 */
export default function Medications() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  
  // UI State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", dosage: "", frequency: "", instructions: "" });
  const [showCamera, setShowCamera] = useState(false);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  
  // Seer Engine State
  const [activeTab, setActiveTab] = useState<"medications" | "history">("medications");
  const [showReview, setShowReview] = useState(false);
  const [selectedExtraction, setSelectedExtraction] = useState<any>(null);
  const [extractionHistory, setExtractionHistory] = useState<any[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [reviewedFilter, setReviewedFilter] = useState<"all" | "reviewed" | "unreviewed">("all");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // tRPC Queries & Mutations
  const medicationsQuery = trpc.medications.list.useQuery({ hubId });
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const createMutation = trpc.medications.create.useMutation();
  const updateMutation = trpc.medications.update.useMutation();
  const deleteMutation = trpc.medications.delete.useMutation();
  const extractFromImageMutation = trpc.medications.extractFromImage.useMutation();

  const hub = hubQuery.data;
  const isFamilyAdmin = hub?.members?.some(m => m.userId === user?.id && m.role === 'family_admin');
  const isFamilyMember = hub?.members?.some(m => m.userId === user?.id && (m.role === 'family_admin' || m.role === 'family_viewer'));

  // ============ Handlers ============

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
      alert("Failed to access camera");
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

      handleExtractResult(result);
      stopCamera();
    } catch (error) {
      alert("Failed to extract medication information from image");
    } finally {
      setIsScanningOCR(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Medication name is required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          medicationId: editingId,
          hubId,
          ...formData,
        });
        alert("Medication updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        alert("Medication added");
      }
      setIsDialogOpen(false);
      setScannedData(null);
      medicationsQuery.refetch();
    } catch (error) {
      alert("Failed to save medication");
    }
  };

  const handleDelete = async (medicationId: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    try {
      await deleteMutation.mutateAsync({ medicationId, hubId });
      alert("Medication deleted");
      medicationsQuery.refetch();
    } catch (error) {
      alert("Failed to delete medication");
    }
  };

  // Handle extraction result from Seer Engine
  const handleExtractResult = (result: any) => {
    setSelectedExtraction(result);
    setExtractionHistory([result, ...extractionHistory]);
    
    // If low confidence, show review modal
    if (result.confidence === "low") {
      setShowReview(true);
    } else {
      // For high confidence, show result card
      setScannedData(result);
    }
  };

  // Handle medication save from review modal
  const handleSaveMedication = (medication: any) => {
    setShowReview(false);
    setSelectedExtraction(null);
    medicationsQuery.refetch();
    alert("Medication saved to hub");
  };

  // Format refill date as relative text
  const formatRefillDate = (dateStr?: string): string => {
    if (!dateStr) return "No refill date";
    const date = new Date(dateStr);
    const today = new Date();
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} days`;
    if (daysUntil === 0) return "Refill today";
    if (daysUntil === 1) return "Refill tomorrow";
    return `Refill in ${daysUntil} days`;
  };

  // Get confidence badge color
  const getConfidenceBadgeColor = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return "bg-[#0D9488] text-white";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  // Count unreviewed low-confidence extractions
  const unreviewed = extractionHistory.filter(e => !e.reviewed && e.confidence === "low").length;

  // Filter extraction history
  const filteredHistory = extractionHistory.filter(e => {
    if (confidenceFilter !== "all" && e.confidence !== confidenceFilter) return false;
    if (reviewedFilter === "reviewed" && !e.reviewed) return false;
    if (reviewedFilter === "unreviewed" && e.reviewed) return false;
    return true;
  });

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
      <WebhookNotificationListener hubId={hubId} />
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBF0] to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          {/* Review Modal */}
          {showReview && selectedExtraction && (
            <MedicationReviewModal
              extraction={selectedExtraction}
              onSave={handleSaveMedication}
              onDiscard={() => {
                setShowReview(false);
                setSelectedExtraction(null);
              }}
              isAdmin={isFamilyAdmin || false}
            />
          )}

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Medications</h1>
              <p className="text-slate-600 mt-2">Manage active and inactive medications</p>
            </div>
            {(isFamilyAdmin || isFamilyMember) && (
              <Button 
                onClick={() => setActiveTab("medications")}
                className="bg-[#0D9488] hover:bg-[#0a7a6f]"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan Label
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("medications")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "medications"
                  ? "text-[#0D9488] border-b-2 border-[#0D9488]"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Medications
            </button>
            {isFamilyAdmin && (
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === "history"
                    ? "text-[#0D9488] border-b-2 border-[#0D9488]"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Extraction History
                {unreviewed > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-[#DC2626] text-white text-xs font-bold rounded-full">
                    {unreviewed}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* MEDICATIONS TAB */}
          {activeTab === "medications" && (
            <div className="space-y-6">
              {/* Scan Label Modal */}
              <Dialog open={isDialogOpen && activeTab === "medications"} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <div />
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Scan Medication Label</DialogTitle>
                    <DialogDescription>
                      Use your camera to scan a medication label. The system will extract the information automatically.
                    </DialogDescription>
                  </DialogHeader>

                  {!scannedData && !showCamera && (
                    <div className="space-y-4">
                      <Button
                        onClick={startCamera}
                        className="w-full bg-[#0D9488] hover:bg-[#0a7a6f]"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Open Camera
                      </Button>
                    </div>
                  )}

                  {showCamera && !scannedData && (
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
                              Capture & Scan
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
                  )}

                  {scannedData && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-blue-700 font-medium">✓ Extraction Complete</p>
                        <p className="text-blue-600 text-sm mt-1">Review the extracted information below and click 'Save' to add to medications list.</p>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Medications List */}
              {medications.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600 text-lg">No medications saved yet.</p>
                    <p className="text-gray-500 mt-2">Tap "Scan Label" to add one.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {medications
                    .sort((a, b) => {
                      if (!a.refillDate) return 1;
                      if (!b.refillDate) return -1;
                      return new Date(a.refillDate).getTime() - new Date(b.refillDate).getTime();
                    })
                    .map((med) => (
                      <Card key={med.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          {/* Needs Review Banner */}
                          {med.confidence === "low" && !med.reviewed && (
                            <div className="mb-4 p-3 bg-red-50 border border-[#DC2626] rounded text-sm text-[#DC2626]">
                              ⚠️ This extraction needs admin review before use
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-semibold text-slate-900">{med.name}</h3>
                                {med.confidence && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBadgeColor(med.confidence)}`}>
                                    {med.confidence === "high" && "High"}
                                    {med.confidence === "medium" && "Medium"}
                                    {med.confidence === "low" && "Low"}
                                  </span>
                                )}
                              </div>

                              {med.dosage && <p className="text-gray-700"><strong>Dosage:</strong> {med.dosage}</p>}
                              {med.frequency && <p className="text-gray-700"><strong>Frequency:</strong> {med.frequency}</p>}
                              {med.prescriber && <p className="text-gray-700"><strong>Prescriber:</strong> {med.prescriber}</p>}

                              <div className="mt-3 flex flex-wrap gap-3">
                                {med.refillDate && (
                                  <div className="text-sm">
                                    <span className="font-medium text-slate-900">{formatRefillDate(med.refillDate)}</span>
                                  </div>
                                )}

                                {med.pharmacyName && (
                                  <div className="text-sm">
                                    <span className="font-medium text-slate-900">{med.pharmacyName}</span>
                                    {med.pharmacyPhone && (
                                      <a
                                        href={`tel:${med.pharmacyPhone}`}
                                        className="ml-2 inline-flex items-center text-[#0D9488] hover:underline"
                                      >
                                        <Phone className="h-3 w-3 mr-1" />
                                        Call
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {isFamilyAdmin && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleOpenDialog(med)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDelete(med.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}

              {/* Compliance Footer */}
              <div className="p-4 bg-[#FDF8F2] border border-[#E5D4C1] rounded text-xs text-gray-700">
                Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
              </div>
            </div>
          )}

          {/* EXTRACTION HISTORY TAB */}
          {activeTab === "history" && isFamilyAdmin && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Confidence Level</Label>
                  <select
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Review Status</Label>
                  <select
                    value={reviewedFilter}
                    onChange={(e) => setReviewedFilter(e.target.value as any)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="unreviewed">Needs Review</option>
                  </select>
                </div>
              </div>

              {/* History List */}
              {filteredHistory.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600">No extractions match your filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((extraction) => (
                    <Card key={extraction.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900">{extraction.extracted?.medication_name || "Unknown"}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBadgeColor(extraction.confidence)}`}>
                                {extraction.confidence === "high" && "High"}
                                {extraction.confidence === "medium" && "Medium"}
                                {extraction.confidence === "low" && "Low"}
                              </span>
                              {extraction.reviewed ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                  ✓ Reviewed
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                                  Needs Review
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Extracted {extraction.extracted_at || 'Unknown'}
                            </p>
                          </div>

                          {!extraction.reviewed && extraction.confidence === "low" && (
                            <Button
                              onClick={() => {
                                setSelectedExtraction(extraction);
                                setShowReview(true);
                              }}
                              size="sm"
                              className="bg-[#0D9488] hover:bg-[#0a7a6f]"
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Compliance Footer */}
              <div className="p-4 bg-[#FDF8F2] border border-[#E5D4C1] rounded text-xs text-gray-700">
                Kinto Care is a logistics and data coordination tool. No medical diagnosis provided.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
