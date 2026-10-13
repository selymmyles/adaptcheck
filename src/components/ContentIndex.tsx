import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface IndexItem {
  name: string;
  findings: { id: string; title: string }[];
}

export interface IndexShot {
  /** "Screenshot 1" */
  label: string;
  fileName: string;
  ready: boolean;
  items: IndexItem[];
}

interface ContentIndexProps {
  shots: IndexShot[];
  onJump: (shotIndex: number, findingId: string) => void;
  onJumpToShot: (shotIndex: number) => void;
}

/** One collapsible item: header with count, expands to finding titles. */
function IndexItemGroup({
  shotIndex,
  item,
  defaultOpen,
  onJump,
}: {
  shotIndex: number;
  item: IndexItem;
  defaultOpen: boolean;
  onJump: (shotIndex: number, findingId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-0.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {item.name}
          <span className="ml-1 font-normal text-stone-400">
            {item.findings.length}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ol className="mt-1 space-y-1">
          {item.findings.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onJump(shotIndex, f.id)}
                className="block w-full truncate text-left text-[13px] text-stone-600 hover:text-teal-800 hover:underline"
                title={f.title}
              >
                {f.title}
              </button>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function IndexBody({
  shots,
  onJump,
  onJumpToShot,
}: ContentIndexProps) {
  return (
    <nav aria-label="Findings index" className="text-sm">
      <ol className="space-y-4">
        {shots.map((shot, si) => {
          const total = shot.items.reduce(
            (n, c) => n + c.findings.length,
            0,
          );
          return (
            <li key={shot.label}>
              <button
                type="button"
                onClick={() => onJumpToShot(si)}
                className="block text-left"
                title={`Jump to ${shot.label}`}
              >
                <span className="font-semibold text-stone-900 hover:text-teal-800 hover:underline">
                  {shot.label}
                  <span className="ml-1.5 font-normal text-stone-400">
                    {total}
                  </span>
                </span>
                <span className="block truncate text-xs text-stone-400" title={shot.fileName}>
                  {shot.fileName}
                </span>
              </button>
              {!shot.ready ? (
                <p className="mt-1 text-xs italic text-stone-400">
                  Analysis failed — no findings.
                </p>
              ) : (
                <ol className="mt-1.5 space-y-2 border-l border-stone-200 pl-3">
                  {shot.items.map((it, ii) => (
                    <IndexItemGroup
                      key={it.name}
                      shotIndex={si}
                      item={it}
                      defaultOpen={si === 0 && ii === 0}
                      onJump={onJump}
                    />
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Jump index: Screenshot → collapsible item → finding. Sidebar on
 * desktop, collapsible drawer on mobile. Clicking a finding scrolls to its
 * card and briefly highlights it.
 *
 * Sticky note: `sticky` is on the <aside> flex item itself (with
 * self-start so it doesn't stretch). The old code put sticky on an inner
 * div whose parent was exactly its own height — nothing to stick within,
 * so it never moved.
 */
export default function ContentIndex(props: ContentIndexProps) {
  return (
    <>
      {/* Desktop sidebar — sticky within the results flex row */}
      <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-64 shrink-0 self-start overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Findings
        </p>
        <IndexBody {...props} />
      </aside>

      {/* Mobile collapsible */}
      <details className="mb-6 rounded-2xl border border-stone-200 bg-white lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-800">
          Findings index
        </summary>
        <div className="border-t border-stone-100 px-4 py-3">
          <IndexBody {...props} />
        </div>
      </details>
    </>
  );
}
