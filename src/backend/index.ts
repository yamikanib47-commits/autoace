/**
 * Composition root for the backend layer.
 *
 * This is the ONE place in the whole codebase that decides which concrete
 * adapter implements each port. Application services and UI code must
 * only ever import from here (or directly from `@/backend/ports` for
 * types) — never from `@/backend/adapters/*` directly.
 *
 * To connect Zo Computer: implement the four ports below against its SDK
 * (new files under src/backend/adapters/zo-computer/, following the same
 * shape as the http/ adapters), then swap the imports/instances here.
 * Nothing in src/application or src/routes needs to change.
 */
import { HttpAuthService } from "./adapters/http/httpAuthService";
import { HttpDatabaseService } from "./adapters/http/httpDatabaseService";
import { HttpStorageService } from "./adapters/http/httpStorageService";
import { HttpNotificationService } from "./adapters/http/httpNotificationService";

import type { AuthService } from "./ports/authService";
import type { DatabaseService } from "./ports/databaseService";
import type { StorageService } from "./ports/storageService";
import type { NotificationService } from "./ports/notificationService";

export const authService: AuthService = new HttpAuthService();
export const databaseService: DatabaseService = new HttpDatabaseService();
export const storageService: StorageService = new HttpStorageService();
export const notificationService: NotificationService = new HttpNotificationService();

export type { AuthService, DatabaseService, StorageService, NotificationService };
