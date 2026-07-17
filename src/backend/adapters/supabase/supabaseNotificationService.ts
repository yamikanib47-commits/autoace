import type { NotificationService, SubmissionNotificationPayload } from "@/backend/ports/notificationService";

export class SupabaseNotificationService implements NotificationService {
  async notifySubmission(_payload: SubmissionNotificationPayload): Promise<void> {
    return;
  }
}
