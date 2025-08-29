import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyArgs {
  rawBody: string;
  headers: Headers;
  secret?: string; // optional override for tests
}

/**
 * Paddle Billing HMAC verification.
 * Header: Paddle-Signature => "ts=1699999999;h1=<hex hmac>"
 * Signed payload: `${ts}:${rawBody}`
 */
export async function verifyPaddleSignature({
  rawBody,
  headers,
  secret,
}: VerifyArgs): Promise<boolean> {
  const header = headers.get("Paddle-Signature") ?? headers.get("paddle-signature");
  if (!header) return false;

  // Parse "ts=...,h1=..." (semicolon-separated)
  const parts = header.split(";").map((kv) => kv.trim());
  const map = new Map<string, string>();
  for (const p of parts) {
    const [k, v] = p.split("=", 2);
    if (k && v) map.set(k, v);
  }

  const ts = map.get("ts");
  const h1 = map.get("h1"); // hex digest string
  if (!ts || !h1) return false;

  const endpointSecret = secret ?? process.env.PADDLE_ENDPOINT_SECRET_KEY;
  if (!endpointSecret) throw new Error("PADDLE_ENDPOINT_SECRET_KEY is not set");

  // Build signed payload: `${ts}:${rawBody}`
  const signedPayload = `${ts}:${rawBody}`;

  // Compute expected HMAC hex
  const expectedHex = createHmac("sha256", endpointSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  // Constant-time compare
  const a = Buffer.from(h1, "hex");
  const b = Buffer.from(expectedHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
