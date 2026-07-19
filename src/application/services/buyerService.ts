/**
 * buyerService — orchestrates buyer-request use cases.
 *
 * Business rule preserved from the old implementation: every successful
 * submission also fires a best-effort outbound notification (previously a
 * Postgres-adjacent webhook called from a TanStack server function). A
 * notification failure must never fail the user-facing submission.
 */
import { databaseService, notificationService } from "@/backend";
import { supabaseUrl } from "@/backend/adapters/supabase/supabaseClient";
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
    const response = await fetch(`${supabaseUrl}/functions/v1/create-buyer-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        phone: values.phone,
        budget: values.budget,
        make: values.make || null,
        model: values.model || null,
        year: values.year || null,
        city: values.city || null,
        transmission: values.transmission || null,
        fuel: values.fuel || null,
        notes: values.notes || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status !== "success") {
      throw new Error(payload?.message ?? "Could not submit your request");
    }

    const request = payload.data.request as BuyerRequest;
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
