import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { userId, days } = await request.json();

    if (!userId || days === undefined || days === null) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsedDays = parseInt(days);
    if (isNaN(parsedDays) || parsedDays < -365 || parsedDays > 365) {
      return NextResponse.json({ error: "Days must be between -365 and 365" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Extend or reduce from current trial end (or from now if expired)
    const baseDate = user.trialEndsAt && user.trialEndsAt > new Date() ? user.trialEndsAt : new Date();
    const newTrialEnd = new Date(baseDate);
    newTrialEnd.setDate(newTrialEnd.getDate() + parsedDays);

    // If reducing below now, set to now (effectively ending trial)
    const finalDate = newTrialEnd < new Date() ? new Date() : newTrialEnd;

    await prisma.user.update({
      where: { id: userId },
      data: { trialEndsAt: finalDate },
    });

    return NextResponse.json({ message: parsedDays >= 0 ? "Trial extended" : "Trial reduced", trialEndsAt: finalDate });
  } catch (err) {
    console.error("Extend trial error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
