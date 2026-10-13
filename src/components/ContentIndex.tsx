import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

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

function IndexBody({
  shots,
  onJump,
  onJumpToShot,
}: ContentIndexProps) {
  // Screenshots are an accordion level too (founder, 2026-10-13),
  // expanded by default — a screenshot that finishes analyzing opens
  // as it lands. The filename under the header stays a jump link.
  const [openShots, setOpenShots] = useState<string[]>(() =>
    shots.map((_, si) => `shot-${si}`),
  );
  useEffect(() => {
    setOpenShots(shots.map((_, si) => `shot-${si}`));
    // Only re-open-all when a screenshot is added, not on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots.length]);
  return (
    <nav aria-label="Findings index" className="text-sm">
      <Accordion
        multiple
        value={openShots}
        onValueChange={(value) => setOpenShots(value as string[])}
      >
        {shots.map((shot, si) => {
          const total = shot.items.reduce(
            (n, c) => n + c.findings.length,
            0,
          );
          return (
            <AccordionItem key={shot.label} value={`shot-${si}`}>
              <AccordionTrigger>
                <span className="font-semibold text-foreground">
                  {shot.label}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {total}
                  </span>
                </span>
              </AccordionTrigger>
              <button
                type="button"
                onClick={() => onJumpToShot(si)}
                className="block max-w-full truncate pb-1 text-left text-xs text-muted-foreground hover:underline"
                title={shot.fileName}
              >
                {shot.fileName}
              </button>
              <AccordionContent>
              {!shot.ready ? (
                <p className="text-xs italic text-muted-foreground">
                  Analysis failed — no findings.
                </p>
              ) : (
                <Accordion
                  multiple
                  defaultValue={
                    si === 0 && shot.items.length > 0
                      ? [shot.items[0].name]
                      : []
                  }
                >
                  {shot.items.map((it) => (
                    <AccordionItem key={it.name} value={it.name}>
                      <AccordionTrigger>
                        <span>
                          {it.name}
                          <span className="ml-1 font-normal text-muted-foreground">
                            {it.findings.length}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ol className="space-y-1">
                          {it.findings.map((f) => (
                            <li key={f.id}>
                              <button
                                type="button"
                                onClick={() => onJump(si, f.id)}
                                className="block w-full truncate text-left text-muted-foreground hover:text-foreground hover:underline"
                                title={f.title}
                              >
                                {f.title}
                              </button>
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </nav>
  );
}

/**
 * Jump index: Screenshot → accordion item → finding. Sidebar on
 * desktop, collapsible drawer on mobile. Clicking a finding scrolls to its
 * card and briefly highlights it. The item groups are the stock shadcn
 * Accordion — no custom styling (founder direction, 2026-10-12: defaults
 * first, token customization only at his direction).
 *
 * Sticky note: `sticky` is on the <aside> flex item itself (with
 * self-start so it doesn't stretch). The old code put sticky on an inner
 * div whose parent was exactly its own height — nothing to stick within,
 * so it never moved.
 */
export default function ContentIndex(props: ContentIndexProps) {
  return (
    <>
      {/* Desktop sidebar — sticky within the results flex row. Panel
          pattern after the shadcn Tags scroll-area demo (founder pick,
          2026-10-13): bordered box, title header over a hairline, and the
          React Aria ScrollArea variant doing the scrolling. */}
      <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-64 shrink-0 self-start overflow-hidden rounded-2xl border border-border bg-card lg:block">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Findings
        </p>
        <ScrollArea className="max-h-[calc(100vh-6rem)] overflow-x-hidden">
          <div className="px-4 py-3">
            <IndexBody {...props} />
          </div>
        </ScrollArea>
      </aside>

      {/* Mobile collapsible */}
      <details className="mb-6 rounded-2xl border border-border bg-card lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
          Findings index
        </summary>
        <ScrollArea className="max-h-[60vh] overflow-x-hidden border-t border-border">
          <div className="px-4 py-3">
            <IndexBody {...props} />
          </div>
        </ScrollArea>
      </details>
    </>
  );
}
