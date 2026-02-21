"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Category } from "@prisma/client";

interface SocialVideo {
  id?: string;
  platform: "tiktok" | "instagram";
  url: string;
  thumbnail: string | null;
  authorHandle: string | null;
  caption: string | null;
}

interface EventFormData {
  title: string;
  description: string;
  category: Category | "";
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string;
  placeId: string | null;
  startTime: string;
  endTime: string;
  priceType: "free" | "paid" | "varies";
  priceMin: string;
  priceMax: string;
  ticketUrl: string;
  ticketInfo: string;
  coverImage: string;
  images: string[];
  socialVideos: SocialVideo[];
  quote: string | null;
  isHost: boolean;
  isFeatured: boolean;
  vibeTags: string[];
  companionTags: string[];
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  eventId?: string;
  mode: "create" | "edit";
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: "LIVE_MUSIC", label: "Live Music", emoji: "🎵" },
  { value: "FOOD", label: "Food & Drink", emoji: "🍽️" },
  { value: "ART", label: "Art & Culture", emoji: "🎨" },
  { value: "BARS", label: "Bars & Nightlife", emoji: "🍺" },
  { value: "COFFEE", label: "Coffee", emoji: "☕" },
  { value: "OUTDOORS", label: "Outdoors", emoji: "🏔️" },
  { value: "FITNESS", label: "Fitness & Wellness", emoji: "🧘" },
  { value: "SEASONAL", label: "Seasonal", emoji: "🎄" },
  { value: "POPUP", label: "Pop-up", emoji: "✨" },
  { value: "OTHER", label: "Other", emoji: "🎭" },
];

const NEIGHBORHOODS = [
  "RiNo", "LoHi", "LoDo", "Capitol Hill", "Cherry Creek", "Five Points",
  "Highlands", "Baker", "Wash Park", "Sloan's Lake", "Tennyson", "Berkeley",
  "City Park", "Uptown", "Golden Triangle", "Ballpark", "Union Station",
  "Curtis Park", "Cole", "SoBo", "Other",
];

const COMPANION_TAGS = [
  { value: "solo", label: "Solo" },
  { value: "date-night", label: "Date Night" },
  { value: "friends", label: "Friends Group" },
  { value: "family", label: "Family Friendly" },
  { value: "work", label: "Work Event" },
  { value: "social", label: "Meeting New People" },
  { value: "21+", label: "21+ Only" },
];

const VIBE_OPTIONS = [
  { value: "chill", label: "Chill", emoji: "😌" },
  { value: "moderate", label: "Moderate", emoji: "🙂" },
  { value: "high-energy", label: "High Energy", emoji: "🔥" },
];

export default function EventForm({ initialData, eventId, mode }: EventFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [socialUrlInput, setSocialUrlInput] = useState("");
  const [loadingSocialPreview, setLoadingSocialPreview] = useState(false);

  const [form, setForm] = useState<EventFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    tags: initialData?.tags || [],
    venueName: initialData?.venueName || "",
    address: initialData?.address || "",
    neighborhood: initialData?.neighborhood || "",
    placeId: initialData?.placeId || null,
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
    priceType: initialData?.priceType || "varies",
    priceMin: initialData?.priceMin || "",
    priceMax: initialData?.priceMax || "",
    ticketUrl: initialData?.ticketUrl || "",
    ticketInfo: initialData?.ticketInfo || "",
    coverImage: initialData?.coverImage || "",
    images: initialData?.images || [],
    socialVideos: initialData?.socialVideos || [],
    quote: initialData?.quote || "",
    isHost: initialData?.isHost || false,
    isFeatured: initialData?.isFeatured || false,
    vibeTags: initialData?.vibeTags || [],
    companionTags: initialData?.companionTags || [],
  });

  const updateForm = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      updateForm("tags", [...form.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    updateForm("tags", form.tags.filter((t) => t !== tag));
  };

  const addSocialVideo = async () => {
    if (!socialUrlInput.trim()) return;

    setLoadingSocialPreview(true);
    try {
      const res = await fetch("/api/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: socialUrlInput }),
      });

      const json = await res.json();

      if (res.ok && json.preview) {
        const newVideo: SocialVideo = {
          platform: json.preview.platform,
          url: json.preview.url,
          thumbnail: json.preview.thumbnail,
          authorHandle: json.preview.authorHandle,
          caption: json.preview.caption,
        };
        updateForm("socialVideos", [...form.socialVideos, newVideo]);
        setSocialUrlInput("");
      } else {
        setError(json.error || "Failed to load video preview");
      }
    } catch {
      setError("Failed to fetch video preview");
    } finally {
      setLoadingSocialPreview(false);
    }
  };

  const removeSocialVideo = (index: number) => {
    updateForm("socialVideos", form.socialVideos.filter((_, i) => i !== index));
  };

  const toggleCompanionTag = (tag: string) => {
    if (form.companionTags.includes(tag)) {
      updateForm("companionTags", form.companionTags.filter((t) => t !== tag));
    } else {
      updateForm("companionTags", [...form.companionTags, tag]);
    }
  };

  const toggleVibeTag = (tag: string) => {
    if (form.vibeTags.includes(tag)) {
      updateForm("vibeTags", form.vibeTags.filter((t) => t !== tag));
    } else {
      updateForm("vibeTags", [...form.vibeTags, tag]);
    }
  };

  const getPriceRange = (): string => {
    if (form.priceType === "free") return "Free";
    if (form.priceType === "varies") return "Varies";
    if (form.priceMin && form.priceMax) return `$${form.priceMin}-$${form.priceMax}`;
    if (form.priceMin) return `$${form.priceMin}+`;
    return "Varies";
  };

  const handleSubmit = async (isDraft: boolean) => {
    setError(null);

    // Validate required fields
    if (!form.title || !form.description || !form.category || !form.startTime || !form.venueName || !form.address || !form.neighborhood) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        tags: form.tags,
        venueName: form.venueName,
        address: form.address,
        neighborhood: form.neighborhood,
        placeId: form.placeId,
        startTime: form.startTime,
        endTime: form.endTime || null,
        priceRange: getPriceRange(),
        ticketUrl: form.ticketUrl || null,
        ticketInfo: form.ticketInfo || null,
        coverImage: form.coverImage || null,
        images: form.images,
        socialVideos: form.socialVideos,
        quote: form.quote || null,
        isHost: form.isHost,
        isFeatured: form.isFeatured,
        vibeTags: form.vibeTags,
        companionTags: form.companionTags,
        isDraft,
      };

      const url = mode === "edit" ? `/api/curator/events/${eventId}` : "/api/curator/events";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save event");
        return;
      }

      // Redirect to success or event page
      if (isDraft) {
        router.push("/curator/events?tab=drafts");
      } else {
        router.push(`/events/${json.event.id}?created=true`);
      }
    } catch {
      setError("Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { title: "Basic Info", icon: "📝" },
    { title: "Date & Time", icon: "📅" },
    { title: "Location", icon: "📍" },
    { title: "Pricing", icon: "💰" },
    { title: "Media", icon: "📸" },
    { title: "Your Take", icon: "💬" },
    { title: "Audience", icon: "👥" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Progress indicator */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {sections.map((section, i) => (
              <button
                key={i}
                onClick={() => setCurrentSection(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  currentSection === i
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{section.icon}</span>
                <span className="hidden sm:inline">{section.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Section 0: Basic Info */}
        {currentSection === 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Basic Info</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="What's the event called?"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Tell people what to expect..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
                <div className="text-right text-xs text-slate-500 mt-1">
                  {form.description.length} characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => updateForm("category", cat.value)}
                      className={`p-4 rounded-xl border-2 text-center transition ${
                        form.category === cat.value
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.emoji}</div>
                      <div className="text-sm font-medium text-slate-700">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (optional)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="rooftop, free, 21+, dog-friendly..."
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition"
                  >
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Date & Time */}
        {currentSection === 1 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Date & Time</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => updateForm("startTime", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date & Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => updateForm("endTime", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Location */}
        {currentSection === 2 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Location</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.venueName}
                  onChange={(e) => updateForm("venueName", e.target.value)}
                  placeholder="e.g., Devil's Ivy, Red Rocks, Civic Center Park"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                  placeholder="123 Main St, Denver, CO 80202"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Neighborhood <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.neighborhood}
                  onChange={(e) => updateForm("neighborhood", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Select a neighborhood</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Pricing */}
        {currentSection === 3 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Pricing & Tickets</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Price Type
                </label>
                <div className="flex gap-4">
                  {[
                    { value: "free", label: "Free" },
                    { value: "paid", label: "Paid" },
                    { value: "varies", label: "Varies" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm("priceType", opt.value as "free" | "paid" | "varies")}
                      className={`px-6 py-3 rounded-lg font-medium transition ${
                        form.priceType === opt.value
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.priceType === "paid" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Min Price ($)
                    </label>
                    <input
                      type="number"
                      value={form.priceMin}
                      onChange={(e) => updateForm("priceMin", e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Max Price ($)
                    </label>
                    <input
                      type="number"
                      value={form.priceMax}
                      onChange={(e) => updateForm("priceMax", e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ticket Link (optional)
                </label>
                <input
                  type="url"
                  value={form.ticketUrl}
                  onChange={(e) => updateForm("ticketUrl", e.target.value)}
                  placeholder="https://eventbrite.com/..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ticket Info (optional)
                </label>
                <textarea
                  value={form.ticketInfo}
                  onChange={(e) => updateForm("ticketInfo", e.target.value)}
                  placeholder="Tickets available at the door, RSVP required, etc."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Media */}
        {currentSection === 4 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Photos & Media</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) => updateForm("coverImage", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
                {form.coverImage && (
                  <div className="mt-3 relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                    <Image
                      src={form.coverImage}
                      alt="Cover preview"
                      fill
                      className="object-cover"
                      onError={() => updateForm("coverImage", "")}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Events with photos get 3x more saves!
                </p>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Add TikTok or Instagram Video
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={socialUrlInput}
                    onChange={(e) => setSocialUrlInput(e.target.value)}
                    placeholder="https://tiktok.com/@user/video/... or https://instagram.com/reel/..."
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={addSocialVideo}
                    disabled={loadingSocialPreview}
                    className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    {loadingSocialPreview ? "..." : "Add"}
                  </button>
                </div>

                {form.socialVideos.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {form.socialVideos.map((video, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        {video.thumbnail ? (
                          <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={video.thumbnail}
                              alt="Video thumbnail"
                              width={64}
                              height={64}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">
                              {video.platform === "tiktok" ? "🎵" : "📷"}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 uppercase">
                              {video.platform}
                            </span>
                            {video.authorHandle && (
                              <span className="text-sm text-slate-700">@{video.authorHandle}</span>
                            )}
                          </div>
                          {video.caption && (
                            <p className="text-sm text-slate-600 truncate">{video.caption}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSocialVideo(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Your Take */}
        {currentSection === 5 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Your Take</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Quote (optional but encouraged)
                </label>
                <textarea
                  value={form.quote ?? ""}
                  onChange={(e) => updateForm("quote", e.target.value)}
                  placeholder="This is my favorite spot for... or Don't miss this because..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
                <div className="text-right text-xs text-slate-500 mt-1">
                  {(form.quote ?? "").length}/200
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isHost}
                    onChange={(e) => updateForm("isHost", e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">I'm hosting/organizing this event</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => updateForm("isFeatured", e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-700">Feature this on my profile</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Audience */}
        {currentSection === 6 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Vibe & Audience</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Vibe
                </label>
                <div className="flex gap-3">
                  {VIBE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleVibeTag(opt.value)}
                      className={`flex-1 p-4 rounded-xl border-2 text-center transition ${
                        form.vibeTags.includes(opt.value)
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.emoji}</div>
                      <div className="text-sm font-medium text-slate-700">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Good For
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMPANION_TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleCompanionTag(tag.value)}
                      className={`px-4 py-2 rounded-full font-medium text-sm transition ${
                        form.companionTags.includes(tag.value)
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className="px-6 py-3 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentSection < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentSection(currentSection + 1)}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-20">
        <div className="container flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/curator/events")}
            className="px-6 py-3 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-6 py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            {saving ? "Publishing..." : mode === "edit" ? "Update Event" : "Publish Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
