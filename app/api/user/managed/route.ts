import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { encrypt } from "@/app/lib/security";

async function checkManagedAccess(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, type: "MANAGED", status: "ACTIVE" },
  });
  return !!sub;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const hasAccess = await checkManagedAccess(session.userId);
  if (!hasAccess) return NextResponse.json({ error: "Managed Trading subscription required" }, { status: 403 });

  const account = await prisma.managedAccount.findUnique({
    where: { userId: session.userId },
  });

  if (!account) return NextResponse.json({ account: null });

  return NextResponse.json({
    account: {
      id: account.id,
      platformName: account.platformName,
      apiKey: "••••••••" + account.apiKey.slice(-4),
      hasSecret: true,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const hasAccess = await checkManagedAccess(session.userId);
  if (!hasAccess) return NextResponse.json({ error: "Managed Trading subscription required" }, { status: 403 });

  try {
    const { platformName, apiKey, apiSecret } = await request.json();

    if (!platformName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = encrypt(apiSecret);

    await prisma.managedAccount.upsert({
      where: { userId: session.userId },
      update: { platformName, apiKey: encryptedKey, apiSecret: encryptedSecret },
      create: { userId: session.userId, platformName, apiKey: encryptedKey, apiSecret: encryptedSecret },
    });

    return NextResponse.json({ message: "Account saved" });
  } catch (error) {
    console.error("Managed account error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await prisma.managedAccount.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ message: "Account removed" });
  } catch (error) {
    console.error("Delete managed error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
