import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { question, answer } = await request.json();
    const count = await prisma.faq.count();
    const faq = await prisma.faq.create({ data: { question, answer, sortOrder: count + 1 } });
    return NextResponse.json({ faq });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { id } = await request.json();
    await prisma.faq.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
