import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  const where = { active: true };

  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: { tradingPair: true, targets: { orderBy: { rank: "asc" } } },
    }),
    prisma.call.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
