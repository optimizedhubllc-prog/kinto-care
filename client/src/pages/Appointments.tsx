import { WebhookNotificationListener } from "@/components/WebhookNotificationListener";
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

/**
 * AppointmentCalendar Component
 * Displays appointments in a calendar view with monthly grid,
 * visual indicators for days with appointments, and sidebar
 * showing appointments for the selected day.
 */
function AppointmentCalendar({ appointments }: { appointments: any[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get appointments for the selected date
  const appointmentsForSelectedDate = selectedDate
    ? appointments.filter(apt => isSameDay(new Date(apt.dateTime), selectedDate))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="md:col-span-2">
        <Card className="rounded-[32px] border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-[#0D9488]">Calendar View</CardTitle>
            <CardDescription>Click on a date to see appointments</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-[24px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Appointments for selected date */}
      <div>
        <Card className="rounded-[32px] border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-[#F87171]">
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
            </CardTitle>
            <CardDescription>
              {appointmentsForSelectedDate.length} appointment{appointmentsForSelectedDate.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsForSelectedDate.length === 0 ? (
              <p className="text-sm text-slate-600">No appointments on this date</p>
            ) : (
              <div className="space-y-3">
                {appointmentsForSelectedDate.map(apt => (
                  <div key={apt.id} className="p-3 bg-slate-50 rounded-[16px] border border-slate-200">
                    <p className="font-semibold text-slate-900">{apt.doctorName || "Appointment"}</p>
                    {apt.specialty && <p className="text-xs text-slate-600">{apt.specialty}</p>}
                    <p className="text-sm font-medium text-[#0D9488] mt-1">
                      {format(new Date(apt.dateTime), "h:mm a")}
                    </p>
                    {apt.location && <p className="text-xs text-slate-600 mt-1">📍 {apt.location}</p>}
                    {apt.notes && <p className="text-xs text-slate-600 mt-2">{apt.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
    medicalContactId: undefined as string | undefined,
  });

  const appointmentsQuery = trpc.appointments.list.useQuery({ hubId });
  const medicalContactsQuery = trpc.medicalContacts.list.useQuery({ hubId });
  const createMutation = trpc.appointments.create.useMutation();
  const updateMutation = trpc.appointments.update.useMutation();
  const deleteMutation = trpc.appointments.delete.useMutation();

  // Check if current user is Family Admin using hub membership role
  const isFamilyAdmin = user?.role === "admin"; // TODO: Update to use hub membership role

  const handleOpenDialog = (appointment?: any) => {
    if (appointment) {
      setEditingId(appointment.id);
      setFormData({
        doctorName: appointment.doctorName || "",
        specialty: appointment.specialty || "",
        dateTime: appointment.dateTime ? new Date(appointment.dateTime).toISOString().slice(0, 16) : "",
        location: appointment.location || "",
        notes: appointment.notes || "",
        medicalContactId: appointment.medicalContactId || undefined,
      });
    } else {
      setEditingId(null);
      setFormData({
        doctorName: "",
        specialty: "",
        dateTime: "",
        location: "",
        notes: "",
        medicalContactId: undefined,
      });
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
      <WebhookNotificationListener hubId={hubId} />
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
                    <Label htmlFor="medicalContact">Link to Medical Contact (Optional)</Label>
                    <select
                      id="medicalContact"
                      value={formData.medicalContactId || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const contact = medicalContactsQuery.data?.find(c => c.id === value);
                          setFormData({
                            ...formData,
                            medicalContactId: value,
                            doctorName: contact?.name || formData.doctorName,
                            specialty: contact?.specialty || formData.specialty,
                          });
                        } else {
                          setFormData({ ...formData, medicalContactId: undefined });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    >
                      <option value="">-- Select a contact --</option>
                      {medicalContactsQuery.data?.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} {contact.specialty ? `(${contact.specialty})` : ""}
                        </option>
                      ))}
                    </select>
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
            <AppointmentCalendar appointments={sortedAppointments} />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
}
