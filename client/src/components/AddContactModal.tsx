import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

/**
 * AddContactModal Component
 * 
 * Form for adding new contacts with:
 * - E.164 phone format validation
 * - Country-based routing preview
 * - Language preference selection
 * - Role-based access control
 * 
 * Features:
 * - Shows routing type before saving
 * - Mobile-first full-screen modal
 * - Real-time form validation
 */

interface AddContactModalProps {
  hubId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
];

export function AddContactModal({ hubId, onClose, onSuccess }: AddContactModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    role: "caregiver" as const,
    phone: "",
    countryCode: "US",
    languagePreference: "en" as const,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const createContactMutation = trpc.contacts.create.useMutation();

  // Validate E.164 format
  const isValidPhone = (phone: string) => {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  };

  // Get routing preview
  const getRoutingPreview = () => {
    if (formData.countryCode === "US") {
      return "This contact will use standard calling (tel: link)";
    }
    if (formData.countryCode === "DO") {
      return "This contact will receive WhatsApp as primary action + calling option";
    }
    return "This contact will receive WhatsApp + calling options";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!isValidPhone(formData.phone)) {
      newErrors.phone = "Invalid phone format. Use E.164 format (e.g., +18095551234)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        hubId,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        countryCode: formData.countryCode,
        languagePreference: formData.languagePreference,
        notes: formData.notes || undefined,
      });

      onSuccess();
    } catch (error) {
      setErrors({ submit: "Failed to create contact. Please try again." });
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === formData.countryCode);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder="Contact name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="family_member">Family Member</option>
              <option value="caregiver">Caregiver</option>
              <option value="medical_facility">Medical Facility</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number * (E.164 format)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone) setErrors({ ...errors, phone: "" });
              }}
              placeholder="+18095551234"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-500 mt-1">Format: +[country code][number]</p>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <select
              value={formData.countryCode}
              onChange={(e) =>
                setFormData({ ...formData, countryCode: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language Preference
            </label>
            <select
              value={formData.languagePreference}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  languagePreference: (e.target.value as any),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value.slice(0, 280),
                })
              }
              placeholder="Add any notes about this contact..."
              maxLength={280}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.notes.length}/280 characters
            </p>
          </div>

          {/* Routing Preview */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
            <p className="text-sm text-teal-900">
              <strong>Routing:</strong> {getRoutingPreview()}
            </p>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-900">{errors.submit}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContactMutation.isPending}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {createContactMutation.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
