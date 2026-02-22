import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, slug: true },
  });

  const denverBySlug = await prisma.city.findUnique({
    where: { slug: "denver" },
  });

  const denverByName = await prisma.city.findFirst({
    where: { name: "Denver" },
  });

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Count events matching feed query with slug-based city
  const feedCount = denverBySlug
    ? await prisma.event.count({
        where: {
          cityId: denverBySlug.id,
          startTime: { gte: now, lte: twoWeeks },
        },
      })
    : "no city by slug";

  // Count events matching feed query with name-based city
  const scraperCount = denverByName
    ? await prisma.event.count({
        where: {
          cityId: denverByName.id,
          startTime: { gte: now, lte: twoWeeks },
        },
      })
    : "no city by name";

  // Sample a scraped event's cityId
  const sampleEvent = await prisma.event.findFirst({
    where: { source: "do303" },
    select: { id: true, title: true, cityId: true, startTime: true },
  });

  return NextResponse.json({
    cities,
    denverBySlugId: denverBySlug?.id,
    denverByNameId: denverByName?.id,
    sameCity: denverBySlug?.id === denverByName?.id,
    feedCount,
    scraperCount,
    sampleEvent,
    now: now.toISOString(),
    twoWeeks: twoWeeks.toISOString(),
  });
}
