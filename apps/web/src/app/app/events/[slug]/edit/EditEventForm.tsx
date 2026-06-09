"use client";

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CeremonyEvent, EventType } from "@/lib/types";
import { deleteEventDraftImage, updateEvent } from "@/app/actions/events";
import { EventTypeIcon } from "@/components/Icons";
import FloatingLabelInput from "@/components/FloatingLabelInput";
import EventPhotoGallery from "@/components/EventPhotoGallery";
import EventPhotoDropzone from "@/components/EventPhotoDropzone";
import {
  EVENT_IMAGE_MAX_MB,
  isEventImageWithinSizeLimit,
} from "@/lib/event-image-upload";
import { uploadEventImageWithProgress } from "@/lib/upload-event-image-client";
import { formatUGX, getEventTypeLabel } from "@/lib/data";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "introduction", label: "Kwanjula" },
  { value: "funeral", label: "Mabugo" },
  { value: "other", label: "Other" },
];

const GRID = "gap-4";

function slotFromGarageImageKey(key: string): number {
  const m = /\/([0-2])\./.exec(key);
  return m ? parseInt(m[1], 10) : 0;
}

function nextFreeSlot(keys: string[]): number {
  const used = new Set(keys.map(slotFromGarageImageKey));
  for (let s = 0; s <= 2; s++) {
    if (!used.has(s)) return s;
  }
  return 2;
}

function buildInitialPhotos(
  event: CeremonyEvent,
  keys: string[]
): { previewUrl: string; key: string }[] {
  if (!keys.length) return [];
  const urls = event.imageUrls ?? [];
  const sorted = [...keys].sort(
    (a, b) => slotFromGarageImageKey(a) - slotFromGarageImageKey(b)
  );
  return sorted.map((key, i) => ({
    key,
    previewUrl:
      urls[i] ??
      `/api/v1/events/by-slug/${encodeURIComponent(event.slug)}/gallery/${i}`,
  }));
}

type DraftPhoto = { previewUrl: string; key: string };

const TOTAL_STEPS = 3;

export default function EditEventForm({
  slug,
  initialEvent,
  imageGarageKeys,
}: {
  slug: string;
  initialEvent: CeremonyEvent;
  imageGarageKeys: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<EventType | null>(
    (initialEvent.type as EventType) ?? "wedding"
  );
  const [title, setTitle] = useState(initialEvent.title ?? "");
  const [organizer, setOrganizer] = useState(initialEvent.organizer ?? "");
  const [treasurerPhone, setTreasurerPhone] = useState(
    initialEvent.treasurerPhone ?? ""
  );
  const [date, setDate] = useState(initialEvent.date ?? "");
  const [location, setLocation] = useState(initialEvent.location ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initialEvent.targetAmount > 0 ? String(initialEvent.targetAmount) : ""
  );
  const [description, setDescription] = useState(
    initialEvent.description ?? ""
  );
  const [showDescription, setShowDescription] = useState(
    (initialEvent.description ?? "").trim().length > 0
  );

  const eventId = initialEvent.id;
  const [photos, setPhotos] = useState<DraftPhoto[]>(() =>
    buildInitialPhotos(initialEvent, imageGarageKeys)
  );
  const photosRef = useRef<DraftPhoto[]>(buildInitialPhotos(initialEvent, imageGarageKeys));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const photoBusy = uploadProgress !== null;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  async function addPhotoFilesFromInput(files: File[]) {
    const picked = files.filter((f): f is File => f.type.startsWith("image/"));
    for (const file of picked) {
      if (photosRef.current.length >= 3) break;
      if (!isEventImageWithinSizeLimit(file)) {
        alert(`Each photo must be ${EVENT_IMAGE_MAX_MB} MB or smaller.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const slot = nextFreeSlot(photosRef.current.map((p) => p.key));
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("eventId", eventId);
      fd.set("slot", String(slot));
      fd.set("file", file);
      setUploadProgress(0);
      const res = await uploadEventImageWithProgress(fd, setUploadProgress);
      setUploadProgress(null);
      if (!res.success) {
        URL.revokeObjectURL(previewUrl);
        alert(res.error);
        continue;
      }
      photosRef.current = [...photosRef.current, { previewUrl, key: res.key }].slice(
        0,
        3
      );
      setPhotos([...photosRef.current]);
    }
  }

  function removePhotoAt(index: number) {
    const p = photosRef.current[index];
    if (!p) return;
    void deleteEventDraftImage(p.key);
    if (p.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(p.previewUrl);
    }
    photosRef.current = photosRef.current.filter((_p, i) => i !== index);
    setPhotos([...photosRef.current]);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const imageUrlsSorted = [...photosRef.current]
      .sort(
        (a, b) => slotFromGarageImageKey(a.key) - slotFromGarageImageKey(b.key)
      )
      .map((p) => p.key);
    const target = Number(targetAmount) || 0;
    const detailPath = `/app/events/${encodeURIComponent(slug)}`;
    try {
      const result = await updateEvent(slug, {
        title: title.trim(),
        type: type ?? "wedding",
        organizer: organizer.trim(),
        treasurerPhone: treasurerPhone.trim(),
        description: description.trim(),
        date,
        location: location.trim(),
        targetAmount: target,
        imageUrls: imageUrlsSorted.length > 0 ? imageUrlsSorted : null,
      });
      if (result.success) {
        /** Full navigation: `router.replace` after a server action is unreliable in some App Router builds. */
        window.location.assign(detailPath);
        return;
      }
      alert(result.error ?? "Failed to save changes.");
      if (result.error === "You must be signed in.") {
        router.push("/login");
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to save changes."
      );
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = type ? EVENT_TYPES.find((t) => t.value === type)?.label : "";

  const detailsDateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-UG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className={GRID}>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/app/events/${slug}`}
          className="text-sm text-muted hover:text-surface"
        >
          ← Back to event
        </Link>
        <p className="text-muted text-sm">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-surface">Edit event</p>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-sm text-accent font-medium hover:underline"
          >
            Back
          </button>
        )}
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (type) setStep(2);
          }}
          className={GRID}
        >
          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6">
              <h1 className="text-xl font-bold text-surface mb-1">
                Event type
              </h1>
              <p className="text-muted text-sm mb-6">
                Choose the category for this ceremony.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {EVENT_TYPES.map((et) => (
                  <button
                    key={et.value}
                    type="button"
                    onClick={() => setType(et.value)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left min-h-[56px] ${
                      type === et.value
                        ? "border-accent bg-accent/10 text-surface"
                        : "border-muted/30 hover:border-muted text-surface"
                    }`}
                  >
                    <EventTypeIcon
                      type={et.value}
                      className="w-6 h-6 text-accent flex-shrink-0"
                    />
                    <span
                      className={`font-semibold text-sm ${type === et.value ? "text-surface" : "text-muted"}`}
                    >
                      {et.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                disabled={!type}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className={GRID}
        >
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
          >
            <span className="flex items-center gap-3">
              <EventTypeIcon
                type={type ?? "wedding"}
                className="w-5 h-5 text-accent"
              />
              <span className="font-medium text-surface">{typeLabel}</span>
            </span>
            <span className="text-sm text-accent">Change</span>
          </button>

          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold text-surface mb-1">
                Basic details
              </h1>
              <p className="text-muted text-sm mb-4">
                Update name, contact, date, and location.
              </p>

              <FloatingLabelInput
                id="edit-title"
                label="Event title"
                value={title}
                onChange={setTitle}
                required
              />
              <FloatingLabelInput
                id="edit-organizer"
                label="Your name (treasurer)"
                value={organizer}
                onChange={setOrganizer}
                required
              />
              <FloatingLabelInput
                id="edit-treasurerPhone"
                label="Mobile Money number"
                value={treasurerPhone}
                onChange={setTreasurerPhone}
                type="tel"
                required
                hint="Contributions go directly here."
              />
              <div className="grid grid-cols-2 gap-4">
                <FloatingLabelInput
                  id="edit-date"
                  label="Event date"
                  value={date}
                  onChange={setDate}
                  type="date"
                  required
                />
                <FloatingLabelInput
                  id="edit-location"
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  required
                />
              </div>
              <FloatingLabelInput
                id="edit-targetAmount"
                label="Target amount (UGX, optional)"
                value={targetAmount}
                onChange={setTargetAmount}
                type="number"
                inputMode="numeric"
                min={0}
              />

              {!showDescription ? (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="text-sm text-accent font-medium"
                >
                  {description.trim() ? "Edit description" : "Add description (optional)"}
                </button>
              ) : (
                <div>
                  <label htmlFor="edit-description" className="sr-only">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() =>
                      setShowDescription(description.trim().length > 0)
                    }
                    rows={3}
                    className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-y bg-light min-h-[4rem]"
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSave} className={GRID}>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
            >
              <span className="flex items-center gap-3">
                <EventTypeIcon
                  type={type ?? "wedding"}
                  className="w-5 h-5 text-accent"
                />
                <span className="font-medium text-surface">{typeLabel}</span>
              </span>
              <span className="text-sm text-accent">Change</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
            >
              <div className="text-left min-w-0">
                <p className="font-medium text-surface truncate">
                  {title || "Event"}
                </p>
                <p className="text-muted text-sm">
                  {detailsDateLabel} · {location || "—"}
                </p>
              </div>
              <span className="text-sm text-accent flex-shrink-0 ml-2">
                Change
              </span>
            </button>
          </div>

          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6 pb-4">
              <h1 className="text-xl font-bold text-surface mb-1">
                Event photos
              </h1>
              <p className="text-muted text-sm">
                Up to 3 pictures. Replace or remove as needed, then save.
              </p>
            </div>

            <EventPhotoDropzone
              disabled={photoBusy || photos.length >= 3}
              uploadProgress={uploadProgress}
              onFiles={(files) => void addPhotoFilesFromInput(files)}
            >
            <EventPhotoGallery
              imageSources={photos.map((p) => p.previewUrl)}
              onEmptyMainClick={() => photoInputRef.current?.click()}
              emptyMainClickDisabled={photoBusy || photos.length >= 3}
              emptyMain={
                <span>
                  No photos — tap here, drag images in, or use{" "}
                  <strong className="text-surface">Add photo</strong> below.
                </span>
              }
              controls={
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const picked = Array.from(e.target.files ?? []).filter(
                        (f): f is File => f.type.startsWith("image/")
                      );
                      e.target.value = "";
                      if (picked.length === 0) return;
                      void addPhotoFilesFromInput(picked);
                    }}
                  />
                  <button
                    type="button"
                    disabled={photos.length >= 3 || photoBusy}
                    onClick={() => photoInputRef.current?.click()}
                    className="text-sm font-semibold text-accent hover:underline disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Add photo ({photos.length}/3)
                  </button>
                  <span className="text-xs text-muted">
                    JPEG, PNG, or WebP · up to {EVENT_IMAGE_MAX_MB} MB each
                  </span>
                </div>
              }
              renderThumbAction={(i) => (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface text-light text-xs font-bold shadow-md border border-muted/40 leading-none flex items-center justify-center hover:bg-surface/90"
                  aria-label="Remove photo"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removePhotoAt(i);
                  }}
                >
                  ×
                </button>
              )}
            />
            </EventPhotoDropzone>

            <div className="px-6 py-5 border-t border-muted/20 space-y-3">
              <h2 className="text-lg font-bold text-surface leading-tight">
                {title}
              </h2>
              <p className="text-sm text-muted">
                {getEventTypeLabel(type ?? "wedding")} · {detailsDateLabel}
                {location ? ` · ${location}` : ""}
              </p>
              {Number(targetAmount) > 0 && (
                <p className="text-sm text-surface font-semibold">
                  Target {formatUGX(Number(targetAmount) || 0)}
                </p>
              )}
              {description.trim().length > 0 && (
                <p className="text-sm text-muted border-t border-muted/15 pt-3 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                disabled={loading || photoBusy}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-4 rounded-lg transition-colors"
              >
                {loading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
