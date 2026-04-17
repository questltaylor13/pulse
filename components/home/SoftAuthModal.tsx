"use client";

import Link from "next/link";
import { CloseIcon } from "@/components/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  action?: string;
}

export default function SoftAuthModal({ open, onClose, action = "save this" }: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-[20px] bg-surface p-6 sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-title font-medium text-ink">Sign in to {action}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-mute hover:text-ink"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <p className="mt-2 text-body text-mute">
          Save spots, build plans, and follow creators. Takes 10 seconds.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/auth/login"
            className="flex h-11 items-center justify-center rounded-pill bg-coral text-body font-medium text-surface hover:bg-coral-dark"
          >
            Continue
          </Link>
          <button
            onClick={onClose}
            className="flex h-11 items-center justify-center rounded-pill text-body text-mute hover:text-ink"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
