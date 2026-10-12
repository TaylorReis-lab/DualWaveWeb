import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash de senha com scrypt (nativo do Node, sem dependências externas).
 * Formato armazenado: "scrypt$<salt_hex>$<hash_hex>".
 */

const KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN, SCRYPT_OPTS).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, salt, hash] = stored.split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const derived = scryptSync(password, salt, KEYLEN, SCRYPT_OPTS);
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
