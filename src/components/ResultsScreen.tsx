import { useMemo, useState } from "react";
import type {
  AnalysisResult,
  Finding,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META, CHECK_ORDER } from "../lib/taxonomy";
import FindingCard from "./FindingCard";
import ScreenshotMap, { type MapMarker } from "./ScreenshotMap";
import ContentIndex, { type IndexShot } from "./ContentIndex";

export interface ResultItem {
  fileName: string;
  imageUrl: string;
  status: "queued" | "analyzing" | "done" | "error";
  result?: AnalysisResult;
  error?: string;
}

interface ResultsScreenProps {
  items: ResultItem[];
  onReset: () => void;
  onRetry: (index: number) => void;
}

interface Highlight {
  shot: number;
  id: string;
}

type Region = NonNullable<Finding["region"]>;

const regionArea = (r: Region) =>
  Math.max(0, r.x_max - r.x_min) * Math.max(0, r.y_max - r.y_min);

const regionCenterY = (r: Region) => (r.y_min + r.y_max) / 2;

const iou = (a: Region, b: Region) => {
  const ix = Math.max(0, Math.min(a.x_max, b.x_max) - Math.max(a.x_min, b.x_min));
  const iy = Math.max(0, Math.min(a.y_max, b.y_max) - Math.max(a.y_min, b.y_min));
  const inter = ix * iy;
  const union = regionArea(a) + regionArea(b) - inter;
  return union > 0 ? inter / union : 0;
};

/** Findings grouped by UI item: regions that contain each other merge into one
 *  item (the nav bar plus its icons, the search bar plus its icons), so each
 *  section reads as one thing on screen rather than one taxonomy bucket.
 *  Ordered bottom of screen first (the nav bar is item one); findings without
 *  a region go in a leading "General" group (unnumbered — only screen-pinned
 *  findings get numbers). Icon findings always merge into a single item. */
function groupByItem(
  findings: Finding[],
): { name: string; findings: Finding[] }[] {
  const withRegion = findings.filter((f) => f.region);
  const withoutRegion = findings.filter((f) => !f.region);
  const byCheckOrder = (a: Finding, b: Finding) =>
    (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0);

  // Union-find: merge when one region contains the other's center, or they
  // overlap substantially.
  const parent = withRegion.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  const centerInside = (outer: Region, inner: Region) => {
    const cx = (inner.x_min + inner.x_max) / 2;
    const cy = (inner.y_min + inner.y_max) / 2;
    const t = 15;
    return (
      cx >= outer.x_min - t &&
      cx <= outer.x_max + t &&
      cy >= outer.y_min - t &&
      cy <= outer.y_max + t
    );
  };
  for (let i = 0; i < withRegion.length; i++) {
    for (let j = i + 1; j < withRegion.length; j++) {
      const ri = withRegion[i].region!;
      const rj = withRegion[j].region!;
      if (
        centerInside(ri, rj) ||
        centerInside(rj, ri) ||
        iou(ri, rj) > 0.2
      ) {
        const pi = find(i);
        const pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }

  const clusters = new Map<number, Finding[]>();
  withRegion.forEach((f, i) => {
    const r = find(i);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r)!.push(f);
  });

  // Icon findings merge into one item: swapping the icon set reads as a
  // single task, not one finding per glyph. Clusters that mix icons with
  // other checks (e.g. tab-bar icons already merged into the tab-bar item)
  // stay put.
  const ICON_CHECK_IDS = new Set(["icon-symbols", "a2i-icon-symbols"]);
  const iconClusters: Finding[][] = [];
  const otherClusters: Finding[][] = [];
  for (const fs of clusters.values()) {
    (fs.every((f) => ICON_CHECK_IDS.has(f.id)) ? iconClusters : otherClusters).push(fs);
  }
  const mergedClusters: Finding[][] = [...otherClusters];
  if (iconClusters.length > 0) mergedClusters.push(iconClusters.flat());

  const itemGroups = mergedClusters
    .map((fs) => {
      // The item is named after its largest region's finding.
      const primary = fs.reduce((a, b) =>
        regionArea(a.region!) >= regionArea(b.region!) ? a : b,
      );
      return { primary, findings: [...fs].sort(byCheckOrder) };
    })
    .sort(
      (a, b) =>
        regionCenterY(b.primary.region!) - regionCenterY(a.primary.region!),
    )
    .map((g, i) => ({
      name: `Item ${i + 1} — ${g.primary.title}`,
      findings: g.findings,
    }));

  const groups: { name: string; findings: Finding[] }[] = [];
  if (withoutRegion.length > 0) {
    groups.push({
      name: "General",
      findings: [...withoutRegion].sort(byCheckOrder),
    });
  }
  groups.push(...itemGroups);
  return groups;
}

function toMarkdown(items: ResultItem[]): string {
  const lines: string[] = ["# Janus adaptation checklist", ""];
  // Cross-screen patterns first: fix once, apply everywhere.
  if (items.length > 1) {
    const byCheck = new Map<
      string,
      { title: string; fix: string; screens: number }
    >();
    items.forEach((item) => {
      const seen = new Set<string>();
      for (const f of item.result?.findings ?? []) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const e = byCheck.get(f.id) ?? { title: f.title, fix: f.fix, screens: 0 };
        e.screens += 1;
        byCheck.set(f.id, e);
      }
    });
    const patterns = [...byCheck.values()]
      .filter((p) => p.screens >= 2)
      .sort((a, b) => b.screens - a.screens);
    if (patterns.length > 0) {
      lines.push("## Fix once, apply everywhere", "");
      for (const p of patterns) {
        lines.push(
          `- [ ] **${p.title}** — on ${p.screens} of ${items.length} screens: ${p.fix}`,
        );
      }
      lines.push("");
    }
  }
  items.forEach((item, i) => {
    const label = `Screenshot ${i + 1}`;
    lines.push(`## ${label} — ${item.fileName}`);
    if (item.status !== "done" || !item.result) {
      lines.push("", "_Analysis failed._", "");
      return;
    }
    const { result } = item;
    const meta = DIRECTION_META[result.direction];
    lines.push("", `_${meta.arrow}_`, "", result.summary, "");
    for (const group of groupByItem(result.findings)) {
      lines.push(`### ${group.name}`, "");
      for (const f of group.findings) {
        lines.push(`- [ ] **${f.title}**`);
        lines.push(`  - ${meta.sourcePatternLabel}: ${f.sourcePattern}`);
        lines.push(`  - ${meta.targetPatternLabel}: ${f.targetPattern}`);
        lines.push(`  - Why: ${f.rationale}`);
        if (f.unverified) {
          lines.push(
            `  - Note: community convention, not an explicit platform guideline${f.unverifiedNote ? ` — ${f.unverifiedNote}` : ""}`,
          );
        } else {
          for (const s of f.sources) {
            lines.push(`  - Source: [${s.label}](${s.url})`);
          }
        }
      }
      lines.push("");
    }
  });
  return lines.join("\n");
}

export default function ResultsScreen({
  items,
  onReset,
  onRetry,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  const flashHighlight = (shot: number, id: string) => {
    setHighlight({ shot, id });
    window.setTimeout(() => {
      setHighlight((cur) =>
        cur && cur.shot === shot && cur.id === id ? null : cur,
      );
    }, 1800);
  };

  const locateOnMap = (shot: number, id: string) => {
    flashHighlight(shot, id);
    // The annotated screenshot is collapsed by default — open it first.
    const map = document.getElementById(`map-${shot}`) as HTMLDetailsElement | null;
    if (map && !map.open) map.open = true;
    map?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const jumpToFinding = (shot: number, id: string) => {
    flashHighlight(shot, id);
    // Let the highlight apply before scrolling into view.
    window.setTimeout(() => {
      const el = document.getElementById(`finding-${shot}-${id}`);
      // Open the category accordion first if the user collapsed it.
      const details = el?.closest("details");
      if (details && !details.open) details.open = true;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
  };

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(items));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context) — no-op, button stays.
    }
  };

  const totalFindings = items.reduce(
    (n, it) => n + (it.result?.findings.length ?? 0),
    0,
  );

  // Cross-screen patterns: checks appearing on 2+ screenshots. Fixing these
  // once (theme, design system) clears them everywhere — the real value of a
  // batch over N separate single-screen reports.
  const patterns = useMemo(() => {
    if (items.length < 2) return [];
    const byCheck = new Map<
      string,
      { id: string; title: string; fix: string; screens: Set<number> }
    >();
    items.forEach((item, si) => {
      for (const f of item.result?.findings ?? []) {
        const e = byCheck.get(f.id) ?? {
          id: f.id,
          title: f.title,
          fix: f.fix,
          screens: new Set<number>(),
        };
        e.screens.add(si);
        byCheck.set(f.id, e);
      }
    });
    return [...byCheck.values()]
      .filter((p) => p.screens.size >= 2)
      .sort((a, b) => b.screens.size - a.screens.size);
  }, [items]);

  const indexShots: IndexShot[] = items.map((item, i) => ({
    label: `Screenshot ${i + 1}`,
    fileName: item.fileName,
    ready: item.status === "done" && !!item.result,
    items:
      item.status === "done" && item.result
        ? groupByItem(item.result.findings).map((g) => ({
            name: g.name,
            findings: g.findings.map((f) => ({ id: f.key, title: f.title })),
          }))
        : [],
  }));

  return (
    <div className="flex items-start gap-6">
      <div className="mx-auto w-full max-w-3xl flex-1">
        {/* Summary header */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-[15px] leading-relaxed text-stone-700">
            <span className="font-semibold text-stone-900">
              {totalFindings} {totalFindings === 1 ? "finding" : "findings"}
            </span>{" "}
            across {items.length}{" "}
            {items.length === 1 ? "screenshot" : "screenshots"} — every one
            needs addressing for a native look.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={copyChecklist}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied to clipboard
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5" />
                  </svg>
                  Copy checklist
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              Analyze more
            </button>
          </div>
        </section>

        {/* Cross-screen patterns: fix once, apply everywhere */}
        {patterns.length > 0 && (
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold tracking-tight text-stone-900">
              Fix once, apply everywhere
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              These patterns repeat across your screens — handle them globally
              (theme, design system) instead of screen by screen.
            </p>
            <ul className="mt-4 space-y-3">
              {patterns.map((p) => (
                <li key={p.id} className="rounded-xl bg-stone-50 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-900">
                      {p.title}
                    </p>
                    <p className="shrink-0 text-xs font-medium text-teal-700">
                      {p.screens.size} of {items.length} screens
                    </p>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
                    {p.fix}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-screenshot sections */}
        {items.map((item, si) => {
          const label = `Screenshot ${si + 1}`;
          if (item.status === "analyzing") {
            return (
              <section key={label} className="mt-8">
                <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                  {label}
                  <span className="ml-2 truncate text-sm font-normal text-stone-400">
                    {item.fileName}
                  </span>
                </h2>
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-700" />
                  </div>
                  <p className="mt-3 text-sm text-stone-500">
                    Retrying analysis…
                  </p>
                </div>
              </section>
            );
          }
          if (item.status !== "done" || !item.result) {
            return (
              <section key={label} className="mt-8">
                <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                  {label}
                  <span className="ml-2 truncate text-sm font-normal text-stone-400">
                    {item.fileName}
                  </span>
                </h2>
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm text-rose-800">
                    {item.error ?? "Analysis failed. Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRetry(si)}
                    className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
                  >
                    Retry this screenshot
                  </button>
                </div>
              </section>
            );
          }

          const { result } = item;
          const direction: AnalysisDirection = result.direction;
          const meta = DIRECTION_META[direction];
          const groups = groupByItem(result.findings);

          // Stable 1..N numbering per screenshot: only findings pinned on the
          // screenshot get numbers (items bottom-up). General findings are
          // unnumbered — numbering what isn't highlighted would leave gaps.
          const numberByKey = new Map<string, number>();
          {
            let n = 0;
            for (const g of groups)
              for (const f of g.findings)
                if (f.region) numberByKey.set(f.key, ++n);
          }
          const markers: MapMarker[] = result.findings.flatMap((f) =>
            f.region
              ? [
                  {
                    key: f.key,
                    number: numberByKey.get(f.key) ?? 0,
                    region: f.region,
                    highlighted:
                      highlight?.shot === si && highlight.id === f.key,
                  },
                ]
              : [],
          );

          return (
            <section key={label} className="mt-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">
                  {label}
                </h2>
                <span className="inline-flex items-center rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">
                  {meta.arrow}
                </span>
                <span className="truncate text-sm text-stone-400">
                  {item.fileName}
                </span>
              </div>
              <p className="mb-6 text-[15px] leading-relaxed text-stone-700">
                {result.summary}
              </p>

              {markers.length > 0 && (
                <details id={`map-${si}`} className="mb-8 scroll-mt-6 group/map">
                  <summary className="mb-3 cursor-pointer list-none">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
                      <svg
                        className="h-4 w-4 text-stone-400 transition-transform group-open/map:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                      Annotated screenshot
                      <span className="font-normal text-stone-400">
                        {markers.length} {markers.length === 1 ? "pin" : "pins"}
                      </span>
                    </span>
                  </summary>
                  <ScreenshotMap
                    imageUrl={item.imageUrl}
                    markers={markers}
                    onSelectMarker={(id) => jumpToFinding(si, id)}
                  />
                </details>
              )}

              {groups.length === 0 && (
                <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
                  No adaptation issues found — this screen already reads
                  native on {meta.targetShort}.
                </p>
              )}

              {groups.map((group) => (
                <details key={group.name} open className="mb-8 group/acc">
                  <summary className="mb-3 cursor-pointer list-none">
                    <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-stone-900">
                      <svg
                        className="h-4 w-4 text-stone-400 transition-transform group-open/acc:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                      {group.name}
                      <span className="text-sm font-medium text-stone-400">
                        {group.findings.length}
                      </span>
                    </span>
                  </summary>
                  <div className="space-y-3">
                    {group.findings.map((f) => (
                      <div
                        key={f.key}
                        id={`finding-${si}-${f.key}`}
                        className="scroll-mt-6"
                      >
                        <FindingCard
                          finding={f}
                          direction={direction}
                          number={numberByKey.get(f.key)}
                          imageUrl={item.imageUrl}
                          active={
                            highlight?.shot === si && highlight.id === f.key
                          }
                          onLocate={
                            f.region ? () => locateOnMap(si, f.key) : null
                          }
                        />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          );
        })}
      </div>

      <ContentIndex
        shots={indexShots}
        onJump={(si, id) => jumpToFinding(si, id)}
      />
    </div>
  );
}
