type StripeEnvironment = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

function required(value: string | undefined, name: string) {
  const result = value?.trim();
  if (!result) throw new Error(`${name} is not configured`);
  return result;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
) {
  if (!signatureHeader) return false;
  const pairs = signatureHeader.split(",").map(part => part.trim().split("=", 2));
  const timestamp = Number(pairs.find(([key]) => key === "t")?.[1]);
  const signatures = pairs.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = toHex(digest);
  return signatures.some(signature => timingSafeEqual(signature, expected));
}

async function stripeRequest<T>(
  env: StripeEnvironment,
  path: string,
  init: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY")}`,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...init.headers,
    },
  });
  const body = await response.json() as { error?: { message?: string } } & T;
  if (!response.ok) throw new Error(body.error?.message || `Stripe returned ${response.status}`);
  return body;
}

export async function createCheckoutSession(
  env: StripeEnvironment,
  values: Record<string, string>,
  idempotencyKey: string,
) {
  return stripeRequest<{ id: string; url: string | null }>(
    env,
    "/checkout/sessions",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(values),
    },
    idempotencyKey,
  );
}

export async function retrieveCheckoutSession(env: StripeEnvironment, sessionId: string) {
  return stripeRequest<{
    id: string;
    amount_total: number | null;
    currency: string | null;
    payment_status: string;
    payment_intent: string | null;
    metadata: Record<string, string>;
  }>(env, `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export function stripeWebhookSecret(env: StripeEnvironment) {
  return required(env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET");
}

