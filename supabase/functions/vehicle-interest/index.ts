import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { body, optionalText, phone, text } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const input = await body(request);
    const row = {
      vehicle_listing_id: text(input.vehicle_listing_id ?? input.vehicleListingId, "vehicle_listing_id", 80),
      name: text(input.name, "name", 80),
      phone: phone(input.phone),
      message: optionalText(input.message, 1000),
    };
    const { data, error } = await getSupabaseAdmin().from("vehicle_interests").insert(row).select("*").single();
    if (error) throw error;
    return jsonResponse({ status: "success", data });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Interest request failed",
    }, 400);
  }
});
