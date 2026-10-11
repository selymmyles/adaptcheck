import { useEffect, useState } from "react";

const STEPS = [
  "Reading layout…",
  "Detecting components…",
  "Checking navigation patterns…",
  "Comparing against Material 3…",
  "Prioritizing findings…",
];

interface AnalyzingViewProps {
  fileName: string;
}

/**
 * Purely presentational staged progress. The parent (App) holds the analyzing
 * phase for ~5s while this cycles through the steps; the mock analysis
 * resolves in parallel.
 */
export default function AnalyzingView({ fileName }: AnalyzingViewProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-xl" aria-live="polite">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <div
          className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-[3px] border-stone-200 border-t-teal-700"
          aria-hidden="true"
        />
        <p className="text-base font-medium text-stone-900">
          Analyzing {fileName}
        </p>
        <p className="mt-1 h-6 text-sm text-stone-500">{STEPS[step]}</p>
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
        <ol className="mt-6 space-y-2 text-left">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-2 text-sm ${
                i <= step ? "text-stone-700" : "text-stone-300"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  i < step ? "bg-teal-700" : i === step ? "bg-teal-400" : "bg-stone-200"
                }`}
                aria-hidden="true"
              />
              {label.replace("…", "")}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
