export type SupabaseEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

function required(value: string | undefined, name: string) {
  const result = value?.trim();
  if (!result) throw new Error(`${name} is not configured`);
  return result;
}

export function supabaseUrl(env: SupabaseEnvironment) {
  return required(env.SUPABASE_URL || env.VITE_SUPABASE_URL, "SUPABASE_URL");
}

export function publishableKey(env: SupabaseEnvironment) {
  return required(
    env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
    "SUPABASE_PUBLISHABLE_KEY",
  );
}

function secretKey(env: SupabaseEnvironment) {
  return required(env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY");
}

async function request<T>(
  env: SupabaseEnvironment,
  path: string,
  init: RequestInit,
  useSecret = true,
): Promise<T> {
  const key = useSecret ? secretKey(env) : publishableKey(env);
  const serverAuthorization = useSecret && !key.startsWith("sb_secret_")
    ? { Authorization: `Bearer ${key}` }
    : {};
  const response = await fetch(`${supabaseUrl(env)}${path}`, {
    ...init,
    headers: {
      apikey: key,
      ...serverAuthorization,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.message || body?.msg || `Supabase returned ${response.status}`);
  return body as T;
}

export async function authenticatedUser(env: SupabaseEnvironment, accessToken: string) {
  return request<{ id: string; email?: string }>(
    env,
    "/auth/v1/user",
    { headers: { Authorization: `Bearer ${accessToken}` } },
    false,
  );
}

export async function ownedChild(env: SupabaseEnvironment, accessToken: string, childId: string, parentId: string) {
  const query = new URLSearchParams({
    select: "id,parent_id,nickname",
    id: `eq.${childId}`,
    parent_id: `eq.${parentId}`,
    limit: "1",
  });
  const rows = await request<Array<{ id: string; parent_id: string; nickname: string }>>(
    env,
    `/rest/v1/children?${query}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    false,
  );
  return rows[0] ?? null;
}

export async function insertOrder(env: SupabaseEnvironment, order: Record<string, unknown>) {
  const rows = await request<Array<{ id: string }>>(env, "/rest/v1/billing_orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(order),
  });
  if (!rows[0]) throw new Error("Supabase did not create the billing order");
  return rows[0];
}

export async function updateOrderSession(env: SupabaseEnvironment, orderId: string, sessionId: string) {
  await request(env, `/rest/v1/billing_orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ stripe_session_id: sessionId }),
  });
}

export type FinalizedCheckout = {
  already_processed: boolean;
  notification_id: string;
  recipient_email: string;
  title: string;
  body: string;
};

export async function finalizeCheckout(env: SupabaseEnvironment, payload: Record<string, unknown>) {
  return request<FinalizedCheckout>(env, "/rest/v1/rpc/finalize_verified_checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNotificationEmailStatus(
  env: SupabaseEnvironment,
  notificationId: string,
  status: "sent" | "failed",
) {
  await request(env, `/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ email_status: status }),
  });
}
