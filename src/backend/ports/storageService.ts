/**
 * StorageService port.
 *
 * Handles binary asset storage (vehicle photos). The rest of the app deals
 * only in opaque "paths" and resolved, time-limited "urls" — never in
 * bucket names, signed-URL mechanics, or a specific object storage vendor.
 */
export interface StorageService {
  /**
   * Uploads files under a logical prefix (e.g. a listing id) and returns
   * the storage paths to persist on the owning record.
   */
  uploadFiles(files: File[], prefix: string): Promise<string[]>;

  /**
   * Resolves storage paths into URLs the browser can load directly.
   * Implementations may return signed, time-limited URLs.
   */
  resolveUrls(paths: string[]): Promise<string[]>;

  /** Deletes files at the given paths (admin moderation). */
  deleteFiles(paths: string[]): Promise<void>;
}
