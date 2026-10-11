import { useRef, useState } from "react";
import type {
  AnalysisResult,
  Finding,
  Severity,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META } from "../lib/taxonomy";
import FindingCard, { SeverityBadge } from "./FindingCard";
import ScreenshotMap, { type MapMarker } from "./ScreenshotMap";

interface ResultsScreenProps {
  result: AnalysisResult;
  fileName: string;
  imageUrl: string | null;
  onReset: () => void;
}

interface Group {
  severity: Severity;
  heading: string;
  blurb: string;
}

function groupsFor(direction: AnalysisDirection): Group[] {
  const meta = DIRECTION_META[direction];
  return [
    {
      severity: "must",
      heading: "Must fix",
      blurb: meta.brokenBlurb,
    },
    {
      severity: "should",
      heading: "Should fix",
      blurb: meta.portedBlurb,
    },
    {
      severity: "nice",
      heading: "Consider polishing",
      blurb: "Nice-to-haves that sell the platform fit.",
    },
  ];
}

function toMarkdown(
  result: AnalysisResult,
  fileName: string,
  direction: AnalysisDirection,
): string {
  const meta = DIRECTION_META[direction];
  const lines: string[] = [
    `# ${meta.arrow} adaptation checklist — ${fileName}`,
    "",
    result.summary,
    "",
  ];
  for (const group of groupsFor(direction)) {
    const findings = result.findings.filter(
      (f) => f.severity === group.severity,
    );
    if (findings.length === 0) continue;
    lines.push(`## ${group.heading}`, "");
    for (const f of findings) {
      lines.push(`- [ ] **${f.title}** (${f.category})`);
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
  return lines.join("\n");
}

export default function ResultsScreen({
  result,
  fileName,
  imageUrl,
  onReset,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const direction = result.direction;
  const meta = DIRECTION_META[direction];
  const groups = groupsFor(direction);

  const counts = (severity: Severity) =>
    result.findings.filter((f) => f.severity === severity).length;

  // Stable 1..N numbering across severity groups (must → should → nice).
  const numberById = new Map<string, number>();
  {
    let n = 0;
    (["must", "should", "nice"] as Severity[]).forEach((sev) => {
      result.findings
        .filter((f) => f.severity === sev)
        .forEach((f) => {
          n += 1;
          numberById.set(f.id, n);
        });
    });
  }

  const markers: MapMarker[] = result.findings.flatMap((f) =>
    f.region
      ? [
          {
            key: f.id,
            number: numberById.get(f.id) ?? 0,
            region: f.region,
            highlighted: highlightedId === f.id,
          },
        ]
      : [],
  );

  const locateFinding = (id: string) => {
    setHighlightedId(id);
    mapWrapRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    window.setTimeout(() => {
      setHighlightedId((cur) => (cur === id ? null : cur));
    }, 1800);
  };

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(result, fileName, direction));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context) — no-op, button stays.
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Direction header */}
      <div className="mb-5">
        <span className="inline-flex items-center rounded-full bg-teal-700 px-3.5 py-1.5 text-sm font-semibold text-white">
          {meta.arrow} checklist
        </span>
      </div>

      {/* Summary */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["must", "should", "nice"] as Severity[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <SeverityBadge severity={s} />
              <span className="text-sm font-semibold text-stone-700">
                {counts(s)}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-stone-700">
          {result.summary}
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
            Analyze another
          </button>
        </div>
      </section>

      {/* Screenshot with region markers */}
      {imageUrl && markers.length > 0 && (
        <div ref={mapWrapRef} className="mt-8 scroll-mt-6">
          <ScreenshotMap
            imageUrl={imageUrl}
            markers={markers}
            onSelectMarker={locateFinding}
          />
        </div>
      )}

      {/* Grouped findings */}
      {groups.map((group) => {
        const findings: Finding[] = result.findings.filter(
          (f) => f.severity === group.severity,
        );
        if (findings.length === 0) return null;
        return (
          <section key={group.severity} className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                {group.heading}
                <span className="ml-2 text-sm font-medium text-stone-400">
                  {findings.length}
                </span>
              </h2>
            </div>
            <p className="mb-4 text-sm text-stone-500">{group.blurb}</p>
            <div className="space-y-3">
              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  direction={direction}
                  number={numberById.get(f.id) ?? 0}
                  active={highlightedId === f.id}
                  onLocate={f.region ? () => locateFinding(f.id) : null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
