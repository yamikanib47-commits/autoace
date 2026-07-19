import { handleOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  if (request.method !== "POST") {
    return jsonResponse({ status: "error", message: "Method not allowed" }, 405);
  }

  try {
    const expected = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    const authorization = request.headers.get("authorization");
    if (!expected || authorization !== `Bearer ${expected}`) {
      return jsonResponse({ status: "error", message: "Unauthorized" }, 401);
    }
    const payload = await request.json();
    console.info("WhatsApp webhook received", JSON.stringify({ keys: Object.keys(payload ?? {}) }));
    return jsonResponse({ status: "success", data: { received: true } });
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error instanceof Error ? error.message : "Webhook failed",
    }, 400);
  }
});
