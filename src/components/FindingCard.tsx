import { useEffect, useRef } from "react";
import type {
  Finding,
  FindingRegion,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META } from "../lib/taxonomy";

/**
 * A zoomed crop of the finding's region, cut from the uploaded screenshot
 * on a <canvas>. Canvas avoids the aspect-ratio pitfalls of CSS-percentage
 * cropping (the old math assumed a square image and misplaced regions on
 * tall phone screenshots). A small padding ring gives context around the
 * flagged element.
 */
function RegionCrop({
  imageUrl,
  region,
  alt,
}: {
  imageUrl: string;
  region: FindingRegion;
  alt: string;
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
      canvas.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl, region.x_min, region.y_min, region.x_max, region.y_max]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className="w-28 shrink-0 self-start rounded-xl border border-stone-200 bg-stone-100 sm:w-36"
      style={{ aspectRatio: `${w} / ${h}` }}
    />
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
  /** True while this finding is highlighted from the index or map. */
  active: boolean;
  /** Tap-to-locate on the screenshot map; null when the finding has no region. */
  onLocate: (() => void) | null;
}) {
  const meta = DIRECTION_META[direction];
  return (
    <article
      className={`rounded-2xl border bg-white p-5 transition-shadow ${
        active
          ? "border-teal-500 shadow-lg shadow-teal-100"
          : "border-stone-200"
      }`}
    >
      <div className="flex gap-4">
        {finding.region && (
          <RegionCrop
            imageUrl={imageUrl}
            region={finding.region}
            alt={`Close-up of ${finding.title}`}
          />
        )}
        <div className="min-w-0 flex-1">
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
          </div>

          <h3 className="mt-2.5 text-base font-semibold tracking-tight text-stone-900">
            {finding.title}
          </h3>

          <div className="mt-3 rounded-xl bg-teal-700/[0.07] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800/70">
              Fix
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-stone-800">
              {finding.fix}
            </p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-stone-50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                {meta.sourcePatternLabel}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-700">
                {finding.sourcePattern}
              </p>
            </div>
            <div className="rounded-xl bg-teal-50/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800/70">
                {meta.targetPatternLabel}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-700">
                {finding.targetPattern}
              </p>
            </div>
          </div>

          <p className="mt-3 border-l-2 border-stone-200 pl-3 text-sm leading-relaxed text-stone-500">
            {finding.rationale}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {finding.unverified ? (
              <span
                className="text-xs italic text-stone-400"
                title={finding.unverifiedNote ?? "Community convention"}
              >
                Community convention — no explicit platform guideline
              </span>
            ) : (
              finding.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-teal-700 underline decoration-teal-200 underline-offset-2 hover:decoration-teal-500"
                >
                  Source: {s.label}
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
