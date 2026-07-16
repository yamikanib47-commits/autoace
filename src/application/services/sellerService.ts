/**
 * sellerService — orchestrates vehicle-listing use cases.
 *
 * Business rule preserved from the old implementation: when a seller
 * submits a listing in response to a specific buyer request
 * (buyerRequestId set), a Match must be created linking the two — this
 * used to happen in a Postgres trigger
 * (`create_match_on_seller_submission`); it now happens explicitly here,
 * in the application layer, where it's visible and testable instead of
 * hidden in database triggers.
 */
import { databaseService, notificationService } from "@/backend";
import { uploadService } from "./uploadService";
import type { VehicleListingFormValues } from "@/application/validation/schemas";
import type { PublicVehicleListing, VehicleListing, VehicleStatus } from "@/domain/types";

export const sellerService = {
  async listAvailable(): Promise<PublicVehicleListing[]> {
    return databaseService.listAvailableVehicles();
  },

  async listAllForAdmin(): Promise<VehicleListing[]> {
    return databaseService.listAllVehicleListings();
  },

  async getById(id: string): Promise<PublicVehicleListing | null> {
    const all = await databaseService.listAvailableVehicles();
    return all.find((v) => v.id === id) ?? null;
  },

  async submitListing(
    values: VehicleListingFormValues,
    photoFiles: File[],
    buyerRequestId: string | null,
  ): Promise<VehicleListing> {
    // The photo prefix becomes the listing id; the backend is expected to
    // honor a client-supplied id on create (or this can be relaxed to let
    // the backend assign one and re-upload — see MIGRATION.md).
    const listingId = crypto.randomUUID();
    const photoPaths = photoFiles.length
      ? await uploadService.uploadVehiclePhotos(photoFiles, listingId)
      : [];

    const listing = await databaseService.createVehicleListing({
      name: values.name,
      phone: values.phone,
      make: values.make,
      model: values.model,
      year: Number(values.year),
      price: values.price,
      mileage: values.mileage,
      transmission: values.transmission || null,
      fuelType: values.fuel_type || null,
      city: values.city || null,
      condition: values.condition || null,
      description: values.description || null,
      notes: values.notes || null,
      photoPaths,
      buyerRequestId,
    });

    if (buyerRequestId) {
      try {
        await databaseService.createMatch(buyerRequestId, listing.id);
      } catch (err) {
        // Preserve the original ON CONFLICT DO NOTHING semantics: a
        // duplicate match should never fail the listing submission.
        console.error("[sellerService] match creation failed", err);
      }
    }

    void notificationService
      .notifySubmission({
        type: "seller_submission",
        submission: listing as unknown as Record<string, unknown>,
      })
      .catch((err) => console.error("[sellerService] notification failed", err));

    return listing;
  },

  async updateStatus(id: string, status: VehicleStatus): Promise<void> {
    return databaseService.updateVehicleListingStatus(id, status);
  },

  async deleteListing(id: string): Promise<void> {
    return databaseService.deleteVehicleListing(id);
  },
};
