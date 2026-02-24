import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.googlePlacesCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({
    success: true,
    deleted: result.count,
  });
}
