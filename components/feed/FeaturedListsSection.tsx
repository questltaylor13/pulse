"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FeaturedList {
  id: string;
  name: string;
  description: string | null;
  shareSlug: string | null;
  saveCount: number;
  itemCount: number;
  creator: {
    name: string | null;
    profileImageUrl: string | null;
    isInfluencer: boolean;
  };
  previewItems: {
    title: string;
    category: string | null;
    imageUrl: string | null;
    note: string | null;
  }[];
}

export default function FeaturedListsSection() {
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lists/featured")
      .then((res) => res.json())
      .then((data) => setLists(data.lists || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Featured Lists</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-80 h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (lists.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Featured Lists</h2>
          <p className="text-sm text-slate-500">Curated by the Denver community</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={list.shareSlug ? `/l/${list.shareSlug}` : `/lists/${list.id}`}
            className="flex-shrink-0 w-80 rounded-xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-lg hover:border-primary/30 group"
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary/10 via-purple-50 to-pink-50 p-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {list.creator.isInfluencer && (
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                    Community
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {list.creator.name}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
                {list.name}
              </h3>
            </div>

            {/* Preview items */}
            <div className="p-4 pt-3 space-y-2">
              {list.previewItems.slice(0, 2).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-slate-400 font-bold mt-0.5">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{item.title}</p>
                    {item.note && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">&ldquo;{item.note}&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
              {list.itemCount > 2 && (
                <p className="text-xs text-primary font-medium">
                  +{list.itemCount - 2} more
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {list.saveCount} saves
              </span>
              <span className="text-xs text-slate-400">
                {list.itemCount} items
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
