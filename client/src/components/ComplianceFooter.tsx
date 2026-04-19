/**
 * Compliance Footer Component
 * 
 * Persistent footer displayed on all pages per Hybrid Heart Branding SOP v1.2
 * Displays the required medical disclaimer and copyright information
 */

export default function ComplianceFooter() {
  return (
    <footer className="bg-[#FDF8F2] border-t border-[#E5D4C1] py-4 px-4 mt-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Compliance Disclaimer */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs text-[#1A2B3C] opacity-75">
              <strong>Kinto Care</strong> is a logistics and data coordination tool. 
              <span className="block md:inline md:ml-1">
                No medical diagnosis provided. Always consult healthcare professionals.
              </span>
            </p>
          </div>

          {/* Copyright & Branding */}
          <div className="text-xs text-[#1A2B3C] opacity-75 text-center md:text-right">
            <p>© 2026 Kinto Care. Hybrid Heart Branding v1.2</p>
            <p className="text-[10px] mt-1">
              Approved by Kinto Development Team & Jaquez Family
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
