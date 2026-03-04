import { createHash, randomBytes } from "crypto";

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

// Session token creation & verification (shared by API route + staff-auth)

export function createSessionToken(): string {
  const token = randomBytes(32).toString("hex");
  const secret = process.env.STAFF_PIN || "fallback-secret";
  const signature = createHash("sha256")
    .update(token + secret)
    .digest("hex");
  return `${token}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [raw, sig] = parts;
  const secret = process.env.STAFF_PIN || "fallback-secret";
  const expected = createHash("sha256")
    .update(raw + secret)
    .digest("hex");
  return sig === expected;
}
