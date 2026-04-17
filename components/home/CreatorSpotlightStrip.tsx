import type { CreatorCardData } from "@/lib/home/types";
import CreatorSpotlightCell from "./CreatorSpotlightCell";

interface Props {
  creators: CreatorCardData[];
}

export default function CreatorSpotlightStrip({ creators }: Props) {
  if (creators.length === 0) return null;

  return (
    <section className="py-6">
      <header className="mb-3 px-5">
        <h2 className="text-title font-medium text-ink">Local creators</h2>
        <p className="mt-0.5 text-body text-mute">
          Follow the people who know Denver
        </p>
      </header>
      <div
        className="flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar"
        style={{ scrollPaddingInline: "20px" }}
      >
        {creators.map((c) => (
          <CreatorSpotlightCell key={c.handle} creator={c} />
        ))}
      </div>
    </section>
  );
}
