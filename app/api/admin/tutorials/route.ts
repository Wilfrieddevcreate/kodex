import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { title, videoUrl, description, isManagedGuide } = await request.json();
    const count = await prisma.tutorial.count();
    const tutorial = await prisma.tutorial.create({ data: { title, videoUrl, description: description || null, isManagedGuide: isManagedGuide || false, sortOrder: count + 1 } });
    return NextResponse.json({ tutorial });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await request.json();
    await prisma.tutorial.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
