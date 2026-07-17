import type { DatabaseService } from "@/backend/ports/databaseService";
import type {
  BuyerRequest,
  CreateBuyerRequestInput,
  CreateVehicleInterestInput,
  CreateVehicleListingInput,
  Match,
  MatchStatus,
  PublicBuyerRequest,
  PublicVehicleListing,
  UUID,
  VehicleInterest,
  VehicleListing,
  VehicleStatus,
} from "@/domain/types";
import { getSupabaseClient } from "./supabaseClient";

type Row = Record<string, unknown>;

const buyer = (row: Row): BuyerRequest => ({
  id: row.id as string,
  name: row.name as string,
  phone: row.phone as string,
  budget: row.budget as string,
  preferredMake: row.preferred_make as string | null,
  preferredModel: row.preferred_model as string | null,
  preferredYear: row.preferred_year as string | null,
  city: row.city as string | null,
  transmission: row.transmission as string | null,
  fuelType: row.fuel_type as string | null,
  notes: row.notes as string | null,
  createdAt: row.created_at as string,
});

const publicBuyer = (row: Row): PublicBuyerRequest => ({
  id: row.id as string,
  budget: row.budget as string,
  preferredMake: row.preferred_make as string | null,
  preferredModel: row.preferred_model as string | null,
  preferredYear: row.preferred_year as string | null,
  city: row.city as string | null,
  transmission: row.transmission as string | null,
  fuelType: row.fuel_type as string | null,
  notes: null,
  createdAt: row.created_at as string,
});

const vehicle = (row: Row): VehicleListing => ({
  id: row.id as string,
  name: row.name as string,
  phone: row.phone as string,
  make: row.make as string,
  model: row.model as string,
  year: row.year as number,
  price: row.price as string,
  mileage: row.mileage as string,
  transmission: row.transmission as string | null,
  fuelType: row.fuel_type as string | null,
  city: row.city as string | null,
  description: row.description as string | null,
  condition: row.condition as string | null,
  notes: row.notes as string | null,
  photoPaths: (row.photo_paths as string[]) ?? [],
  status: row.status as VehicleStatus,
  buyerRequestId: row.buyer_request_id as string | null,
  createdAt: row.created_at as string,
});

const publicVehicle = (row: Row): PublicVehicleListing => ({
  id: row.id as string,
  make: row.make as string,
  model: row.model as string,
  year: row.year as number,
  price: row.price as string,
  mileage: row.mileage as string,
  transmission: row.transmission as string | null,
  fuelType: row.fuel_type as string | null,
  city: row.city as string | null,
  description: row.description as string | null,
  condition: row.condition as string | null,
  photoPaths: (row.photo_paths as string[]) ?? [],
  status: row.status as VehicleStatus,
  createdAt: row.created_at as string,
});

const match = (row: Row): Match => ({
  id: row.id as string,
  status: row.status as MatchStatus,
  adminNotes: row.admin_notes as string | null,
  buyerRequest: buyer(row.buyer_request as Row),
  vehicleListing: vehicle(row.vehicle_listing as Row),
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const interest = (row: Row): VehicleInterest => ({
  id: row.id as string,
  vehicleListingId: row.vehicle_listing_id as string,
  name: row.name as string,
  phone: row.phone as string,
  message: row.message as string | null,
  createdAt: row.created_at as string,
});

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data as T;
}

async function listMatchesFromRows(): Promise<Match[]> {
  const rows = await unwrap(
    getSupabaseClient()
      .from("matches")
      .select("*, buyer_request:buyer_requests(*), vehicle_listing:vehicle_listings(*)")
      .order("created_at", { ascending: false }),
  );
  return (rows as Row[]).map(match);
}

export class SupabaseDatabaseService implements DatabaseService {
  async listActiveBuyerRequests() {
    return (await unwrap(getSupabaseClient().from("public_buyer_requests").select("*").order("created_at", { ascending: false }))).map(publicBuyer);
  }

  async listAllBuyerRequests() {
    return (await unwrap(getSupabaseClient().from("buyer_requests").select("*").order("created_at", { ascending: false }))).map(buyer);
  }

  async createBuyerRequest(input: CreateBuyerRequestInput) {
    return buyer(await unwrap(getSupabaseClient().from("buyer_requests").insert({
      name: input.name,
      phone: input.phone,
      budget: input.budget,
      preferred_make: input.preferredMake ?? null,
      preferred_model: input.preferredModel ?? null,
      preferred_year: input.preferredYear ?? null,
      city: input.city ?? null,
      transmission: input.transmission ?? null,
      fuel_type: input.fuelType ?? null,
      notes: input.notes ?? null,
    }).select().single()));
  }

  async deleteBuyerRequest(id: UUID) {
    await unwrap(getSupabaseClient().from("buyer_requests").delete().eq("id", id));
  }

  async listAvailableVehicles() {
    return (await unwrap(getSupabaseClient().from("public_vehicle_listings").select("*").order("created_at", { ascending: false }))).map(publicVehicle);
  }

  async listAllVehicleListings() {
    return (await unwrap(getSupabaseClient().from("vehicle_listings").select("*").order("created_at", { ascending: false }))).map(vehicle);
  }

  async createVehicleListing(input: CreateVehicleListingInput) {
    return vehicle(await unwrap(getSupabaseClient().from("vehicle_listings").insert({
      name: input.name,
      phone: input.phone,
      make: input.make,
      model: input.model,
      year: input.year,
      price: input.price,
      mileage: input.mileage,
      transmission: input.transmission ?? null,
      fuel_type: input.fuelType ?? null,
      city: input.city ?? null,
      description: input.description ?? null,
      condition: input.condition ?? null,
      notes: input.notes ?? null,
      photo_paths: input.photoPaths ?? [],
      buyer_request_id: input.buyerRequestId ?? null,
    }).select().single()));
  }

  async updateVehicleListingStatus(id: UUID, status: VehicleStatus) {
    await unwrap(getSupabaseClient().from("vehicle_listings").update({ status }).eq("id", id));
  }

  async deleteVehicleListing(id: UUID) {
    await unwrap(getSupabaseClient().from("vehicle_listings").delete().eq("id", id));
  }

  listMatches() {
    return listMatchesFromRows();
  }

  async createMatch(buyerRequestId: UUID, vehicleListingId: UUID) {
    const row = await unwrap(getSupabaseClient().from("matches").insert({ buyer_request_id: buyerRequestId, vehicle_listing_id: vehicleListingId }).select("*, buyer_request:buyer_requests(*), vehicle_listing:vehicle_listings(*)").single());
    return match(row as unknown as Row);
  }

  async updateMatchStatus(id: UUID, status: MatchStatus) {
    await unwrap(getSupabaseClient().from("matches").update({ status, updated_at: new Date().toISOString() }).eq("id", id));
  }

  async createVehicleInterest(input: CreateVehicleInterestInput) {
    return interest(await unwrap(getSupabaseClient().from("vehicle_interests").insert({
      vehicle_listing_id: input.vehicleListingId,
      name: input.name,
      phone: input.phone,
      message: input.message ?? null,
    }).select().single()));
  }

  async listVehicleInterests() {
    return (await unwrap(getSupabaseClient().from("vehicle_interests").select("*").order("created_at", { ascending: false }))).map(interest);
  }
}
