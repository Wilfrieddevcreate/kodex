import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

// GET users (paginated)
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");
  const search = url.searchParams.get("search") || "";

  const where: Record<string, unknown> = { role: "CLIENT" as const };
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        country: true, emailVerified: true, trialEndsAt: true, createdAt: true,
        subscriptions: { where: { status: "ACTIVE" }, select: { type: true } },
        affiliate: { select: { status: true, promoCode: true } },
        referredBy: { select: { referrer: { select: { firstName: true, lastName: true, email: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((u) => ({
      id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email,
      phone: u.phone, country: u.country, emailVerified: u.emailVerified,
      trialEndsAt: u.trialEndsAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      hasSubscription: u.subscriptions.length > 0,
      subscriptionType: u.subscriptions[0]?.type || null,
      affiliateStatus: u.affiliate?.status || null,
      affiliatePromoCode: u.affiliate?.promoCode || null,
      referredBy: u.referredBy ? `${u.referredBy.referrer.firstName} ${u.referredBy.referrer.lastName} (${u.referredBy.referrer.email})` : null,
    })),
    total,
  });
}

// DELETE user
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === "ADMIN") return NextResponse.json({ error: "Cannot delete admin" }, { status: 403 });

    // Delete all related data
    await prisma.callTarget.deleteMany({ where: { call: { id: undefined } } }); // no-op, just for safety
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.referral.deleteMany({ where: { OR: [{ referrerId: userId }, { referredUserId: userId }] } });
    await prisma.managedAccount.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.affiliate.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// CREATE user (admin can add users)
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { firstName, lastName, email, phone, country, language, password, trialDays } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "First name, last name, email and password are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = trialDays ? new Date(Date.now() + trialDays * 86400000) : null;

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || "",
        country: country || "US",
        language: language || "EN",
        passwordHash,
        emailVerified: true, // admin-created accounts are auto-verified
        trialEndsAt,
      },
    });

    return NextResponse.json({ message: "User created", userId: user.id });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
