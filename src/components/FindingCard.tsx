import type {
  Finding,
  Severity,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META } from "../lib/taxonomy";

const SEVERITY_STYLES: Record<
  Severity,
  { badge: string; dot: string; label: string }
> = {
  must: {
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
    label: "Must fix",
  },
  should: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    label: "Should fix",
  },
  nice: {
    badge: "bg-stone-100 text-stone-600 ring-stone-200",
    dot: "bg-stone-400",
    label: "Polish",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export default function FindingCard({
  finding,
  direction,
}: {
  finding: Finding;
  direction: AnalysisDirection;
}) {
  const meta = DIRECTION_META[direction];
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
          {finding.category}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold tracking-tight text-stone-900">
        {finding.title}
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
    </article>
  );
}
