"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import StepIndicator from "@/components/wallet/StepIndicator";
import InviteStepPreviewPanel from "@/components/invitations/InviteStepPreviewPanel";
import ThemePickerCard from "@/components/invitations/ThemePickerCard";
import { INVITE_TEMPLATES, getTemplateMeta } from "@/lib/invitations/templates";
import {
  inviteContentFieldLabels,
  type InviteContentFieldKey,
} from "@/lib/invitations/content-labels";
import {
  defaultInvitationTitle,
  mergeEventIntoInviteContent,
} from "@/lib/invitations/event-content-defaults";
import { formatCalendarDate } from "@/lib/data";
import type { CeremonyEvent } from "@/lib/types";
import type {
  InvitationDetail,
  InvitationRecipient,
  InviteCardContent,
  InviteTemplateId,
  RsvpStatus,
} from "@/lib/invitations/types";
import {
  addInvitationRecipient,
  publishInvitation,
  removeInvitationRecipient,
  updateInvitation,
} from "@/app/actions/invitations";
import { filterPublicContributions } from "@/lib/data";
import { IconBack } from "@/components/Icons";

const STEPS = ["Theme", "Content", "Design", "Guests", "Publish"];
const MANAGE_TABS = [
  { id: "links" as const, label: "Links" },
  { id: "theme" as const, label: "Theme" },
  { id: "content" as const, label: "Content" },
  { id: "design" as const, label: "Design" },
  { id: "guests" as const, label: "Guests" },
];
type ManageTab = (typeof MANAGE_TABS)[number]["id"];

const FONTS: InviteCardContent["font"][] = [
  "serif",
  "sans-serif",
  "script",
  "monospace",
];
const ACCENTS = [
  "#9A7432",
  "#3B6D11",
  "#185FA5",
  "#993556",
  "#7B2FBE",
  "#D85A30",
];

const FONT_LABELS: Record<InviteCardContent["font"], string> = {
  serif: "Serif",
  "sans-serif": "Sans-serif",
  script: "Script",
  monospace: "Monospace",
};

const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: "Pending",
  accepted: "Yes",
  declined: "No",
  maybe: "Maybe",
};

const PUBLISHED_SAVE_MSG =
  "Changes apply to all guest links immediately. Guests will see the updated card when they refresh.";

interface InvitationWizardProps {
  event: CeremonyEvent;
  initial: InvitationDetail;
}

function initialEditorState(
  event: CeremonyEvent,
  initial: InvitationDetail
) {
  const content = mergeEventIntoInviteContent(initial.content, event);
  const title = initial.title.trim()
    ? initial.title
    : defaultInvitationTitle(event, content);
  return { content, title };
}

export default function InvitationWizard({
  event,
  initial,
}: InvitationWizardProps) {
  const editorInit = initialEditorState(event, initial);
  const isPublishedInitial = initial.status === "published";
  const [step, setStep] = useState(isPublishedInitial ? 4 : 0);
  const [manageTab, setManageTab] = useState<ManageTab>("links");
  const [inv, setInv] = useState(initial);
  const [title, setTitle] = useState(editorInit.title);
  const [templateId, setTemplateId] = useState<InviteTemplateId>(
    initial.templateId
  );
  const [content, setContent] = useState<InviteCardContent>(editorInit.content);
  const [guestInput, setGuestInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(isPublishedInitial);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(editorInit.content);
  const titleRef = useRef(editorInit.title);
  const templateIdRef = useRef(initial.templateId);
  const fieldLabels = inviteContentFieldLabels(event.type);
  const contentFields: InviteContentFieldKey[] = [
    "name1",
    "name2",
    "headline",
    "date",
    "time",
    "venue",
    "location",
    "footer",
  ];

  type SavePatch = {
    title?: string;
    templateId?: InviteTemplateId;
    content?: Partial<InviteCardContent>;
  };

  function syncEditorFromDetail(detail: InvitationDetail) {
    contentRef.current = detail.content;
    titleRef.current = detail.title;
    templateIdRef.current = detail.templateId;
    setContent(detail.content);
    setTitle(detail.title);
    setTemplateId(detail.templateId);
    setInv(detail);
  }

  const persistInvitation = useCallback(
    async (patch?: SavePatch) => {
      const mergedContent: InviteCardContent = {
        ...contentRef.current,
        ...(patch?.content ?? {}),
      };
      contentRef.current = mergedContent;
      if (patch?.title !== undefined) titleRef.current = patch.title;
      if (patch?.templateId !== undefined) templateIdRef.current = patch.templateId;

      const payload = {
        title: titleRef.current,
        templateId: templateIdRef.current,
        content: mergedContent,
      };
      const updated = await updateInvitation(inv.id, payload);
      // Keep local editor state; server response must not reset in-progress fields.
      setInv({
        ...updated,
        content: contentRef.current,
        title: titleRef.current,
        templateId: templateIdRef.current,
      });
      return updated;
    },
    [inv.id]
  );

  const savePublished = useCallback(
    async (patch?: SavePatch, opts?: { skipConfirm?: boolean }) => {
      if (
        published &&
        !opts?.skipConfirm &&
        !window.confirm(PUBLISHED_SAVE_MSG)
      ) {
        return;
      }
      setSaveStatus("saving");
      try {
        await persistInvitation(patch);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setSaveStatus("error");
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    },
    [published, persistInvitation]
  );

  const runPersist = useCallback(
    async (patch?: SavePatch, opts?: { skipConfirm?: boolean }) => {
      if (published) return savePublished(patch, opts);
      setSaveStatus("saving");
      try {
        await persistInvitation(patch);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setSaveStatus("error");
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    },
    [published, persistInvitation, savePublished]
  );

  const flushPendingSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      await runPersist(undefined, { skipConfirm: true });
    }
  }, [runPersist]);

  const scheduleSave = useCallback(
    (patch?: SavePatch) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("saving");
      debounceRef.current = setTimeout(() => {
        void runPersist(patch, { skipConfirm: true });
      }, 500);
    },
    [runPersist]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  function applyContent(partial: Partial<InviteCardContent>) {
    const next = { ...contentRef.current, ...partial };
    contentRef.current = next;
    setContent(next);
    return next;
  }

  async function patchContent(
    partial: Partial<InviteCardContent>,
    immediate = false
  ) {
    applyContent(partial);
    if (immediate) {
      try {
        if (published) await savePublished();
        else await persistInvitation();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
      return;
    }
    scheduleSave();
  }

  async function nextStep() {
    setError(null);
    setLoading(true);
    try {
      await flushPendingSave();
      await persistInvitation();
      if (step === 3 && inv.recipients.length === 0) {
        setError("Add at least one guest.");
        return;
      }
      if (step < STEPS.length - 1) setStep((s) => s + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      await flushPendingSave();
      await persistInvitation();
      const updated = await publishInvitation(inv.id);
      syncEditorFromDetail(updated);
      setPublished(true);
      setManageTab("links");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGuest() {
    const name = guestInput.trim();
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const r = await addInvitationRecipient(inv.id, { guestName: name });
      setInv((prev) => ({
        ...prev,
        recipients: [r, ...prev.recipients],
        recipientCount: prev.recipientCount + 1,
      }));
      setGuestInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add guest.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveGuest(recipientId: string) {
    if (
      published &&
      !window.confirm(
        "Remove this guest? Their personal link will stop working."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await removeInvitationRecipient(inv.id, recipientId);
      setInv((prev) => ({
        ...prev,
        recipients: prev.recipients.filter((r) => r.id !== recipientId),
        recipientCount: Math.max(0, prev.recipientCount - 1),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove guest.");
    } finally {
      setLoading(false);
    }
  }

  async function importContributors() {
    const names = filterPublicContributions(event.contributions)
      .filter((c) => !c.anonymous)
      .map((c) => c.name);
    const unique = [...new Set(names)];
    if (unique.length === 0) {
      setError("No named contributors to import.");
      return;
    }
    setLoading(true);
    setError(null);
    let added = 0;
    let skipped = 0;
    for (const name of unique) {
      if (inv.recipients.some((r) => r.guestName === name)) {
        skipped++;
        continue;
      }
      try {
        const r = await addInvitationRecipient(inv.id, { guestName: name });
        setInv((prev) => ({
          ...prev,
          recipients: [r, ...prev.recipients],
          recipientCount: prev.recipientCount + 1,
        }));
        added++;
      } catch {
        skipped++;
      }
    }
    const detail = await updateInvitation(inv.id, {
      title: titleRef.current,
      templateId: templateIdRef.current,
      content: contentRef.current,
    });
    setInv({
      ...detail,
      content: contentRef.current,
      title: titleRef.current,
      templateId: templateIdRef.current,
    });
    setLoading(false);
    if (added > 0 || skipped > 0) {
      setError(null);
      const msg =
        skipped > 0
          ? `Added ${added} guest${added === 1 ? "" : "s"}, skipped ${skipped} (already on list).`
          : `Added ${added} guest${added === 1 ? "" : "s"}.`;
      setImportMessage(msg);
      setTimeout(() => setImportMessage(null), 4000);
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

  async function copyAllLinks() {
    const text = inv.recipients
      .map((r) => `${r.guestName}: ${r.publicUrl}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken("__all__");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setError("Could not copy links.");
    }
  }

  const localhostLinks = inv.recipients.some((r) =>
    /localhost|127\.0\.0\.1/i.test(r.publicUrl)
  );

  const activeView = published
    ? manageTab
    : step === 0
      ? "theme"
      : step === 1
        ? "content"
        : step === 2
          ? "design"
          : step === 3
            ? "guests"
            : "publish";

  function renderThemeStep() {
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-medium text-surface">Choose a theme</h2>
        <p className="text-xs text-muted">Sets the look of your invitation</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-2">
          {INVITE_TEMPLATES.map((t) => (
            <ThemePickerCard
              key={t.id}
              template={t}
              selected={templateId === t.id}
              disabled={loading || saveStatus === "saving"}
              onSelect={(id) => {
                templateIdRef.current = id;
                setTemplateId(id);
                scheduleSave({ templateId: id });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderContentStep() {
    return (
      <div className="space-y-4">
        {published ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {PUBLISHED_SAVE_MSG}
          </p>
        ) : null}
        <InviteStepPreviewPanel
          templateId={templateId}
          content={content}
          slug={event.slug}
        />
        <div className="space-y-3">
          <h2 className="text-[15px] font-medium text-surface">Edit content</h2>
          <label className="block text-xs font-medium text-muted">
            List title (not shown on card)
          </label>
          <input
            className="w-full border border-muted/40 rounded-lg px-3 py-2 text-sm"
            value={title}
            onChange={(e) => {
              titleRef.current = e.target.value;
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
          />
          {contentFields.map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted mb-1">
                {fieldLabels[key]}
              </label>
              <input
                className="w-full border border-muted/40 rounded-lg px-3 py-2 text-sm"
                value={content[key]}
                onChange={(e) => {
                  applyContent({ [key]: e.target.value });
                  scheduleSave();
                }}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-surface">
            <input
              type="checkbox"
              checked={content.rsvpEnabled}
              onChange={(e) =>
                void patchContent({ rsvpEnabled: e.target.checked }, true)
              }
            />
            Enable RSVP on public card
          </label>
          {content.rsvpEnabled ? (
            <>
              <label className="block text-xs font-medium text-muted">
                RSVP deadline (optional)
              </label>
              <input
                type="date"
                className="w-full border border-muted/40 rounded-lg px-3 py-2 text-sm"
                value={content.rsvpDeadline?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  void patchContent(
                    { rsvpDeadline: e.target.value || undefined },
                    true
                  )
                }
              />
              <textarea
                className="w-full border border-muted/40 rounded-lg px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="RSVP note for guests"
                value={content.rsvpNote ?? ""}
              onChange={(e) => {
                applyContent({ rsvpNote: e.target.value });
                scheduleSave();
              }}
              />
            </>
          ) : null}
        </div>
      </div>
    );
  }

  function renderDesignStep() {
    return (
      <div className="space-y-4">
        {published ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {PUBLISHED_SAVE_MSG}
          </p>
        ) : null}
        <InviteStepPreviewPanel
          templateId={templateId}
          content={content}
          slug={event.slug}
          showExport={false}
        />
        <div className="space-y-5 pt-1">
          <h2 className="text-[15px] font-medium text-surface">Customise design</h2>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Font
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f}
                  type="button"
                  disabled={loading}
                  onClick={() => void patchContent({ font: f }, true)}
                  className={`text-sm px-3 py-2.5 rounded-lg border text-center ${
                    content.font === f
                      ? "bg-surface text-light border-surface"
                      : "border-muted/30 text-surface bg-light hover:border-accent"
                  }`}
                >
                  {FONT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              Accent colour
            </p>
            <div className="grid grid-cols-6 gap-2.5 max-w-xs">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={loading}
                  onClick={() => void patchContent({ accentColor: c }, true)}
                  className={`aspect-square w-full max-w-[2.5rem] mx-auto rounded-full border-2 ${
                    content.accentColor === c
                      ? "border-surface ring-2 ring-surface/30"
                      : "border-muted/40"
                  }`}
                  style={{ background: c }}
                  aria-label={`Accent ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderGuestsStep() {
    return (
      <div className="space-y-4">
        <h2 className="text-[15px] font-medium text-surface">Add guests</h2>
        <p className="text-xs text-muted">
          Each guest gets a unique link to view the card and RSVP.
          {published
            ? " New guests receive a new link; existing links stay the same."
            : ""}
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-muted/40 rounded-lg px-3 py-2 text-sm"
            placeholder="Name"
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddGuest()}
          />
          <button
            type="button"
            onClick={handleAddGuest}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-surface text-light text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => void importContributors()}
          disabled={loading}
          className="text-xs text-accent hover:underline disabled:opacity-50"
        >
          Import from contributors
        </button>
        {importMessage ? (
          <p className="text-xs text-[#27500A] bg-lime/30 border border-lime/40 rounded-lg px-3 py-2">
            {importMessage}
          </p>
        ) : null}
        <ul className="space-y-2">
          {inv.recipients.map((r) => (
            <GuestRow
              key={r.id}
              recipient={r}
              published={published}
              copiedToken={copiedToken}
              onCopy={copyLink}
              onRemove={() => void handleRemoveGuest(r.id)}
            />
          ))}
        </ul>
      </div>
    );
  }

  function renderLinksStep() {
    return (
      <div className="space-y-4 pb-4">
        <div>
          <h2 className="text-[15px] font-medium text-surface">Guest links</h2>
          <p className="text-sm text-muted mt-1">
            Copy each link and share via WhatsApp, SMS, or email.
          </p>
        </div>
        {localhostLinks ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Links use localhost. Set{" "}
            <code className="text-[11px]">NEXT_PUBLIC_APP_URL</code> to your
            public site URL before sharing with guests.
          </p>
        ) : null}
        {inv.recipients.length > 0 ? (
          <button
            type="button"
            onClick={() => void copyAllLinks()}
            className="w-full py-3 rounded-lg bg-accent text-white text-sm font-medium"
          >
            {copiedToken === "__all__" ? "All links copied!" : "Copy all links"}
          </button>
        ) : null}
        <ul className="space-y-2">
          {inv.recipients.map((r) => (
            <li
              key={r.id}
              className="p-3 bg-light rounded-xl border border-muted/30"
            >
              <div className="flex justify-between gap-2 items-start">
                <p className="text-sm font-medium text-surface">{r.guestName}</p>
                <span className="text-[10px] text-muted text-right shrink-0">
                  {r.openedAt ? "Opened" : "Not opened"}
                  <br />
                  RSVP {RSVP_LABELS[r.rsvpStatus]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyLink(r.publicUrl, r.viewToken)}
                className="mt-2.5 w-full py-2 rounded-lg border border-accent/50 text-accent text-sm font-medium hover:bg-accent/10"
              >
                {copiedToken === r.viewToken ? "Copied!" : "Copy link"}
              </button>
            </li>
          ))}
        </ul>
        <InviteStepPreviewPanel
          templateId={templateId}
          content={content}
          slug={event.slug}
        />
        <Link
          href={`/app/events/${event.slug}/invite`}
          className="block text-center text-sm text-accent font-medium pt-2"
        >
          Back to invitations
        </Link>
      </div>
    );
  }

  function renderPublishStep() {
    const theme = getTemplateMeta(templateId);
    return (
      <div className="space-y-4">
        <h2 className="text-[15px] font-medium text-surface">Review & publish</h2>
        <InviteStepPreviewPanel
          templateId={templateId}
          content={content}
          slug={event.slug}
          showExport
        />
        <div className="bg-light rounded-xl border border-muted/30 divide-y divide-muted/20">
          <div className="flex justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-muted">Theme</span>
            <span className="text-surface font-medium text-right">{theme.name}</span>
          </div>
          <div className="flex justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-muted">Guests</span>
            <span className="text-surface font-medium">
              {inv.recipients.length}
            </span>
          </div>
          <div className="flex justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-muted">RSVP</span>
            <span className="text-surface font-medium">
              {content.rsvpEnabled ? "Enabled" : "Off"}
            </span>
          </div>
          {content.rsvpEnabled && content.rsvpDeadline ? (
            <div className="flex justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-muted">RSVP by</span>
              <span className="text-surface font-medium text-right">
                {formatCalendarDate(content.rsvpDeadline.slice(0, 10), "long")}
              </span>
            </div>
          ) : null}
        </div>
        {inv.recipients.length === 0 ? (
          <p className="text-sm text-[#a32d2d] bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Add at least one guest before publishing.
          </p>
        ) : null}
      </div>
    );
  }

  const headerTitle = published
    ? "Manage invitation"
    : STEPS[step];

  return (
    <div className="min-h-screen bg-cream flex flex-col pb-28">
      <div className="bg-surface text-light px-4 py-3 sticky top-14 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Link
            href={`/app/events/${event.slug}/invite`}
            className="text-accent text-sm inline-flex items-center gap-1"
          >
            <IconBack className="w-4 h-4" />
          </Link>
          <div className="flex-1 text-center text-sm font-medium truncate">
            {headerTitle}
          </div>
          {saveStatus === "saving" ? (
            <span className="text-[10px] text-muted flex-shrink-0">Saving…</span>
          ) : saveStatus === "saved" ? (
            <span className="text-[10px] text-lime flex-shrink-0">Saved</span>
          ) : (
            <span className="w-8 flex-shrink-0" aria-hidden />
          )}
        </div>
        {published ? (
          <div className="max-w-lg mx-auto mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {MANAGE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setManageTab(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                  manageTab === tab.id
                    ? "bg-accent text-white"
                    : "bg-light/10 text-light/80 hover:bg-light/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-lg mx-auto mt-3">
            <StepIndicator total={STEPS.length} current={step + 1} />
          </div>
        )}
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        {error ? (
          <p className="text-sm text-[#a32d2d] mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        {activeView === "theme" && renderThemeStep()}
        {activeView === "content" && renderContentStep()}
        {activeView === "design" && renderDesignStep()}
        {activeView === "guests" && renderGuestsStep()}
        {activeView === "links" && renderLinksStep()}
        {activeView === "publish" && renderPublishStep()}
      </div>

      {!published ? (
        <div className="fixed bottom-0 left-0 right-0 bg-light border-t border-muted/30 p-4 z-40">
          <div className="max-w-lg mx-auto flex gap-2">
            {step > 0 && step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-lg border border-muted/30 text-sm text-muted"
              >
                Back
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="flex-[2] py-3 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
              >
                Continue
              </button>
            ) : step === 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="flex-[2] py-3 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
              >
                Review
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="flex-[2] py-3 rounded-lg bg-surface text-light text-sm font-medium disabled:opacity-50"
              >
                Publish & get links
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuestRow({
  recipient,
  published,
  copiedToken,
  onCopy,
  onRemove,
}: {
  recipient: InvitationRecipient;
  published: boolean;
  copiedToken: string | null;
  onCopy: (url: string, token: string) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 p-3 bg-light rounded-lg border border-muted/30">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-surface truncate block">
          {recipient.guestName}
        </span>
        {published ? (
          <span className="text-[10px] text-muted">
            {recipient.openedAt ? "Opened" : "Not opened"} ·{" "}
            {RSVP_LABELS[recipient.rsvpStatus]}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {published ? (
          <button
            type="button"
            onClick={() => onCopy(recipient.publicUrl, recipient.viewToken)}
            className="text-xs text-accent"
          >
            {copiedToken === recipient.viewToken ? "Copied" : "Copy"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-[#a32d2d]"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
