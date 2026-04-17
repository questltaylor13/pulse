"use client";

import { SearchIcon } from "@/components/icons";

interface Props {
  placeholder?: string;
  onOpen: () => void;
}

export default function SearchBar({ placeholder = "What are you in the mood for?", onOpen }: Props) {
  return (
    <div className="bg-surface px-5 pb-3 pt-1">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-11 w-full items-center gap-2 rounded-search bg-mute-hush px-4 text-left text-body text-mute transition-colors hover:bg-mute-divider"
      >
        <SearchIcon size={16} className="text-mute shrink-0" />
        <span className="truncate">{placeholder}</span>
      </button>
    </div>
  );
}
