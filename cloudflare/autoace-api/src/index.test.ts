import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import app from "./index";

type EventPayload = Record<string, unknown>;

type ExecutionContextStub = ExecutionContext & { pending: Promise<unknown>[] };

const webhookUrl = "https://example.test/make-webhook";
const env = {
  SUPABASE_URL: "https://supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-only",
  APP_ORIGIN: "https://autoace-cloudflare-test.pages.dev",
  NOTIFICATION_WEBHOOK_URL: webhookUrl,
  NOTIFICATION_EVENT_SECRET: "notification-test-secret",
};

let webhookEvents: EventPayload[];
let webhookShouldFail: boolean;
let originalFetch: typeof globalThis.fetch;

function context(): ExecutionContextStub {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(promise);
    },
    passThroughOnException() {},
  } as ExecutionContextStub;
}

async function request(path: string, init: RequestInit, ctx = context()) {
  const response = await app.fetch(new Request(`https://worker.test${path}`, init), env, ctx);
  await Promise.all(ctx.pending);
  return response;
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

beforeEach(() => {
  webhookEvents = [];
  webhookShouldFail = false;
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init = {}) => {
    const url = String(input);
    if (url === webhookUrl) {
      if (webhookShouldFail) throw new Error("webhook unavailable");
      webhookEvents.push(JSON.parse(String(init.body)) as EventPayload);
      return jsonResponse({ accepted: true }, 202);
    }

    if (url.includes("/rest/v1/buyer_requests") && init.method === "POST") {
      return jsonResponse([{ id: "buyer-1", name: "Buyer Name", phone: "0977000000", budget: "K500,000" }]);
    }
    if (url.includes("/rest/v1/buyer_requests?select=id")) {
      return jsonResponse([{ id: "buyer-1" }]);
    }
    if (url.includes("/rest/v1/vehicle_listings") && init.method === "POST") {
      return jsonResponse([{ id: "vehicle-1", name: "Seller Name", phone: "0966000000", make: "Toyota", model: "Hilux", year: 2022, price: "K700,000", mileage: "40,000 km", photo_paths: [] }]);
    }
    if (url.includes("/rest/v1/matches") && init.method === "POST") {
      return jsonResponse([{ id: "match-1", buyer_request_id: "buyer-1", vehicle_listing_id: "vehicle-1", status: "new" }]);
    }
    return jsonResponse([]);
  }) as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("notification events", () => {
  it("fires buyer_request_created after a successful buyer request", async () => {
    const response = await request("/buyer-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Buyer Name", phone: "0977000000", budget: "K500,000" }),
    });

    expect(response.status).toBe(201);
    expect(webhookEvents.map((event) => event.event)).toEqual(["buyer_request_created"]);
  });

  it("keeps vehicle creation successful when the webhook fails", async () => {
    webhookShouldFail = true;
    const response = await request("/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Seller Name", phone: "0966000000", make: "Toyota", model: "Hilux", year: 2022, price: "K700,000", mileage: "40,000 km" }),
    });

    expect(response.status).toBe(201);
  });

  it("fires vehicle_created after a successful vehicle listing", async () => {
    const response = await request("/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Seller Name", phone: "0966000000", make: "Toyota", model: "Hilux", year: 2022, price: "K700,000", mileage: "40,000 km" }),
    });

    expect(response.status).toBe(201);
    expect(webhookEvents.map((event) => event.event)).toEqual(["vehicle_created"]);
  });

  it("fires match_created when vehicle creation creates a match", async () => {
    const response = await request("/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Seller Name", phone: "0966000000", make: "Toyota", model: "Hilux", year: 2022, price: "K700,000", mileage: "40,000 km", buyerRequestId: "00000000-0000-4000-8000-000000000001" }),
    });

    expect(response.status).toBe(201);
    expect(webhookEvents.map((event) => event.event)).toEqual(["match_created", "vehicle_created"]);
  });

  it("protects the manual notification endpoint and accepts a valid event without blocking", async () => {
    const unauthorized = await request("/notifications/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "vehicle_created", title: "Test", reason: "Test" }),
    });
    expect(unauthorized.status).toBe(401);

    const response = await request("/notifications/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer notification-test-secret" },
      body: JSON.stringify({ event: "vehicle_created", title: "Test", reason: "Test", timestamp: "2026-07-23T00:00:00.000Z" }),
    });
    expect(response.status).toBe(202);
    expect(webhookEvents.at(-1)?.event).toBe("vehicle_created");
  });
});
