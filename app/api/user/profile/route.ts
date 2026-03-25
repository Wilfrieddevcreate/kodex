import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { sanitize, isValidPhone } from "@/app/lib/security";

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await request.json();
    const firstName = sanitize(body.firstName || "");
    const lastName = sanitize(body.lastName || "");
    const phone = sanitize(body.phone || "");
    const language = sanitize(body.language || "").toUpperCase();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const validLanguages = ["FR", "EN", "ES", "TR"];
    const updateData: Record<string, string> = { firstName, lastName };
    if (phone) updateData.phone = phone;
    if (language && validLanguages.includes(language)) updateData.language = language;

    await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
