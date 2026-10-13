import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AnalysisResult,
  Finding,
  AnalysisDirection,
} from "../lib/mockAnalysis";
import { DIRECTION_META, CHECK_ORDER } from "../lib/taxonomy";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import FindingCard from "./FindingCard";
import ScreenshotMap, { type MapMarker } from "./ScreenshotMap";
import ContentIndex, { type IndexShot } from "./ContentIndex";

export interface ResultItem {
  fileName: string;
  imageUrl: string;
  status: "queued" | "analyzing" | "done" | "error";
  result?: AnalysisResult;
  error?: string;
}

interface ResultsScreenProps {
  items: ResultItem[];
  onReset: () => void;
  onRetry: (index: number) => void;
}

interface Highlight {
  shot: number;
  id: string;
}

type Region = NonNullable<Finding["region"]>;

const regionArea = (r: Region) =>
  Math.max(0, r.x_max - r.x_min) * Math.max(0, r.y_max - r.y_min);

const regionCenterY = (r: Region) => (r.y_min + r.y_max) / 2;

const iou = (a: Region, b: Region) => {
  const ix = Math.max(0, Math.min(a.x_max, b.x_max) - Math.max(a.x_min, b.x_min));
  const iy = Math.max(0, Math.min(a.y_max, b.y_max) - Math.max(a.y_min, b.y_min));
  const inter = ix * iy;
  const union = regionArea(a) + regionArea(b) - inter;
  return union > 0 ? inter / union : 0;
};

/** Findings grouped by UI item: regions that contain each other merge into one
 *  item (the nav bar plus its icons, the search bar plus its icons), so each
 *  section reads as one thing on screen rather than one taxonomy bucket.
 *  Ordered bottom of screen first (the nav bar is item one); findings without
 *  a region go in a leading "General" group (unnumbered — only screen-pinned
 *  findings get numbers). Icon findings merge into a single item per
 *  screen area (nearby icons together; distant icons separate). */
/**
 * Plain-language conversion names for item groups, keyed by check id
 * (founder, 2026-10-13): an item is named for what the element IS and
 * what it BECOMES — "iOS sheet to Material bottom sheet" — not the
 * check's title ("Modal presentation and dismissal"). Ids are
 * directional, so each pair is already in conversion order. A check
 * with no entry falls back to its finding's title.
 */
const ITEM_NAMES: Record<string, [string, string]> = {
  "nav-back-behavior": ["iOS nav bar", "Material top app bar"],
  "nav-tab-bar": ["iOS tab bar", "Material navigation bar"],
  "nav-large-titles": ["iOS large title", "Material top app bar"],
  "nav-modal": ["iOS sheet", "Material bottom sheet"],
  "a2i-nav-back": ["System back only", "iOS back chevron"],
  "a2i-nav-drawer": ["Hamburger drawer", "iOS tab bar"],
  "a2i-nav-tabs": ["Material tab row", "iOS segmented control"],
  "a2i-nav-bottombar": ["Material navigation bar", "iOS tab bar"],
  "a2i-nav-fullscreen-dialog": ["Material full-screen dialog", "iOS full-screen cover"],
  "type-font": ["SF Pro", "Roboto"],
  "type-scale": ["iOS text styles", "Material type scale"],
  "a2i-type-font": ["Roboto", "SF Pro"],
  "a2i-type-scale": ["Material type scale", "iOS text styles"],
  "comp-alert": ["iOS alert", "Material dialog"],
  "comp-action-sheet": ["iOS action sheet", "Material bottom sheet"],
  "comp-list": ["iOS grouped list", "Material list"],
  "comp-menu": ["iOS pop-up menu", "Material menu"],
  "comp-fab": ["iOS floating button", "Material FAB"],
  "comp-searchbar": ["iOS search bar", "Material search bar"],
  "comp-segmented": ["iOS segmented control", "Material segmented buttons"],
  "comp-date-picker": ["iOS date wheels", "Material date picker"],
  "comp-switch": ["iOS switch", "Material switch"],
  "comp-time-picker": ["iOS time wheels", "Material time picker"],
  "comp-stepper": ["iOS stepper", "Material icon buttons"],
  "a2i-comp-fab": ["Material FAB", "iOS nav-bar button"],
  "a2i-comp-searchbar": ["Material search bar", "iOS search field"],
  "a2i-comp-dynamic-color": ["Dynamic color palette", "Fixed palette"],
  "a2i-comp-dialog": ["Material dialog", "iOS alert"],
  "a2i-comp-cards": ["Elevated cards", "Grouped backgrounds"],
  "a2i-comp-list": ["Material list", "iOS grouped list"],
  "a2i-comp-menu": ["Material menu", "iOS menu"],
  "a2i-comp-switch": ["Material switch", "iOS switch"],
  "a2i-comp-snackbar": ["Material snackbar", "iOS status indicator"],
  "a2i-comp-buttons": ["Material buttons", "iOS buttons"],
  "a2i-comp-pickers": ["Material date/time pickers", "iOS pickers"],
  "touch-targets": ["44pt touch targets", "48dp touch targets"],
  "layout-safe-area": ["iOS safe area layout", "Android edge-to-edge layout"],
  "layout-status-bar": ["Opaque status bar", "Transparent status bar"],
  "a2i-touch-targets": ["48dp touch targets", "44pt touch targets"],
  "a2i-layout-edge": ["Edge-to-edge layout", "iOS safe area"],
  "a2i-layout-statusbar": ["Transparent status bar", "Per-screen status bar style"],
  "layout-gesture-insets": ["iOS edge gestures", "Android gesture insets"],
  "motion-transitions": ["iOS transitions", "Material motion"],
  "motion-duration": ["iOS durations", "Material motion tokens"],
  "a2i-motion-transitions": ["Material transitions", "iOS parallax push/pop"],
  "a2i-motion-tokens": ["Material motion tokens", "iOS animation curves"],
  "motion-predictive-back": ["Custom swipe-back", "Predictive back gesture"],
  "icon-symbols": ["SF Symbols", "Material Symbols"],
  "icon-tab-sizing": ["Tint-only tab icons", "Material tab icons"],
  "a2i-icon-symbols": ["Material Symbols", "SF Symbols"],
  "a2i-icon-adaptive": ["Adaptive icon", "Full-bleed app icon"],
  "a2i-icon-themed": ["Themed icon", "Full-color app icon"],
};

function groupByItem(
  findings: Finding[],
): { name: string; findings: Finding[] }[] {
  const withRegion = findings.filter((f) => f.region);
  const withoutRegion = findings.filter((f) => !f.region);
  const byCheckOrder = (a: Finding, b: Finding) =>
    (CHECK_ORDER[a.id] ?? 0) - (CHECK_ORDER[b.id] ?? 0);

  // Union-find: merge when one region contains the other's center, or they
  // overlap substantially.
  const parent = withRegion.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  const centerInside = (outer: Region, inner: Region) => {
    const cx = (inner.x_min + inner.x_max) / 2;
    const cy = (inner.y_min + inner.y_max) / 2;
    const t = 15;
    return (
      cx >= outer.x_min - t &&
      cx <= outer.x_max + t &&
      cy >= outer.y_min - t &&
      cy <= outer.y_max + t
    );
  };
  for (let i = 0; i < withRegion.length; i++) {
    for (let j = i + 1; j < withRegion.length; j++) {
      const ri = withRegion[i].region!;
      const rj = withRegion[j].region!;
      if (
        centerInside(ri, rj) ||
        centerInside(rj, ri) ||
        iou(ri, rj) > 0.2
      ) {
        const pi = find(i);
        const pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }

  const clusters = new Map<number, Finding[]>();
  withRegion.forEach((f, i) => {
    const r = find(i);
    if (!clusters.has(r)) clusters.set(r, []);
    clusters.get(r)!.push(f);
  });

  // Icon findings merge into one item: swapping the icon set reads as a
  // single task, not one finding per glyph. Clusters that mix icons with
  // other checks (e.g. tab-bar icons already merged into the tab-bar item)
  // stay put.
  const ICON_CHECK_IDS = new Set(["icon-symbols", "a2i-icon-symbols"]);
  const iconClusters: Finding[][] = [];
  const otherClusters: Finding[][] = [];
  for (const fs of clusters.values()) {
    (fs.every((f) => ICON_CHECK_IDS.has(f.id)) ? iconClusters : otherClusters).push(fs);
  }
  // Icon findings merge into one item ONLY when they're near each other
  // (same toolbar, same list, same nav row). Icons in different parts of
  // the screen — top-of-page buttons vs a mid-page button — are separate
  // items, because they're separate components to fix.
  const boxGap = (a: Region, b: Region): number => {
    const dx = Math.max(0, Math.max(a.x_min - b.x_max, b.x_min - a.x_max));
    const dy = Math.max(0, Math.max(a.y_min - b.y_max, b.y_min - a.y_max));
    return Math.hypot(dx, dy);
  };
  const iconParent = iconClusters.map((_, i) => i);
  const iconFind = (i: number): number =>
    iconParent[i] === i ? i : (iconParent[i] = iconFind(iconParent[i]));
  for (let i = 0; i < iconClusters.length; i++) {
    for (let j = i + 1; j < iconClusters.length; j++) {
      const near = iconClusters[i].some((fi) =>
        iconClusters[j].some(
          (fj) => boxGap(fi.region!, fj.region!) <= 90,
        ),
      );
      if (near) {
        const pi = iconFind(i);
        const pj = iconFind(j);
        if (pi !== pj) iconParent[pi] = pj;
      }
    }
  }
  const iconGroups = new Map<number, Finding[]>();
  iconClusters.forEach((fs, i) => {
    const r = iconFind(i);
    if (!iconGroups.has(r)) iconGroups.set(r, []);
    iconGroups.get(r)!.push(...fs);
  });
  const mergedClusters: Finding[][] = [
    ...otherClusters,
    ...iconGroups.values(),
  ];

  const itemGroups = mergedClusters
    .map((fs) => {
      // The item is named after its largest region's finding.
      const primary = fs.reduce((a, b) =>
        regionArea(a.region!) >= regionArea(b.region!) ? a : b,
      );
      return { primary, findings: [...fs].sort(byCheckOrder) };
    })
    .sort(
      (a, b) =>
        regionCenterY(a.primary.region!) - regionCenterY(b.primary.region!),
    )
    .map((g) => {
      const pair = ITEM_NAMES[g.primary.id];
      return {
        base: pair ? `${pair[0]} to ${pair[1]}` : g.primary.title,
        findings: g.findings,
      };
    });
  // Two clusters on one screen can be the same conversion (two
  // sheets); suffix repeats so headers stay distinguishable.
  const seen = new Map<string, number>();
  const named = itemGroups.map((g) => {
    const n = (seen.get(g.base) ?? 0) + 1;
    seen.set(g.base, n);
    return {
      name: n > 1 ? `${g.base} ${n}` : g.base,
      findings: g.findings,
    };
  });

  const groups: { name: string; findings: Finding[] }[] = [];
  if (withoutRegion.length > 0) {
    groups.push({
      name: "General",
      findings: [...withoutRegion].sort(byCheckOrder),
    });
  }
  groups.push(...named);
  return groups;
}

function toMarkdown(items: ResultItem[]): string {
  const lines: string[] = ["# Janus adaptation checklist", ""];
  // Cross-screen patterns first: fix once, apply everywhere.
  if (items.length > 1) {
    const byCheck = new Map<
      string,
      { title: string; fix: string; screens: number }
    >();
    items.forEach((item) => {
      const seen = new Set<string>();
      for (const f of item.result?.findings ?? []) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const e = byCheck.get(f.id) ?? { title: f.title, fix: f.fix, screens: 0 };
        e.screens += 1;
        byCheck.set(f.id, e);
      }
    });
    const patterns = [...byCheck.values()]
      .filter((p) => p.screens >= 2)
      .sort((a, b) => b.screens - a.screens);
    if (patterns.length > 0) {
      lines.push("## Fix once, apply everywhere", "");
      for (const p of patterns) {
        lines.push(
          `- [ ] **${p.title}** — on ${p.screens} of ${items.length} screens: ${p.fix}`,
        );
      }
      lines.push("");
    }
  }
  items.forEach((item, i) => {
    const label = `Screenshot ${i + 1}`;
    lines.push(`## ${label} — ${item.fileName}`);
    if (item.status !== "done" || !item.result) {
      lines.push("", "_Analysis failed._", "");
      return;
    }
    const { result } = item;
    const meta = DIRECTION_META[result.direction];
    lines.push("", `_${meta.arrow}_`, "", result.summary, "");
    for (const group of groupByItem(result.findings)) {
      lines.push(`### ${group.name}`, "");
      for (const f of group.findings) {
        lines.push(`- [ ] **${f.title}**`);
        lines.push(`  - ${meta.sourcePatternLabel}: ${f.sourcePattern}`);
        lines.push(`  - ${meta.targetPatternLabel}: ${f.targetPattern}`);
        lines.push(`  - Why: ${f.rationale}`);
        if (f.unverified) {
          lines.push(
            `  - Note: community convention, not an explicit platform guideline${f.unverifiedNote ? ` — ${f.unverifiedNote}` : ""}`,
          );
        } else {
          for (const s of f.sources) {
            lines.push(`  - Source: [${s.label}](${s.url})`);
          }
        }
      }
      lines.push("");
    }
  });
  return lines.join("\n");
}

export default function ResultsScreen({
  items,
  onReset,
  onRetry,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [collapsedShots, setCollapsedShots] = useState<ReadonlySet<number>>(
    new Set(),
  );
  /** Shots whose annotated-screenshot accordion is open (closed by default). */
  const [openMaps, setOpenMaps] = useState<ReadonlySet<number>>(new Set());
  /** Findings the user collapsed, keyed `${shot}:${findingKey}`.
   *  Expanded by default (founder: don't default closed) — findings
   *  that arrive later are open too, since only closures are tracked. */
  const [closedFindings, setClosedFindings] = useState<ReadonlySet<string>>(
    new Set(),
  );
  /** Item groups the user collapsed, keyed `${shot}:${groupName}`.
   *  Groups are expanded by default too. Collapse uses the same house
   *  toggle as the screenshot sections (button + conditional render),
   *  NOT the Accordion component: a real accordion would nest the
   *  finding items inside another animated panel — the exact nesting
   *  whose borders GPU Chrome dropped. */
  const [closedGroups, setClosedGroups] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const toggleGroup = (shot: number, name: string) => {
    const key = `${shot}:${name}`;
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleShot = (shot: number) => {
    setCollapsedShots((prev) => {
      const next = new Set(prev);
      if (next.has(shot)) next.delete(shot);
      else next.add(shot);
      return next;
    });
  };

  const expandShot = (shot: number) => {
    setCollapsedShots((prev) => {
      if (!prev.has(shot)) return prev;
      const next = new Set(prev);
      next.delete(shot);
      return next;
    });
  };

  const flashHighlight = (shot: number, id: string) => {
    setHighlight({ shot, id });
    window.setTimeout(() => {
      setHighlight((cur) =>
        cur && cur.shot === shot && cur.id === id ? null : cur,
      );
    }, 1800);
  };

  const locateOnMap = (shot: number, id: string) => {
    flashHighlight(shot, id);
    // The annotated screenshot accordion is closed by default — open it.
    setOpenMaps((prev) => new Set(prev).add(shot));
    window.setTimeout(() => {
      document
        .getElementById(`map-${shot}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 30);
  };

  const jumpToFinding = (shot: number, id: string) => {
    expandShot(shot);
    flashHighlight(shot, id);
    // Reopen the finding's group first if the user collapsed it
    // (instant — the group toggle mounts content immediately).
    const result = items[shot]?.result;
    const group = result
      ? groupByItem(result.findings).find((g) =>
          g.findings.some((f) => f.key === id),
        )
      : undefined;
    let waited = false;
    if (group && closedGroups.has(`${shot}:${group.name}`)) {
      toggleGroup(shot, group.name);
      waited = true;
    }
    // If the user collapsed this finding, reopen it and give its
    // accordion time to expand before scrolling to it.
    const key = `${shot}:${id}`;
    if (closedFindings.has(key)) {
      setClosedFindings((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      window.setTimeout(() => {
        document
          .getElementById(`finding-${shot}-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return;
    }
    // Let the highlight apply (and a reopened group mount) before
    // scrolling into view.
    window.setTimeout(
      () => {
        document
          .getElementById(`finding-${shot}-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      waited ? 120 : 30,
    );
  };

  const jumpToScreenshot = (shot: number) => {
    document
      .getElementById(`shot-${shot}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(items));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context) — no-op, button stays.
    }
  };

  const totalFindings = items.reduce(
    (n, it) => n + (it.result?.findings.length ?? 0),
    0,
  );
  const doneItems = items.filter((it) => it.status === "done" && it.result);
  const screensNeedingWork = doneItems.filter(
    (it) => (it.result?.findings.length ?? 0) > 0,
  ).length;

  // Cross-screen patterns: checks appearing on 2+ screenshots. Fixing these
  // once (theme, design system) clears them everywhere — the real value of a
  // batch over N separate single-screen reports.
  const patterns = useMemo(() => {
    if (items.length < 2) return [];
    const byCheck = new Map<
      string,
      { id: string; title: string; fix: string; screens: Set<number> }
    >();
    items.forEach((item, si) => {
      for (const f of item.result?.findings ?? []) {
        const e = byCheck.get(f.id) ?? {
          id: f.id,
          title: f.title,
          fix: f.fix,
          screens: new Set<number>(),
        };
        e.screens.add(si);
        byCheck.set(f.id, e);
      }
    });
    return [...byCheck.values()]
      .filter((p) => p.screens.size >= 2)
      .sort((a, b) => b.screens.size - a.screens.size);
  }, [items]);

  const indexShots: IndexShot[] = items.map((item, i) => ({
    label: `Screenshot ${i + 1}`,
    fileName: item.fileName,
    ready: item.status === "done" && !!item.result,
    items:
      item.status === "done" && item.result
        ? groupByItem(item.result.findings).map((g) => ({
            name: g.name,
            findings: g.findings.map((f) => ({ id: f.key, title: f.title })),
          }))
        : [],
  }));

  return (
    <div className="flex items-start gap-6">
      <div className="mx-auto w-full max-w-3xl flex-1">
        {/* Summary header */}
        <Card>
          <CardContent>
          <p className="text-[15px] leading-relaxed text-foreground">
            <span className="font-semibold text-foreground">
              {totalFindings} {totalFindings === 1 ? "finding" : "findings"}
            </span>{" "}
            across {doneItems.length}{" "}
            {doneItems.length === 1 ? "screenshot" : "screenshots"}
            {screensNeedingWork === doneItems.length
              ? " — every one needs addressing for a native look."
              : screensNeedingWork === 0
                ? " — every screen already reads native."
                : ` — ${screensNeedingWork} of ${doneItems.length} screens need addressing; the rest already read native.`}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={copyChecklist}>
              {copied ? (
                <>
                  <Check aria-hidden="true" />
                  Copied to clipboard
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" />
                  Copy checklist
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>
              Analyze more
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Cross-screen patterns: fix once, apply everywhere */}
        {patterns.length > 0 && (
          <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fix once, apply everywhere</CardTitle>
              <CardDescription>
                These patterns repeat across your screens — handle them
                globally (theme, design system) instead of screen by screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <ItemGroup>
              {patterns.map((p) => (
                <Item key={p.id} variant="muted">
                  <ItemContent>
                    <ItemTitle>{p.title}</ItemTitle>
                    <p className="text-[13px] leading-relaxed text-foreground">
                      {p.fix}
                    </p>
                  </ItemContent>
                  <ItemActions>
                    <span className="text-xs font-medium text-primary">
                      {p.screens.size} of {items.length} screens
                    </span>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Per-screenshot sections */}
        {items.map((item, si) => {
          const label = `Screenshot ${si + 1}`;
          if (item.status === "analyzing") {
            return (
              <section key={label} id={`shot-${si}`} className="mt-8 scroll-mt-6">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {label}
                  <span className="ml-2 truncate text-sm font-normal text-muted-foreground">
                    {item.fileName}
                  </span>
                </h2>
                <div className="mt-3">
                <Card>
                  <CardContent>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Retrying analysis…
                  </p>
                  </CardContent>
                </Card>
                </div>
              </section>
            );
          }
          if (item.status !== "done" || !item.result) {
            return (
              <section key={label} id={`shot-${si}`} className="mt-8 scroll-mt-6">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {label}
                  <span className="ml-2 truncate text-sm font-normal text-muted-foreground">
                    {item.fileName}
                  </span>
                </h2>
                <div className="mt-3">
                <Alert variant="destructive">
                  <AlertDescription>
                    {item.error ?? "Analysis failed. Please try again."}
                  </AlertDescription>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => onRetry(si)}
                    >
                      Retry this screenshot
                    </Button>
                  </div>
                </Alert>
                </div>
              </section>
            );
          }

          const { result } = item;
          const direction: AnalysisDirection = result.direction;
          const meta = DIRECTION_META[direction];
          const groups = groupByItem(result.findings);

          // Stable 1..N numbering per screenshot: only findings pinned on the
          // screenshot get numbers (items top-down, in on-screen order, and the
          // item groups below follow the same order). General findings are
          // unnumbered — numbering what isn't highlighted would leave gaps.
          const numberByKey = new Map<string, number>();
          {
            let n = 0;
            for (const g of groups)
              for (const f of g.findings)
                if (f.region) numberByKey.set(f.key, ++n);
          }
          const markers: MapMarker[] = result.findings.flatMap((f) =>
            f.region
              ? [
                  {
                    key: f.key,
                    number: numberByKey.get(f.key) ?? 0,
                    region: f.region,
                    highlighted:
                      highlight?.shot === si && highlight.id === f.key,
                  },
                ]
              : [],
          );

          return (
            <section key={label} id={`shot-${si}`} className="mt-10 scroll-mt-6">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => toggleShot(si)}
                  aria-expanded={!collapsedShots.has(si)}
                  className="flex w-full flex-wrap items-center gap-3 text-left"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {label}
                  </h2>
                  <Badge>{meta.arrow}</Badge>
                  <span className="truncate text-sm text-muted-foreground">
                    {item.fileName}
                  </span>
                  <ChevronDown
                    className={`ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform ${collapsedShots.has(si) ? "" : "rotate-180"}`}
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {!collapsedShots.has(si) && (
                <>
              <p className="mb-6 text-[15px] leading-relaxed text-foreground">
                {result.summary}
              </p>

              {markers.length > 0 && (
                <div className="mb-8">
                <Card className="rounded-lg py-0">
                  <CardContent className="px-3.5">
                <Accordion
                  value={openMaps.has(si) ? ["map"] : []}
                  onValueChange={(v) =>
                    setOpenMaps((prev) => {
                      const next = new Set(prev);
                      if ((v as string[]).includes("map")) next.add(si);
                      else next.delete(si);
                      return next;
                    })
                  }
                >
                  <AccordionItem
                    value="map"
                    id={`map-${si}`}
                    className="scroll-mt-6"
                  >
                    <AccordionTrigger>
                      <span>
                        Annotated screenshot
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {markers.length}{" "}
                          {markers.length === 1 ? "pin" : "pins"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScreenshotMap
                        imageUrl={item.imageUrl}
                        markers={markers}
                        onSelectMarker={(id) => jumpToFinding(si, id)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                  </CardContent>
                </Card>
                </div>
              )}

              {groups.length === 0 && (
                <Card>
                  <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No adaptation issues found — this screen already reads
                    native on {meta.targetShort}.
                  </p>
                  </CardContent>
                </Card>
              )}

              {groups.length > 0 && (
                <div className="mb-8 space-y-8">
                  {groups.map((group) => (
                    <section key={group.name} aria-label={group.name}>
                      <h3 className="text-sm font-medium text-foreground">
                        <button
                          type="button"
                          onClick={() => toggleGroup(si, group.name)}
                          aria-expanded={!closedGroups.has(`${si}:${group.name}`)}
                          className="flex w-full items-center text-left"
                        >
                          {group.name}
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            {group.findings.length}
                          </span>
                          <ChevronDown
                            className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${closedGroups.has(`${si}:${group.name}`) ? "" : "rotate-180"}`}
                            aria-hidden="true"
                          />
                        </button>
                      </h3>
                      {!closedGroups.has(`${si}:${group.name}`) && (
                        <>
                          <Separator className="mt-2" />
                      <Accordion
                        multiple
                        className="mt-2.5 gap-2.5"
                        value={group.findings
                          .filter((f) => !closedFindings.has(`${si}:${f.key}`))
                          .map((f) => f.key)}
                        onValueChange={(v) => {
                          const open = new Set(v as string[]);
                          setClosedFindings((prev) => {
                            const next = new Set(prev);
                            for (const f of group.findings) {
                              const k = `${si}:${f.key}`;
                              if (open.has(f.key)) next.delete(k);
                              else next.add(k);
                            }
                            return next;
                          });
                        }}
                      >
                          {group.findings.map((f) => (
                            <div
                              key={f.key}
                              id={`finding-${si}-${f.key}`}
                              className={`scroll-mt-6 rounded-xl ${
                                highlight?.shot === si &&
                                highlight.id === f.key
                                  ? "ring-2 ring-ring"
                                  : ""
                              }`}
                            >
                              <FindingCard
                                finding={f}
                                direction={direction}
                                number={numberByKey.get(f.key)}
                                imageUrl={item.imageUrl}
                                onLocate={
                                  f.region
                                    ? () => locateOnMap(si, f.key)
                                    : null
                                }
                              />
                            </div>
                          ))}
                      </Accordion>
                        </>
                      )}
                    </section>
                  ))}
                </div>
              )}
                </>
              )}
            </section>
          );
        })}
      </div>

      <ContentIndex
        shots={indexShots}
        onJump={(si, id) => jumpToFinding(si, id)}
        onJumpToShot={jumpToScreenshot}
      />
    </div>
  );
}
