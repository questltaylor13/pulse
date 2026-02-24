"use client";

import { useState, useEffect } from "react";
import { X, Plus, ListChecks } from "lucide-react";

interface ListSummary {
  id: string;
  name: string;
  itemCount: number;
}

interface SaveToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeId: string;
  itemName: string;
}

export default function SaveToListModal({
  isOpen,
  onClose,
  placeId,
  itemName,
}: SaveToListModalProps) {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setSuccess(null);
      fetch("/api/lists")
        .then((r) => r.json())
        .then((data) => setLists(data.lists || []))
        .catch(() => setLists([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (listId: string) => {
    setSaving(listId);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });

      if (res.ok) {
        setSuccess(listId);
        setTimeout(() => onClose(), 1200);
      }
    } catch {
      // Silently handle
    } finally {
      setSaving(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Save to List</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="px-4 pt-3 text-sm text-slate-500 truncate">
          Saving <span className="font-medium text-slate-700">{itemName}</span>
        </p>

        {/* List selection */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Loading lists...
            </div>
          ) : lists.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No lists yet. Create one from the Lists page.
            </div>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleSave(list.id)}
                disabled={saving === list.id || success === list.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition text-left disabled:opacity-60"
              >
                <ListChecks className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">
                    {list.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {list.itemCount} item{list.itemCount !== 1 ? "s" : ""}
                  </div>
                </div>
                {success === list.id ? (
                  <span className="text-xs font-medium text-green-600">
                    Saved!
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
