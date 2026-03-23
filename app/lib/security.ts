import { RateLimiterMemory } from "rate-limiter-flexible";
import crypto from "crypto";

// ─── RATE LIMITERS ───────────────────────────────────

// Auth routes: 5 attempts per minute per IP
export const authLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// OTP resend: 3 per 5 minutes per email
export const otpLimiter = new RateLimiterMemory({
  points: 3,
  duration: 300,
});

// General API: 60 requests per minute per IP
export const apiLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
});

// Stripe checkout: 3 per minute per user
export const checkoutLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60,
});

// Withdrawals: 2 per hour per admin
export const withdrawalLimiter = new RateLimiterMemory({
  points: 2,
  duration: 3600,
});

export async function rateLimit(limiter: RateLimiterMemory, key: string): Promise<boolean> {
  try {
    await limiter.consume(key);
    return true;
  } catch {
    return false;
  }
}

// ─── INPUT VALIDATION ────────────────────────────────

export function sanitize(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Strip HTML tags
    .slice(0, 1000); // Max length
}

export function isValidEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email) && email.length <= 254;
}

export function isValidPhone(phone: string): boolean {
  const re = /^\+?[0-9\s\-().]{6,20}$/;
  return re.test(phone);
}

export function isStrongPassword(password: string): boolean {
  // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

// ─── ENCRYPTION (for API keys in managed accounts) ───

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

function getKeyBuffer(): Buffer {
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── SECURE OTP ──────────────────────────────────────

export function generateSecureOTP(): string {
  // Cryptographically secure random OTP
  const buffer = crypto.randomBytes(3);
  const num = buffer.readUIntBE(0, 3) % 1000000;
  return num.toString().padStart(6, "0");
}

// ─── IP EXTRACTION ───────────────────────────────────

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}
