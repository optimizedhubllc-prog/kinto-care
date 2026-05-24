import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";

interface MedicationLabelUploadProps {
  hubId: string;
  onExtract: (result: any) => void;
  isLoading?: boolean;
}

/**
 * MedicationLabelUpload: Mobile-first camera/file upload interface
 * Accepts: jpg, png, webp — max 5MB
 * Shows image preview before submission
 */
export function MedicationLabelUpload({
  hubId,
  onExtract,
  isLoading = false,
}: MedicationLabelUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleFileSelect = (file: File) => {
    setError(null);

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('medications.uploadError'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t('medications.fileSizeError'));
      return;
    }

    setSelectedFile(file);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError(t('medications.selectImageError'));
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        if (!base64) {
          setError(t('medications.readFileError'));
          return;
        }

        // Call the Seer Engine extraction procedure
        const result = await fetch("/api/seer/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            hubId,
            mimeType: selectedFile.type,
          }),
        });

        if (!result.ok) {
          throw new Error(t('medications.extractionFailed'));
        }

        const data = await result.json();
        onExtract(data);
        setPreview(null);
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('medications.extractionFailed'));
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <Card className="p-6 bg-white border border-[#E5D4C1]">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1A2B3C]">{t('medications.scanMedicationLabel')}</h3>

        {/* Preview */}
        {preview && (
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
            <img src={preview} alt={t('medications.labelPreview')} className="w-full h-auto" />
          </div>
        )}

        {/* Error */}
        {error && <div className="p-3 bg-red-50 border border-[#DC2626] rounded text-[#DC2626] text-sm">{error}</div>}

        {/* Upload Buttons */}
        <div className="flex gap-3 flex-col sm:flex-row">
          {/* Camera Input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading || !!preview}
            className="flex-1 bg-[#0D9488] hover:bg-[#0D7A6F] text-white"
          >
            📷 {t('medications.takePhoto')}
          </Button>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || !!preview}
            variant="outline"
            className="flex-1"
          >
            📁 {t('medications.chooseFile')}
          </Button>
        </div>

        {/* Action Buttons */}
        {preview && (
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-[#0D9488] hover:bg-[#0D7A6F] text-white"
            >
              {isLoading ? t('common.scanning') : `✓ ${t('medications.scanLabel')}`}
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1" disabled={isLoading}>
              ✗ {t('common.cancel')}
            </Button>
          </div>
        )}

        {/* Info Text */}
        <p className="text-sm text-gray-600">
          {t('medications.uploadInfo')}
        </p>
      </div>
    </Card>
  );
}
