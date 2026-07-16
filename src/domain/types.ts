/**
 * Domain types for AutoAce.
 *
 * These types describe the application's core entities and are completely
 * independent of any backend, ORM, or database engine. Both the backend
 * ports (src/backend/ports) and the application services
 * (src/application/services) speak in these types — nothing outside
 * src/backend/adapters should ever import a vendor SDK type
 * (e.g. a Supabase row type, a Postgres type, etc).
 */

export type UUID = string;
export type ISODateString = string;

export type AppRole = "admin" | "user";

export type VehicleStatus = "available" | "reserved" | "sold";

export type MatchStatus =
  | "new"
  | "reviewing"
  | "sent_to_buyer"
  | "buyer_interested"
  | "viewing_scheduled"
  | "completed"
  | "rejected";

/** A buyer's request for a vehicle. Maps to the old `buyer_submissions` table. */
export interface BuyerRequest {
  id: UUID;
  name: string;
  phone: string;
  budget: string;
  preferredMake: string | null;
  preferredModel: string | null;
  preferredYear: string | null;
  city: string | null;
  transmission: string | null;
  fuelType: string | null;
  notes: string | null;
  createdAt: ISODateString;
}

/** Public-safe projection of a BuyerRequest — no name/phone. Used on /requests. */
export type PublicBuyerRequest = Omit<BuyerRequest, "name" | "phone">;

export interface CreateBuyerRequestInput {
  name: string;
  phone: string;
  budget: string;
  preferredMake?: string | null;
  preferredModel?: string | null;
  preferredYear?: string | null;
  city?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  notes?: string | null;
}

/** A seller's vehicle listing. Maps to the old `seller_submissions` table. */
export interface VehicleListing {
  id: UUID;
  name: string;
  phone: string;
  make: string;
  model: string;
  year: number;
  price: string;
  mileage: string;
  transmission: string | null;
  fuelType: string | null;
  city: string | null;
  description: string | null;
  condition: string | null;
  notes: string | null;
  photoPaths: string[];
  status: VehicleStatus;
  buyerRequestId: UUID | null;
  createdAt: ISODateString;
}

/** Public-safe projection of a VehicleListing — no name/phone/notes. Used on /marketplace. */
export type PublicVehicleListing = Omit<
  VehicleListing,
  "name" | "phone" | "notes" | "buyerRequestId"
>;

export interface CreateVehicleListingInput {
  name: string;
  phone: string;
  make: string;
  model: string;
  year: number;
  price: string;
  mileage: string;
  transmission?: string | null;
  fuelType?: string | null;
  city?: string | null;
  description?: string | null;
  condition?: string | null;
  notes?: string | null;
  photoPaths?: string[];
  buyerRequestId?: UUID | null;
}

/** A candidate pairing of a buyer request with a vehicle listing. */
export interface Match {
  id: UUID;
  status: MatchStatus;
  adminNotes: string | null;
  buyerRequest: BuyerRequest;
  vehicleListing: VehicleListing;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A prospective buyer's expression of interest in a specific listing. */
export interface VehicleInterest {
  id: UUID;
  vehicleListingId: UUID;
  name: string;
  phone: string;
  message: string | null;
  createdAt: ISODateString;
}

export interface CreateVehicleInterestInput {
  vehicleListingId: UUID;
  name: string;
  phone: string;
  message?: string | null;
}

export interface AuthenticatedUser {
  id: UUID;
  email: string;
  roles: AppRole[];
}

export interface Session {
  user: AuthenticatedUser;
  accessToken: string;
}
