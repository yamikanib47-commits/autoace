import { SupabaseAuthService } from "./adapters/supabase/supabaseAuthService";
import { SupabaseDatabaseService } from "./adapters/supabase/supabaseDatabaseService";
import { SupabaseStorageService } from "./adapters/supabase/supabaseStorageService";
import { SupabaseNotificationService } from "./adapters/supabase/supabaseNotificationService";

import type { AuthService } from "./ports/authService";
import type { DatabaseService } from "./ports/databaseService";
import type { StorageService } from "./ports/storageService";
import type { NotificationService } from "./ports/notificationService";

export const authService: AuthService = new SupabaseAuthService();
export const databaseService: DatabaseService = new SupabaseDatabaseService();
export const storageService: StorageService = new SupabaseStorageService();
export const notificationService: NotificationService = new SupabaseNotificationService();

export type { AuthService, DatabaseService, StorageService, NotificationService };
