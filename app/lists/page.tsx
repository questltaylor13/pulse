"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Category } from "@prisma/client";

interface RecentItem {
  id: string;
  title: string;
  category: Category;
  venueName: string;
  startTime: string;
}

interface UserList {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isDefault: boolean;
  isPublic: boolean;
  template: string | null;
  shareSlug: string | null;
  itemCount: number;
  recentItems: RecentItem[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_COLORS: Record<Category, string> = {
  ART: "bg-purple-100 text-purple-700",
  LIVE_MUSIC: "bg-pink-100 text-pink-700",
  BARS: "bg-amber-100 text-amber-700",
  FOOD: "bg-orange-100 text-orange-700",
  COFFEE: "bg-yellow-100 text-yellow-700",
  OUTDOORS: "bg-green-100 text-green-700",
  FITNESS: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-red-100 text-red-700",
  POPUP: "bg-indigo-100 text-indigo-700",
  OTHER: "bg-slate-100 text-slate-700",
  RESTAURANT: "bg-orange-100 text-orange-700",
  ACTIVITY_VENUE: "bg-cyan-100 text-cyan-700",
};

export default function MyListsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchLists();
  }, [session, status, router]);

  const fetchLists = async () => {
    try {
      const response = await fetch("/api/lists");
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists);
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId));
      }
    } catch (error) {
      console.error("Failed to delete list:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Lists</h1>
          <p className="text-slate-600">
            Create and manage your curated event lists
          </p>
        </div>
        <Link
          href="/lists/new"
          className="inline-flex items-center gap-2 btn-primary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New List
        </Link>
      </div>

      {/* Lists Grid */}
      {lists.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div key={list.id} className="card relative group">
              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                {!list.isDefault && (
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="p-1.5 rounded-full bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <Link href={`/lists/${list.id}`}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 hover:text-primary transition">
                    {list.name}
                  </h3>
                  {list.isPublic && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Public
                    </span>
                  )}
                </div>

                {list.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {list.description}
                  </p>
                )}

                {/* Recent items preview */}
                {list.recentItems.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {list.recentItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category]}`}
                        >
                          {item.category.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-slate-600 truncate">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="text-xs text-slate-400">
                  {list.itemCount} event{list.itemCount !== 1 ? "s" : ""}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No lists yet</h3>
          <p className="text-slate-600 mb-4">
            Create your first list to start curating events.
          </p>
          <Link href="/lists/new" className="btn-primary">
            Create Your First List
          </Link>
        </div>
      )}
    </div>
  );
}
