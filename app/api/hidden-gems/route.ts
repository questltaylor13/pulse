import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where: {
      noveltyScore: { gte: 7 },
      qualityScore: { gte: 5 },
      city: { slug: "denver" },
    },
    orderBy: [
      { noveltyScore: "desc" },
      { qualityScore: "desc" },
    ],
    take: 8,
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
      noveltyScore: true,
      qualityScore: true,
      isRecurring: true,
      startTime: true,
      tags: true,
    },
  });

  return NextResponse.json({ events });
}
