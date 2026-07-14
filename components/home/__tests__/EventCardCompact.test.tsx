import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EventCardCompact from "@/components/home/EventCardCompact";
import type { EventCompact } from "@/lib/home/types";

// Test-only: the card's SaveButton/NotForMeButton children call useSession(),
// which throws without a <SessionProvider>. Stub it (idiomatic RTL+next-auth).
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// Full EventCompact shape; enum-typed fields cast through unknown for the fixture.
const baseEvent = {
  id: "evt_1",
  title: "Jazz at Nocturne",
  category: "LIVE_MUSIC",
  imageUrl: null,
  venueName: "Nocturne",
  neighborhood: "RiNo",
  startTime: new Date().toISOString(),
  priceRange: "$$",
  isEditorsPick: false,
  isPermanent: false,
  noveltyScore: null,
  driveTimeFromDenver: null,
  tags: [],
  oneLiner: null,
  region: "DENVER_METRO",
  townName: null,
  isDayTrip: false,
  isWeekendTrip: false,
  driveNote: null,
  worthTheDriveScore: null,
} as unknown as EventCompact;

describe("EventCardCompact reasonLine", () => {
  it("renders the reason line when reasonLine is provided", () => {
    render(<EventCardCompact event={baseEvent} reasonLine={'Feels like "cozy"'} />);
    expect(screen.getByText(/Feels like/)).toBeInTheDocument();
  });

  it("omits the reason line when reasonLine is null", () => {
    render(<EventCardCompact event={baseEvent} reasonLine={null} />);
    expect(screen.queryByText(/Feels like/)).not.toBeInTheDocument();
  });
});
