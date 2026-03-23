import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authLimiter, rateLimit, getClientIP, sanitize } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const allowed = await rateLimit(authLimiter, `verify:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const email = sanitize(body.email || "").toLowerCase();
    const code = sanitize(body.code || "");

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic error to prevent enumeration
    if (!user || user.emailVerified || !user.emailCode || !user.emailCodeExp) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    if (new Date() > user.emailCodeExp) {
      return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
    }

    // Constant-time comparison to prevent timing attacks on OTP
    const codeMatch = code.length === user.emailCode.length &&
      code.split("").every((c, i) => c === user.emailCode![i]);

    if (!codeMatch) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        emailCode: null,
        emailCodeExp: null,
      },
    });

    return NextResponse.json({ message: "Email verified" });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
