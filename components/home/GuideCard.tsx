"use client";

import { useState } from "react";
import type { SeedGuide } from "@/lib/home/seed-guides";
import { CloseIcon } from "@/components/icons";

interface Props {
  guide: SeedGuide;
}

export default function GuideCard({ guide }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="relative block shrink-0 snap-start text-left"
        style={{ width: 260 }}
        aria-label={`Preview guide: ${guide.title}`}
      >
        <div className="relative overflow-hidden rounded-card border border-mute-divider bg-surface">
          <div className="relative h-[160px] w-full bg-mute-hush">
            <img
              src={guide.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
            <div className="absolute inset-x-3 bottom-3">
              <h3 className="line-clamp-2 text-[16px] font-medium text-surface">
                {guide.title}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[12px] text-surface/85">
                {guide.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3">
            <img
              src={guide.creator.avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-6 w-6 rounded-full object-cover"
            />
            <span className="text-[12px] font-medium text-ink">{guide.creator.name}</span>
            <span className="text-[12px] text-mute">· {guide.creator.label}</span>
          </div>
        </div>
      </button>
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Coming soon"
          className="fixed inset-0 z-modal flex items-end justify-center bg-ink/40 sm:items-center"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-[20px] bg-surface p-6 sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-title font-medium text-ink">Coming soon</h2>
              <button
                aria-label="Close"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1 text-mute hover:text-ink"
              >
                <CloseIcon size={22} />
              </button>
            </div>
            <p className="mt-2 text-body text-mute">
              Full guides are launching in May. This is a preview of {guide.title} by{" "}
              {guide.creator.name}.
            </p>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-pill bg-ink text-body font-medium text-surface hover:bg-ink-soft"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
