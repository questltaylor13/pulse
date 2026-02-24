"use client";

import { useState } from "react";
import { ItemStatus } from "@prisma/client";
import { setItemStatus, removeItemStatus } from "@/lib/actions/items";

interface ItemStatusButtonsProps {
  itemId: string;
  initialStatus: ItemStatus | null;
  onStatusChange?: (status: ItemStatus | null) => void;
  size?: "sm" | "md";
}

export default function ItemStatusButtons({
  itemId,
  initialStatus,
  onStatusChange,
  size = "md",
}: ItemStatusButtonsProps) {
  const [status, setStatus] = useState<ItemStatus | null>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleStatusClick = async (newStatus: ItemStatus) => {
    if (loading) return;
    setLoading(true);

    try {
      if (status === newStatus) {
        // Toggle off
        await removeItemStatus(itemId);
        setStatus(null);
        onStatusChange?.(null);
      } else {
        await setItemStatus(itemId, newStatus);
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } catch {
      /* silently handled */
    } finally {
      setLoading(false);
    }
  };

  const buttonBase = size === "sm"
    ? "px-2 py-1 text-xs rounded-md"
    : "px-3 py-1.5 text-sm rounded-md";

  return (
    <div className="flex items-center gap-2">
      {/* Want Button */}
      <button
        onClick={() => handleStatusClick("WANT")}
        disabled={loading}
        className={`flex items-center gap-1 font-medium transition ${buttonBase} ${
          status === "WANT"
            ? "bg-primary text-white hover:bg-primary-dark"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        } disabled:opacity-50`}
      >
        <svg
          className={size === "sm" ? "h-3 w-3" : "h-4 w-4"}
          fill={status === "WANT" ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        Want
      </button>

      {/* Done Button */}
      <button
        onClick={() => handleStatusClick("DONE")}
        disabled={loading}
        className={`flex items-center gap-1 font-medium transition ${buttonBase} ${
          status === "DONE"
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        } disabled:opacity-50`}
      >
        <svg
          className={size === "sm" ? "h-3 w-3" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Done
      </button>

      {/* Pass Button */}
      <button
        onClick={() => handleStatusClick("PASS")}
        disabled={loading}
        className={`flex items-center gap-1 font-medium transition ${buttonBase} ${
          status === "PASS"
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        } disabled:opacity-50`}
        title="Not interested"
      >
        <svg
          className={size === "sm" ? "h-3 w-3" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        Pass
      </button>
    </div>
  );
}
