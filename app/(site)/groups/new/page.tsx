"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EMOJI_OPTIONS = [
  "👥", "🎉", "🎊", "🎭", "🎨", "🎵", "🎸", "🍕", "🍻", "☕",
  "🏃", "💪", "🧘", "🏔️", "🌄", "🌆", "✨", "💎", "🔥", "⚡",
  "🌟", "🚀", "🎯", "💜", "💙", "💚", "💛", "🧡", "❤️", "🖤",
];

export default function CreateGroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👥");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/auth/login");
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          emoji,
          description: description.trim() || undefined,
          isPublic,
        }),
      });

      if (response.ok) {
        const { group } = await response.json();
        router.push(`/groups/${group.id}`);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create group");
      }
    } catch (error) {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Group</h1>
          <p className="text-slate-600">Start a new group to explore Denver together</p>
        </div>
        <Link
          href="/groups"
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Cancel
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleCreate} className="card space-y-6">
        {/* Emoji Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Group Emoji
          </label>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-4xl">
              {emoji}
            </div>
            <div className="text-sm text-slate-500">
              Choose an emoji that represents your group
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition ${
                  emoji === e
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Group Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Weekend Crew"
            maxLength={50}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What brings your group together?"
            maxLength={200}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">Public Group</p>
            <p className="text-sm text-slate-500">
              Anyone can find and request to join
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              isPublic ? "bg-primary" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isPublic ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}
