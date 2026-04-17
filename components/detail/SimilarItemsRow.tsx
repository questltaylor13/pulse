"use client";

import Link from "next/link";

interface SimilarItem {
  id: string;
  href: string;
  imageUrl: string | null;
  title: string;
  subtitle: string;
}

interface Props {
  heading: string;
  items: SimilarItem[];
}

export default function SimilarItemsRow({ heading, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h3 className="mb-3 px-5 text-title font-medium text-ink">{heading}</h3>
      <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="w-40 shrink-0"
          >
            <div className="h-[100px] w-40 overflow-hidden rounded-card bg-mute-hush">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-mute-soft">
                  <span className="text-[24px]">&#x1f4cd;</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 truncate text-body font-medium text-ink">{item.title}</p>
            <p className="truncate text-[12px] text-mute">{item.subtitle}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
