import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export type ItemStatus = "queued" | "analyzing" | "done" | "error";

export interface ProgressItem {
  fileName: string;
  status: ItemStatus;
  error?: string;
}

interface AnalyzingViewProps {
  items: ProgressItem[];
}

/** Analysis phases shown under the active file — keeps the wait feeling alive. */
const PHASES = [
  "Detecting platform…",
  "Scanning layout…",
  "Comparing components…",
  "Checking icons…",
  "Verifying findings…",
];

function FileRow({ item }: { item: ProgressItem }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (item.status !== "analyzing") return;
    setPhase(0);
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4000);
    return () => clearInterval(t);
  }, [item.status]);

  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-stone-800">
          {item.fileName}
        </p>
        {item.status === "done" && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Done"
          >
            <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
          </span>
        )}
        {item.status === "error" && (
          <span className="shrink-0 text-xs font-medium text-rose-600">
            Failed
          </span>
        )}
      </div>
      {/* Per-file progress bar, LocalSend-style */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
        {item.status === "done" ? (
          <div className="h-full w-full rounded-full bg-primary" />
        ) : item.status === "analyzing" ? (
          <div className="indeterminate-bar h-full w-1/3 rounded-full bg-primary" />
        ) : item.status === "error" ? (
          <div className="h-full w-full rounded-full bg-rose-400" />
        ) : null}
      </div>
      {item.status === "analyzing" && (
        <p className="mt-1.5 text-xs text-stone-400">{PHASES[phase]}</p>
      )}
      {item.status === "queued" && (
        <p className="mt-1.5 text-xs text-stone-400">Waiting…</p>
      )}
      {item.status === "error" && item.error && (
        <p className="mt-1.5 text-xs text-rose-600">{item.error}</p>
      )}
    </li>
  );
}

/**
 * Batch progress, LocalSend-style: a progress bar under each file and a
 * total-progress bar at the bottom. No apologies for slow AI.
 */
export default function AnalyzingView({ items }: AnalyzingViewProps) {
  const done = items.filter((i) => i.status === "done").length;
  const progress = items.length > 0 ? (done / items.length) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-xl" aria-live="polite">
      <style>{`
        @keyframes indeterminate-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .indeterminate-bar { animation: indeterminate-slide 1.4s ease-in-out infinite; }
      `}</style>
      <Card className="gap-0 rounded-2xl p-8">
        <p className="text-base font-medium text-stone-900">
          Analyzing {items.length === 1 ? "your screenshot" : `${items.length} screenshots`}
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Deep check takes 1–2 minutes per screenshot — every finding is
          verified three times before it shows up.
        </p>
        <ol className="mt-6 space-y-5">
          {items.map((item) => (
            <FileRow key={item.fileName} item={item} />
          ))}
        </ol>
        <Separator className="mt-8 bg-stone-100" />
        <div className="pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-stone-700">Total progress</p>
            <p className="text-xs text-stone-400">
              {done} of {items.length}
            </p>
          </div>
          <Progress
            value={progress}
            aria-label="Total progress"
            className="mt-2 gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-700"
          />
        </div>
      </Card>
    </div>
  );
}
