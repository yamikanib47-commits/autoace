/**
 * uploadService — thin application-layer wrapper around StorageService.
 * Exists so UI code depends on "the app's upload workflow" rather than a
 * storage vendor's API shape directly.
 */
import { storageService } from "@/backend";

export const uploadService = {
  uploadVehiclePhotos(files: File[], listingId: string): Promise<string[]> {
    return storageService.uploadFiles(files, listingId);
  },

  resolveVehiclePhotoUrls(paths: string[] | null | undefined): Promise<string[]> {
    if (!paths || paths.length === 0) return Promise.resolve([]);
    return storageService.resolveUrls(paths);
  },
};
