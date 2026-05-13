"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type EventPhotoGalleryProps = {
  imageSources: string[];
  className?: string;
  /** Shown in the main area when there are no images. */
  emptyMain?: ReactNode;
  /** When set, the empty main area is a tap target (e.g. open file picker). */
  onEmptyMainClick?: () => void;
  /** Disable empty-area interaction (e.g. while uploading). */
  emptyMainClickDisabled?: boolean;
  /** Optional controls under the thumbnail strip (e.g. add file input). */
  controls?: ReactNode;
  /** Per-thumbnail overlay (e.g. remove); receives gallery index. */
  renderThumbAction?: (index: number) => ReactNode;
  /**
   * When set, rendered as one card under the thumbnails (e.g. event hero merged with gallery).
   * Parent should not add a second border around the gallery in that case.
   */
  mergeFooter?: ReactNode;
};

/**
 * Horizontal snap scroll for main image + inset thumbnail row (tap to select).
 */
export default function EventPhotoGallery({
  imageSources,
  className = "",
  emptyMain,
  onEmptyMainClick,
  emptyMainClickDisabled = false,
  controls,
  renderThumbAction,
  mergeFooter,
}: EventPhotoGalleryProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const n = imageSources.length;

  const scrollToIndex = useCallback((i: number) => {
    const el = stripRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (n === 0) {
      setIndex(0);
      return;
    }
    setIndex((prev) => {
      const clamped = Math.min(prev, n - 1);
      requestAnimationFrame(() => {
        const el = stripRef.current;
        if (el && el.clientWidth) {
          el.scrollTo({ left: clamped * el.clientWidth, behavior: "auto" });
        }
      });
      return clamped;
    });
  }, [n]);

  function onStripScroll() {
    const el = stripRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (!w || n === 0) return;
    const i = Math.round(el.scrollLeft / w);
    const clamped = Math.max(0, Math.min(n - 1, i));
    setIndex((prev) => (prev === clamped ? prev : clamped));
  }

  const backdropSrc = n > 0 ? imageSources[Math.min(index, n - 1)] : null;

  const merged = Boolean(mergeFooter);

  return (
    <div
      className={`select-none ${className} ${
        merged ? "overflow-hidden rounded-xl border border-muted/30 bg-light shadow-sm" : ""
      }`}
    >
      <div
        className={`relative bg-muted/20 ${
          merged ? "rounded-t-xl" : "rounded-t-xl overflow-hidden"
        }`}
      >
        {n === 0 ? (
          onEmptyMainClick ? (
            <button
              type="button"
              onClick={onEmptyMainClick}
              disabled={emptyMainClickDisabled}
              className="aspect-[4/3] w-full flex flex-col items-center justify-center text-muted text-sm px-6 text-center cursor-pointer transition-colors hover:bg-muted/20 active:bg-muted/30 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-light"
            >
              {emptyMain ?? "No photos yet"}
            </button>
          ) : (
            <div className="aspect-[4/3] flex items-center justify-center text-muted text-sm px-6 text-center">
              {emptyMain ?? "No photos yet"}
            </div>
          )
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl isolate">
            {backdropSrc ? (
              <div
                className="pointer-events-none absolute inset-0 z-0"
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backdropSrc}
                  alt=""
                  className="absolute left-1/2 top-1/2 h-[160%] w-[160%] min-h-full min-w-full object-cover blur-[48px] saturate-125 opacity-90 will-change-transform"
                  style={{
                    transform: "translate3d(-50%, -50%, 0) scale(1.1)",
                  }}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-light/25 via-light/10 to-light/35" />
              </div>
            ) : null}
            <div
              ref={stripRef}
              role="region"
              aria-roledescription="carousel"
              aria-label="Event photos"
              onScroll={onStripScroll}
              className="relative z-[1] flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ msOverflowStyle: "none" }}
            >
              {imageSources.map((src, i) => (
                <div
                  key={`${i}-${src.slice(0, 48)}`}
                  className="relative h-full min-w-full shrink-0 snap-center overflow-hidden bg-transparent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user/blob/data URLs */}
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full object-contain object-center drop-shadow-sm"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            {n === 1 && renderThumbAction ? (
              <div className="pointer-events-auto absolute top-2 right-2 z-[2]">
                {renderThumbAction(0)}
              </div>
            ) : null}
          </div>
        )}

        {n > 1 && (
          <div className="relative z-10 -mt-3 px-3 pb-1">
            <div className="mx-auto max-w-md rounded-xl bg-muted/15 border border-muted/25 px-2 py-2 shadow-sm">
              <div className="flex justify-center gap-2 flex-wrap">
                {imageSources.map((src, i) => (
                  <div key={`t-${i}-${src.slice(0, 32)}`} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        scrollToIndex(i);
                      }}
                      className={`block w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === i
                          ? "border-accent ring-2 ring-accent/30"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      aria-label={`Show photo ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </button>
                    {renderThumbAction?.(i)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {mergeFooter ? (
        <div className="relative z-20 border-t border-light/15">{mergeFooter}</div>
      ) : null}

      {controls ? (
        <div
          className={`px-4 pt-2 pb-3 border-t border-muted/15 bg-light/80 ${
            merged ? "rounded-b-xl" : ""
          }`}
        >
          {controls}
        </div>
      ) : null}
    </div>
  );
}
