import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import GuideDetailPage from "@/components/guides/GuideDetailPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await prisma.guide.findUnique({
    where: { slug },
    select: { title: true, tagline: true },
  });
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.title} — Pulse`,
    description: guide.tagline,
  };
}

export default async function GuideDetailRoute({ params }: PageProps) {
  const { slug } = await params;

  const guide = await prisma.guide.findUnique({
    where: { slug, isPublished: true },
    include: {
      creator: {
        select: {
          handle: true,
          displayName: true,
          profileImageUrl: true,
          specialties: true,
        },
      },
      stops: {
        orderBy: { order: "asc" },
        include: {
          place: {
            select: {
              name: true,
              neighborhood: true,
              category: true,
              primaryImageUrl: true,
            },
          },
          event: {
            select: {
              title: true,
              venueName: true,
              neighborhood: true,
              category: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!guide) notFound();

  return <GuideDetailPage guide={guide} />;
}
