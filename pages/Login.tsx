import { useState } from "react";
import { useTranslation } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

/**
 * LoginPage: Email/password authentication for Kinto Care
 * 
 * Features:
 * - Email and password fields (required)
 * - Sign In button with loading state
 * - Error messaging for invalid credentials
 * - Mobile-first responsive design
 * - Spanish localization support
 * - Kinto Care branding with heart logo
 * - Compliance disclaimer footer
 * 
 * On successful login:
 * - Reads user role and language_preference from users table
 * - Routes based on role (family_admin, family_member, caregiver)
 * - Stores auth token in session
 * 
 * No self-registration - admin invites only
 */
export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // tRPC mutation for login
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Successful login - redirect to dashboard
      if (data.user.hubId) {
        setLocation(`/dashboard/${data.user.hubId}`);
      } else {
        // Fallback if no hub assigned
        setLocation("/dashboard");
      }
    },
    onError: (error) => {
      // Show error message
      setError(error.message || t("auth.invalidCredentials"));
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError(t("auth.requiredFields"));
      setIsLoading(false);
      return;
    }

    // Attempt login
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen bg-[#FDF8F2] flex flex-col items-center justify-center p-4">
      {/* Kinto Care Logo & Branding */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="text-4xl">❤️</div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1A2B3C] font-playfair">
            Kinto Care
          </h1>
        </div>
        <p className="text-sm text-gray-600">{t("auth.careHub")}</p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-white border border-[#E5D4C1] shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-[#1A2B3C]">{t("auth.signIn")}</CardTitle>
          <CardDescription>{t("auth.enterCredentials")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t("auth.email")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="pedro@kinto.care"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-gray-300"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t("auth.password")}
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="border-gray-300"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-[#DC2626] rounded text-[#DC2626] text-sm">
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0D9488] hover:bg-[#0a7a6f] text-white font-medium py-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>

            {/* Forgot Password Link (Placeholder) */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-[#0D9488] hover:text-[#0a7a6f] underline"
                disabled={isLoading}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Compliance Disclaimer Footer */}
      <div className="mt-12 max-w-md text-center">
        <p className="text-xs text-gray-600 leading-relaxed">
          {t("common.disclaimer")}
        </p>
      </div>

      {/* Trust Pillar */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          {t("auth.trustPillar")}
        </p>
      </div>
    </div>
  );
}
