import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
        <p className="truncate text-sm font-medium text-foreground">
          {item.fileName}
        </p>
        {item.status === "done" && (
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Done"
          >
            <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
          </span>
        )}
        {item.status === "error" && (
          <span className="shrink-0 text-xs font-medium text-destructive">
            Failed
          </span>
        )}
      </div>
      {/* Per-file progress — stock Progress. No value while analyzing puts
          the primitive in its indeterminate state; error rows carry their
          state in text instead of a bar. */}
      {item.status !== "error" && (
        <div className="mt-2">
          <Progress
            value={
              item.status === "done"
                ? 100
                : item.status === "analyzing"
                  ? null
                  : 0
            }
            aria-label={`Progress for ${item.fileName}`}
          />
        </div>
      )}
      {item.status === "analyzing" && (
        <p className="mt-1.5 text-xs text-muted-foreground">{PHASES[phase]}</p>
      )}
      {item.status === "queued" && (
        <p className="mt-1.5 text-xs text-muted-foreground">Waiting…</p>
      )}
      {item.status === "error" && item.error && (
        <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
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
      <Card>
        <CardContent>
        <p className="text-base font-medium text-foreground">
          Analyzing {items.length === 1 ? "your screenshot" : `${items.length} screenshots`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Deep check takes 1–2 minutes per screenshot — every finding is
          cross-checked before it shows up.
        </p>
        <ol className="mt-6 space-y-5">
          {items.map((item) => (
            <FileRow key={item.fileName} item={item} />
          ))}
        </ol>
        <div className="mt-8">
          <Separator />
        </div>
        <div className="pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Total progress</p>
            <p className="text-xs text-muted-foreground">
              {done} of {items.length}
            </p>
          </div>
          <div className="mt-2">
            <Progress value={progress} aria-label="Total progress" />
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
