"use client";

import { useRef, useState } from "react";
import { X, Camera, Upload, AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

// ============================================================================
// Types
// ============================================================================

type ConfidenceLevel = "high" | "medium" | "low";

type ExtractedMedication = {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  confidence: ConfidenceLevel;
};

type KintoScanProps = {
  hubId: string;
  onSave: (med: { name: string; dosage: string; frequency: string; instructions: string }) => Promise<void>;
  onClose: () => void;
};

// ============================================================================
// Helpers
// ============================================================================

function computeConfidence(extracted: Omit<ExtractedMedication, "confidence">): ConfidenceLevel {
  const fields = [extracted.name, extracted.dosage, extracted.frequency, extracted.instructions];
  const filled = fields.filter(f => f && f.trim().length > 0).length;
  if (filled >= 3) return "high";
  if (filled === 2) return "medium";
  return "low";
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm text-[#1A2B3C] focus:outline-none focus:ring-2 focus:ring-[#0D9488]";

// ============================================================================
// KintoScan Component
// ============================================================================

export function KintoScan({ hubId, onSave, onClose }: KintoScanProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<"capture" | "extracting" | "review" | "saving">("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedMedication | null>(null);
  const [form, setForm] = useState({ name: "", dosage: "", frequency: "", instructions: "" });
  const [error, setError] = useState<string | null>(null);

  // ── Image ingestion ────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setError(null);

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("medications.uploadError"));
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t("medications.fileSizeError"));
      return;
    }

    // Generate preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      if (!base64) {
        setError(t("medications.readFileError"));
        return;
      }
      await runExtraction(base64);
    };
    reader.onerror = () => setError(t("medications.readFileError"));
    reader.readAsDataURL(file);
  };

  // ── Claude Vision extraction ───────────────────────────────────────────────

  const runExtraction = async (base64: string) => {
    setStage("extracting");
    setError(null);

    try {
      const response = await fetch("/api/trpc/medications.extractFromImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: { hubId, imageBase64: base64 },
        }),
      });

      if (!response.ok) throw new Error("Extraction failed");

      const data = await response.json();
      const result = data?.result?.data?.json ?? data?.result?.data ?? data;

      const extracted: ExtractedMedication = {
        name: result.name ?? "",
        dosage: result.dosage ?? "",
        frequency: result.frequency ?? "",
        instructions: result.instructions ?? "",
        confidence: computeConfidence(result),
      };

      setExtracted(extracted);
      setForm({
        name: extracted.name,
        dosage: extracted.dosage,
        frequency: extracted.frequency,
        instructions: extracted.instructions,
      });
      setStage("review");
    } catch (err) {
      setError(t("medications.extractionFailed"));
      setStage("capture");
    }
  };

  // ── Save to hub ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t("medications.nameRequired"));
      return;
    }
    setStage("saving");
    try {
      await onSave(form);
      onClose();
    } catch {
      setError(t("medications.extractionFailed"));
      setStage("review");
    }
  };

  // ── Confidence UI ──────────────────────────────────────────────────────────

  const confidenceBadge = (level: ConfidenceLevel) => {
    const map = {
      high: { color: "bg-green-100 text-green-800", label: t("medications.high") },
      medium: { color: "bg-yellow-100 text-yellow-800", label: t("medications.medium") },
      low: { color: "bg-red-100 text-red-800", label: t("medications.low") },
    };
    const { color, label } = map[level];
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
        {t("medications.confidence")}: {label}
      </span>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            {/* KintoScan brand mark */}
            <div className="flex items-center gap-1">
              <span className="text-[#DC2626] font-serif font-semibold">Kinto</span>
              <span className="text-[#0D9488] font-semibold text-sm">Scan</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-[#DC2626]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">

          {/* ── Stage: Capture ── */}
          {stage === "capture" && (
            <>
              <p className="text-sm text-muted-foreground">{t("medications.scanDescription")}</p>

              {/* Preview */}
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={previewUrl} alt={t("medications.labelPreview")} className="w-full object-contain max-h-48" />
                </div>
              )}

              {/* Upload info */}
              <p className="text-xs text-muted-foreground">{t("medications.uploadInfo")}</p>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Camera — opens native camera on mobile */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                >
                  <Camera className="h-4 w-4" />
                  {t("medications.takePhoto")}
                </button>

                {/* File upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-[#0D9488] text-[#0D9488] rounded-lg hover:bg-teal-50 text-sm font-semibold"
                >
                  <Upload className="h-4 w-4" />
                  {t("medications.chooseFile")}
                </button>
              </div>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </>
          )}

          {/* ── Stage: Extracting ── */}
          {stage === "extracting" && (
            <div className="flex flex-col items-center gap-4 py-8">
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border w-full">
                  <img src={previewUrl} alt={t("medications.labelPreview")} className="w-full object-contain max-h-40" />
                  <div className="absolute inset-0 bg-[#0D9488]/10 flex items-center justify-center">
                    <div className="bg-white rounded-lg px-4 py-2 shadow text-sm text-[#0D9488] font-semibold animate-pulse">
                      {t("common.scanning")}
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">{t("medications.scanDescription")}</p>
            </div>
          )}

          {/* ── Stage: Review ── */}
          {stage === "review" && extracted && (
            <>
              {/* Preview thumbnail */}
              {previewUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={previewUrl} alt={t("medications.labelPreview")} className="w-full object-contain max-h-32" />
                </div>
              )}

              {/* Confidence badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#1A2B3C]">{t("medications.extractionResult")}</span>
                {confidenceBadge(extracted.confidence)}
              </div>

              {/* Low confidence warning */}
              {extracted.confidence === "low" && (
                <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{t("medications.lowConfidenceWarning")}</span>
                </div>
              )}

              {/* Trust Pillar disclaimer */}
              <div className="text-xs text-muted-foreground bg-[#FDF8F2] rounded-lg px-3 py-2">
                ⚠️ {t("medications.disclaimer")}
              </div>

              {/* Editable form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A2B3C] uppercase tracking-wide">
                    {t("medications.medicationName")} *
                  </label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder={t("medications.aspirin")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A2B3C] uppercase tracking-wide">
                    {t("medications.dosage")}
                  </label>
                  <input
                    className={inputCls}
                    value={form.dosage}
                    onChange={e => setForm(p => ({ ...p, dosage: e.target.value }))}
                    placeholder={t("medications.dosagePlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A2B3C] uppercase tracking-wide">
                    {t("medications.frequency")}
                  </label>
                  <input
                    className={inputCls}
                    value={form.frequency}
                    onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
                    placeholder={t("medications.frequencyPlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1A2B3C] uppercase tracking-wide">
                    {t("medications.frequency")}
                  </label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={form.instructions}
                    onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                    placeholder={t("medications.frequencyPlaceholder")}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setStage("capture"); setExtracted(null); setPreviewUrl(null); setError(null); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t("medications.scanAnother")}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
                >
                  <CheckCircle className="h-4 w-4" />
                  {t("medications.saveToHub")}
                </button>
              </div>
            </>
          )}

          {/* ── Stage: Saving ── */}
          {stage === "saving" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t("common.saving")}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
