export const notificationEvents = [
  "buyer_request_created",
  "vehicle_created",
  "vehicle_interest_created",
  "match_created",
  "match_status_changed",
  "vehicle_deleted",
  "buyer_request_deleted",
  "user_registered",
] as const;

export type NotificationEventName = (typeof notificationEvents)[number];

export type NotificationEventPayload = {
  event: NotificationEventName;
  title: string;
  name: string;
  phone: string;
  reason: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export type NotificationEnvironment = {
  NOTIFICATION_WEBHOOK_URL?: string;
};

export interface NotificationService {
  send(payload: NotificationEventPayload): Promise<void>;
}

type Fetcher = typeof fetch;

export function createNotificationService(env: NotificationEnvironment, fetcher: Fetcher = fetch): NotificationService {
  return {
    async send(payload) {
      const webhookUrl = env.NOTIFICATION_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn("notification_webhook_skipped", {
          event: payload.event,
          timestamp: payload.timestamp,
          webhookResponseStatus: "not_configured",
        });
        return;
      }

      try {
        const response = await fetcher(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const logData = {
          event: payload.event,
          timestamp: payload.timestamp,
          webhookResponseStatus: response.status,
        };
        if (response.ok) {
          console.log("notification_webhook_sent", logData);
        } else {
          console.error("notification_webhook_failed", logData);
        }
      } catch {
        console.error("notification_webhook_failed", {
          event: payload.event,
          timestamp: payload.timestamp,
          webhookResponseStatus: "network_error",
        });
      }
    },
  };
}
