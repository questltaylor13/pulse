"use client";

import Image from "next/image";
import Link from "next/link";
import { CATEGORY_PLACEHOLDER_IMAGE } from "@/lib/constants/placeholder-images";

const WEEKEND_PICKS = [
  {
    number: 1,
    title: "Red Rocks Stairs at Sunrise",
    editorial:
      "Free. Brutal. Totally worth it. 380 steps with views of the entire Front Range waking up. Get there by 6am before it gets crowded. Bring water and a layer \u2014 it\u2019s cold at dawn but you\u2019ll be sweating by step 50.",
    details: "Wed, Apr 8 \u00b7 6:00 AM \u00b7 Red Rocks Amphitheatre \u00b7 Free",
    category: "Outdoors",
    categoryColor: "bg-green-100 text-green-700",
    tag: "\ud83d\udd25 Staff Pick",
    tagColor: "from-orange-500 to-red-500",
    image: CATEGORY_PLACEHOLDER_IMAGE.OUTDOORS,
    href: "/feed?category=OUTDOORS",
  },
  {
    number: 2,
    title: "Archery Dodgeball",
    editorial:
      "Yes, this is real. You grab a recurve bow, load foam-tipped arrows, and play dodgeball in an indoor arena. It\u2019s as chaotic and fun as it sounds. Go with 4+ friends and prepare to talk about it for weeks.",
    details: "Always Available \u00b7 Archery Games Denver, Arvada \u00b7 $30-40/person",
    category: "Experience",
    categoryColor: "bg-cyan-100 text-cyan-700",
    tag: "\ud83c\udfaf You Haven\u2019t Tried This",
    tagColor: "from-cyan-500 to-blue-500",
    image: CATEGORY_PLACEHOLDER_IMAGE.ACTIVITY_VENUE,
    href: "/feed?category=ACTIVITY_VENUE",
  },
  {
    number: 3,
    title: "The Summer Set at Meow Wolf",
    editorial:
      "Live pop-rock inside a psychedelic, multi-floor art experience. Even if you\u2019re not a huge fan of the band, Meow Wolf\u2019s Perplexiplex stage is worth it just for the venue. Grab a mocktail at Sips and wander the exhibits before the show.",
    details: "Fri, Apr 3 \u00b7 8:00 PM \u00b7 Meow Wolf Denver \u00b7 TBD",
    category: "Live Music",
    categoryColor: "bg-pink-100 text-pink-700",
    tag: "\ud83c\udfaa Unique Venue",
    tagColor: "from-purple-500 to-pink-500",
    image: CATEGORY_PLACEHOLDER_IMAGE.LIVE_MUSIC,
    href: "/feed?category=LIVE_MUSIC",
  },
];

export default function WeekendPicksHero() {
  // Calculate this weekend's date range
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFri = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFri);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const dateRange = `${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}\u2013${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Curated for you
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-display">
          Your Weekend, Sorted
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          3 picks for {dateRange} based on what you&apos;re into
        </p>
      </div>

      {/* Picks */}
      <div className="grid gap-5 md:grid-cols-3">
        {WEEKEND_PICKS.map((pick) => (
          <Link
            key={pick.number}
            href={pick.href}
            className="group relative rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition"
          >
            {/* Image */}
            <div className="relative h-36 overflow-hidden">
              <Image
                src={pick.image}
                alt={pick.title}
                fill
                className="object-cover transition-transform group-hover:scale-105 opacity-80"
              />
              {/* Number badge */}
              <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-900">
                  {pick.number}
                </span>
              </div>
              {/* Tag */}
              <div className="absolute top-3 right-3">
                <span
                  className={`bg-gradient-to-r ${pick.tagColor} text-white text-xs font-bold px-2.5 py-1 rounded-full`}
                >
                  {pick.tag}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${pick.categoryColor}`}
                >
                  {pick.category}
                </span>
              </div>
              <h3 className="font-bold text-white text-base mb-2">
                {pick.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-3">
                {pick.editorial}
              </p>
              <p className="text-xs text-slate-500">{pick.details}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
