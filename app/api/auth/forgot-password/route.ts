import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendResetPasswordEmail } from "@/app/lib/mail";
import { otpLimiter, rateLimit, getClientIP, sanitize, generateSecureOTP } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const allowed = await rateLimit(otpLimiter, `forgot:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
    }

    const body = await request.json();
    const email = sanitize(body.email || "").toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const emailCode = generateSecureOTP();
      const emailCodeExp = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { email },
        data: { emailCode, emailCodeExp },
      });

      try {
        await sendResetPasswordEmail(email, emailCode);
      } catch (mailErr) {
        console.error("Mail error:", mailErr);
      }
    }

    return NextResponse.json({ message: "If this account exists, a code was sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
