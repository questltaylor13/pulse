"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "pulse-welcome-dismissed";

interface WelcomeBannerProps {
  userName: string | null | undefined;
}

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setHiding(true);
    localStorage.setItem(STORAGE_KEY, "true");
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  const firstName = userName?.split(" ")[0] || "there";

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 md:p-8 text-white overflow-hidden transition-all duration-300 ${
        hiding ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
      }`}
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition z-10"
        aria-label="Dismiss welcome banner"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative z-10 max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold font-display mb-3">
          Welcome to Pulse, {firstName} <span className="inline-block animate-[wave_1.5s_ease-in-out]">&#x1F44B;</span>
        </h2>

        <p className="text-slate-300 leading-relaxed mb-1 text-sm md:text-base">
          We pull together every event, activity, and hidden gem in Denver &mdash; then filter it down to the stuff that actually matches what you&apos;re into.
        </p>
        <p className="text-slate-400 leading-relaxed mb-6 text-sm md:text-base hidden md:block">
          No more scrolling 30 pages of the Denver events calendar. No more missing out on things you didn&apos;t know existed. Below is your personalized feed based on what you told us you like. Save things, explore lists from the community, and let us know what we got right.
        </p>

        <button
          onClick={dismiss}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-primary/20"
        >
          Let&apos;s Go &rarr;
        </button>

        <p className="text-xs text-slate-500 mt-4">
          Pulse is in early beta for Denver. We&apos;re adding new events and activities daily.
        </p>
      </div>
    </div>
  );
}
