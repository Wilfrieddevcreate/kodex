import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Only show guide to users with MANAGED subscription
  const sub = await prisma.subscription.findFirst({
    where: { userId: session.userId, type: "MANAGED", status: "ACTIVE" },
  });
  if (!sub) return NextResponse.json({ video: null });

  const video = await prisma.tutorial.findFirst({
    where: { isManagedGuide: true },
    select: { id: true, title: true, videoUrl: true, description: true },
  });

  return NextResponse.json({ video });
}
