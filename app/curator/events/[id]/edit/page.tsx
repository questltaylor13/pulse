"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import EventForm from "@/components/curator/EventForm";

interface EventData {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood: string;
  startTime: string;
  endTime: string | null;
  priceRange: string;
  status: string;
  coverImage: string | null;
  images: string[];
  ticketUrl: string | null;
  ticketInfo: string | null;
  vibeTags: string[];
  companionTags: string[];
  placeId: string | null;
  isHost: boolean;
  quote: string;
  isFeatured: boolean;
  socialVideos: {
    id: string;
    platform: string;
    url: string;
    thumbnail: string | null;
    authorHandle: string | null;
    caption: string | null;
  }[];
}

export default function EditEventPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && params.id) {
      fetchEvent();
    }
  }, [status, router, params.id]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/curator/events/${params.id}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load event");
        return;
      }

      setEvent(json.event);
    } catch {
      setError("Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!event) return;

    try {
      const res = await fetch(`/api/curator/events/${event.id}/publish`, {
        method: "POST",
      });

      if (res.ok) {
        router.push(`/events/${event.id}?published=true`);
      }
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleUnpublish = async () => {
    if (!event) return;

    try {
      const res = await fetch(`/api/curator/events/${event.id}/unpublish`, {
        method: "POST",
      });

      if (res.ok) {
        router.push("/curator/events?tab=drafts");
      }
    } catch (error) {
      console.error("Failed to unpublish:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/curator/events" className="text-primary hover:underline">
            Back to My Events
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  // Parse price range to get priceType, priceMin, priceMax
  let priceType: "free" | "paid" | "varies" = "varies";
  let priceMin = "";
  let priceMax = "";

  if (event.priceRange === "Free") {
    priceType = "free";
  } else if (event.priceRange.startsWith("$")) {
    priceType = "paid";
    const match = event.priceRange.match(/\$(\d+)(?:-\$(\d+))?/);
    if (match) {
      priceMin = match[1] || "";
      priceMax = match[2] || "";
    }
  }

  // Format datetime for input
  const formatDatetimeLocal = (date: string) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  };

  const initialData = {
    title: event.title,
    description: event.description,
    category: event.category as import("@prisma/client").Category,
    tags: event.tags,
    venueName: event.venueName,
    address: event.address,
    neighborhood: event.neighborhood,
    placeId: event.placeId,
    startTime: formatDatetimeLocal(event.startTime),
    endTime: event.endTime ? formatDatetimeLocal(event.endTime) : "",
    priceType,
    priceMin,
    priceMax,
    ticketUrl: event.ticketUrl || "",
    ticketInfo: event.ticketInfo || "",
    coverImage: event.coverImage || "",
    images: event.images,
    socialVideos: event.socialVideos.map((v) => ({
      id: v.id,
      platform: v.platform as "tiktok" | "instagram",
      url: v.url,
      thumbnail: v.thumbnail,
      authorHandle: v.authorHandle,
      caption: v.caption,
    })),
    quote: event.quote || "",
    isHost: event.isHost,
    isFeatured: event.isFeatured,
    vibeTags: event.vibeTags,
    companionTags: event.companionTags,
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/curator/events" className="text-sm text-primary hover:underline mb-1 inline-block">
                &larr; Back to My Events
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Edit Event</h1>
            </div>
            <div className="flex items-center gap-2">
              {event.status === "DRAFT" ? (
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Publish
                </button>
              ) : (
                <button
                  onClick={handleUnpublish}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <EventForm mode="edit" eventId={event.id} initialData={initialData} />
    </div>
  );
}
