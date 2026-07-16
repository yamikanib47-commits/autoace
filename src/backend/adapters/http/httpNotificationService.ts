/**
 * REST-backed implementation of NotificationService.
 *
 * Expected backend contract:
 *   POST /notifications/submission   { type, submission } -> 204
 *
 * The backend is responsible for forwarding this to wherever the old
 * WEBHOOK_URL pointed (e.g. Slack, a CRM, WhatsApp Business API, etc).
 * Failures are logged, not thrown — a notification failure should never
 * block a user's form submission from succeeding.
 */
import type {
  NotificationService,
  SubmissionNotificationPayload,
} from "@/backend/ports/notificationService";
import { apiFetch } from "./httpClient";

export class HttpNotificationService implements NotificationService {
  async notifySubmission(payload: SubmissionNotificationPayload): Promise<void> {
    try {
      await apiFetch<void>("/notifications/submission", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true,
      });
    } catch (err) {
      console.error("[notifications] delivery failed", err);
    }
  }
}
