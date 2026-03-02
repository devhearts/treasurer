"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUGX } from "@/lib/data";
import { addContribution } from "@/app/actions/events";
import type { CeremonyEvent } from "@/lib/types";
import { IconBack, IconAdd } from "@/components/Icons";

interface ContributionsPageContentProps {
  event: CeremonyEvent;
}

export default function ContributionsPageContent({
  event,
}: ContributionsPageContentProps) {
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    const result = await addContribution(event.slug, {
      name: addName,
      anonymous: false,
      amount: Number(addAmount),
      phone: "",
      message: addNote || undefined,
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      manual: true,
    });
    setAddSaving(false);
    if (result.success) {
      router.refresh();
      setAddModalOpen(false);
      setAddName("");
      setAddAmount("");
      setAddNote("");
    } else {
      alert(result.error ?? "Failed to add contribution.");
    }
  }

  return (
    <main className="min-h-screen bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to event</span>
        </Link>

        <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
          <div className="p-4 border-b border-muted/20 flex items-center justify-between">
            <h1 className="text-lg font-bold text-surface">All contributions</h1>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-accent font-medium"
            >
              <IconAdd className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="p-4">
            {event.contributions.length === 0 ? (
              <p className="text-muted text-sm">No contributions yet.</p>
            ) : (
              <ul className="space-y-2">
                {event.contributions
                  .slice()
                  .reverse()
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between py-3 border-b border-muted/10 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-surface text-sm">
                          {c.anonymous ? "Anonymous" : c.name}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(c.date).toLocaleDateString("en-UG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {c.manual && " · Added by treasurer"}
                        </p>
                      </div>
                      <span className="font-semibold text-surface text-sm">
                        {formatUGX(c.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-surface/80"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="bg-light rounded-t-2xl sm:rounded-xl border border-muted/30 shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-surface mb-2">
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add contribution</span>
            </h3>
            <p className="text-muted text-sm mb-4">
              Record cash or off-app payment.
            </p>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="sr-only">Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Contributor name"
                  required
                  className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="sr-only">Amount (UGX)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Amount"
                  required
                  min={1}
                  className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="sr-only">Note (optional)</label>
                <input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="e.g. cash"
                  className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <button
                type="submit"
                disabled={addSaving}
                className="cta-primary disabled:opacity-50"
              >
                {addSaving ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
