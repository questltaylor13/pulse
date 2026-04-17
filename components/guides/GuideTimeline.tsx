import Image from "next/image";
import InsiderTipCallout from "./InsiderTipCallout";

interface StopData {
  id: string;
  order: number;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  note: string;
  insiderTip: string | null;
  walkTimeToNext: number | null;
  place: {
    name: string;
    neighborhood: string | null;
    category: string | null;
    primaryImageUrl: string | null;
  } | null;
  event: {
    title: string;
    venueName: string;
    neighborhood: string | null;
    category: string | null;
    imageUrl: string | null;
  } | null;
}

interface Props {
  stops: StopData[];
}

function formatCategory(cat: string | null): string {
  if (!cat) return "";
  return cat
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GuideTimeline({ stops }: Props) {
  return (
    <div className="relative">
      {stops.map((stop, idx) => {
        const isLast = idx === stops.length - 1;
        const name = stop.place?.name ?? stop.event?.title ?? "Stop";
        const neighborhood =
          stop.place?.neighborhood ?? stop.event?.neighborhood ?? null;
        const category =
          stop.place?.category ?? stop.event?.category ?? null;
        const imageUrl =
          stop.place?.primaryImageUrl ?? stop.event?.imageUrl ?? null;

        return (
          <div key={stop.id} className="relative flex gap-4">
            {/* Left column: number circle + connecting line */}
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-[13px] font-medium text-white">
                {stop.order}
              </div>
              {!isLast && (
                <div className="w-[2px] flex-1 bg-coral/30" />
              )}
            </div>

            {/* Right column: stop content */}
            <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-6"}`}>
              {/* Time window */}
              {stop.timeWindowStart && stop.timeWindowEnd && (
                <p className="mb-1 text-[12px] text-mute">
                  {stop.timeWindowStart} &ndash; {stop.timeWindowEnd}
                </p>
              )}

              {/* Name */}
              <h3 className="text-[16px] font-medium text-ink">{name}</h3>

              {/* Neighborhood + category */}
              <p className="mt-0.5 text-[12px] text-mute">
                {[neighborhood, formatCategory(category)]
                  .filter(Boolean)
                  .join(" \u00B7 ")}
              </p>

              {/* Cover image */}
              {imageUrl && (
                <div className="relative mt-3 h-[160px] w-full overflow-hidden rounded-card bg-mute-hush">
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="object-cover"
                  />
                </div>
              )}

              {/* Creator note */}
              {stop.note && (
                <p className="mt-3 text-[14px] leading-relaxed text-ink">
                  {stop.note}
                </p>
              )}

              {/* Insider tip */}
              {stop.insiderTip && (
                <div className="mt-3">
                  <InsiderTipCallout tip={stop.insiderTip} />
                </div>
              )}

              {/* Walk time to next */}
              {!isLast && stop.walkTimeToNext != null && (
                <p className="mt-3 text-[12px] text-mute">
                  &darr; {stop.walkTimeToNext} min walk
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
