import { useEffect, useRef, useState } from "react";
import type {
  Finding,
  FindingRegion,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META } from "../lib/taxonomy";

/**
 * Pick the citation most relevant to a platform: the source whose label
 * starts with "Apple" for iOS, "Material"/"Android" for Material.
 * Falls back to the first source.
 */
function platformSource(
  sources: { label: string; url: string }[],
  platform: "ios" | "material",
): { label: string; url: string } | null {
  if (sources.length === 0) return null;
  const matches = (label: string) =>
    platform === "ios"
      ? label.startsWith("Apple")
      : label.startsWith("Material") || label.startsWith("Android");
  return sources.find((s) => matches(s.label)) ?? sources[0];
}

/**
 * A zoomed crop of the finding's region, cut from the uploaded screenshot
 * on a <canvas>. Canvas avoids the aspect-ratio pitfalls of CSS-percentage
 * cropping (which assumed a square image and misplaced regions on tall
 * phone screenshots). A small padding ring gives context around the
 * flagged element.
 */
function RegionCrop({
  imageUrl,
  region,
  alt,
  className,
}: {
  imageUrl: string;
  region: FindingRegion;
  alt: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = region.x_max - region.x_min;
  const h = region.y_max - region.y_min;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // Region in image pixels, with 8% padding clamped to the image.
      const padX = w * 0.08;
      const padY = h * 0.08;
      const sx = Math.max(0, ((region.x_min - padX) / 1000) * iw);
      const sy = Math.max(0, ((region.y_min - padY) / 1000) * ih);
      const sw = Math.min(iw - sx, ((w + padX * 2) / 1000) * iw);
      const sh = Math.min(ih - sy, ((h + padY * 2) / 1000) * ih);
      // Canvas backing store matches the source pixels; CSS scales it.
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      canvas
        .getContext("2d")
        ?.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl, region.x_min, region.y_min, region.x_max, region.y_max, w, h]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={
        className ??
        "h-auto max-w-full rounded-xl border border-stone-200 bg-stone-100"
      }
    />
  );
}

/**
 * Lightbox: the region crop at a closer look, over a dimmed page.
 * Closes on backdrop click, the close button, or Escape.
 */
function CropLightbox({
  imageUrl,
  region,
  alt,
  onClose,
}: {
  imageUrl: string;
  region: FindingRegion;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div onClick={(e) => e.stopPropagation()}>
        <RegionCrop
          imageUrl={imageUrl}
          region={region}
          alt={alt}
          className="h-auto max-h-[85vh] w-auto max-w-[92vw] rounded-xl border border-white/20 shadow-2xl"
        />
      </div>
    </div>
  );
}

function PatternBox({
  platformLabel,
  pattern,
  cite,
  tone,
}: {
  platformLabel: string;
  pattern: string;
  cite: { label: string; url: string } | null;
  tone: "source" | "target";
}) {
  return (
    <div
      className={
        tone === "source"
          ? "rounded-xl bg-stone-50 p-3.5"
          : "rounded-xl bg-teal-50/60 p-3.5"
      }
    >
      <p
        className={
          tone === "source"
            ? "text-[11px] font-semibold uppercase tracking-wider text-stone-400"
            : "text-[11px] font-semibold uppercase tracking-wider text-teal-800/70"
        }
      >
        {platformLabel}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-stone-700">{pattern}</p>
      {cite && (
        <a
          href={cite.url}
          target="_blank"
          rel="noopener noreferrer"
          title={cite.label}
          className="mt-2 inline-block text-xs font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:decoration-teal-500"
        >
          source
        </a>
      )}
    </div>
  );
}

export default function FindingCard({
  finding,
  direction,
  number,
  imageUrl,
  active,
  onLocate,
}: {
  finding: Finding;
  direction: AnalysisDirection;
  /** 1-based position in the screenshot's list; matches the map badge. */
  number: number;
  /** Object URL of the screenshot this finding came from. */
  imageUrl: string;
  /** Whether this card is the current jump/locate highlight target. */
  active: boolean;
  /** Tap-to-locate on the screenshot map; null when the finding has no region. */
  onLocate: (() => void) | null;
}) {
  const meta = DIRECTION_META[direction];
  const sourceKey: "ios" | "material" =
    direction === "ios-to-android" ? "ios" : "material";
  const targetKey: "ios" | "material" =
    sourceKey === "ios" ? "material" : "ios";
  const [showShot, setShowShot] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 transition-shadow ${
        active
          ? "border-teal-500 shadow-lg shadow-teal-100"
          : "border-stone-200"
      }`}
    >
      {/* Header: number badge + category pill */}
      <div className="flex flex-wrap items-center gap-2">
        {onLocate ? (
          <button
            type="button"
            onClick={onLocate}
            title="Show on screenshot"
            aria-label={`Show finding ${number} on the screenshot`}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white transition-transform hover:scale-110"
          >
            {number}
          </button>
        ) : (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-[11px] font-bold text-stone-500"
            aria-hidden="true"
          >
            {number}
          </span>
        )}
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
          {finding.category}
        </span>
        {finding.unverified && (
          <span
            className="text-xs italic text-stone-400"
            title={finding.unverifiedNote ?? "Community convention"}
          >
            Community convention
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-base font-semibold tracking-tight text-stone-900">
        {finding.title}
      </h3>

      {/* FIX */}
      <div className="mt-3 rounded-xl bg-teal-700/[0.07] p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800/70">
          Fix
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-stone-800">
          {finding.fix}
        </p>
      </div>

      {/* Pattern boxes, stacked vertically */}
      <div className="mt-3 space-y-3">
        <PatternBox
          platformLabel={meta.sourcePlatform}
          pattern={finding.sourcePattern}
          cite={platformSource(finding.sources, sourceKey)}
          tone="source"
        />
        <PatternBox
          platformLabel={meta.targetPlatform}
          pattern={finding.targetPattern}
          cite={platformSource(finding.sources, targetKey)}
          tone="target"
        />
      </div>

      {/* Screenshot crop, collapsed by default */}
      {finding.region && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowShot((v) => !v)}
            aria-expanded={showShot}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showShot ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
            {showShot ? "Hide screenshot" : "Show screenshot"}
          </button>
          {showShot && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setLightbox(true)}
                title="Enlarge"
                aria-label={`Enlarge screenshot for ${finding.title}`}
                className="block cursor-zoom-in transition-transform hover:scale-[1.01]"
              >
                <RegionCrop
                  imageUrl={imageUrl}
                  region={finding.region}
                  alt={`Close-up of ${finding.title}`}
                />
              </button>
            </div>
          )}
        </div>
      )}
      {lightbox && finding.region && (
        <CropLightbox
          imageUrl={imageUrl}
          region={finding.region}
          alt={`Close-up of ${finding.title}`}
          onClose={() => setLightbox(false)}
        />
      )}
    </article>
  );
}
