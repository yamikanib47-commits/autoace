/**
 * vehicleInterestService — a buyer expressing interest in a specific
 * listing from the vehicle detail page, plus the admin-side read.
 */
import { databaseService } from "@/backend";
import { edgeFunctionUrl } from "@/backend/adapters/supabase/supabaseClient";
import type { VehicleInterestFormValues } from "@/application/validation/schemas";
import type { VehicleInterest } from "@/domain/types";

export const vehicleInterestService = {
  async registerInterest(
    vehicleListingId: string,
    values: VehicleInterestFormValues,
  ): Promise<VehicleInterest> {
    const response = await fetch(edgeFunctionUrl("vehicle-interest"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_listing_id: vehicleListingId,
        name: values.name,
        phone: values.phone,
        message: values.message || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status !== "success") throw new Error(payload?.message ?? "Interest request failed");
    return payload.data as VehicleInterest;
  },

  async listAllForAdmin(): Promise<VehicleInterest[]> {
    return databaseService.listVehicleInterests();
  },
};
