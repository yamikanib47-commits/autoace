/**
 * buyerService — orchestrates buyer-request use cases.
 *
 * Business rule preserved from the old implementation: every successful
 * submission also fires a best-effort outbound notification (previously a
 * Postgres-adjacent webhook called from a TanStack server function). A
 * notification failure must never fail the user-facing submission.
 */
import { databaseService, notificationService } from "@/backend";
import type { BuyerRequestFormValues } from "@/application/validation/schemas";
import type { BuyerRequest, PublicBuyerRequest } from "@/domain/types";

export const buyerService = {
  async listActiveRequests(): Promise<PublicBuyerRequest[]> {
    return databaseService.listActiveBuyerRequests();
  },

  async listAllForAdmin(): Promise<BuyerRequest[]> {
    return databaseService.listAllBuyerRequests();
  },

  async submitRequest(values: BuyerRequestFormValues): Promise<BuyerRequest> {
    const request = await databaseService.createBuyerRequest({
      name: values.name,
      phone: values.phone,
      budget: values.budget,
      preferredMake: values.make || null,
      preferredModel: values.model || null,
      preferredYear: values.year || null,
      city: values.city || null,
      transmission: values.transmission || null,
      fuelType: values.fuel || null,
      notes: values.notes || null,
    });

    void notificationService
      .notifySubmission({
        type: "buyer_submission",
        submission: request as unknown as Record<string, unknown>,
      })
      .catch((err) => console.error("[buyerService] notification failed", err));

    return request;
  },

  async deleteRequest(id: string): Promise<void> {
    return databaseService.deleteBuyerRequest(id);
  },
};
