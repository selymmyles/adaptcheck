import type { DirectionRequest } from "../lib/mockAnalysis";

export type ItemStatus = "queued" | "analyzing" | "done" | "error";

export interface ProgressItem {
  fileName: string;
  status: ItemStatus;
  error?: string;
}

interface AnalyzingViewProps {
  items: ProgressItem[];
  directionRequest: DirectionRequest;
}

const COMPARE_LABEL: Record<DirectionRequest, string> = {
  "ios-to-android": "Comparing against Material 3…",
  "android-to-ios": "Comparing against iOS HIG…",
  auto: "Detecting platform…",
};

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-white" aria-label="Done">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700" aria-label="Failed">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (status === "analyzing") {
    return (
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-stone-200 border-t-teal-700" aria-label="Analyzing" />
    );
  }
  return (
    <span className="h-6 w-6 rounded-full border-[3px] border-stone-200" aria-label="Queued" />
  );
}

/**
 * Per-screenshot progress for a batch analysis. The parent (App) runs up to
 * two /api/analyze calls concurrently; this view reflects each item's status.
 */
export default function AnalyzingView({
  items,
  directionRequest,
}: AnalyzingViewProps) {
  const done = items.filter((i) => i.status === "done").length;
  const progress = items.length > 0 ? (done / items.length) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-xl" aria-live="polite">
      <div className="rounded-2xl border border-stone-200 bg-white p-8">
        <p className="text-center text-base font-medium text-stone-900">
          Analyzing {items.length === 1 ? "your screenshot" : `${items.length} screenshots`}
        </p>
        <p className="mt-1 text-center text-sm text-stone-500">
          {COMPARE_LABEL[directionRequest]}
        </p>
        <div
          className="mt-6 h-1.5 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-teal-700 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.fileName} className="flex items-center gap-3">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-800">
                  {item.fileName}
                </p>
                {item.status === "analyzing" && (
                  <p className="text-xs text-stone-400">Reading layout…</p>
                )}
                {item.status === "queued" && (
                  <p className="text-xs text-stone-400">Waiting…</p>
                )}
                {item.status === "error" && item.error && (
                  <p className="text-xs text-rose-600">{item.error}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
