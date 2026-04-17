"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { SavedIcon } from "@/components/icons";
import SoftAuthModal from "./SoftAuthModal";

interface Props {
  itemId: string;
  itemType: "event" | "place" | "guide";
  initialSaved?: boolean;
}

export default function SaveButton({ itemId, itemType, initialSaved = false }: Props) {
  const { data: session } = useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      setAuthPromptOpen(true);
      return;
    }
    if (itemType === "guide") return; // Phase 1: guides aren't savable yet
    setPending(true);
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [itemType === "event" ? "eventId" : "placeId"]: itemId,
          action: saved ? "unsave" : "save",
        }),
      });
      setSaved(!saved);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={saved ? "Unsave" : "Save"}
        aria-pressed={saved}
        onClick={handleClick}
        disabled={pending}
        className="absolute right-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/85 text-ink backdrop-blur transition hover:bg-white"
      >
        <SavedIcon size={16} className={saved ? "fill-coral text-coral" : ""} />
      </button>
      <SoftAuthModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        action={itemType === "guide" ? "save this guide" : "save this"}
      />
    </>
  );
}
