import { useState } from "react";
import type {
  AnalysisResult,
  Finding,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META, TAXONOMY, CHECK_ORDER } from "../lib/taxonomy";
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

/** Findings grouped by taxonomy category, in taxonomy order. */
function groupByCategory(
  findings: Finding[],
): { name: string; findings: Finding[] }[] {
  const sorted = [...findings].sort(
    (a, b) => (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0),
  );
  return TAXONOMY.map((cat) => ({
    name: cat.name,
    findings: sorted.filter((f) => f.category === cat.name),
  })).filter((g) => g.findings.length > 0);
}

function toMarkdown(items: ResultItem[]): string {
  const lines: string[] = ["# Janus adaptation checklist", ""];
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
    for (const group of groupByCategory(result.findings)) {
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
    document
      .getElementById(`map-${shot}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  const indexShots: IndexShot[] = items.map((item, i) => ({
    label: `Screenshot ${i + 1}`,
    fileName: item.fileName,
    ready: item.status === "done" && !!item.result,
    categories:
      item.status === "done" && item.result
        ? groupByCategory(item.result.findings).map((g) => ({
            name: g.name,
            findings: g.findings.map((f) => ({ id: f.id, title: f.title })),
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

        {/* Per-screenshot sections */}
        {items.map((item, si) => {
          const label = `Screenshot ${si + 1}`;
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
          const groups = groupByCategory(result.findings);

          // Stable 1..N numbering per screenshot, in category order.
          const numberById = new Map<string, number>();
          {
            let n = 0;
            for (const g of groups)
              for (const f of g.findings) numberById.set(f.id, ++n);
          }
          const markers: MapMarker[] = result.findings.flatMap((f) =>
            f.region
              ? [
                  {
                    key: f.id,
                    number: numberById.get(f.id) ?? 0,
                    region: f.region,
                    highlighted:
                      highlight?.shot === si && highlight.id === f.id,
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
                <div id={`map-${si}`} className="mb-8 scroll-mt-6">
                  <ScreenshotMap
                    imageUrl={item.imageUrl}
                    markers={markers}
                    onSelectMarker={(id) => locateOnMap(si, id)}
                  />
                </div>
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
                        key={f.id}
                        id={`finding-${si}-${f.id}`}
                        className="scroll-mt-6"
                      >
                        <FindingCard
                          finding={f}
                          direction={direction}
                          number={numberById.get(f.id) ?? 0}
                          imageUrl={item.imageUrl}
                          active={
                            highlight?.shot === si && highlight.id === f.id
                          }
                          onLocate={
                            f.region ? () => locateOnMap(si, f.id) : null
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
