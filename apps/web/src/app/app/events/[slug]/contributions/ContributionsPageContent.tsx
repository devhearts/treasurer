"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUGX, formatCalendarDate, isPublicContribution } from "@/lib/data";
import { addContribution, setContributionVisibility } from "@/app/actions/events";
import type { CeremonyEvent } from "@/lib/types";
import EventPhotoGallery from "@/components/EventPhotoGallery";
import EventStatusNotice from "@/components/EventStatusNotice";
import { publicStatusNotice } from "@/lib/event-lifecycle";
import {
  IconBack,
  IconAdd,
  IconPaid,
  IconPledge,
  IconEye,
  IconEyeOff,
} from "@/components/Icons";
import { validateUgandaPhone } from "@/lib/phone";

interface ContributionsPageContentProps {
  event: CeremonyEvent;
}

export default function ContributionsPageContent({
  event,
}: ContributionsPageContentProps) {
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAnonymous, setAddAnonymous] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  /** Empty string = tag to whole event (no milestone). */
  const [addMilestoneId, setAddMilestoneId] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(
    null
  );
  /** `"all"` | `"general"` | milestone id */
  const [milestoneFilter, setMilestoneFilter] = useState<string>("all");

  const hasMilestones = event.milestoneItems.length > 0;
  const contributionsOpen = (event.status ?? "active") === "active";
  const statusNotice = publicStatusNotice({
    status: event.status ?? "active",
    statusMessage: event.statusMessage,
  });

  const contributionsSorted = event.contributions.slice().reverse();
  const filteredContributions = contributionsSorted.filter((c) => {
    if (milestoneFilter === "all") return true;
    if (milestoneFilter === "general") return !c.milestoneId;
    return c.milestoneId === milestoneFilter;
  });

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setAddError("Enter a valid amount (at least UGX 1).");
      return;
    }
    if (!addAnonymous && !addName.trim()) {
      setAddError("Enter the contributor name.");
      return;
    }
    if (addPhone.trim()) {
      const phoneErr = validateUgandaPhone(addPhone);
      if (phoneErr) {
        setAddError(phoneErr);
        return;
      }
    }
    setAddSaving(true);
    const result = await addContribution(event.slug, {
      name: addAnonymous ? "Anonymous" : addName.trim(),
      anonymous: addAnonymous,
      amount,
      phone: addPhone.trim(),
      message: addNote || undefined,
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      manual: true,
      milestoneId: addMilestoneId.trim() || undefined,
    });
    setAddSaving(false);
    if (result.success) {
      router.refresh();
      setAddModalOpen(false);
      setAddName("");
      setAddAnonymous(false);
      setAddAmount("");
      setAddNote("");
      setAddPhone("");
      setAddMilestoneId("");
      setAddError(null);
    } else {
      setAddError(result.error ?? "Failed to add contribution.");
    }
  }

  return (
    <main className="min-h-screen bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        <Link
          href={`/app/events/${event.slug}`}
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to event</span>
        </Link>

        {event.imageUrls && event.imageUrls.length > 0 ? (
          <div className="mb-4 rounded-xl border border-muted/30 overflow-hidden bg-light shadow-sm">
            <EventPhotoGallery imageSources={event.imageUrls} />
          </div>
        ) : null}

        <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
          <div className="p-4 border-b border-muted/20 space-y-3">
            {statusNotice ? (
              <EventStatusNotice notice={statusNotice} />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg font-bold text-surface">All contributions</h1>
              {contributionsOpen ? (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-accent font-medium flex-shrink-0"
                >
                  <IconAdd className="w-4 h-4" />
                  Add
                </button>
              ) : null}
            </div>
            {hasMilestones && (
              <div>
                <label
                  htmlFor="contributions-milestone-filter"
                  className="block text-xs font-medium text-muted mb-1"
                >
                  Filter by milestone
                </label>
                <select
                  id="contributions-milestone-filter"
                  value={milestoneFilter}
                  onChange={(e) => setMilestoneFilter(e.target.value)}
                  className="w-full border border-muted/50 rounded-lg px-3 py-2.5 text-sm text-surface bg-light focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">All contributions</option>
                  <option value="general">General (no milestone)</option>
                  {event.milestoneItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs text-muted mb-3">
              Use visibility to exclude a row from the public event page, recent
              contributions there, and the receipt (copy/share).
            </p>
            {event.contributions.length === 0 ? (
              <p className="text-muted text-sm">No contributions yet.</p>
            ) : filteredContributions.length === 0 ? (
              <p className="text-muted text-sm">
                No contributions match this milestone filter.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredContributions.map((c) => {
                    const onPublic = isPublicContribution(c);
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3 py-3 border-b border-muted/10 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {c.status === "paid" ? (
                            <IconPaid className="w-4 h-4 flex-shrink-0 text-accent" aria-label="Paid" />
                          ) : (
                            <IconPledge className="w-4 h-4 flex-shrink-0 text-muted" aria-label="Pledged" />
                          )}
                          <div>
                            <p className="font-medium text-surface text-sm">
                              {c.anonymous ? "Anonymous" : c.name}
                            </p>
                            <p className="text-xs text-muted">
                              {formatCalendarDate(c.date)}
                              {c.milestoneId && (
                                <>
                                  {" · "}
                                  <span className="text-accent/90">
                                    {event.milestoneItems.find((m) => m.id === c.milestoneId)
                                      ?.name ?? "Milestone"}
                                  </span>
                                </>
                              )}
                              {c.status === "pledged" && c.pledgeHopeBy?.trim() && (
                                <>
                                  {" · "}
                                  Hope to pay by{" "}
                                  {formatCalendarDate(c.pledgeHopeBy)}
                                </>
                              )}
                              {c.manual && " · Added by treasurer"}
                              {!onPublic && (
                                <span className="text-muted/80">
                                  {" · "}
                                  Not on public / receipt
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="font-semibold text-surface text-sm">
                            {formatUGX(c.amount)}
                          </span>
                          <button
                            type="button"
                            disabled={visibilitySavingId === c.id}
                            onClick={async () => {
                              setVisibilitySavingId(c.id);
                              const result = await setContributionVisibility(
                                event.slug,
                                c.id,
                                !onPublic
                              );
                              setVisibilitySavingId(null);
                              if (result.success) {
                                router.refresh();
                              } else {
                                alert(result.error ?? "Could not update.");
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-muted/30 px-2 py-1 text-xs font-medium text-muted hover:bg-muted/10 hover:text-surface disabled:opacity-50"
                            aria-pressed={onPublic}
                            aria-label={
                              onPublic
                                ? "Hide from public page and receipt"
                                : "Show on public page and receipt"
                            }
                          >
                            {onPublic ? (
                              <IconEye className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <IconEyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
              {addError && (
                <p className="text-sm text-red-600" role="alert">
                  {addError}
                </p>
              )}
              {!addAnonymous && (
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
              )}
              <label className="flex items-start gap-3 cursor-pointer text-sm text-surface">
                <input
                  type="checkbox"
                  checked={addAnonymous}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setAddAnonymous(on);
                    if (on) setAddName("");
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-muted/50 text-accent focus:ring-accent"
                />
                <span>Anonymous on the list</span>
              </label>
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
              {hasMilestones && (
                <div>
                  <label
                    htmlFor="add-contribution-milestone"
                    className="block text-xs font-medium text-muted mb-1"
                  >
                    Tag to milestone
                  </label>
                  <select
                    id="add-contribution-milestone"
                    value={addMilestoneId}
                    onChange={(e) => setAddMilestoneId(e.target.value)}
                    className="w-full border border-muted/50 rounded-lg px-3 py-3 text-sm text-surface bg-light focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Whole event (no milestone)</option>
                    {event.milestoneItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label
                  className="block text-xs font-medium text-muted mb-1"
                  htmlFor="add-contribution-phone"
                >
                  Phone (optional)
                </label>
                <input
                  id="add-contribution-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="e.g. 077xxxxxxx"
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
