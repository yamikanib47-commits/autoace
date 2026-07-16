/**
 * DatabaseService port.
 *
 * Resource-oriented data access, not a generic ORM/query-builder facade.
 * Every method here corresponds to something the AutoAce product actually
 * needs; this keeps the port small, keeps business rules (validation,
 * matching, etc.) out of it, and means swapping the backend never requires
 * touching application services or UI code — only the adapter changes.
 *
 * No method signature references SQL, a table name, or any specific
 * database engine. An adapter is free to implement this against Postgres,
 * a REST API, Zo Computer, or an in-memory store for tests.
 */
import type {
  BuyerRequest,
  CreateBuyerRequestInput,
  CreateVehicleListingInput,
  CreateVehicleInterestInput,
  Match,
  MatchStatus,
  PublicBuyerRequest,
  PublicVehicleListing,
  UUID,
  VehicleInterest,
  VehicleListing,
  VehicleStatus,
} from "@/domain/types";

export interface DatabaseService {
  // --- Buyer requests ---------------------------------------------------
  /** Public, PII-stripped feed shown on /requests. */
  listActiveBuyerRequests(): Promise<PublicBuyerRequest[]>;
  /** Full records, admin-only. */
  listAllBuyerRequests(): Promise<BuyerRequest[]>;
  createBuyerRequest(input: CreateBuyerRequestInput): Promise<BuyerRequest>;
  deleteBuyerRequest(id: UUID): Promise<void>;

  // --- Vehicle listings ---------------------------------------------------
  /** Public, PII-stripped feed shown on /marketplace and /vehicles/:id. */
  listAvailableVehicles(): Promise<PublicVehicleListing[]>;
  /** Full records, admin-only. */
  listAllVehicleListings(): Promise<VehicleListing[]>;
  createVehicleListing(input: CreateVehicleListingInput): Promise<VehicleListing>;
  updateVehicleListingStatus(id: UUID, status: VehicleStatus): Promise<void>;
  deleteVehicleListing(id: UUID): Promise<void>;

  // --- Matches -------------------------------------------------------------
  listMatches(): Promise<Match[]>;
  createMatch(buyerRequestId: UUID, vehicleListingId: UUID): Promise<Match>;
  updateMatchStatus(id: UUID, status: MatchStatus): Promise<void>;

  // --- Vehicle interests -----------------------------------------------------
  createVehicleInterest(input: CreateVehicleInterestInput): Promise<VehicleInterest>;
  listVehicleInterests(): Promise<VehicleInterest[]>;
}
