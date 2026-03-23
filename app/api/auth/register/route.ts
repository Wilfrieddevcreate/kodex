import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { sendVerificationEmail } from "@/app/lib/mail";
import {
  authLimiter, rateLimit, getClientIP,
  sanitize, isValidEmail, isValidPhone, isStrongPassword,
  generateSecureOTP,
} from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    // Rate limit
    const ip = getClientIP(request);
    const allowed = await rateLimit(authLimiter, `register:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const firstName = sanitize(body.firstName || "");
    const lastName = sanitize(body.lastName || "");
    const email = sanitize(body.email || "").toLowerCase();
    const phone = sanitize(body.phone || "");
    const country = sanitize(body.country || "");
    const language = sanitize(body.language || "EN");
    const password = body.password || "";
    const promoCode = sanitize(body.promoCode || "");

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !country || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate email
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Validate phone
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      return NextResponse.json({
        error: "Password must be at least 8 characters with uppercase, lowercase, and a number",
      }, { status: 400 });
    }

    // Check if user already exists — generic message to prevent enumeration
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 400 });
    }

    // Get trial duration from settings
    const settings = await prisma.appSettings.findFirst();
    const trialDays = settings?.trialDurationDays ?? 7;

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Hash password with high cost
    const passwordHash = await bcrypt.hash(password, 12);

    // Cryptographically secure OTP
    const emailCode = generateSecureOTP();
    const emailCodeExp = new Date(Date.now() + 15 * 60 * 1000);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        country,
        language,
        passwordHash,
        emailCode,
        emailCodeExp,
        trialEndsAt,
      },
    });

    // Handle promo code (referral)
    if (promoCode) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { promoCode, status: "APPROVED" },
      });
      if (affiliate) {
        await prisma.referral.create({
          data: {
            referrerId: affiliate.userId,
            referredUserId: user.id,
            referredIp: ip,
          },
        });
      }
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, emailCode);
    } catch (mailErr) {
      console.error("Mail error:", mailErr);
    }

    return NextResponse.json({ message: "Account created. Check your email." });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
