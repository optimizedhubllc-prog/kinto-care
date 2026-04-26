import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * ProtectedRoute: Enforces role-based access control
 * 
 * Props:
 * - children: Component to render if authorized
 * - allowedRoles: Array of allowed hub member roles
 * - fallback: Component to show while checking auth (default: loading spinner)
 * 
 * Behavior:
 * - Redirects unauthenticated users to /login
 * - Redirects unauthorized users to /dashboard with "Access denied" toast
 * - Shows loading state while checking authentication
 */
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("family_admin" | "family_member" | "caregiver")[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0D9488]" />
        </div>
      )
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    setLocation("/login");
    return null;
  }

  // Check role-based access if allowedRoles specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.hubMemberRole || "family_member";
    if (!allowedRoles.includes(userRole as any)) {
      toast.error("Access denied");
      setLocation("/dashboard");
      return null;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
