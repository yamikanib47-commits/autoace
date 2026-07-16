/**
 * REST-backed implementation of DatabaseService.
 *
 * Expected backend contract (adjust to match Zo Computer's actual API —
 * see docs/ARCHITECTURE.md "Backend contract"). All list/create endpoints
 * below replace what used to be direct Supabase table access, RPC
 * functions (get_active_buyer_requests, get_available_vehicles), and the
 * `create_match_on_seller_submission` trigger:
 *
 *   GET    /buyer-requests/public        -> PublicBuyerRequest[]
 *   GET    /buyer-requests                -> BuyerRequest[]        (admin)
 *   POST   /buyer-requests                { ...CreateBuyerRequestInput }
 *   DELETE /buyer-requests/:id                                     (admin)
 *
 *   GET    /vehicles/available            -> PublicVehicleListing[]
 *   GET    /vehicles                      -> VehicleListing[]      (admin)
 *   POST   /vehicles                      { ...CreateVehicleListingInput }
 *   PATCH  /vehicles/:id/status           { status }                (admin)
 *   DELETE /vehicles/:id                                            (admin)
 *
 *   GET    /matches                       -> Match[]                (admin)
 *   POST   /matches                       { buyerRequestId, vehicleListingId }
 *   PATCH  /matches/:id/status            { status }                (admin)
 *
 *   POST   /vehicle-interests             { ...CreateVehicleInterestInput }
 *   GET    /vehicle-interests             -> VehicleInterest[]      (admin)
 *
 * The backend — not this adapter — is responsible for enforcing who may
 * call the admin-only endpoints, input length limits, and any equivalent
 * of the old auto-match-on-submission behavior if you choose to keep it
 * server-side. This app's application layer also creates the match
 * explicitly (see sellerService.submitListing), so it is safe for the
 * backend to leave that to the client.
 */
import type { DatabaseService } from "@/backend/ports/databaseService";
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
import { apiFetch } from "./httpClient";

export class HttpDatabaseService implements DatabaseService {
  listActiveBuyerRequests(): Promise<PublicBuyerRequest[]> {
    return apiFetch("/buyer-requests/public", { skipAuth: true });
  }

  listAllBuyerRequests(): Promise<BuyerRequest[]> {
    return apiFetch("/buyer-requests");
  }

  createBuyerRequest(input: CreateBuyerRequestInput): Promise<BuyerRequest> {
    return apiFetch("/buyer-requests", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });
  }

  deleteBuyerRequest(id: UUID): Promise<void> {
    return apiFetch(`/buyer-requests/${id}`, { method: "DELETE" });
  }

  listAvailableVehicles(): Promise<PublicVehicleListing[]> {
    return apiFetch("/vehicles/available", { skipAuth: true });
  }

  listAllVehicleListings(): Promise<VehicleListing[]> {
    return apiFetch("/vehicles");
  }

  createVehicleListing(input: CreateVehicleListingInput): Promise<VehicleListing> {
    return apiFetch("/vehicles", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });
  }

  updateVehicleListingStatus(id: UUID, status: VehicleStatus): Promise<void> {
    return apiFetch(`/vehicles/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  deleteVehicleListing(id: UUID): Promise<void> {
    return apiFetch(`/vehicles/${id}`, { method: "DELETE" });
  }

  listMatches(): Promise<Match[]> {
    return apiFetch("/matches");
  }

  createMatch(buyerRequestId: UUID, vehicleListingId: UUID): Promise<Match> {
    return apiFetch("/matches", {
      method: "POST",
      body: JSON.stringify({ buyerRequestId, vehicleListingId }),
    });
  }

  updateMatchStatus(id: UUID, status: MatchStatus): Promise<void> {
    return apiFetch(`/matches/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  createVehicleInterest(input: CreateVehicleInterestInput): Promise<VehicleInterest> {
    return apiFetch("/vehicle-interests", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });
  }

  listVehicleInterests(): Promise<VehicleInterest[]> {
    return apiFetch("/vehicle-interests");
  }
}
