import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isStrongPassword, authLimiter, rateLimit, getClientIP } from "@/app/lib/security";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = getClientIP(request);
  const allowed = await rateLimit(authLimiter, `password:${ip}`);
  if (!allowed) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json({ error: "Password must be at least 8 characters with uppercase, lowercase, and a number" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });

    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
