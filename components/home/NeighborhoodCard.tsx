import Link from "next/link";
import type { NeighborhoodCardData } from "@/lib/home/types";

interface Props {
  neighborhood: NeighborhoodCardData;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=400&q=60";

export default function NeighborhoodCard({ neighborhood }: Props) {
  const { slug, name, coverImageUrl, placeCount } = neighborhood;

  return (
    <Link
      href={`/places/neighborhood/${slug}`}
      className="relative block shrink-0 snap-start overflow-hidden rounded-card"
      style={{ width: 180, height: 200 }}
    >
      <img
        src={coverImageUrl || FALLBACK_IMG}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75))",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-[18px] font-medium leading-tight text-white">
          {name}
        </p>
        <p className="mt-0.5 text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>
          {placeCount} {placeCount === 1 ? "place" : "places"}
        </p>
      </div>
    </Link>
  );
}
