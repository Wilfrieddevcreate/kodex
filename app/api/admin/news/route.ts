import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { prisma } from "@/app/lib/prisma";
import { sendPushToAll } from "@/app/lib/push";
import { sendNewsToTelegram } from "@/app/lib/telegram";
import { notifyBroadcast } from "@/app/lib/notifications";

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  const [items, total] = await Promise.all([
    prisma.news.findMany({ skip, take, orderBy: { createdAt: "desc" } }),
    prisma.news.count(),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { title, description, imageUrl, titleFr, descriptionFr, titleEs, descriptionEs, titleTr, descriptionTr } = await request.json();
    if (!title || !description || !imageUrl) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const news = await prisma.news.create({
      data: {
        title, description, imageUrl, active: true,
        titleFr: titleFr || null, descriptionFr: descriptionFr || null,
        titleEs: titleEs || null, descriptionEs: descriptionEs || null,
        titleTr: titleTr || null, descriptionTr: descriptionTr || null,
      },
    });

    // DB notification (visible in bell)
    notifyBroadcast(`New Article: ${title}`, description.slice(0, 100) + (description.length > 100 ? "..." : ""), "news").catch(console.error);

    // Push notification (browser)
    sendPushToAll({ title: "New Article", message: title, url: "/dashboard" }).catch(console.error);

    // Telegram
    sendNewsToTelegram({ title, description }).catch(console.error);

    return NextResponse.json({ news });
  } catch (err) {
    console.error("Create news error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await request.json();
    await prisma.news.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete news error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, active } = await request.json();
    await prisma.news.update({ where: { id }, data: { active } });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("Update news error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
