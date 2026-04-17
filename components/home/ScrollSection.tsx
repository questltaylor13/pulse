import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  seeAllHref?: string;
  empty?: React.ReactNode;
  children: React.ReactNode;
}

export default function ScrollSection({
  title,
  subtitle,
  count,
  seeAllHref,
  empty,
  children,
}: Props) {
  const childCount = Array.isArray(children) ? children.flat().length : 1;

  return (
    <section className="py-6">
      <header className="mb-3 flex items-end justify-between px-5">
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-title font-medium text-ink">{title}</h2>
            {typeof count === "number" && count > 0 && (
              <span className="rounded-pill bg-mute-hush px-2 py-0.5 text-meta text-mute">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-body text-mute">{subtitle}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="flex items-center gap-0.5 text-body text-ink hover:text-coral"
          >
            See all
            <ChevronRightIcon size={14} />
          </Link>
        )}
      </header>
      {childCount === 0 && empty ? (
        <div className="px-5">{empty}</div>
      ) : (
        <div
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 no-scrollbar"
          style={{ scrollPaddingInline: "20px" }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
