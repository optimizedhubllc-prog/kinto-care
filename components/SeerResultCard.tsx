import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";

interface SeerResultCardProps {
  result: {
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
  };
  onSave: () => void;
  onScanAgain: () => void;
  isSaving?: boolean;
}

/**
 * SeerResultCard: Display extraction results with confidence scoring
 * Shows all extracted fields, confidence badge, and compliance disclaimer
 */
export function SeerResultCard({ result, onSave, onScanAgain, isSaving = false }: SeerResultCardProps) {
  const { t } = useTranslation();
  const { extracted, confidence, disclaimer } = result;

  const confidenceColors = {
    high: "bg-[#0D9488] text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-[#DC2626] text-white",
  };

  const confidenceLabels = {
    high: t('medications.high'),
    medium: t('medications.medium'),
    low: t('medications.lowConfidenceVerify'),
  };

  const fields = [
    { label: t('medications.medicationName'), value: extracted.medication_name },
    { label: t('medications.dosage'), value: extracted.dosage },
    { label: t('medications.frequency'), value: extracted.frequency },
    { label: t('medications.prescriber'), value: extracted.prescriber },
    { label: t('medications.refillDate'), value: extracted.refill_date },
    { label: t('medications.quantity'), value: extracted.quantity },
    { label: t('medications.pharmacy'), value: extracted.pharmacy_name },
    { label: t('medications.pharmacyPhone'), value: extracted.pharmacy_phone },
  ];

  return (
    <Card className="p-6 bg-white border border-[#E5D4C1] space-y-6">
      {/* Confidence Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1A2B3C]">{t('medications.extractionResult')}</h3>
        <div className={`px-3 py-1 rounded text-sm font-medium ${confidenceColors[confidence]}`}>
          {confidenceLabels[confidence]}
        </div>
      </div>

      {/* Low Confidence Warning */}
      {confidence === "low" && (
        <div className="p-4 bg-red-50 border border-[#DC2626] rounded">
          <p className="text-[#DC2626] font-medium">⚠️ {t('medications.pleaseVerify')}</p>
          <p className="text-sm text-[#DC2626] mt-1">
            {t('medications.lowConfidenceWarning')}
          </p>
        </div>
      )}

      {/* Extracted Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.label} className="border border-gray-200 rounded p-3">
            <p className="text-xs font-medium text-gray-600 uppercase">{field.label}</p>
            <p className="text-sm text-[#1A2B3C] mt-1">{field.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Compliance Disclaimer */}
      <div className="p-4 bg-[#FDF8F2] border border-[#E5D4C1] rounded">
        <p className="text-xs text-gray-700">{disclaimer}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <Button
          onClick={onSave}
          disabled={isSaving || confidence === "low"}
          className="flex-1 bg-[#0D9488] hover:bg-[#0D7A6F] text-white"
        >
          {isSaving ? t('common.saving') : `✓ ${t('medications.saveToHub')}`}
        </Button>
        <Button onClick={onScanAgain} variant="outline" className="flex-1" disabled={isSaving}>
          📷 {t('medications.scanAnother')}
        </Button>
      </div>

      {/* Low Confidence Save Note */}
      {confidence === "low" && (
        <p className="text-xs text-gray-600 text-center">
          {t('medications.lowConfidenceAdminNote')}
        </p>
      )}
    </Card>
  );
}
