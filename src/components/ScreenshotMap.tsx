import type { FindingRegion } from "../lib/mockAnalysis";

export interface MapMarker {
  /** Finding id. */
  key: string;
  /** Number matching the finding's position in the results list. */
  number: number;
  region: FindingRegion;
  highlighted: boolean;
}

interface ScreenshotMapProps {
  imageUrl: string;
  markers: MapMarker[];
  onSelectMarker: (key: string) => void;
}

const pct = (v: number) => `${v / 10}%`;

/**
 * The uploaded screenshot with numbered badges over each finding's region.
 * Badge numbers match the finding numbers in the results list below.
 */
export default function ScreenshotMap({
  imageUrl,
  markers,
  onSelectMarker,
}: ScreenshotMapProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-muted">
      <div className="relative mx-auto w-fit max-w-full">
        <img
          src={imageUrl}
          alt="Uploaded screenshot with flagged regions marked"
          className="block max-h-[70vh] w-auto max-w-full"
        />
        {markers.map((m) => (
          <div key={m.key}>
            {/* region outline */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute rounded-md border-2 transition-colors ${
                m.highlighted ? "border-primary" : "border-primary/30"
              }`}
              style={{
                left: pct(m.region.x_min),
                top: pct(m.region.y_min),
                width: pct(m.region.x_max - m.region.x_min),
                height: pct(m.region.y_max - m.region.y_min),
              }}
            />
            {/* numbered badge, anchored at the region's top-left corner */}
            <button
              type="button"
              onClick={() => onSelectMarker(m.key)}
              aria-label={`Highlight finding ${m.number}`}
              className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md transition-transform ${
                m.highlighted
                  ? "scale-125 animate-pulse bg-primary"
                  : "bg-primary/90 hover:scale-110"
              }`}
              style={{
                left: pct(m.region.x_min),
                top: pct(m.region.y_min),
              }}
            >
              {m.number}
            </button>
          </div>
        ))}
      </div>
      <figcaption className="border-t border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        Numbered markers point at each flagged element — tap a finding's number
        to pulse its marker.
      </figcaption>
    </figure>
  );
}
