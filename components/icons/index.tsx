import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

function makeIcon(path: React.ReactNode) {
  return function Icon({ size = 22, ...rest }: IconProps) {
    return (
      <svg {...baseProps(size)} {...rest}>
        {path}
      </svg>
    );
  };
}

// ---- Category rail icons (9) ----
export const AllIcon = makeIcon(
  <>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <circle cx="6" cy="18" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
  </>
);

export const MusicIcon = makeIcon(
  <>
    <path d="M9 18V6l10-2v12" />
    <circle cx="7" cy="18" r="2.2" />
    <circle cx="17" cy="16" r="2.2" />
  </>
);

export const FoodIcon = makeIcon(
  <>
    <path d="M6 3v8a3 3 0 0 0 6 0V3" />
    <path d="M9 3v18" />
    <path d="M18 3v9.5a2.5 2.5 0 0 0 0 5V21" />
  </>
);

export const WeirdIcon = makeIcon(
  <>
    <path d="M12 2.5 14 8l5.5.8-4 3.9.9 5.5L12 15.7 7.6 18.2l.9-5.5-4-3.9L10 8z" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </>
);

export const OffbeatIcon = makeIcon(
  <>
    <path d="M4 12a8 8 0 0 1 16 0" />
    <path d="M4 12a8 8 0 0 0 16 0" strokeDasharray="1.5 2.5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </>
);

export const ArtIcon = makeIcon(
  <>
    <path d="M3 20h18" />
    <path d="M6 20V9l6-5 6 5v11" />
    <circle cx="12" cy="11" r="1.4" />
    <path d="M10 20v-4h4v4" />
  </>
);

export const OutdoorsIcon = makeIcon(
  <>
    <path d="M3 20h18" />
    <path d="M6 20 12 8l6 12" />
    <path d="M9 15h6" />
  </>
);

export const ComedyIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 10h.01M16 10h.01" strokeWidth="2.6" />
    <path d="M8 15c1 1.5 2.5 2.2 4 2.2S15 16.5 16 15" />
  </>
);

export const PopupIcon = makeIcon(
  <>
    <path d="M3 10h18" />
    <path d="M5 10 7 4h10l2 6" />
    <path d="M6 10v10h12V10" />
    <path d="M12 4v6" />
  </>
);

// ---- Places rail icons ----
export const BarsIcon = makeIcon(
  <>
    <path d="M8 2l4 8H4l4-8z" />
    <path d="M8 10v10" />
    <path d="M4 20h8" />
    <path d="M16 2v6a2 2 0 0 0 4 0V2" />
    <path d="M18 8v12" />
  </>
);

export const CoffeeIcon = makeIcon(
  <>
    <path d="M5 6h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1" />
    <path d="M5 6v8a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V6" />
    <path d="M3 20h14" />
  </>
);

export const NightlifeIcon = makeIcon(
  <>
    <path d="M12 3v3" />
    <path d="M18.4 5.6l-2.1 2.1" />
    <path d="M21 12h-3" />
    <path d="M5.6 5.6l2.1 2.1" />
    <path d="M3 12h3" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 16v5" />
  </>
);

// ---- Bottom nav icons (3) ----
export const HomeIcon = makeIcon(
  <>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v10h12V10" />
    <path d="M10 20v-5h4v5" />
  </>
);

export const SavedIcon = makeIcon(
  <path d="M6 4h12v17l-6-4-6 4V4z" />
);

export const ProfileIcon = makeIcon(
  <>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </>
);

// ---- Misc UI icons ----
export const SearchIcon = makeIcon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.3-4.3" />
  </>
);

export const ChevronRightIcon = makeIcon(
  <path d="m9 5 7 7-7 7" />
);

export const CloseIcon = makeIcon(
  <>
    <path d="M5 5l14 14" />
    <path d="M19 5 5 19" />
  </>
);

export const AvatarPlaceholderIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" fill="#f0f0f0" stroke="none" />
    <circle cx="12" cy="10" r="3.2" />
    <path d="M5.5 19c1.4-3 3.8-4.5 6.5-4.5S17.1 16 18.5 19" />
  </>
);
