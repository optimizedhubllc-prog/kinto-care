import { WebhookNotificationListener } from "@/components/WebhookNotificationListener";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";

export default function CareLogistics() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    taskNotes: "",
  });

  const logisticsQuery = trpc.careLogistics.list.useQuery({ hubId });
  const createMutation = trpc.careLogistics.create.useMutation();
  const updateMutation = trpc.careLogistics.update.useMutation();
  const deleteMutation = trpc.careLogistics.delete.useMutation();

  const isFamilyAdmin = user?.role === "admin";

  const handleOpenDialog = (logistic?: any) => {
    if (logistic) {
      setEditingId(logistic.id);
      setFormData({
        startTime: logistic.startTime ? new Date(logistic.startTime).toISOString().slice(0, 16) : "",
        endTime: logistic.endTime ? new Date(logistic.endTime).toISOString().slice(0, 16) : "",
        taskNotes: logistic.taskNotes || "",
      });
    } else {
      setEditingId(null);
      setFormData({ startTime: "", endTime: "", taskNotes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startTime || !formData.endTime) {
      toast.error("Start and end times are required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          logisticId: editingId,
          hubId,
          ...formData,
        });
        toast.success("Shift updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        toast.success("Shift added");
      }
      setIsDialogOpen(false);
      logisticsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save shift");
    }
  };

  const handleDelete = async (logisticId: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      await deleteMutation.mutateAsync({ logisticId, hubId });
      toast.success("Shift deleted");
      logisticsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete shift");
    }
  };

  if (logisticsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const logistics = logisticsQuery.data || [];
  const sortedLogistics = [...logistics].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <WebhookNotificationListener hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Care Schedule</h1>
              <p className="text-slate-600 mt-2">Track caregiver shifts and handover notes</p>
            </div>
            {isFamilyAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Add"} Shift</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="taskNotes">Handover Notes</Label>
                    <Input
                      id="taskNotes"
                      value={formData.taskNotes}
                      onChange={(e) => setFormData({ ...formData, taskNotes: e.target.value })}
                      placeholder="e.g., Took medications at 9am"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Update" : "Add"} Shift
                  </Button>
                </form>
              </DialogContent>
              </Dialog>
            )}
        </div>

        {logistics.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-slate-600">No shifts scheduled yet. {isFamilyAdmin && "Add one to get started."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedLogistics.map((log) => {
              const duration = Math.round(
                (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60)
              );
              return (
                <Card key={log.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 mb-2">
                          {format(new Date(log.startTime), "PPpp")} - {format(new Date(log.endTime), "p")}
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-600" />
                          <p className="font-medium">{duration} minutes</p>
                        </div>
                        {log.taskNotes && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">{log.taskNotes}</p>
                          </div>
                        )}
                      </div>
                      {isFamilyAdmin && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(log)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(log.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
