import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Wave 5 — OG metadata for the public list page.
//
// page.tsx is a client component (it fetches and mutates), so it cannot export
// generateMetadata. This server layout wraps it purely to attach the card, which
// is the whole point of a shareable list: dropping the link in a group chat has
// to render as something, not as a bare URL.
//
// Mirrors the Wave 4 public rankings pages. Only public lists get a card —
// a private list must not leak its name or cover image through OG tags.

interface LayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const list = await prisma.list.findUnique({
    where: { shareSlug: params.slug },
    select: {
      name: true,
      description: true,
      coverImageUrl: true,
      isPublic: true,
      user: { select: { name: true, username: true } },
      _count: { select: { items: true } },
      // Fall back to the first item's image when the list has no cover.
      items: {
        orderBy: { order: "asc" },
        take: 1,
        select: {
          event: { select: { imageUrl: true } },
          place: { select: { primaryImageUrl: true } },
        },
      },
    },
  });

  if (!list || !list.isPublic) return {};

  const owner =
    list.user.name ?? (list.user.username ? `@${list.user.username}` : "A Pulse user");
  const count = list._count.items;
  const spots = `${count} ${count === 1 ? "spot" : "spots"}`;
  const title = `${list.name} · ${owner}`;
  const description =
    list.description ?? `${spots} in Denver, collected on Pulse.`;

  const image =
    list.coverImageUrl ??
    list.items[0]?.event?.imageUrl ??
    list.items[0]?.place?.primaryImageUrl ??
    null;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · Pulse`,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default function PublicListLayout({ children }: LayoutProps) {
  return children;
}
