"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import NearbyItemCard from "./NearbyItemCard";
import AddToPlanModal from "./AddToPlanModal";
import type { NearbyListGroup } from "@/lib/proximity";

interface FromListsTabProps {
  groups: NearbyListGroup[];
  radiusMiles: number;
}

export default function FromListsTab({ groups, radiusMiles }: FromListsTabProps) {
  const [planModal, setPlanModal] = useState<{
    eventId: string | null;
    placeId: string | null;
    name: string;
  } | null>(null);

  if (groups.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-400">
          None of your saved spots are within {radiusMiles} mi — try expanding
          your radius
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.listId}>
          {/* List header */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm text-slate-900">
              {group.listName}
            </h4>
            {!group.isOwner && group.ownerName && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                <Users className="w-3 h-3" />
                {group.ownerName}
              </span>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            {group.items.map((item) => (
              <NearbyItemCard
                key={item.listItemId}
                name={item.name}
                address={item.address}
                neighborhood={item.neighborhood}
                distance={item.distance}
                googleRating={item.googleRating}
                googleReviewCount={item.googleReviewCount}
                priceLevel={item.priceLevel}
                priceRange={item.priceRange}
                imageUrl={item.imageUrl}
                category={item.category}
                vibeTags={item.vibeTags}
                isNew={item.isNew}
                notes={item.notes}
                href={
                  item.placeId
                    ? `/places/${item.placeId}`
                    : `/events/${item.eventId}`
                }
                actions={
                  <button
                    onClick={() =>
                      setPlanModal({
                        eventId: item.eventId,
                        placeId: item.placeId,
                        name: item.name,
                      })
                    }
                    className="text-xs font-medium text-[#FF4D4F] hover:text-[#FF4D4F]/80 transition"
                  >
                    + Add to Plan
                  </button>
                }
              />
            ))}
          </div>
        </div>
      ))}

      <AddToPlanModal
        isOpen={!!planModal}
        onClose={() => setPlanModal(null)}
        eventId={planModal?.eventId}
        placeId={planModal?.placeId}
        itemName={planModal?.name || ""}
      />
    </div>
  );
}
