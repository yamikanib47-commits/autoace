/**
 * REST-backed implementation of StorageService.
 *
 * Expected backend contract:
 *   POST   /storage/vehicle-photos/:prefix   multipart FormData "files" -> { paths: string[] }
 *   POST   /storage/vehicle-photos/resolve   { paths }                 -> { urls: string[] }
 *   DELETE /storage/vehicle-photos           { paths }                 (admin)
 *
 * The old Supabase implementation signed URLs client-side against a
 * private bucket; this adapter instead asks the backend to resolve paths
 * into URLs, which keeps signing-key material off the client entirely.
 */
import type { StorageService } from "@/backend/ports/storageService";
import { apiFetch } from "./httpClient";

export class HttpStorageService implements StorageService {
  async uploadFiles(files: File[], prefix: string): Promise<string[]> {
    if (files.length === 0) return [];
    const form = new FormData();
    for (const file of files) form.append("files", file, file.name);
    const { paths } = await apiFetch<{ paths: string[] }>(
      `/storage/vehicle-photos/${encodeURIComponent(prefix)}`,
      { method: "POST", body: form, skipAuth: true },
    );
    return paths;
  }

  async resolveUrls(paths: string[]): Promise<string[]> {
    if (paths.length === 0) return [];
    const { urls } = await apiFetch<{ urls: string[] }>("/storage/vehicle-photos/resolve", {
      method: "POST",
      body: JSON.stringify({ paths }),
      skipAuth: true,
    });
    return urls;
  }

  async deleteFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await apiFetch<void>("/storage/vehicle-photos", {
      method: "DELETE",
      body: JSON.stringify({ paths }),
    });
  }
}
