import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recent = await prisma.userSearchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { query: true },
  });

  return NextResponse.json({ searches: recent.map((r) => r.query) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const query = body.query?.trim();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  await prisma.userSearchHistory.create({
    data: { userId: session.user.id, query, resultsCount: body.resultsCount ?? 0 },
  });

  return NextResponse.json({ saved: true });
}
