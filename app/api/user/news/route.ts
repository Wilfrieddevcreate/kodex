import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");
  const locale = url.searchParams.get("locale") || "en";

  const where = { active: true };

  const [items, total] = await Promise.all([
    prisma.news.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.news.count({ where }),
  ]);

  // Return localized content based on locale
  const localizedItems = items.map((n) => {
    let title = n.title;
    let description = n.description;

    if (locale === "fr" && n.titleFr) { title = n.titleFr; description = n.descriptionFr || n.description; }
    else if (locale === "es" && n.titleEs) { title = n.titleEs; description = n.descriptionEs || n.description; }
    else if (locale === "tr" && n.titleTr) { title = n.titleTr; description = n.descriptionTr || n.description; }

    return {
      id: n.id,
      title,
      description,
      imageUrl: n.imageUrl,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ items: localizedItems, total });
}
