import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";

/**
 * ContactCard Component
 * 
 * Displays a single contact with smart routing logic:
 * - US contacts: Standard tel: link only
 * - International contacts: WhatsApp + VoIP deep links
 * - Dominican Republic (DO): WhatsApp as primary action
 * 
 * Features:
 * - Country flag emoji
 * - Language indicator (ES badge for Spanish)
 * - International Contact badge for non-US
 * - Mobile-first design
 */

interface ContactCardProps {
  id: string;
  name: string;
  role: string;
  phone: string;
  countryCode: string;
  languagePreference: string;
  notes?: string;
  isInternational: boolean;
  isDominicanRepublic: boolean;
  countryFlag: string;
  whatsappUrl?: string;
}

export function ContactCard({
  id,
  name,
  role,
  phone,
  countryCode,
  languagePreference,
  notes,
  isInternational,
  isDominicanRepublic,
  countryFlag,
  whatsappUrl,
}: ContactCardProps) {
  const { t } = useTranslation();
  // Format phone for display (remove +1 for US numbers)
  const displayPhone = countryCode === "US" && phone.startsWith("+1") 
    ? phone.slice(2) 
    : phone;

  // Get role badge styling
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "family_admin":
      case "family_member":
        return "bg-blue-100 text-blue-800";
      case "caregiver":
        return "bg-green-100 text-green-800";
      case "medical_facility":
      case "pharmacy":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Header: Name + Role Badge + Country Flag */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{countryFlag}</span>
            <h3 className="font-semibold text-gray-900">{name}</h3>
          </div>
          <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
            {role.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Phone Number */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 font-mono">{displayPhone}</p>
      </div>

      {/* Badges Row: International + Language */}
      <div className="flex gap-2 mb-3">
        {isInternational && (
          <Badge className="bg-teal-100 text-teal-800 text-xs">
            {t('contacts.international')}
          </Badge>
        )}
        {languagePreference === "es" && (
          <Badge className="bg-amber-100 text-amber-800 text-xs">
            ES
          </Badge>
        )}
      </div>

      {/* Notes (if provided) */}
      {notes && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{notes}</p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isInternational ? (
          <>
            {/* International: WhatsApp Primary, Call Secondary */}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  size="sm"
                  className={`w-full ${
                    isDominicanRepublic
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-teal-600 hover:bg-teal-700"
                  } text-white`}
                >
                  {isDominicanRepublic ? t('contacts.whatsapp') : t('contacts.message')}
                </Button>
              </a>
            )}
            <a href={`tel:${phone}`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full">
                {t('contacts.call')}
              </Button>
            </a>
          </>
        ) : (
          <>
            {/* US: Call Only */}
            <a href={`tel:${phone}`} className="flex-1">
              <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                {t('contacts.call')}
              </Button>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
