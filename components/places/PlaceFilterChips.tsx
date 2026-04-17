"use client";

import { useRouter } from "next/navigation";

const CHIPS = [
  { value: "all", label: "All" },
  { value: "eat", label: "Eat" },
  { value: "drink", label: "Drink" },
  { value: "coffee", label: "Coffee" },
  { value: "things-to-do", label: "Things to do" },
] as const;

interface Props {
  activeCat: string;
  baseHref: string;
}

export default function PlaceFilterChips({ activeCat, baseHref }: Props) {
  const router = useRouter();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {CHIPS.map((chip) => {
        const isActive = activeCat === chip.value;
        return (
          <button
            key={chip.value}
            onClick={() =>
              router.replace(
                chip.value === "all"
                  ? baseHref
                  : `${baseHref}?cat=${chip.value}`,
              )
            }
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-body transition ${
              isActive
                ? "bg-ink text-surface"
                : "border border-mute-divider bg-surface text-ink"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
