import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const { extracted, confidence, disclaimer } = result;

  const confidenceColors = {
    high: "bg-[#0D9488] text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-[#DC2626] text-white",
  };

  const confidenceLabels = {
    high: "High Confidence",
    medium: "Medium Confidence",
    low: "Low Confidence - Verify Manually",
  };

  const fields = [
    { label: "Medication Name", value: extracted.medication_name },
    { label: "Dosage", value: extracted.dosage },
    { label: "Frequency", value: extracted.frequency },
    { label: "Prescriber", value: extracted.prescriber },
    { label: "Refill Date", value: extracted.refill_date },
    { label: "Quantity", value: extracted.quantity },
    { label: "Pharmacy Name", value: extracted.pharmacy_name },
    { label: "Pharmacy Phone", value: extracted.pharmacy_phone },
  ];

  return (
    <Card className="p-6 bg-white border border-[#E5D4C1] space-y-6">
      {/* Confidence Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#1A2B3C]">Extraction Result</h3>
        <div className={`px-3 py-1 rounded text-sm font-medium ${confidenceColors[confidence]}`}>
          {confidenceLabels[confidence]}
        </div>
      </div>

      {/* Low Confidence Warning */}
      {confidence === "low" && (
        <div className="p-4 bg-red-50 border border-[#DC2626] rounded">
          <p className="text-[#DC2626] font-medium">⚠️ Please verify this information manually</p>
          <p className="text-sm text-[#DC2626] mt-1">
            Several fields could not be clearly extracted. Review and correct the information below before saving.
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
          {isSaving ? "Saving..." : "✓ Save to Hub"}
        </Button>
        <Button onClick={onScanAgain} variant="outline" className="flex-1" disabled={isSaving}>
          📷 Scan Another
        </Button>
      </div>

      {/* Low Confidence Save Note */}
      {confidence === "low" && (
        <p className="text-xs text-gray-600 text-center">
          A family admin must review and manually save low-confidence extractions.
        </p>
      )}
    </Card>
  );
}
