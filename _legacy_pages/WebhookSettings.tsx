import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, AlertTriangle, Zap, Search, X, ChevronDown, ChevronUp, Clock, AlertCircle } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

/**
 * Webhook Settings Page
 * 
 * Allows Family Admin to:
 * - View webhook URL and integration instructions
 * - Test webhook connectivity
 * - View webhook event history and statistics
 * - Monitor delivery status with expandable details
 * - Search and filter webhook events
 * - View delivery logs for each event
 */

export default function WebhookSettings() {
  const { hubId } = useParams<{ hubId: string }>();
  const [, navigate] = useLocation();
  const userQuery = trpc.auth.me.useQuery();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "delivered" | "failed">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Fetch hub to check user's role
  const hubQuery = trpc.hubs.getById.useQuery(
    { hubId: hubId || "" },
    { enabled: !!hubId }
  );

  // Check if current user is Family Admin
  const isFamilyAdmin = hubQuery.data?.members?.some(
    m => m.userId === userQuery.data?.id && m.role === 'family_admin'
  );

  // Show loading state while checking permissions
  if (hubQuery.isLoading || userQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect if not Family Admin
  if (!isFamilyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>Only Family Admins can access webhook settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/hubs/${hubId}/dashboard`)} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch webhook data
  const webhookUrlQuery = trpc.webhooks.getWebhookUrl.useQuery(
    { hubId: hubId || "" },
    { enabled: !!hubId }
  );

  const statsQuery = trpc.webhooks.getStats.useQuery(
    { hubId: hubId || "" },
    { enabled: !!hubId }
  );

  const eventsQuery = trpc.webhooks.getEvents.useQuery(
    { hubId: hubId || "", limit: 100 },
    { enabled: !!hubId }
  );

  // Fetch logs for expanded event
  const logsQuery = trpc.webhooks.getLogs.useQuery(
    { eventId: expandedEventId || "", hubId: hubId || "" },
    { enabled: !!expandedEventId && !!hubId }
  );

  const testWebhookMutation = trpc.webhooks.testWebhook.useMutation({
    onSuccess: () => {
      // Refresh stats and events after test
      statsQuery.refetch();
      eventsQuery.refetch();
    },
  });

  const handleCopyUrl = () => {
    if (webhookUrlQuery.data?.url) {
      navigator.clipboard.writeText(webhookUrlQuery.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestWebhook = () => {
    if (hubId) {
      testWebhookMutation.mutate({ hubId });
    }
  };

  // Filter events by date range
  const filterByDateRange = (event: any) => {
    const eventDate = new Date(event.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (dateRangeFilter) {
      case "today":
        return eventDate >= today;
      case "week":
        return eventDate >= weekAgo;
      case "month":
        return eventDate >= monthAgo;
      default:
        return true;
    }
  };

  // Filter events based on search, status, and date range
  const filteredEvents = (eventsQuery.data || []).filter((event) => {
    const matchesSearch = event.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesDateRange = filterByDateRange(event);
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Calculate event counts
  const eventCounts = {
    total: eventsQuery.data?.length || 0,
    delivered: eventsQuery.data?.filter((e) => e.status === "delivered").length || 0,
    failed: eventsQuery.data?.filter((e) => e.status === "failed").length || 0,
    pending: eventsQuery.data?.filter((e) => e.status === "pending").length || 0,
  };

  // Show loading state while checking auth
  if (userQuery.isLoading || hubQuery.isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Prevent rendering if user is not family_admin (redirect happens in useEffect)
  if (!isFamilyAdmin) {
    return null;
  }

  if (!hubId) return <div>Hub not found</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect Kinto with n8n workflows for automated notifications and care coordination
        </p>
      </div>

      {/* Webhook URL Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-teal-600" />
            Webhook Endpoint
          </CardTitle>
          <CardDescription>
            Use this URL to send notifications from n8n to your care hub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhookUrlQuery.isLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : webhookUrlQuery.data ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded font-mono text-sm break-all">
                  {webhookUrlQuery.data.url}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Security Notice</p>
                    <p>
                      All requests must include the X-Webhook-Signature header with HMAC-SHA256
                      signature. Keep your webhook secret secure.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleTestWebhook}
                disabled={testWebhookMutation.isPending}
                className="w-full"
              >
                {testWebhookMutation.isPending ? "Testing..." : "Test Webhook"}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Instructions</CardTitle>
          <CardDescription>How to set up n8n workflows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">1. Payload Format</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`{
  "message": "Medication reminder: Take your vitamins",
  "hubId": "${hubId}",
  "metadata": {
    "source": "n8n",
    "workflow": "medication-reminder"
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Required Headers</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    Content-Type: application/json
                  </span>
                </div>
                <div>
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    X-Webhook-Signature: [HMAC-SHA256 hex digest]
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Signature Generation</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Sign the request body using HMAC-SHA256 with your webhook secret:
              </p>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`const crypto = require('crypto');
const secret = process.env.WEBHOOK_SECRET;
const payload = JSON.stringify(body);
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statsQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Statistics</CardTitle>
            <CardDescription>Activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{statsQuery.data.totalEvents}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">
                  {statsQuery.data.deliveredEvents}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {statsQuery.data.failedEvents}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-teal-600">
                  {statsQuery.data.successRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Event History */}
      {eventsQuery.data && eventsQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Event History</CardTitle>
            <CardDescription>Detailed webhook event tracking and delivery logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Count Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-xl font-bold">{eventCounts.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-700 mb-1">Delivered</p>
                <p className="text-xl font-bold text-green-600">{eventCounts.delivered}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-1">Failed</p>
                <p className="text-xl font-bold text-red-600">{eventCounts.failed}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-700 mb-1">Pending</p>
                <p className="text-xl font-bold text-amber-600">{eventCounts.pending}</p>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-3 border-t pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                  >
                    All ({eventCounts.total})
                  </Button>
                  <Button
                    variant={statusFilter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("pending")}
                  >
                    Pending ({eventCounts.pending})
                  </Button>
                  <Button
                    variant={statusFilter === "delivered" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("delivered")}
                  >
                    Delivered ({eventCounts.delivered})
                  </Button>
                  <Button
                    variant={statusFilter === "failed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("failed")}
                  >
                    Failed ({eventCounts.failed})
                  </Button>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={dateRangeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRangeFilter("all")}
                  >
                    All Time
                  </Button>
                  <Button
                    variant={dateRangeFilter === "today" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRangeFilter("today")}
                  >
                    Today
                  </Button>
                  <Button
                    variant={dateRangeFilter === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRangeFilter("week")}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant={dateRangeFilter === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRangeFilter("month")}
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>
            </div>

            {/* Events Table */}
            <div className="border rounded-lg overflow-hidden">
              {filteredEvents.length > 0 ? (
                <div className="divide-y">
                  {filteredEvents.map((event) => (
                    <div key={event.id}>
                      {/* Event Row */}
                      <button
                        onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                        className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium truncate">{event.message}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge
                            variant={
                              event.status === "delivered"
                                ? "default"
                                : event.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {event.status}
                          </Badge>
                          {expandedEventId === event.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {expandedEventId === event.id && (
                        <div className="bg-muted/30 p-4 border-t space-y-4">
                          {/* Event Payload */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Event Payload</h4>
                            <pre className="bg-background rounded p-3 text-xs overflow-auto border max-h-48">
                              {event.payload
                                ? JSON.stringify(JSON.parse(event.payload), null, 2)
                                : "No payload"}
                            </pre>
                          </div>

                          {/* Delivery Logs */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Delivery Logs</h4>
                            {logsQuery.isLoading ? (
                              <div className="text-sm text-muted-foreground">Loading logs...</div>
                            ) : logsQuery.data && logsQuery.data.length > 0 ? (
                              <div className="space-y-2">
                                {logsQuery.data.map((log, idx) => (
                                  <div key={idx} className="bg-background rounded p-3 border text-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs">
                                        Status: {log.statusCode}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(log.createdAt || "").toLocaleString()}
                                      </span>
                                    </div>
                                    {log.responseMessage && (
                                      <p className="text-muted-foreground">{log.responseMessage}</p>
                                    )}
                                    {log.ipAddress && (
                                      <p className="text-xs text-muted-foreground">
                                        IP: {log.ipAddress}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                No delivery logs available
                              </div>
                            )}
                          </div>

                          {/* Failure Reason */}
                          {event.failureReason && (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <p className="text-sm font-semibold text-red-900 mb-1">Failure Reason</p>
                              <p className="text-sm text-red-800">{event.failureReason}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || dateRangeFilter !== "all"
                    ? "No events match your filters"
                    : "No webhook events yet"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
