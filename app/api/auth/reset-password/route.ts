import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { authLimiter, rateLimit, getClientIP, sanitize, isStrongPassword } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const allowed = await rateLimit(authLimiter, `reset:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const email = sanitize(body.email || "").toLowerCase();
    const code = sanitize(body.code || "");
    const password = body.password || "";

    if (!email || !code || !password || code.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({
        error: "Password must be at least 8 characters with uppercase, lowercase, and a number",
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.emailCode || !user.emailCodeExp) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    if (new Date() > user.emailCodeExp) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // Constant-time comparison
    const codeMatch = code.length === user.emailCode.length &&
      code.split("").every((c, i) => c === user.emailCode![i]);

    if (!codeMatch) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        emailCode: null,
        emailCodeExp: null,
      },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
