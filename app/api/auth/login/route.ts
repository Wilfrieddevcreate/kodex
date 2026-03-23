import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { generateToken } from "@/app/lib/auth";
import { authLimiter, rateLimit, getClientIP, sanitize, isValidEmail } from "@/app/lib/security";

export async function POST(request: Request) {
  try {
    // Rate limit — prevents brute force
    const ip = getClientIP(request);
    const allowed = await rateLimit(authLimiter, `login:${ip}`);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const email = sanitize(body.email || "").toLowerCase();
    const password = body.password || "";

    if (!email || !password || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time comparison: always hash even if user not found (prevents timing attacks)
    if (!user) {
      await bcrypt.hash(password, 12);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ emailVerified: false }, { status: 200 });
    }

    const token = generateToken(user.id);

    const response = NextResponse.json({
      emailVerified: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
