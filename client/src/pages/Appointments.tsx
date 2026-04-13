import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams } from "wouter";
import ResponsiveNav from "@/components/ResponsiveNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Appointments() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    doctorName: "",
    specialty: "",
    dateTime: "",
    location: "",
    notes: "",
  });

  const appointmentsQuery = trpc.appointments.list.useQuery({ hubId });
  const createMutation = trpc.appointments.create.useMutation();
  const updateMutation = trpc.appointments.update.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  const isFamilyAdmin = user?.role === "admin";

  const handleOpenDialog = (appointment?: any) => {
    if (appointment) {
      setEditingId(appointment.id);
      setFormData({
        doctorName: appointment.doctorName || "",
        specialty: appointment.specialty || "",
        dateTime: appointment.dateTime ? new Date(appointment.dateTime).toISOString().slice(0, 16) : "",
        location: appointment.location || "",
        notes: appointment.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({ doctorName: "", specialty: "", dateTime: "", location: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dateTime) {
      toast.error("Date and time are required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          appointmentId: editingId,
          hubId,
          ...formData,
        });
        toast.success("Appointment updated");
      } else {
        await createMutation.mutateAsync({
          hubId,
          ...formData,
        });
        toast.success("Appointment added");
      }
      setIsDialogOpen(false);
      appointmentsQuery.refetch();
    } catch (error) {
      toast.error("Failed to save appointment");
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await deleteMutation.mutateAsync({ appointmentId, hubId });
      toast.success("Appointment deleted");
      appointmentsQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete appointment");
    }
  };

  if (appointmentsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const appointments = appointmentsQuery.data || [];
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 md:ml-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Appointments</h1>
              <p className="text-slate-600 mt-2">Track doctor visits and medical appointments</p>
            </div>
            {isFamilyAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Appointment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit" : "Add"} Appointment</DialogTitle>
                  <DialogDescription>
                    Enter the appointment details below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="doctorName">Doctor Name</Label>
                    <Input
                      id="doctorName"
                      value={formData.doctorName}
                      onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                      placeholder="e.g., Dr. Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="e.g., Cardiology"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTime">Date & Time *</Label>
                    <Input
                      id="dateTime"
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Hospital Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingId ? "Update" : "Add"} Appointment
                  </Button>
                </form>
              </DialogContent>
              </Dialog>
            )}
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {appointments.length === 0 ? (
              <Card>
                <CardContent className="pt-12 text-center">
                  <p className="text-slate-600">No appointments yet. {isFamilyAdmin && "Add one to get started."}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedAppointments.map((apt) => (
                  <Card key={apt.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {apt.doctorName || "Appointment"}
                          </CardTitle>
                          {apt.specialty && <p className="text-sm text-slate-600 mt-1">{apt.specialty}</p>}
                        </div>
                        {isFamilyAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(apt)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(apt.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-600" />
                          <p className="font-medium">{format(new Date(apt.dateTime), "PPpp")}</p>
                        </div>
                        {apt.location && <p className="text-sm text-slate-600">📍 {apt.location}</p>}
                        {apt.notes && <p className="text-sm text-slate-600 mt-2">{apt.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="pt-12 text-center">
                <p className="text-slate-600">Calendar view coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
}
