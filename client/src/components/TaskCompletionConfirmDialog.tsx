import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import React, { useState } from "react";

export interface TaskCompletionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  onConfirm: (notes?: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * TaskCompletionConfirmDialog Component
 * Confirmation dialog for marking tasks as complete.
 *
 * Features:
 * - Displays task title for confirmation
 * - Optional notes field (max 280 characters)
 * - Mobile-first full-screen dialog on small screens
 * - Loading state during submission
 * - Error handling
 *
 * Design Tokens:
 * - Teal #0D9488 (confirm button)
 * - Red #DC2626 (errors)
 * - Navy #1A2B3C (text)
 */
export function TaskCompletionConfirmDialog({
  open,
  onOpenChange,
  taskTitle,
  onConfirm,
  isLoading = false,
}: TaskCompletionConfirmDialogProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    try {
      setError(null);
      await onConfirm(notes || undefined);
      setNotes("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNotes("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const charCount = notes.length;
  const maxChars = 280;
  const isOverLimit = charCount > maxChars;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-playfair text-navy">
            Mark Task Complete?
          </DialogTitle>
          <DialogDescription>
            Confirm that you want to mark this task as complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Title Display */}
          <div className="bg-linen rounded-lg p-3 border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Task:</p>
            <p className="text-gray-900 font-semibold mt-1 line-clamp-2">{taskTitle}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes" className="text-sm font-medium text-gray-700">
              Add a completion note (optional)
            </Label>
            <Textarea
              id="completion-notes"
              placeholder="e.g., Task completed successfully, no issues..."
              value={notes}
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue.length <= maxChars) {
                  setNotes(newValue);
                }
              }}
              className="min-h-20 text-sm resize-none"
              disabled={isLoading}
              maxLength={maxChars}
            />
            <div className="flex justify-between items-center">
              <p className={`text-xs ${isOverLimit ? "text-red-600" : "text-gray-500"}`}>
                {charCount} / {maxChars} characters
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                "Confirm Complete"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
