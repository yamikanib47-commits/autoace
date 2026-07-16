/**
 * vehicleInterestService — a buyer expressing interest in a specific
 * listing from the vehicle detail page, plus the admin-side read.
 */
import { databaseService } from "@/backend";
import type { VehicleInterestFormValues } from "@/application/validation/schemas";
import type { VehicleInterest } from "@/domain/types";

export const vehicleInterestService = {
  async registerInterest(
    vehicleListingId: string,
    values: VehicleInterestFormValues,
  ): Promise<VehicleInterest> {
    return databaseService.createVehicleInterest({
      vehicleListingId,
      name: values.name,
      phone: values.phone,
      message: values.message || null,
    });
  },

  async listAllForAdmin(): Promise<VehicleInterest[]> {
    return databaseService.listVehicleInterests();
  },
};
