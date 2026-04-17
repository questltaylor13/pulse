"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const LIST_TEMPLATES = [
  {
    id: "date_night",
    name: "Date Night",
    description: "Romantic spots for a perfect evening out",
    icon: "❤️",
  },
  {
    id: "visitors_guide",
    name: "Visitor's Guide",
    description: "Must-see spots for first-time visitors to Denver",
    icon: "🗺️",
  },
  {
    id: "weekend",
    name: "This Weekend",
    description: "Top picks for the upcoming weekend",
    icon: "📅",
  },
  {
    id: "budget_friendly",
    name: "Budget Friendly",
    description: "Great experiences that won't break the bank",
    icon: "💰",
  },
  {
    id: "hidden_gems",
    name: "Hidden Gems",
    description: "Under-the-radar spots locals love",
    icon: "💎",
  },
];

export default function CreateListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  const handleSelectTemplate = (templateId: string) => {
    const template = LIST_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setName(template.name);
      setDescription(template.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a list name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
          template: selectedTemplate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create list");
      }

      const list = await response.json();
      router.push(`/lists/${list.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create a New List</h1>
        <p className="text-slate-600">
          Organize your favorite events and share them with others.
        </p>
      </div>

      {/* Templates */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">
          Start from a template (optional)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LIST_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className={`p-4 rounded-lg border-2 text-left transition ${
                selectedTemplate === template.id
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{template.icon}</span>
                <span className="font-medium text-slate-900">{template.name}</span>
              </div>
              <p className="text-sm text-slate-500">{template.description}</p>
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <button
            onClick={() => {
              setSelectedTemplate(null);
              setName("");
              setDescription("");
            }}
            className="mt-3 text-sm text-slate-500 hover:text-primary"
          >
            Clear template
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            List Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Denver Favorites"
            className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this list about?"
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
          <div>
            <span className="text-sm font-medium text-slate-700">Make this list public</span>
            <p className="text-xs text-slate-500">
              Public lists can be viewed and shared with anyone
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create List"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-slate-100 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
