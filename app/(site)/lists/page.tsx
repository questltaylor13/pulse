"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@prisma/client";
import { CATEGORY_EMOJI } from "@/lib/constants/categories";
import { getUnifiedList, UnifiedListItem } from "@/lib/actions/lists";

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
  emoji?: string;
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

export default function ListsHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<UserList[]>([]);
  const [wantCount, setWantCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [listsRes, wantItems, doneItems] = await Promise.all([
        fetch("/api/lists"),
        getUnifiedList("WANT"),
        getUnifiedList("DONE"),
      ]);

      if (listsRes.ok) {
        const data = await listsRes.json();
        setLists(data.lists || []);
      }

      setWantCount(wantItems.length);
      setDoneCount(doneItems.length);
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

  const customLists = lists.filter((l) => !l.isDefault);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Lists</h1>
          <p className="text-slate-600">
            Track what you want to do and where you&apos;ve been
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

      {/* Default Lists - Want & Done */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Want to Do */}
          <Link
            href="/lists/want"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-6 text-white shadow-lg hover:shadow-xl transition group"
          >
            <div className="absolute top-0 right-0 text-8xl opacity-20 -mr-4 -mt-4 group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">✨</span>
                <h3 className="text-xl font-bold">Want to Do</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">
                Events and places you&apos;re excited about
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{wantCount}</span>
                <span className="text-white/70 text-sm">
                  item{wantCount !== 1 ? "s" : ""} saved
                </span>
              </div>
            </div>
          </Link>

          {/* Done */}
          <Link
            href="/lists/done"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 p-6 text-white shadow-lg hover:shadow-xl transition group"
          >
            <div className="absolute top-0 right-0 text-8xl opacity-20 -mr-4 -mt-4 group-hover:scale-110 transition-transform">
              ✓
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🎉</span>
                <h3 className="text-xl font-bold">Done</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">
                Places you&apos;ve visited and events attended
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{doneCount}</span>
                <span className="text-white/70 text-sm">
                  item{doneCount !== 1 ? "s" : ""} completed
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Custom Lists Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Your Lists</h2>
          <Link
            href="/lists/new"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            + Create List
          </Link>
        </div>

        {customLists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customLists.map((list) => (
              <div key={list.id} className="card relative group hover:shadow-lg transition">
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(list.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white transition opacity-0 group-hover:opacity-100 z-10"
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

                <Link href={`/lists/${list.id}`} className="block">
                  {/* Cover image or emoji */}
                  {list.coverImageUrl ? (
                    <div className="h-24 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl">
                      <Image
                        src={list.coverImageUrl}
                        alt={list.name}
                        width={400}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 -mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <span className="text-4xl opacity-50">
                        {list.emoji || "📋"}
                      </span>
                    </div>
                  )}

                  {/* List info */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{list.emoji || "📋"}</span>
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition truncate">
                      {list.name}
                    </h3>
                    {list.isPublic && (
                      <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Public
                      </span>
                    )}
                  </div>

                  {list.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {list.description}
                    </p>
                  )}

                  {/* Item preview */}
                  {list.recentItems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {list.recentItems.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          <span>{CATEGORY_EMOJI[item.category]}</span>
                          <span className="truncate max-w-[100px]">{item.title}</span>
                        </span>
                      ))}
                      {list.itemCount > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500">
                          +{list.itemCount - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{list.itemCount} item{list.itemCount !== 1 ? "s" : ""}</span>
                    {list.shareSlug && (
                      <span className="text-primary">shareable</span>
                    )}
                  </div>
                </Link>
              </div>
            ))}

            {/* Create new list card */}
            <Link
              href="/lists/new"
              className="card border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center justify-center py-12 text-center group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-medium text-slate-600 group-hover:text-primary transition">
                Create New List
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Organize your favorites
              </p>
            </Link>
          </div>
        ) : (
          <div className="card text-center py-12 border-2 border-dashed border-slate-200">
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
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Create your first list</h3>
            <p className="text-slate-600 mb-4">
              Organize events and places into custom collections
            </p>
            <Link href="/lists/new" className="btn-primary">
              Create a List
            </Link>
          </div>
        )}
      </section>

      {/* List Ideas */}
      <section className="card bg-gradient-to-br from-slate-50 to-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">List Ideas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { emoji: "💕", name: "Date Night Ideas", desc: "Romantic spots" },
            { emoji: "🍻", name: "Weekend Vibes", desc: "Fun with friends" },
            { emoji: "👨‍👩‍👧", name: "Family Friendly", desc: "Kid-approved" },
            { emoji: "🎸", name: "Live Music", desc: "Concert bucket list" },
          ].map((idea) => (
            <Link
              key={idea.name}
              href={`/lists/new?name=${encodeURIComponent(idea.name)}`}
              className="p-3 bg-white rounded-lg hover:shadow-md transition group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{idea.emoji}</span>
                <div>
                  <p className="font-medium text-slate-900 text-sm group-hover:text-primary transition">
                    {idea.name}
                  </p>
                  <p className="text-xs text-slate-500">{idea.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
