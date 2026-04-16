import { useState } from "react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, AlertTriangle, Zap } from "lucide-react";
import { useParams } from "wouter";

/**
 * Webhook Settings Page
 * 
 * Allows Family Admin to:
 * - View webhook URL and integration instructions
 * - Test webhook connectivity
 * - View webhook event history and statistics
 * - Monitor delivery status
 */

export default function WebhookSettings() {
  const { hubId } = useParams<{ hubId: string }>();
  const userQuery = trpc.auth.me.useQuery();
  const [copied, setCopied] = useState(false);

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
    { hubId: hubId || "", limit: 10 },
    { enabled: !!hubId }
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

      {/* Recent Events */}
      {eventsQuery.data && eventsQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Last 10 webhook events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventsQuery.data.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
