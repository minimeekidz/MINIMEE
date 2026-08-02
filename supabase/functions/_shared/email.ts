// Sends the "anonymous/service email" channel required by MINIMEE_OPERATIONS.md
// section 6. Uses Resend's HTTP API because it needs no SDK dependency in
// Deno; swap the fetch call below if the operator picks a different
// transactional email provider. Never throws — a delivery failure is
// reported to the caller so it can be recorded, not surfaced to the parent.
export async function sendServiceEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("SERVICE_EMAIL_FROM") ?? "MINIMEE <notifications@minimee.me>";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        text: params.body,
      }),
    });
    if (!response.ok) {
      return { ok: false, error: `Email provider responded ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
