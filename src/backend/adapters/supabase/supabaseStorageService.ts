import type { StorageService } from "@/backend/ports/storageService";
import { getSupabaseClient } from "./supabaseClient";

export class SupabaseStorageService implements StorageService {
  async uploadFiles(files: File[], prefix: string): Promise<string[]> {
    const paths: string[] = [];
    for (const file of files) {
      const path = `${prefix}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await getSupabaseClient().storage.from("vehicle-photos").upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      paths.push(path);
    }
    return paths;
  }

  async resolveUrls(paths: string[]): Promise<string[]> {
    return paths.map((path) => getSupabaseClient().storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl);
  }

  async deleteFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await getSupabaseClient().storage.from("vehicle-photos").remove(paths);
    if (error) throw new Error(error.message);
  }
}
