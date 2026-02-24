"use client";

import { useState, useEffect } from "react";
import { X, Plus, Calendar } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  planType: string;
  dateStart: string;
}

interface AddToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  placeId?: string | null;
  itemName: string;
}

export default function AddToPlanModal({
  isOpen,
  onClose,
  eventId,
  placeId,
  itemName,
}: AddToPlanModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSuccess(null);
      fetch("/api/plans")
        .then((r) => r.json())
        .then((data) => setPlans(data.plans || []))
        .catch(() => setPlans([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleAdd = async (planId: string) => {
    setAdding(planId);
    try {
      const res = await fetch(`/api/plans/${planId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, placeId }),
      });

      if (res.ok) {
        setSuccess(planId);
        setTimeout(() => onClose(), 1200);
      }
    } catch {
      // Silently handle
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Add to Plan</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="px-4 pt-3 text-sm text-slate-500 truncate">
          Adding <span className="font-medium text-slate-700">{itemName}</span>
        </p>

        {/* Plan list */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Loading plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No plans yet. Create one from the Plans page.
            </div>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleAdd(plan.id)}
                disabled={adding === plan.id || success === plan.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition text-left disabled:opacity-60"
              >
                <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">
                    {plan.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(plan.dateStart).toLocaleDateString()}
                  </div>
                </div>
                {success === plan.id ? (
                  <span className="text-xs font-medium text-green-600">
                    Added!
                  </span>
                ) : (
                  <Plus className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
