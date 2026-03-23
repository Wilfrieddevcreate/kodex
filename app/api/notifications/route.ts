import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

async function hasActiveAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      trialEndsAt: true,
      subscriptions: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
    },
  });
  if (!user) return false;
  const now = new Date();
  const trialActive = user.trialEndsAt ? user.trialEndsAt > now : false;
  return user.subscriptions.length > 0 || trialActive;
}

// Get notifications for current user
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  const active = await hasActiveAccess(session.userId);

  // If user has active access: show personal + broadcast notifications
  // If not: show only personal notifications (system, subscription related)
  const where = active
    ? { OR: [{ userId: session.userId }, { userId: null }] }
    : { userId: session.userId };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where, orderBy: { createdAt: "desc" }, skip, take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);

  return NextResponse.json({ items, total, unreadCount });
}

// Mark notifications as read
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { ids } = await request.json();

  const active = await hasActiveAccess(session.userId);
  const baseWhere = active
    ? { OR: [{ userId: session.userId }, { userId: null }] }
    : { userId: session.userId };

  if (ids === "all") {
    await prisma.notification.updateMany({
      where: { ...baseWhere, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });
  }

  return NextResponse.json({ message: "Marked as read" });
}
