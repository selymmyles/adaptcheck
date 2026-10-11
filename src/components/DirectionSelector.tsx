import type { DirectionRequest } from "../lib/mockAnalysis";

const OPTIONS: Array<{ value: DirectionRequest; label: string }> = [
  { value: "ios-to-android", label: "iOS design" },
  { value: "android-to-ios", label: "Android design" },
  { value: "auto", label: "Auto-detect" },
];

interface DirectionSelectorProps {
  value: DirectionRequest;
  onChange: (value: DirectionRequest) => void;
}

export default function DirectionSelector({
  value,
  onChange,
}: DirectionSelectorProps) {
  return (
    <div className="mx-auto mb-6 w-full max-w-xl">
      <p
        id="direction-label"
        className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-stone-400"
      >
        What are you uploading?
      </p>
      <div
        role="radiogroup"
        aria-labelledby="direction-label"
        className="grid grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1"
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "bg-white text-teal-800 shadow-sm ring-1 ring-stone-200"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
