"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMilestoneItem, deleteMilestoneItem } from "@/app/actions/events";
import { formatUGX } from "@/lib/data";
import type { CeremonyEvent } from "@/lib/types";

function progressPct(raised: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}

export default function MilestoneItemsTab({ event }: { event: CeremonyEvent }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await addMilestoneItem(event.slug, {
      name,
      targetAmount: Number(target),
    });
    setSaving(false);
    if (result.success) {
      setName("");
      setTarget("");
      router.refresh();
    } else {
      alert(result.error ?? "Could not add milestone.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this milestone?")) {
      return;
    }
    setDeletingId(id);
    const result = await deleteMilestoneItem(event.slug, id);
    setDeletingId(null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error ?? "Could not delete.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
        <div className="p-4 border-b border-muted/20">
          <h2 className="font-bold text-surface">Add milestone</h2>
          <p className="text-xs text-muted mt-1">
            Sub-goals for this event. Contributors can tag payments to a milestone on the Contributions tab and contribute form.
          </p>
        </div>
        <form onSubmit={handleAdd} className="p-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name (e.g. Catering)"
            required
            className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          <input
            type="number"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target amount (UGX)"
            required
            min={1}
            className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
          <button type="submit" disabled={saving} className="cta-primary w-full disabled:opacity-50">
            {saving ? "Saving…" : "Add milestone"}
          </button>
        </form>
      </div>

      <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
        <div className="p-4 border-b border-muted/20">
          <h2 className="font-bold text-surface">Your milestones</h2>
        </div>
        <div className="p-4">
          {event.milestoneItems.length === 0 ? (
            <p className="text-sm text-muted">No milestones yet. Add one above.</p>
          ) : (
            <ul className="space-y-4">
              {event.milestoneItems.map((m) => {
                const pct = progressPct(m.raisedAmount, m.targetAmount);
                return (
                  <li
                    key={m.id}
                    className="rounded-xl border border-muted/20 p-4 bg-muted/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-surface">{m.name}</p>
                        <p className="text-sm text-muted tabular-nums mt-1">
                          {formatUGX(m.raisedAmount)} of {formatUGX(m.targetAmount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === m.id}
                        onClick={() => void handleDelete(m.id)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 flex-shrink-0"
                      >
                        {deletingId === m.id ? "…" : "Delete"}
                      </button>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-1">{pct}% toward target</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
