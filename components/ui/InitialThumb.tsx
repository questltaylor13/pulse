// Wave 5 hygiene — the image-or-initial thumbnail, extracted.
//
// Four surfaces were carrying their own copy of "render the image, or fall back
// to a gradient square with the first letter in it": ComparisonDuel,
// RankedListRow, and both new social components. Size, rounding and initial
// size are the caller's business; the fallback behaviour is not.
//
// Not used for the rankings-page hero, which is a full-bleed cover with no
// initial — a different thing that only looks similar.

interface Props {
  src: string | null;
  /** The initial is taken from this when there's no image. */
  title: string;
  /** Size + rounding. e.g. "h-12 w-12 rounded-lg" */
  className?: string;
  /** Text size of the fallback initial. */
  initialClassName?: string;
  /** Extra classes on the <img> itself — e.g. the duel's hover zoom. */
  imgClassName?: string;
}

export default function InitialThumb({
  src,
  title,
  className = "h-12 w-12 rounded-lg",
  initialClassName = "text-lg",
  imgClassName = "",
}: Props) {
  return (
    <div className={`flex-shrink-0 overflow-hidden bg-mute-hush ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-soft to-coral/20 font-semibold text-ink/40 ${initialClassName}`}
        >
          {title.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
}
