import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Pill, Calendar, Users, Stethoscope, Home, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

interface ResponsiveNavProps {
  hubId: string;
}

/**
 * KINTO BETA 1.1: Responsive Navigation Component
 * 
 * Features:
 * - Desktop: Warm-toned sidebar with teal primary color
 * - Mobile: Top hamburger menu + glassmorphism bottom navigation
 * - Familial Warmth aesthetic with Playfair Display headings
 * - 32px border-radius on interactive elements
 */
export default function ResponsiveNav({ hubId }: ResponsiveNavProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: Home, path: `/dashboard/${hubId}` },
    { label: "Medications", icon: Pill, path: `/medications/${hubId}` },
    { label: "Appointments", icon: Calendar, path: `/appointments/${hubId}` },
    { label: "Care Schedule", icon: Users, path: `/care-logistics/${hubId}` },
    { label: "Medical Contacts", icon: Stethoscope, path: `/medical-contacts/${hubId}` },
  ];

  const isActive = (path: string) => location === path;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <>
      {/* Desktop Sidebar - Familial Warmth Theme */}
      <div className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:bg-gradient-to-b md:from-[#FFFBF0] md:to-[#F3E8D8] md:text-slate-900 md:flex md:flex-col md:border-r md:border-[#E5D4C1] md:shadow-lg">
        <div className="p-6 border-b border-[#E5D4C1] flex items-center gap-3">
          <img 
            src="/manus-storage/kinto-logo-hybrid-heart_3fb6ae96.png" 
            alt="Kinto Care Logo" 
            className="h-12 w-12 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-[#0D9488]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Kinto
            </h1>
            <p className="text-xs text-slate-600">Care Hub</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[2rem] transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-[#0D9488] text-white shadow-md"
                    : "text-slate-700 hover:bg-[#CCFBF1] hover:text-[#0D9488]"
                }`}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5D4C1] space-y-2">
          <div className="px-4 py-2">
            <p className="text-xs text-slate-600">Logged in as</p>
            <p className="text-sm font-medium truncate text-slate-900">{user?.name}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-slate-700 hover:bg-[#CCFBF1] hover:text-[#0D9488] rounded-[2rem]"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Top Bar - Familial Warmth Theme */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#FFFBF0] border-b border-[#E5D4C1] z-50 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <img 
              src="/manus-storage/kinto-logo-hybrid-heart_3fb6ae96.png" 
              alt="Kinto Care Logo" 
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-lg font-bold text-[#0D9488]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Kinto
            </h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-[#F3E8D8] rounded-[2rem] text-slate-900 transition-colors"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-[#E5D4C1] bg-[#FFFBF0]" id="mobile-menu" role="navigation" aria-label="Mobile navigation">
            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
              <button
                key={item.path}
                onClick={() => {
                  setLocation(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[2rem] transition-all duration-200 ${
                  isActive(item.path)
                    ? "bg-[#0D9488] text-white"
                    : "text-slate-700 hover:bg-[#CCFBF1]"
                }`}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
                );
              })}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-[2rem] text-slate-700 hover:bg-[#CCFBF1] transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation - Glassmorphism Effect */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glassmorphism border-t border-white/20">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex-1 flex flex-col items-center justify-center py-3 transition-all duration-200 ${
                  isActive(item.path)
                    ? "text-[#0D9488] border-t-2 border-[#0D9488]"
                    : "text-slate-600 hover:text-[#0D9488]"
                }`}
                aria-label={item.label}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Padding - Ensures content doesn't overlap with nav */}
      <div className="md:ml-64 md:pt-0 pt-16 pb-20 md:pb-0" />
    </>
  );
}
