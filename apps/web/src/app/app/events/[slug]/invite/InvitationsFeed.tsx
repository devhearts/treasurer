"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CeremonyEvent } from "@/lib/types";
import type {
  InvitationDetail,
  InvitationListItem,
  RsvpStatus,
} from "@/lib/invitations/types";
import { getTemplateMeta } from "@/lib/invitations/templates";
import {
  createInvitation,
  deleteInvitation,
  duplicateInvitation,
  getInvitation,
} from "@/app/actions/invitations";

type Filter = "all" | "published" | "draft";

const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Pending",
  accepted: "Yes",
  declined: "No",
  maybe: "Maybe",
};

interface InvitationsFeedProps {
  event: CeremonyEvent;
  initialItems: InvitationListItem[];
  listError?: string | null;
}

function emptyMessage(filter: Filter, hasAny: boolean): { title: string; body: string } {
  if (!hasAny) {
    return {
      title: "No invitations yet",
      body: "Create a digital invitation card, add guests, and share personalized links.",
    };
  }
  if (filter === "published") {
    return {
      title: "No published invitations",
      body: "Publish a draft to get guest links and track opens and RSVPs.",
    };
  }
  return {
    title: "No drafts",
    body: "Create a new invitation or duplicate an existing one to start a draft.",
  };
}

export default function InvitationsFeed({
  event,
  initialItems,
  listError: initialListError = null,
}: InvitationsFeedProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [statsId, setStatsId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, InvitationDetail>>(
    {}
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialListError);
  const [listError, setListError] = useState<string | null>(initialListError);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const statsDetail = statsId ? detailCache[statsId] : undefined;

  useEffect(() => {
    if (!statsId) return;
    if (detailCache[statsId]) return;
    setDetailLoading(true);
    void getInvitation(statsId)
      .then((d) => {
        setDetailCache((prev) => ({ ...prev, [statsId]: d }));
      })
      .catch(() => {
        setError("Could not load guest details.");
      })
      .finally(() => setDetailLoading(false));
  }, [statsId, detailCache]);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const inv = await createInvitation(event.slug);
      router.push(`/app/events/${event.slug}/invite/${inv.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(id: string) {
    setLoading(true);
    setError(null);
    try {
      const copy = await duplicateInvitation(id);
      setItems((prev) => [copy, ...prev]);
      router.push(`/app/events/${event.slug}/invite/${copy.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not duplicate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, published: boolean) {
    const msg = published
      ? "Delete this published invitation? All guest links will stop working."
      : "Delete this invitation?";
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteInvitation(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (statsId === id) setStatsId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  async function copyAllLinks(recipients: InvitationDetail["recipients"]) {
    const text = recipients.map((r) => `${r.guestName}: ${r.publicUrl}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken("__all__");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setError("Could not copy links.");
    }
  }

  const empty = emptyMessage(filter, items.length > 0);

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["published", "Published"],
            ["draft", "Drafts"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              filter === key
                ? "bg-surface text-light border-surface"
                : "border-muted/30 text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {listError ? (
        <div className="text-sm text-[#a32d2d] bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => {
              setListError(null);
              router.refresh();
            }}
            className="text-xs font-medium text-accent whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      ) : null}

      {error && !listError ? (
        <p className="text-sm text-[#a32d2d] bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 && !listError ? (
        <div className="text-center py-12 px-4">
          <p className="text-surface font-medium">{empty.title}</p>
          <p className="text-sm text-muted mt-2 max-w-xs mx-auto">{empty.body}</p>
          {(filter === "all" || filter === "draft") && items.length === 0 ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-6 py-3 rounded-full disabled:opacity-50"
            >
              + Create invitation
            </button>
          ) : null}
        </div>
      ) : listError ? null : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const theme = getTemplateMeta(inv.templateId);
            return (
              <div
                key={inv.id}
                className="bg-light rounded-xl border border-muted/30 p-4"
              >
                <div className="flex gap-3">
                  <div
                    className="w-12 h-[4.5rem] rounded-md flex items-center justify-center text-[9px] font-bold tracking-wider border border-muted/30 flex-shrink-0"
                    style={{
                      background: theme.bg,
                      color: theme.labelColor,
                    }}
                  >
                    {theme.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 items-start">
                      <div>
                        <p className="font-medium text-surface truncate">
                          {inv.title}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {theme.name}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          inv.status === "published"
                            ? "bg-lime/40 text-[#27500A]"
                            : "bg-muted/20 text-muted"
                        }`}
                      >
                        {inv.status === "published" ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {inv.recipientCount} guests · {inv.openCount} opened ·{" "}
                      {inv.rsvpYesCount} RSVP yes
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(inv.id)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-muted/30 text-muted hover:border-accent"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStatsId(statsId === inv.id ? null : inv.id)
                    }
                    className="text-xs px-3 py-1.5 rounded-lg border border-muted/30 text-muted hover:border-accent"
                  >
                    {statsId === inv.id ? "Hide guests" : "Guests"}
                  </button>
                  <Link
                    href={`/app/events/${event.slug}/invite/${inv.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-surface text-light hover:bg-surface/90"
                  >
                    {inv.status === "draft" ? "Continue editing" : "Manage"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(inv.id, inv.status === "published")}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-[#a32d2d]"
                  >
                    Delete
                  </button>
                </div>
                {statsId === inv.id ? (
                  <div className="mt-3 pt-3 border-t border-muted/20 space-y-2">
                    <div className="text-xs text-muted space-y-1">
                      <p>
                        Opens: {inv.openCount} / {inv.recipientCount} (
                        {inv.recipientCount
                          ? Math.round(
                              (inv.openCount / inv.recipientCount) * 100
                            )
                          : 0}
                        %)
                      </p>
                      <p>
                        RSVP: {inv.rsvpYesCount} yes · {inv.rsvpNoCount} no ·{" "}
                        {inv.rsvpMaybeCount} maybe ·{" "}
                        {Math.max(
                          0,
                          inv.recipientCount -
                            inv.rsvpYesCount -
                            inv.rsvpNoCount -
                            inv.rsvpMaybeCount
                        )}{" "}
                        pending
                      </p>
                    </div>
                    {detailLoading && !statsDetail ? (
                      <p className="text-xs text-muted">Loading guests…</p>
                    ) : null}
                    {statsDetail ? (
                      <>
                        {statsDetail.recipients.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              void copyAllLinks(statsDetail.recipients)
                            }
                            className="text-xs text-accent font-medium"
                          >
                            {copiedToken === "__all__"
                              ? "All links copied!"
                              : "Copy all links"}
                          </button>
                        ) : null}
                        <ul className="space-y-2">
                          {statsDetail.recipients.map((r) => (
                            <li
                              key={r.id}
                              className="p-2.5 bg-cream rounded-lg border border-muted/20 text-xs"
                            >
                              <div className="flex justify-between gap-2">
                                <span className="font-medium text-surface truncate">
                                  {r.guestName}
                                </span>
                                <span className="text-muted flex-shrink-0">
                                  {r.openedAt ? "Opened" : "Not opened"} ·{" "}
                                  {RSVP_LABELS[r.rsvpStatus]}
                                </span>
                              </div>
                              {inv.status === "published" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyLink(r.publicUrl, r.viewToken)
                                  }
                                  className="mt-1.5 text-accent font-medium"
                                >
                                  {copiedToken === r.viewToken
                                    ? "Copied!"
                                    : "Copy link"}
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && !listError ? (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-accent text-white text-2xl shadow-lg flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 z-30"
          aria-label="Create invitation"
        >
          +
        </button>
      ) : null}
    </div>
  );
}
