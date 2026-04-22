import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Medications from "@/pages/Medications";
import Appointments from "@/pages/Appointments";
import CareLogistics from "@/pages/CareLogistics";
import MedicalContacts from "@/pages/MedicalContacts";
import HubSettings from "@/pages/HubSettings";
import WebhookSettings from "@/pages/WebhookSettings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import ComplianceFooter from "./components/ComplianceFooter";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard/:hubId" component={Dashboard} />
      <Route path="/hub-settings/:hubId" component={HubSettings} />
      <Route path="/webhook-settings/:hubId" component={WebhookSettings} />
      <Route path="/medications/:hubId" component={Medications} />
      <Route path="/appointments/:hubId" component={Appointments} />
      <Route path="/care-logistics/:hubId" component={CareLogistics} />
      <Route path="/medical-contacts/:hubId" component={MedicalContacts} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <div className="flex-1">
              <Router />
            </div>
            {/* Hybrid Heart Compliance Footer - Persistent across all pages */}
            <ComplianceFooter />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
