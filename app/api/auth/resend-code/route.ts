import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendVerificationEmail } from "@/app/lib/mail";
import { otpLimiter, rateLimit, getClientIP, sanitize, generateSecureOTP } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const body = await request.json();
    const email = sanitize(body.email || "").toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Rate limit per IP + email
    const allowed = await rateLimit(otpLimiter, `resend:${ip}:${email}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: "If this account exists, a code was sent." });
    }

    const emailCode = generateSecureOTP();
    const emailCodeExp = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { emailCode, emailCodeExp },
    });

    try {
      await sendVerificationEmail(email, emailCode);
    } catch (mailErr) {
      console.error("Mail error:", mailErr);
    }

    return NextResponse.json({ message: "Code sent" });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
