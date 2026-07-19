import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { body, optionalText, phone, text } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const input = await body(request);
    const row = {
      name: text(input.name, "name", 80),
      phone: phone(input.phone),
      budget: text(input.budget, "budget", 80),
      preferred_make: optionalText(input.preferred_make ?? input.make, 80),
      preferred_model: optionalText(input.preferred_model ?? input.model, 80),
      preferred_year: optionalText(input.preferred_year ?? input.year, 20),
      city: optionalText(input.city, 80),
      transmission: optionalText(input.transmission, 40),
      fuel_type: optionalText(input.fuel_type ?? input.fuel, 40),
      notes: optionalText(input.notes, 1000),
    };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("buyer_requests").insert(row).select("*").single();
    if (error) throw error;

    let matchesQuery = supabase
      .from("public_vehicle_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (row.preferred_make) matchesQuery = matchesQuery.ilike("make", `%${row.preferred_make}%`);
    if (row.preferred_model) matchesQuery = matchesQuery.ilike("model", `%${row.preferred_model}%`);
    if (row.city) matchesQuery = matchesQuery.ilike("city", `%${row.city}%`);
    const matchesResult = await matchesQuery;

    return jsonResponse({
      status: "success",
      data: { request: data, matches: matchesResult.error ? [] : matchesResult.data ?? [] },
    });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Buyer request failed",
    }, 400);
  }
});
