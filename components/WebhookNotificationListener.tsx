import { useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface WebhookNotificationListenerProps {
  hubId: string;
}

/**
 * WebhookNotificationListener
 * 
 * Subscribes to real-time webhook events for a hub and displays toast notifications.
 * Should be mounted in the main dashboard/hub layout.
 * 
 * Usage:
 * <WebhookNotificationListener hubId={currentHubId} />
 */
export function WebhookNotificationListener({ hubId }: WebhookNotificationListenerProps) {
  // Subscribe to webhook events
  const subscription = trpc.webhooks.onNewEvent.useSubscription(
    { hubId },
    {
      onData: (event) => {
        console.log("[WebhookListener] Received event:", event);

        // Display toast notification with event message
        toast.success(event.message, {
          description: "New webhook notification",
          duration: 5000,
        });
      },
      onError: (error) => {
        console.error("[WebhookListener] Subscription error:", error);
        toast.error("Failed to connect to webhook notifications", {
          description: "Connection error",
          duration: 5000,
        });
      },
    }
  );

  useEffect(() => {
    console.log(`[WebhookListener] Mounted for hub ${hubId}`);

    return () => {
      console.log(`[WebhookListener] Unmounted for hub ${hubId}`);
    };
  }, [hubId]);

  // This component doesn't render anything, it just listens
  return null;
}
