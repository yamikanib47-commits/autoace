/**
 * NotificationService port.
 *
 * Fire-and-forget outbound notifications triggered by domain events
 * (e.g. "a buyer submitted a request"). The old Lovable implementation
 * posted to a configurable webhook URL from a server function; this port
 * preserves that behavior while staying transport-agnostic.
 */
export type SubmissionNotificationType = "buyer_submission" | "seller_submission";

export interface SubmissionNotificationPayload {
  type: SubmissionNotificationType;
  submission: Record<string, unknown>;
}

export interface NotificationService {
  notifySubmission(payload: SubmissionNotificationPayload): Promise<void>;
}
