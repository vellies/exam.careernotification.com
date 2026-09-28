import { randomBytes, createHash } from "crypto";

/**
 * Verification/reset links carry the raw token; only its hash is stored in
 * the database, so a leaked DB snapshot can't be used to take over accounts.
 */
export function createToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
