import { filterValidVibeTags } from "@/lib/constants/vibe-tags";

interface Props {
  tags: string[];
}

export default function VibeTagPill({ tags }: Props) {
  const valid = filterValidVibeTags(tags).slice(0, 2);
  if (valid.length === 0) return null;

  return (
    <span className="inline-block rounded-pill bg-mute-hush px-2 py-0.5 text-[11px] text-mute">
      {valid.join(" · ")}
    </span>
  );
}
