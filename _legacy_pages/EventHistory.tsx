import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, ChevronLeft, AlertCircle, CheckCircle, Clock } from "lucide-react";

/**
 * EventHistory Component
 * 
 * Read-only admin view for webhook event history.
 * Displays all webhook events received by the system in reverse chronological order.
 * Only accessible to Family Admin role members.
 * 
 * Features:
 * - View event type, timestamp, status, and source
 * - Pagination with last 50 events displayed
 * - Status indicators (success/failed/pending)
 * - Read-only, no actions
 */
export default function EventHistory() {
  const { user } = useAuth();
  const { hubId } = useParams() as { hubId: string };
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(0);

  // tRPC queries
  const hubQuery = trpc.hubs.getById.useQuery({ hubId });
  const eventsQuery = trpc.webhooks.getEvents.useQuery(
    { hubId, limit: 50, offset: page * 50 },
    { enabled: !!hubId }
  );

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
            <CardDescription>Only Family Admins can access event history.</CardDescription>
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
  const events = eventsQuery.data || [];

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'delivered':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Delivered',
          badgeVariant: 'default' as const,
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Failed',
          badgeVariant: 'destructive' as const,
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          label: 'Pending',
          badgeVariant: 'secondary' as const,
        };
      default:
        return {
          icon: Clock,
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          label: status,
          badgeVariant: 'outline' as const,
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF0] to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/hub-settings/${hubId}`)}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Event History</h1>
            <p className="text-slate-600 mt-2">Webhook events received by {hub?.patientName}'s hub</p>
          </div>
        </div>

        {/* Events Card */}
        <Card className="border-2 border-[#0D9488]/10 rounded-[32px]">
          <CardHeader>
            <CardTitle className="text-[#0D9488]">Recent Events</CardTitle>
            <CardDescription>
              {eventsQuery.isLoading ? 'Loading...' : `${events.length} event${events.length !== 1 ? 's' : ''} shown`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0D9488]" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No events yet</p>
                <p className="text-sm text-slate-500 mt-1">Webhook events will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event: any) => {
                  const statusDisplay = getStatusDisplay(event.status);
                  const StatusIcon = statusDisplay.icon;
                  const eventDate = new Date(event.createdAt);

                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-[24px] border border-slate-200 hover:border-slate-300 transition-colors ${statusDisplay.bgColor}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <StatusIcon className={`h-5 w-5 ${statusDisplay.color} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            {/* Event Type and Message */}
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-slate-900 truncate">
                                {event.message || 'Webhook Event'}
                              </p>
                              <Badge variant={statusDisplay.badgeVariant} className="flex-shrink-0">
                                {statusDisplay.label}
                              </Badge>
                            </div>

                            {/* Timestamp and Attempts */}
                            <div className="flex flex-col gap-1 text-sm text-slate-600">
                              <p>
                                {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                              </p>
                              {event.deliveryAttempts !== undefined && (
                                <p>Delivery attempts: {event.deliveryAttempts}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {events.length > 0 && (
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0 || eventsQuery.isLoading}
                  className="rounded-[12px]"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={events.length < 50 || eventsQuery.isLoading}
                  className="rounded-[12px]"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
