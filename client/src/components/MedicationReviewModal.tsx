import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ExtractionResult {
  id: string;
  extracted: {
    medication_name: string | null;
    dosage: string | null;
    frequency: string | null;
    prescriber: string | null;
    refill_date: string | null;
    quantity: string | null;
    pharmacy_name: string | null;
    pharmacy_phone: string | null;
  };
  confidence: "high" | "medium" | "low";
  disclaimer: string;
  extracted_at: string;
  hub_id: string;
}

interface MedicationReviewModalProps {
  extraction: ExtractionResult;
  onSave: (medication: any) => void;
  onDiscard: () => void;
  isAdmin: boolean;
}

/**
 * MedicationReviewModal: Manual review interface for low-confidence extractions
 * Allows family_admin to:
 * - Edit all extracted fields
 * - Add review notes
 * - Confirm and save to hub
 * - Discard extraction
 */
export function MedicationReviewModal({
  extraction,
  onSave,
  onDiscard,
  isAdmin,
}: MedicationReviewModalProps) {
  const [formData, setFormData] = useState({
    medication_name: extraction.extracted.medication_name || "",
    dosage: extraction.extracted.dosage || "",
    frequency: extraction.extracted.frequency || "",
    prescriber: extraction.extracted.prescriber || "",
    refill_date: extraction.extracted.refill_date || "",
    quantity: extraction.extracted.quantity || "",
    pharmacy_name: extraction.extracted.pharmacy_name || "",
    pharmacy_phone: extraction.extracted.pharmacy_phone || "",
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.medication_name.trim()) {
      alert("Medication name is required");
      return;
    }

    setIsSaving(true);
    try {
      const medication = {
        id: `med-${Date.now()}`,
        name: formData.medication_name,
        dosage: formData.dosage || undefined,
        frequency: formData.frequency || undefined,
        prescriber: formData.prescriber || undefined,
        refillDate: formData.refill_date || undefined,
        quantity: formData.quantity || undefined,
        pharmacyName: formData.pharmacy_name || undefined,
        pharmacyPhone: formData.pharmacy_phone || undefined,
        confidence: extraction.confidence,
        reviewed: true,
        reviewNotes: reviewNotes || undefined,
        extractedAt: extraction.extracted_at,
      };

      onSave(medication);
    } finally {
      setIsSaving(false);
    }
  };

  const confidenceColors = {
    high: "bg-[#0D9488] text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-[#DC2626] text-white",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold text-[#1A2B3C]">Review Extraction</h2>
            <p className="text-sm text-gray-600 mt-1">Edit fields and confirm before saving</p>
          </div>
          <div
            className={`px-3 py-1 rounded text-sm font-medium ${confidenceColors[extraction.confidence]}`}
          >
            {extraction.confidence === "high" && "High Confidence"}
            {extraction.confidence === "medium" && "Medium Confidence"}
            {extraction.confidence === "low" && "Low Confidence"}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Low Confidence Warning */}
          {extraction.confidence === "low" && (
            <div className="p-4 bg-red-50 border border-[#DC2626] rounded">
              <p className="text-[#DC2626] font-medium">⚠️ Please verify this information</p>
              <p className="text-sm text-[#DC2626] mt-1">
                Several fields could not be clearly extracted. Review and correct the information below.
              </p>
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
              <Input
                value={formData.medication_name}
                onChange={(e) => handleFieldChange("medication_name", e.target.value)}
                placeholder="e.g., Aspirin"
                className="border-gray-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                <Input
                  value={formData.dosage}
                  onChange={(e) => handleFieldChange("dosage", e.target.value)}
                  placeholder="e.g., 500mg"
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <Input
                  value={formData.frequency}
                  onChange={(e) => handleFieldChange("frequency", e.target.value)}
                  placeholder="e.g., Twice daily"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescriber</label>
              <Input
                value={formData.prescriber}
                onChange={(e) => handleFieldChange("prescriber", e.target.value)}
                placeholder="e.g., Dr. Smith"
                className="border-gray-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refill Date</label>
                <Input
                  type="date"
                  value={formData.refill_date}
                  onChange={(e) => handleFieldChange("refill_date", e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange("quantity", e.target.value)}
                  placeholder="e.g., 30 tablets"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name</label>
              <Input
                value={formData.pharmacy_name}
                onChange={(e) => handleFieldChange("pharmacy_name", e.target.value)}
                placeholder="e.g., CVS Pharmacy"
                className="border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Phone</label>
              <Input
                value={formData.pharmacy_phone}
                onChange={(e) => handleFieldChange("pharmacy_phone", e.target.value)}
                placeholder="e.g., (555) 123-4567"
                className="border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes (Optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this extraction..."
                maxLength={280}
                className="border-gray-300 resize-none h-24"
              />
              <p className="text-xs text-gray-500 mt-1">{reviewNotes.length}/280 characters</p>
            </div>
          </div>

          {/* Compliance Disclaimer */}
          <div className="p-4 bg-[#FDF8F2] border border-[#E5D4C1] rounded">
            <p className="text-xs text-gray-700">{extraction.disclaimer}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-[#0D9488] hover:bg-[#0D7A6F] text-white"
            >
              {isSaving ? "Saving..." : "✓ Confirm & Save"}
            </Button>
            <Button
              onClick={onDiscard}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              ✕ Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
