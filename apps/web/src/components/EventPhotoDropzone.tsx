"use client";

import type { DragEvent, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

type EventPhotoDropzoneProps = {
  children: ReactNode;
  /** Called with image files from drag-drop or paste (not used for hidden input — parent handles that). */
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** 0–100 while uploading; null hides the progress overlay. */
  uploadProgress?: number | null;
  className?: string;
};

function imageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  if (dt.files?.length) {
    for (const f of Array.from(dt.files)) {
      if (f.type.startsWith("image/")) out.push(f);
    }
    return out;
  }
  for (const item of Array.from(dt.items)) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f?.type.startsWith("image/")) out.push(f);
    }
  }
  return out;
}

/**
 * Drag-and-drop target wrapping the event photo gallery. Shows upload progress overlay.
 */
export default function EventPhotoDropzone({
  children,
  onFiles,
  disabled = false,
  uploadProgress = null,
  className = "",
}: EventPhotoDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const canAccept = !disabled && uploadProgress === null;

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canAccept) return;
      dragDepth.current += 1;
      setDragOver(true);
    },
    [canAccept]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (canAccept) e.dataTransfer.dropEffect = "copy";
    },
    [canAccept]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setDragOver(false);
      if (!canAccept) return;
      const files = imageFilesFromDataTransfer(e.dataTransfer);
      if (files.length) onFiles(files);
    },
    [canAccept, onFiles]
  );

  const showProgress = uploadProgress !== null;
  const progressLabel =
    uploadProgress !== null && uploadProgress >= 0
      ? `${uploadProgress}%`
      : "";

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {dragOver && canAccept ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-[1px]"
          aria-hidden
        >
          <p className="text-sm font-semibold text-accent px-4 text-center">
            Drop photos to upload
          </p>
        </div>
      ) : null}

      {showProgress ? (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-xl bg-light/85 backdrop-blur-sm px-6"
          role="status"
          aria-live="polite"
          aria-label={`Uploading photo${progressLabel ? `, ${progressLabel}` : ""}`}
        >
          <p className="text-sm font-semibold text-surface">Uploading…</p>
          <div className="w-full max-w-xs h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{
                width:
                  uploadProgress !== null && uploadProgress >= 0
                    ? `${Math.max(4, uploadProgress)}%`
                    : "40%",
              }}
            />
          </div>
          {progressLabel ? (
            <p className="text-xs text-muted tabular-nums">{progressLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
