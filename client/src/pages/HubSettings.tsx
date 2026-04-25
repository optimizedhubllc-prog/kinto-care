import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Loader2, Trash2, Users, Shield, Eye, Zap, History } from "lucide-react";
import { WebhookNotificationListener } from "@/components/WebhookNotificationListener";

/**
 * HubSettings Component
 * 
 * Provides Family Admin with full hub management capabilities:
 * - View and manage hub members
 * - Change member roles (family_admin, family_viewer, caregiver)
 * - Remove members from hub
 * - Generate and share invite codes
 * - View hub information
 * 
 * Only accessible to Family Admin role members.
 */
export default function HubSettings() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [, setLocation] = useLocation();
  
  // State for dialogs and actions
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<"family_admin" | "family_viewer" | "caregiver" | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<number | null>(null);

  // tRPC queries and mutations
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const generateInviteCodeMutation = trpc.hubs.generateInviteCode.useMutation();
  const updateRoleMutation = trpc.hubMembers.updateRole.useMutation();
  const removeMemberMutation = trpc.hubMembers.remove.useMutation();
  const utils = trpc.useUtils();

  // Check if current user is Family Admin
  const isFamilyAdmin = hubQuery.data?.members?.some(
    m => m.userId === user?.id && m.role === 'family_admin'
  );

  // Redirect if not Family Admin
  if (hubQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isFamilyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>Only Family Admins can access hub settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation(`/dashboard/${hubId}`)} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hub = hubQuery.data;
  const members = hub?.members || [];

  // Handle generate invite code
  const handleGenerateInviteCode = async () => {
    try {
      await generateInviteCodeMutation.mutateAsync({ hubId });
      await utils.hubs.getById.invalidate({ hubId });
      toast.success("Invite code generated successfully");
    } catch (error) {
      toast.error("Failed to generate invite code");
    }
  };



  // Handle role change
  const handleChangeRole = async () => {
    if (selectedMemberForRole === null || !newRole) return;

    try {
      await updateRoleMutation.mutateAsync({
        hubId,
        userId: selectedMemberForRole,
        newRole,
      });
      await utils.hubs.getById.invalidate({ hubId });
      toast.success(`Member role updated to ${newRole.replace('_', ' ')}`);
      setSelectedMemberForRole(null);
      setNewRole(null);
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  // Handle remove member
  const handleRemoveMember = async () => {
    if (memberToRemove === null) return;

    try {
      await removeMemberMutation.mutateAsync({
        hubId,
        userId: memberToRemove,
      });
      await utils.hubs.getById.invalidate({ hubId });
      toast.success("Member removed from hub");
      setMemberToRemove(null);
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  // Get role display name and icon
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'family_admin':
        return { name: 'Family Admin', icon: Shield, color: 'text-red-600' };
      case 'family_viewer':
        return { name: 'Family Viewer', icon: Eye, color: 'text-blue-600' };
      case 'caregiver':
        return { name: 'Caregiver', icon: Users, color: 'text-green-600' };
      default:
        return { name: role, icon: Users, color: 'text-slate-600' };
    }
  };

  return (
    <>
      <WebhookNotificationListener hubId={hubId} />
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBF0] to-slate-100">
        <div className="max-w-4xl mx-auto p-4 md:p-6 md:ml-0">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Hub Settings</h1>
              <p className="text-slate-600 mt-2">Manage {hub?.patientName}'s care hub and team members</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation(`/event-history/${hubId}`)}
                variant="outline"
                className="flex items-center gap-2 rounded-[2rem] border-[#0D9488] text-[#0D9488] hover:bg-[#CCFBF1]"
              >
                <History className="h-4 w-4" />
                Event History
              </Button>
              <Button
                onClick={() => setLocation(`/webhook-settings/${hubId}`)}
                variant="outline"
                className="flex items-center gap-2 rounded-[2rem] border-[#0D9488] text-[#0D9488] hover:bg-[#CCFBF1]"
              >
                <Zap className="h-4 w-4" />
                Webhooks
              </Button>
            </div>
          </div>

          {/* Hub Information Card */}
          <Card className="mb-6 border-2 border-[#0D9488]/10 rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-[#0D9488]">Hub Information</CardTitle>
              <CardDescription>Details about this care hub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-600">Patient Name</Label>
                <p className="text-lg font-semibold text-slate-900">{hub?.patientName}</p>
              </div>
              {hub?.patientDob && (
                <div>
                  <Label className="text-slate-600">Date of Birth</Label>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(hub.patientDob).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-slate-600">Hub ID</Label>
                <p className="text-sm font-mono text-slate-600 break-all">{hubId}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invite Code Card */}
          <Card className="mb-6 border-2 border-[#F87171]/10 rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-[#F87171]">Invite New Members</CardTitle>
              <CardDescription>Share this code to invite family members or caregivers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">Generate an invite code to share with family members and caregivers.</p>
              <Button
                onClick={handleGenerateInviteCode}
                disabled={generateInviteCodeMutation.isPending}
                className="w-full bg-[#F87171] hover:bg-[#F87171]/90 text-white"
              >
                {generateInviteCodeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate New Invite Code'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Members Management Card */}
          <Card className="border-2 border-[#0D9488]/10 rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-[#0D9488]">Team Members</CardTitle>
              <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''} in this hub</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => {
                  const roleInfo = getRoleInfo(member.role);
                  const RoleIcon = roleInfo.icon;
                  const isCurrentUser = member.userId === user?.id;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-[24px] border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <RoleIcon className={`h-5 w-5 ${roleInfo.color}`} />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            {member.userId}
                            {isCurrentUser && <span className="text-xs ml-2 text-slate-600">(You)</span>}
                          </p>
                          <p className="text-sm text-slate-600">{roleInfo.name}</p>
                        </div>
                      </div>

                      {/* Action Buttons - Only for non-current users */}
                      {!isCurrentUser && (
                        <div className="flex gap-2">
                          {/* Change Role Dialog */}
                          <Dialog open={selectedMemberForRole === member.userId} onOpenChange={(open) => {
                            if (!open) {
                              setSelectedMemberForRole(null);
                              setNewRole(null);
                            } else {
                              setSelectedMemberForRole(member.userId);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[#0D9488] border-[#0D9488]/20 hover:bg-[#0D9488]/5"
                                aria-label={`Change role for ${member.userId}`}
                              >
                                Change Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[24px]">
                              <DialogHeader>
                                <DialogTitle>Change Member Role</DialogTitle>
                                <DialogDescription>
                                  Update the role for {member.userId}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="role-select">New Role</Label>
                                  <Select value={newRole || member.role} onValueChange={(value) => setNewRole(value as any)}>
                                    <SelectTrigger id="role-select" className="rounded-[16px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="family_admin">Family Admin</SelectItem>
                                      <SelectItem value="family_viewer">Family Viewer</SelectItem>
                                      <SelectItem value="caregiver">Caregiver</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" onClick={() => setSelectedMemberForRole(null)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleChangeRole}
                                    disabled={updateRoleMutation.isPending || newRole === member.role}
                                    className="bg-[#0D9488] hover:bg-[#0D9488]/90 text-white"
                                  >
                                    {updateRoleMutation.isPending ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      'Update Role'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Remove Member Alert Dialog */}
                          <AlertDialog open={memberToRemove === member.userId} onOpenChange={(open) => {
                            if (!open) {
                              setMemberToRemove(null);
                            } else {
                              setMemberToRemove(member.userId);
                            }
                          }}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              aria-label={`Remove ${member.userId} from hub`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <AlertDialogContent className="rounded-[24px]">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.userId} from this hub? They will lose access to all care information.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex gap-2 justify-end">
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleRemoveMember}
                                  disabled={removeMemberMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {removeMemberMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Removing...
                                    </>
                                  ) : (
                                    'Remove Member'
                                  )}
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => setLocation(`/dashboard/${hubId}`)}
              className="rounded-[16px]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
