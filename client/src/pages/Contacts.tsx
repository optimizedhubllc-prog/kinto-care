import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ContactCard } from "@/components/ContactCard";
import { AddContactModal } from "@/components/AddContactModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/contexts/LanguageContext";

/**
 * ContactsPage Component
 * 
 * Displays all hub contacts organized by role:
 * - Family Members section
 * - Caregivers & External Contacts section
 * 
 * Features:
 * - Mobile-first responsive layout
 * - International contacts sorted to top
 * - Add Contact button (family_admin only)
 * - Empty states for each section
 * - Real-time contact list updates
 */

const HUB_ID = "d7dd12a1-ed80-4429-96fd-cf5d7fc16c0e"; // Jaquez family hub

export function ContactsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch contacts for the hub
  const { data: contacts = [], isLoading, refetch } = trpc.contacts.list.useQuery(
    { hubId: HUB_ID },
    { enabled: !!user }
  );

  // Check if user is family_admin
  const isFamilyAdmin = user?.role === "admin"; // Adjust based on actual role field

  // Separate contacts by role
  const familyContacts = contacts.filter(c => 
    ["family_admin", "family_member"].includes(c.role)
  );
  
  const caregiverContacts = contacts.filter(c => 
    !["family_admin", "family_member"].includes(c.role)
  );

  // Sort by international status (international first)
  const sortByInternational = (a: any, b: any) => {
    if (a.isInternational === b.isInternational) return 0;
    return a.isInternational ? -1 : 1;
  };

  const sortedFamilyContacts = [...familyContacts].sort(sortByInternational);
  const sortedCaregiverContacts = [...caregiverContacts].sort(sortByInternational);

  const handleContactAdded = () => {
    setShowAddModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy-900">{t('contacts.title')}</h1>
          {isFamilyAdmin && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              + {t('contacts.addContact')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Family Members Section */}
        <section>
          <h2 className="text-lg font-semibold text-navy-900 mb-4">{t('contacts.familyMembers')}</h2>
          {sortedFamilyContacts.length > 0 ? (
            <div className="space-y-3">
              {sortedFamilyContacts.map(contact => (
                <ContactCard key={contact.id} {...contact} />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-500">{t('contacts.noFamilyMembers')}</p>
            </div>
          )}
        </section>

        {/* Caregivers & External Contacts Section */}
        <section>
          <h2 className="text-lg font-semibold text-navy-900 mb-4">
            {t('contacts.caregiversAndContacts')}
          </h2>
          {sortedCaregiverContacts.length > 0 ? (
            <div className="space-y-3">
              {sortedCaregiverContacts.map(contact => (
                <ContactCard key={contact.id} {...contact} />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-500">{t('contacts.noCaregivers')}</p>
              {isFamilyAdmin && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  variant="outline"
                  className="mt-3"
                >
                  {t('contacts.addFirstContact')}
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Trust Pillar Footer */}
      <div className="mt-12 py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        <p>{t('common.disclaimer')}</p>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          hubId={HUB_ID}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleContactAdded}
        />
      )}
    </div>
  );
}
