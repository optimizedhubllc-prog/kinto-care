import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, Users, Clock, Pill } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const hubsQuery = trpc.hubs.list.useQuery(undefined, { enabled: isAuthenticated });

  // Redirect authenticated users to dashboard or onboarding
  useEffect(() => {
    if (isAuthenticated && !loading && hubsQuery.data) {
      if (hubsQuery.data.length > 0) {
        navigate(`/dashboard/${hubsQuery.data[0].hub.id}`);
      } else {
        navigate("/onboarding");
      }
    }
  }, [isAuthenticated, loading, hubsQuery.data, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Kinto Care Heart Logo - SOP v1.2 */}
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663129010374/QJ3E2r9gCPZv4t7YHdCX6w/kinto-care-logo-sop-v1.2-axWCEe4rP9rfBvTTQ26hhN.webp" 
                alt="Kinto Care" 
                className="h-10 w-auto"
              />
            </div>
            <Button asChild size="lg">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Caregiving Made Simple
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Coordinate care for your loved ones with a centralized hub for medications, appointments, and caregiver schedules. Built for families, by families.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <a href={getLoginUrl()}>Get Started</a>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Pill className="h-8 w-8 text-blue-600 mb-4" />
              <CardTitle>Medication Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Track medications, dosages, and instructions in one centralized location.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Clock className="h-8 w-8 text-green-600 mb-4" />
              <CardTitle>Appointment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Never miss a doctor's visit with integrated appointment scheduling and reminders.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-purple-600 mb-4" />
              <CardTitle>Care Coordination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Manage caregiver shifts and handover notes for seamless care transitions.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Heart className="h-8 w-8 text-red-600 mb-4" />
              <CardTitle>Family Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Invite family members and caregivers with role-based access control.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-slate-600">
            © 2026 Kinto. Caring for what matters most.
          </p>
        </div>
      </footer>
    </div>
  );
}
