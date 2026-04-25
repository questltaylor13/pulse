import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await prisma.event.findMany({
    where: {
      city: { slug: "denver" },
      OR: [
        { isNew: true },
        {
          createdAt: { gte: thirtyDaysAgo },
          noveltyScore: { gte: 5 },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      description: true,
      oneLiner: true,
      category: true,
      venueName: true,
      address: true,
      priceRange: true,
      imageUrl: true,
      isRecurring: true,
      tags: true,
    },
  });

  return NextResponse.json({ events });
}
