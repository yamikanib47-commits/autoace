import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { body, optionalText, phone, text, year } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  try {
    const input = await body(request);
    const listingId = typeof input.id === "string" && input.id ? input.id : crypto.randomUUID();
    const row = {
      id: listingId,
      name: text(input.name, "name", 80),
      phone: phone(input.phone),
      make: text(input.make, "make", 80),
      model: text(input.model, "model", 80),
      year: year(input.year),
      price: text(input.price, "price", 80),
      mileage: text(input.mileage, "mileage", 80),
      transmission: optionalText(input.transmission, 40),
      fuel_type: optionalText(input.fuel_type ?? input.fuel, 40),
      city: optionalText(input.city, 80),
      condition: optionalText(input.condition, 40),
      description: optionalText(input.description, 1000),
      notes: optionalText(input.notes, 1000),
      photo_paths: Array.isArray(input.photo_paths) ? input.photo_paths.filter((item): item is string => typeof item === "string").slice(0, 20) : [],
      buyer_request_id: optionalText(input.buyer_request_id, 80),
    };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("vehicle_listings").insert(row).select("*").single();
    if (error) throw error;
    if (row.buyer_request_id) {
      const matchResult = await supabase.from("matches").upsert({ buyer_request_id: row.buyer_request_id, vehicle_listing_id: listingId }, { onConflict: "buyer_request_id,vehicle_listing_id", ignoreDuplicates: true });
      if (matchResult.error) throw matchResult.error;
    }
    return jsonResponse({ status: "success", data });
  } catch (error) {
    return jsonResponse({ status: "error", message: error instanceof Error ? error.message : "Seller submission failed" }, 400);
  }
});
