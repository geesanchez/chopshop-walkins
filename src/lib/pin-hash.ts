import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// --- PIN hashing (salted HMAC-SHA256) ---

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", salt).update(pin).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  // Support legacy unsalted SHA256 hashes (no colon separator)
  if (!stored.includes(":")) {
    const legacy = createHash("sha256").update(pin).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(legacy, "hex"), Buffer.from(stored, "hex"));
    } catch {
      return false;
    }
  }
  const [salt, hash] = stored.split(":");
  const candidate = createHmac("sha256", salt).update(pin).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

// --- Session token creation & verification ---

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return secret;
}

export function createSessionToken(): string {
  const token = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", getSessionSecret())
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [raw, sig] = parts;
  try {
    const expected = createHmac("sha256", getSessionSecret())
      .update(raw)
      .digest("hex");
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
