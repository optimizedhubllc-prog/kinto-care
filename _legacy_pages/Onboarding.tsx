import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [patientName, setPatientName] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createHubMutation = trpc.hubs.create.useMutation();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Please enter the patient's name");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createHubMutation.mutateAsync({
        patientName: patientName.trim(),
        patientDob: patientDob || undefined,
      });

      toast.success("Patient hub created successfully!");
      setLocation(`/dashboard/${result.hubId}`);
    } catch (error) {
      toast.error("Failed to create hub. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setIsLoading(true);
    try {
      toast.info("Invite code feature coming soon");
    } catch (error) {
      toast.error("Failed to join hub. Please check the invite code.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Welcome to Kinto</CardTitle>
          <CardDescription>
            {user.name ? `Hi ${user.name}! ` : ""}
            Let's set up your caregiving hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Hub</TabsTrigger>
              <TabsTrigger value="join">Join Hub</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new patient hub to coordinate care for a loved one.
              </p>
              <form onSubmit={handleCreateHub} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">Patient's Name *</Label>
                  <Input
                    id="patient-name"
                    placeholder="e.g., Dad, Mom, Grandpa"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-dob">Date of Birth (Optional)</Label>
                  <Input
                    id="patient-dob"
                    type="date"
                    value={patientDob}
                    onChange={(e) => setPatientDob(e.target.value)}
                    disabled={isLoading}
                    className="text-base"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Hub
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Join an existing hub using an invite code from a family member.
              </p>
              <form onSubmit={handleJoinHub} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code *</Label>
                  <Input
                    id="invite-code"
                    placeholder="Enter the 6-character code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    maxLength={6}
                    className="text-base tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join Hub
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
