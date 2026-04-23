import { describe, it, expect } from "vitest";
import {
  isEventRef,
  isPlaceRef,
  isDiscoveryRef,
  isItemRef,
  type FeedbackRef,
} from "@/lib/feedback/types";

describe("FeedbackRef type guards", () => {
  const eventRef: FeedbackRef = { eventId: "evt_1" };
  const placeRef: FeedbackRef = { placeId: "plc_1" };
  const discoveryRef: FeedbackRef = { discoveryId: "dsc_1" };
  const itemRef: FeedbackRef = { itemId: "itm_1" };

  it("isEventRef matches only event refs", () => {
    expect(isEventRef(eventRef)).toBe(true);
    expect(isEventRef(placeRef)).toBe(false);
    expect(isEventRef(discoveryRef)).toBe(false);
    expect(isEventRef(itemRef)).toBe(false);
  });

  it("isPlaceRef matches only place refs", () => {
    expect(isPlaceRef(placeRef)).toBe(true);
    expect(isPlaceRef(eventRef)).toBe(false);
    expect(isPlaceRef(discoveryRef)).toBe(false);
    expect(isPlaceRef(itemRef)).toBe(false);
  });

  it("isDiscoveryRef matches only discovery refs", () => {
    expect(isDiscoveryRef(discoveryRef)).toBe(true);
    expect(isDiscoveryRef(eventRef)).toBe(false);
    expect(isDiscoveryRef(placeRef)).toBe(false);
    expect(isDiscoveryRef(itemRef)).toBe(false);
  });

  it("isItemRef matches only legacy item refs", () => {
    expect(isItemRef(itemRef)).toBe(true);
    expect(isItemRef(eventRef)).toBe(false);
    expect(isItemRef(placeRef)).toBe(false);
    expect(isItemRef(discoveryRef)).toBe(false);
  });
});
