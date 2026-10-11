export interface IndexCategory {
  name: string;
  findings: { id: string; title: string }[];
}

export interface IndexShot {
  /** "Screenshot 1" */
  label: string;
  fileName: string;
  ready: boolean;
  categories: IndexCategory[];
}

interface ContentIndexProps {
  shots: IndexShot[];
  onJump: (shotIndex: number, findingId: string) => void;
}

function IndexBody({
  shots,
  onJump,
}: ContentIndexProps) {
  return (
    <nav aria-label="Findings index" className="text-sm">
      <ol className="space-y-4">
        {shots.map((shot, si) => {
          const total = shot.categories.reduce(
            (n, c) => n + c.findings.length,
            0,
          );
          return (
            <li key={shot.label}>
              <p className="font-semibold text-stone-900">
                {shot.label}
                <span className="ml-1.5 font-normal text-stone-400">
                  {total}
                </span>
              </p>
              <p className="truncate text-xs text-stone-400" title={shot.fileName}>
                {shot.fileName}
              </p>
              {!shot.ready ? (
                <p className="mt-1 text-xs italic text-stone-400">
                  Analysis failed — no findings.
                </p>
              ) : (
                <ol className="mt-1.5 space-y-2.5 border-l border-stone-200 pl-3">
                  {shot.categories.map((cat) => (
                    <li key={cat.name}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {cat.name}
                        <span className="ml-1 font-normal text-stone-400">
                          {cat.findings.length}
                        </span>
                      </p>
                      <ol className="mt-1 space-y-1">
                        {cat.findings.map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => onJump(si, f.id)}
                              className="block w-full truncate text-left text-[13px] text-stone-600 hover:text-teal-800 hover:underline"
                              title={f.title}
                            >
                              {f.title}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </li>
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
 * Sticky jump index: Screenshot → category → finding. Sidebar on desktop,
 * collapsible drawer on mobile. Clicking a finding scrolls to its card and
 * briefly highlights it.
 */
export default function ContentIndex(props: ContentIndexProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Findings
          </p>
          <IndexBody {...props} />
        </div>
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
