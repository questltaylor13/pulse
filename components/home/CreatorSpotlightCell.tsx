import Link from "next/link";
import Image from "next/image";
import type { CreatorCardData } from "@/lib/home/types";

interface Props {
  creator: CreatorCardData;
}

export default function CreatorSpotlightCell({ creator }: Props) {
  return (
    <Link
      href={`/influencers/${creator.handle}`}
      className="flex shrink-0 flex-col items-center gap-1.5"
      style={{ width: 80 }}
    >
      {/* Avatar with coral ring + white inner padding */}
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#E85D3A] p-[2px]">
        <div className="flex h-full w-full items-center justify-center rounded-full bg-surface p-[2px]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-mute-hush">
            {creator.profileImageUrl ? (
              <Image
                src={creator.profileImageUrl}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[20px] font-medium text-mute">
                {creator.displayName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="max-w-full truncate text-center text-[12px] font-medium text-ink">
        {creator.displayName.split(" ")[0]}
      </span>
      <span className="-mt-1 max-w-full truncate text-center text-[10px] text-mute">
        {creator.label}
      </span>
    </Link>
  );
}
