import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/LanguageContext";

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
  const { t } = useTranslation();
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
      alert(t('medications.nameRequired'));
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
            <h2 className="text-xl font-semibold text-[#1A2B3C]">{t('medications.reviewExtraction')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('medications.editFieldsConfirm')}</p>
          </div>
          <div
            className={`px-3 py-1 rounded text-sm font-medium ${confidenceColors[extraction.confidence]}`}
          >
            {extraction.confidence === "high" && t('medications.high')}
            {extraction.confidence === "medium" && t('medications.medium')}
            {extraction.confidence === "low" && t('medications.low')}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Low Confidence Warning */}
          {extraction.confidence === "low" && (
            <div className="p-4 bg-red-50 border border-[#DC2626] rounded">
              <p className="text-[#DC2626] font-medium">⚠️ {t('medications.pleaseVerify')}</p>
              <p className="text-sm text-[#DC2626] mt-1">
                {t('medications.lowConfidenceWarning')}
              </p>
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.medicationName')} *</label>
              <Input
                value={formData.medication_name}
                onChange={(e) => handleFieldChange("medication_name", e.target.value)}
                placeholder={t('medications.aspirin')}
                className="border-gray-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.dosage')}</label>
                <Input
                  value={formData.dosage}
                  onChange={(e) => handleFieldChange("dosage", e.target.value)}
                  placeholder={t('medications.dosagePlaceholder')}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.frequency')}</label>
                <Input
                  value={formData.frequency}
                  onChange={(e) => handleFieldChange("frequency", e.target.value)}
                  placeholder={t('medications.frequencyPlaceholder')}
                  className="border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.prescriber')}</label>
              <Input
                value={formData.prescriber}
                onChange={(e) => handleFieldChange("prescriber", e.target.value)}
                placeholder={t('medications.prescriberPlaceholder')}
                className="border-gray-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.refillDate')}</label>
                <Input
                  type="date"
                  value={formData.refill_date}
                  onChange={(e) => handleFieldChange("refill_date", e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.quantity')}</label>
                <Input
                  value={formData.quantity}
                  onChange={(e) => handleFieldChange("quantity", e.target.value)}
                  placeholder={t('medications.quantityPlaceholder')}
                  className="border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.pharmacy')}</label>
              <Input
                value={formData.pharmacy_name}
                onChange={(e) => handleFieldChange("pharmacy_name", e.target.value)}
                placeholder={t('medications.pharmacyPlaceholder')}
                className="border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.pharmacyPhone')}</label>
              <Input
                value={formData.pharmacy_phone}
                onChange={(e) => handleFieldChange("pharmacy_phone", e.target.value)}
                placeholder={t('medications.pharmacyPhonePlaceholder')}
                className="border-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('medications.reviewNotes')}</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t('medications.reviewNotesPlaceholder')}
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
              {isSaving ? t('common.saving') : `✓ ${t('medications.confirmSave')}`}
            </Button>
            <Button
              onClick={onDiscard}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              ✗ {t('common.discard')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
