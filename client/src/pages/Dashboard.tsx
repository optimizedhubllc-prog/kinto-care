import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Pill, Calendar, Users, Stethoscope } from "lucide-react";
import { useParams, useLocation } from "wouter";
import ResponsiveNav from "@/components/ResponsiveNav";

export default function Dashboard() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [, setLocation] = useLocation();
  
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const medicationsQuery = trpc.medications.list.useQuery({ hubId });
  const appointmentsQuery = trpc.appointments.list.useQuery({ hubId });
  const careLogisticsQuery = trpc.careLogistics.list.useQuery({ hubId });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (hubQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hub = hubQuery.data;
  const medications = medicationsQuery.data || [];
  const appointments = appointmentsQuery.data || [];
  const careLogistics = careLogisticsQuery.data || [];

  const isFamilyAdmin = hub?.members?.some(m => m.userId === user.id && m.role === 'family_admin');

  return (
    <>
      <ResponsiveNav hubId={hubId} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto p-4 md:p-6 md:ml-0">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              {hub?.patientName}'s Care Hub
            </h1>
            <p className="text-slate-600 mt-2">
              Welcome, {user.name}. You have {isFamilyAdmin ? 'admin' : 'view-only'} access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Medications Module */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <CardTitle>Medications</CardTitle>
                </div>
                <CardDescription>Active medications and dosages</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{medications.length}</p>
                <p className="text-sm text-slate-600 mt-2">Active medications</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => setLocation(`/medications/${hubId}`)}>
                  View Medications
                </Button>
              </CardContent>
            </Card>

            {/* Appointments Module */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <CardTitle>Appointments</CardTitle>
                </div>
                <CardDescription>Upcoming doctor visits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
                <p className="text-sm text-slate-600 mt-2">Total appointments</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => setLocation(`/appointments/${hubId}`)}>
                  View Appointments
                </Button>
              </CardContent>
            </Card>

            {/* Care Logistics Module */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <CardTitle>Care Schedule</CardTitle>
                </div>
                <CardDescription>Caregiver shifts and handovers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{careLogistics.length}</p>
                <p className="text-sm text-slate-600 mt-2">Scheduled shifts</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => setLocation(`/care-logistics/${hubId}`)}>
                  View Schedule
                </Button>
              </CardContent>
            </Card>

            {/* Medical Contacts Module */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-orange-600" />
                  <CardTitle>Medical Contacts</CardTitle>
                </div>
                <CardDescription>Doctors and healthcare providers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">Reference</p>
                <p className="text-sm text-slate-600 mt-2">View all contacts</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => setLocation(`/medical-contacts/${hubId}`)}>
                  View Contacts
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Hub Members Section */}
          {hub?.members && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Hub Members</CardTitle>
                <CardDescription>People with access to this care hub</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hub.members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{member.userId}</p>
                        <p className="text-sm text-slate-600">{member.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {isFamilyAdmin && (
                  <Button className="w-full mt-4" variant="default">
                    Manage Members
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
