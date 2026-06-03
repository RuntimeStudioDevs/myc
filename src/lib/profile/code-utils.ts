import "server-only";
import { createHash, randomInt } from "crypto";

export function generateVerificationCode(): string {
  return randomInt(100000, 999999).toString().padStart(6, "0");
}

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function verifyCodeHash(code: string, hash: string): boolean {
  return hashVerificationCode(code) === hash;
}

export function getCodeExpiry(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
