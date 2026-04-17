"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EventForm from "@/components/curator/EventForm";

export default function NewEventPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-slate-900">Add New Event</h1>
            </div>
          </div>
        </div>
      </div>

      <EventForm mode="create" />
    </div>
  );
}
