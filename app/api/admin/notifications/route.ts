import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

// Send notification (broadcast or to specific user)
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { title, message, type, userId } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message required" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || "info",
        userId: userId || null, // null = broadcast
      },
    });

    return NextResponse.json({ notification });
  } catch (err) {
    console.error("Create notification error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
