import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: { id: string };
}

/**
 * Item detail page — redirects to the appropriate Event or Place detail page.
 * The Item model is a unified abstraction; the real detail UX lives at /events/ and /places/.
 */
export default async function ItemDetailPage({ params }: PageProps) {
  const { id } = params;

  const item = await prisma.item.findUnique({
    where: { id },
    select: { id: true, type: true, externalId: true, source: true },
  });

  if (!item) {
    notFound();
  }

  // For PLACE items, redirect to /places/{id}
  if (item.type === "PLACE") {
    redirect(`/places/${item.id}`);
  }

  // For EVENT items, find the corresponding Event record via externalId+source
  if (item.externalId && item.source) {
    const event = await prisma.event.findFirst({
      where: { externalId: item.externalId, source: item.source },
      select: { id: true },
    });
    if (event) {
      redirect(`/events/${event.id}`);
    }
  }

  // Fallback: show a basic detail page if no matching event/place found
  const fullItem = await prisma.item.findUnique({ where: { id } });
  if (!fullItem) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900">{fullItem.title}</h1>
        <p className="text-slate-600">{fullItem.description}</p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
          <span>{fullItem.venueName}</span>
          {fullItem.address && (
            <>
              <span className="text-slate-300">|</span>
              <span>{fullItem.address}</span>
            </>
          )}
        </div>
        {fullItem.priceRange && (
          <p className="text-sm text-slate-500">{fullItem.priceRange}</p>
        )}
        {fullItem.sourceUrl && (
          <a
            href={fullItem.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition"
          >
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
}
