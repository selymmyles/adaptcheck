import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type {
  Finding,
  FindingRegion,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META } from "../lib/taxonomy";

/**
 * The worker also sends these icon fields on findings at runtime, but they
 * are not declared on the shared Finding type (pre-existing gap on main —
 * the proper fix is adding them to src/lib/mockAnalysis.ts). Declared
 * locally here so the UI typechecks without touching src/lib.
 */
type FindingWithIconFields = Finding & {
  detail?: string;
  counterpartExact?: boolean;
};

/**
 * Pick the citation most relevant to a platform, matched on URL host first
 * (apple.com → iOS; material.io / android.com / fonts.google.com → Material),
 * then on label prefix. Falls back to the first source from the same
 * platform family — never a source from the other platform's docs.
 */
function platformSource(
  sources: { label: string; url: string }[],
  platform: "ios" | "material",
): { label: string; url: string } | null {
  if (sources.length === 0) return null;
  const host = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  };
  const isIos = (s: { label: string; url: string }) =>
    host(s.url).endsWith("apple.com") || s.label.startsWith("Apple");
  const isMaterial = (s: { label: string; url: string }) =>
    host(s.url).includes("material.io") ||
    host(s.url).includes("android.com") ||
    host(s.url).includes("fonts.google.com") ||
    s.label.startsWith("Material") ||
    s.label.startsWith("Android") ||
    s.label.startsWith("Google");
  const matches = platform === "ios" ? isIos : isMaterial;
  return sources.find(matches) ?? null;
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
      // Region in image pixels, padded and clamped to the image. The
      // padding is proportional (35%) but floored in per-mille units:
      // small regions (a lone icon button) got almost no absolute
      // padding at a flat percentage and rendered cramped, the flagged
      // element nearly touching the crop edges (founder, 2026-10-13).
      const padX = Math.max(w * 0.35, 28);
      const padY = Math.max(h * 0.35, 28);
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
        "h-auto max-w-full rounded-xl border border-border bg-muted"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>
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
  note,
}: {
  platformLabel: string;
  pattern: string;
  cite: { label: string; url: string } | null;
  tone: "source" | "target";
  /** Small extra line, e.g. the exact counterpart symbol name. */
  note?: string;
}) {
  return (
    <div
      className={
        tone === "source"
          ? "rounded-xl bg-muted p-3"
          : "rounded-xl bg-accent p-3"
      }
    >
      <p
        className={
          tone === "source"
            ? "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            : "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        }
      >
        {platformLabel}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{pattern}</p>
      {note && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Counterpart:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
            {note}
          </code>
        </p>
      )}
      {cite && (
        <a
          href={cite.url}
          target="_blank"
          rel="noopener noreferrer"
          title={cite.label}
          className={cn(buttonVariants({ variant: "link", size: "xs" }), "mt-1.5 h-auto px-0")}
        >
          source
        </a>
      )}
    </div>
  );
}

/**
 * Icon findings lead with the symbol itself: the rendered glyph, its exact
 * name, and a copy button for the code — not a paragraph describing it.
 * The button is icon-only (founder direction 2026-10-13): it copies the
 * exact paste-ready artifact for that platform — the SwiftUI snippet
 * `Image(systemName: "…")` for SF Symbols, the bare name for Material —
 * and says so via its accessible label / hover title, not face text.
 */
function IconBox({
  platformLabel,
  iconName,
  iconSrc,
  copyText,
  copyLabel,
  pattern,
  cite,
  closest,
  tone,
}: {
  platformLabel: string;
  iconName?: string;
  iconSrc?: string;
  copyText?: string;
  copyLabel?: string;
  pattern: string;
  cite?: { label: string; url: string } | null;
  /** True when this is the model's closest-equivalent recommendation. */
  closest?: boolean;
  tone: "source" | "target";
}) {
  const [copied, setCopied] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const copy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };
  return (
    <div
      className={
        tone === "source"
          ? "rounded-xl bg-muted p-3"
          : "rounded-xl bg-accent p-3"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={
            tone === "source"
              ? "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              : "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          }
        >
          {platformLabel}
        </p>
        {closest && (
          <Badge variant="secondary">Closest match</Badge>
        )}
      </div>
      {iconName ? (
        <div className="mt-2 flex items-center gap-3">
          {iconSrc && imgOk && (
            <img
              src={iconSrc}
              alt={`${iconName} icon`}
              className="h-7 w-7 shrink-0 object-contain"
              onError={() => setImgOk(false)}
            />
          )}
          <code className="rounded bg-card px-2 py-1 font-mono text-sm font-semibold text-foreground">
            {iconName}
          </code>
          {copyText && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={copy}
              className="shrink-0"
              aria-label={copied ? "Copied" : copyLabel}
              title={copied ? "Copied" : copyLabel}
            >
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground">
          Icon not identified — see the pattern below.
        </p>
      )}
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{pattern}</p>
      {cite && (
        <a
          href={cite.url}
          target="_blank"
          rel="noopener noreferrer"
          title={cite.label}
          className={cn(buttonVariants({ variant: "link", size: "xs" }), "mt-1 h-auto px-0")}
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
  onLocate,
}: {
  finding: Finding;
  direction: AnalysisDirection;
  /** 1-based position in the screenshot's list; matches the map badge.
   *  Undefined for general (unpinned) findings — no badge is shown. */
  number?: number;
  /** Object URL of the screenshot this finding came from. */
  imageUrl: string;
  /** Tap-to-locate on the screenshot map; null when the finding has no region. */
  onLocate: (() => void) | null;
}) {
  const meta = DIRECTION_META[direction];
  const sourceKey: "ios" | "material" =
    direction === "ios-to-android" ? "ios" : "material";
  const targetKey: "ios" | "material" =
    sourceKey === "ios" ? "material" : "ios";
  // Icon findings can deep-link straight to the counterpart icon's page so
  // devs copy code instead of hunting. Apple has no per-symbol web pages, so
  // the iOS side gets the exact SF Symbol name as text instead.
  const materialCite = finding.deepLink
    ? {
        label: `Google Fonts — ${finding.counterpartName ?? "icon"}`,
        url: finding.deepLink,
      }
    : platformSource(finding.sources, "material");
  const iosBoxNote =
    !finding.deepLink && finding.counterpartName && targetKey === "ios"
      ? finding.counterpartName
      : undefined;
  const [showShot, setShowShot] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  // Icon findings name the exact symbols instead of describing them.
  const isIconFinding =
    finding.id === "icon-symbols" || finding.id === "a2i-icon-symbols";
  const iconFields = finding as FindingWithIconFields;
  const sfName =
    direction === "ios-to-android" ? iconFields.detail : finding.counterpartName;
  const materialName =
    direction === "ios-to-android" ? finding.counterpartName : iconFields.detail;
  const closestCounterpart =
    iconFields.counterpartExact === false && !!finding.counterpartName;

  return (
    <AccordionItem
      value={finding.key}
      className="rounded-lg border border-border"
    >
      {/* Collapsed row: the pin number (its own button, beside the
          trigger) + category badge + title. The finding's outline lives
          on the accordion item itself — never on a box inside the
          panel; that nesting is what GPU Chrome dropped (2026-10-13). */}
      <div className="flex items-center gap-2 px-3.5 [&>h3]:min-w-0 [&>h3]:flex-1">
        {number !== undefined &&
          (onLocate ? (
            <button
              type="button"
              onClick={onLocate}
              title="Show on screenshot"
              aria-label={`Show finding ${number} on the screenshot`}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground transition-transform hover:scale-110"
            >
              {number}
            </button>
          ) : (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
              aria-hidden="true"
            >
              {number}
            </span>
          ))}
        <AccordionTrigger className="hover:no-underline">
          <span className="flex min-w-0 items-center gap-2">
            <Badge variant="secondary">{finding.category}</Badge>
            <span className="line-clamp-1" title={finding.title}>
              {finding.title}
            </span>
            {finding.unverified && (
              <span
                className="shrink-0 text-xs font-normal italic text-muted-foreground"
                title={finding.unverifiedNote ?? "Community convention"}
              >
                Community convention
              </span>
            )}
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className="[&_p:not(:last-child)]:mb-0">
        <div className="space-y-2 px-3.5 pt-1">

      {/* FIX */}
      <div className="rounded-xl bg-muted p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Fix
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
          {finding.fix}
        </p>
      </div>

      {/* Pattern boxes, stacked vertically — icon findings lead with the symbols */}
        {isIconFinding ? (
          <>
            <IconBox
              platformLabel={meta.sourcePlatform}
              iconName={sourceKey === "ios" ? sfName : materialName}
              iconSrc={
                sourceKey === "ios"
                  ? sfName
                    ? `/icons/sf/${sfName}.svg`
                    : undefined
                  : materialName
                    ? `/icons/material/${materialName}.svg`
                    : undefined
              }
              copyText={
                sourceKey === "ios"
                  ? sfName
                    ? `Image(systemName: "${sfName}")`
                    : undefined
                  : (materialName ?? undefined)
              }
              copyLabel={sourceKey === "ios" ? "Copy SwiftUI" : "Copy name"}
              pattern={finding.sourcePattern}
              cite={
                sourceKey === "material"
                  ? materialCite
                  : platformSource(finding.sources, "ios")
              }
              tone="source"
            />
            <IconBox
              platformLabel={meta.targetPlatform}
              iconName={targetKey === "ios" ? sfName : materialName}
              iconSrc={
                targetKey === "ios"
                  ? sfName
                    ? `/icons/sf/${sfName}.svg`
                    : undefined
                  : materialName
                    ? `/icons/material/${materialName}.svg`
                    : undefined
              }
              copyText={
                targetKey === "ios"
                  ? sfName
                    ? `Image(systemName: "${sfName}")`
                    : undefined
                  : (materialName ?? undefined)
              }
              copyLabel={targetKey === "ios" ? "Copy SwiftUI" : "Copy name"}
              pattern={finding.targetPattern}
              cite={
                targetKey === "material"
                  ? materialCite
                  : platformSource(finding.sources, "ios")
              }
              closest={closestCounterpart}
              tone="target"
            />
          </>
        ) : (
          <>
            <PatternBox
              platformLabel={meta.sourcePlatform}
              pattern={finding.sourcePattern}
              cite={sourceKey === "material" ? materialCite : platformSource(finding.sources, "ios")}
              tone="source"
            />
            <PatternBox
              platformLabel={meta.targetPlatform}
              pattern={finding.targetPattern}
              cite={targetKey === "material" ? materialCite : platformSource(finding.sources, "ios")}
              tone="target"
              note={iosBoxNote}
            />
          </>
        )}

        {/* Screenshot crop, collapsed by default */}
        {finding.region && (
          <div className="w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowShot((v) => !v)}
            aria-expanded={showShot}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showShot ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {showShot ? "Hide screenshot" : "Show screenshot"}
          </Button>
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
        </div>
      </AccordionContent>
      {lightbox && finding.region && (
        <CropLightbox
          imageUrl={imageUrl}
          region={finding.region}
          alt={`Close-up of ${finding.title}`}
          onClose={() => setLightbox(false)}
        />
      )}
    </AccordionItem>
  );
}
