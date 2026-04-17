"use client";

import Link from "next/link";

interface Props {
  href: string;
  imageUrl: string | null;
  title: string;
  subtitle: string;
  onClick?: () => void;
}

export default function SearchResultItem({ href, imageUrl, title, subtitle, onClick }: Props) {
  return (
    <li>
      <Link href={href} onClick={onClick} className="flex items-center gap-3 py-2">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-mute-hush">
          {imageUrl && (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">{title}</p>
          <p className="truncate text-[12px] text-mute">{subtitle}</p>
        </div>
      </Link>
    </li>
  );
}
