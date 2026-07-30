import { describe, expect, it } from "vitest";
import { PLAN_CATALOG } from "../functions/_shared/payment-config";
import { verifyStripeSignature } from "../functions/_shared/stripe";

async function signature(secret: string, timestamp: number, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

describe("payment server rules", () => {
  it("keeps all accepted prices fixed in HKD cents", () => {
    expect(PLAN_CATALOG.one_time_theme.amount).toBe(12_800);
    expect(PLAN_CATALOG.monthly_3m.amount).toBe(32_400);
    expect(PLAN_CATALOG.yearly.amount).toBe(118_800);
  });

  it("accepts a valid Stripe signature over the exact raw body", async () => {
    const timestamp = 1_800_000_000;
    const body = '{"id":"evt_verified"}';
    const signed = await signature("whsec_test", timestamp, body);
    expect(await verifyStripeSignature(
      body,
      `t=${timestamp},v1=${signed}`,
      "whsec_test",
      timestamp,
    )).toBe(true);
  });

  it("rejects a changed body, wrong secret and stale event", async () => {
    const timestamp = 1_800_000_000;
    const body = '{"id":"evt_verified"}';
    const signed = await signature("whsec_test", timestamp, body);
    expect(await verifyStripeSignature(
      '{"id":"evt_tampered"}',
      `t=${timestamp},v1=${signed}`,
      "whsec_test",
      timestamp,
    )).toBe(false);
    expect(await verifyStripeSignature(
      body,
      `t=${timestamp},v1=${signed}`,
      "whsec_wrong",
      timestamp,
    )).toBe(false);
    expect(await verifyStripeSignature(
      body,
      `t=${timestamp},v1=${signed}`,
      "whsec_test",
      timestamp + 301,
    )).toBe(false);
  });
});

