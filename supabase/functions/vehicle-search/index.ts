import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { optionalText, text } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    const input = request.method === "GET"
      ? Object.fromEntries(new URL(request.url).searchParams)
      : await request.json();
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("public_vehicle_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (input.make) query = query.ilike("make", `%${text(input.make, "make", 80)}%`);
    if (input.model) query = query.ilike("model", `%${text(input.model, "model", 80)}%`);
    if (input.city) query = query.ilike("city", `%${text(input.city, "city", 80)}%`);
    if (input.status) query = query.eq("status", optionalText(input.status, 20) ?? "available");

    const { data, error } = await query;
    if (error) throw error;
    return jsonResponse({ status: "success", data: data ?? [] });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Vehicle search failed",
    }, 400);
  }
});
