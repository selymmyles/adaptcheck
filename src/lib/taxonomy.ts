/**
 * iOS → Material 3 adaptation taxonomy.
 *
 * Structured encoding of the design differences a designer must address when
 * porting an iOS screen to Android. Each check captures the iOS pattern, the
 * Material 3 equivalent, why the change matters, and a default severity used
 * when the analysis engine has no stronger signal.
 *
 * This file is pure data — the future analysis backend will reference the same
 * check ids, so keep ids stable once the backend exists.
 */

export type Severity = "must" | "should" | "nice";

export interface TaxonomyCheck {
  /** Stable id — shared with the backend analysis engine. Do not rename. */
  id: string;
  /** Short imperative name of the check, shown in UI. */
  check: string;
  iosPattern: string;
  androidPattern: string;
  rationale: string;
  defaultSeverity: Severity;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  checks: TaxonomyCheck[];
}

export const TAXONOMY: TaxonomyCategory[] = [
  {
    id: "navigation",
    name: "Navigation",
    checks: [
      {
        id: "nav-back-behavior",
        check: "Back gesture and behavior",
        iosPattern:
          "Edge-swipe from the left plus an in-app back chevron; interactive pop transition tied to the gesture.",
        androidPattern:
          "System predictive back (Android 14+) that previews the previous destination; back applies to the whole task stack.",
        rationale:
          "Android users rely on the system back affordance. Duplicating an in-app chevron on every screen creates conflicting navigation and breaks predictive-back previews.",
        defaultSeverity: "must",
      },
      {
        id: "nav-tab-bar",
        check: "Bottom tab bar styling",
        iosPattern:
          "Translucent bottom tab bar, icon above label, no selection container.",
        androidPattern:
          "Material navigation bar on a tonal surface container with an active-indicator pill behind the selected icon.",
        rationale:
          "An iOS-styled tab bar reads as a port. The active-indicator pill is the platform signal for selection on Android.",
        defaultSeverity: "should",
      },
      {
        id: "nav-large-titles",
        check: "Large collapsing titles",
        iosPattern:
          "Large title that collapses into the navigation bar on scroll.",
        androidPattern:
          "Material top app bar with a scroll behavior (small, center-aligned, medium, or large) matched to the screen's hierarchy.",
        rationale:
          "iOS large titles don't collapse the Material way. A medium or large top app bar gives the same hierarchy without looking ported.",
        defaultSeverity: "should",
      },
      {
        id: "nav-modal",
        check: "Modal presentation and dismissal",
        iosPattern:
          "Card-style modal that slides up and dismisses with a swipe-down gesture.",
        androidPattern:
          "Modal bottom sheet with a drag handle and scrim, or a full-screen dialog for complex flows.",
        rationale:
          "Swipe-to-dismiss cards don't exist in Material. Bottom sheets with drag handles are the expected dismiss gesture on Android.",
        defaultSeverity: "must",
      },
    ],
  },
  {
    id: "typography",
    name: "Typography",
    checks: [
      {
        id: "type-font",
        check: "System font swap (SF Pro)",
        iosPattern: "SF Pro / SF Pro Rounded as the system typeface.",
        androidPattern:
          "Roboto, or the brand font with a proper Android license.",
        rationale:
          "SF Pro is not licensed for Android. Ship Roboto or re-license the brand font — silent fallback to Roboto looks broken.",
        defaultSeverity: "must",
      },
      {
        id: "type-scale",
        check: "Type scale roles",
        iosPattern: "iOS text styles (large title, title 1–3, headline, body, callout, footnote).",
        androidPattern:
          "Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).",
        rationale:
          "Mapping sizes by eye produces inconsistent hierarchy. Re-mapping to Material roles keeps text, spacing, and accessibility scaling coherent.",
        defaultSeverity: "should",
      },
    ],
  },
  {
    id: "components",
    name: "Components",
    checks: [
      {
        id: "comp-alert",
        check: "Alerts",
        iosPattern: "Centered alert with vertically stacked action buttons.",
        androidPattern:
          "Material dialog: tonal container, title and body, actions as right-aligned text buttons.",
        rationale:
          "iOS-style stacked-button alerts are an instant 'ported' signal. Material dialogs use text-button actions aligned to the trailing edge.",
        defaultSeverity: "should",
      },
      {
        id: "comp-action-sheet",
        check: "Action sheets",
        iosPattern: "iOS action sheet sliding up from the bottom with a cancel row.",
        androidPattern:
          "Modal bottom sheet: list of options, drag handle, scrim; no separate cancel row needed.",
        rationale:
          "Action sheets map almost 1:1 to bottom sheets — keep the option list, restyle the container and drop the iOS cancel pattern.",
        defaultSeverity: "should",
      },
      {
        id: "comp-fab",
        check: "Floating action button",
        iosPattern: "No iOS equivalent — commonly added as a floating circular button.",
        androidPattern:
          "Material FAB: bottom-trailing, 16dp margins, above the navigation bar, carrying the single primary action; correct elevation and size variant.",
        rationale:
          "Adding a FAB is fine, but it must follow Material placement, elevation, and size rules — not float like an iOS overlay.",
        defaultSeverity: "nice",
      },
      {
        id: "comp-segmented",
        check: "Steppers and segmented controls",
        iosPattern: "iOS stepper and segmented control (pill-in-track look).",
        androidPattern:
          "Material segmented buttons: individually outlined buttons in single-select or multi-select configuration.",
        rationale:
          "The iOS pill-in-track segmented control has a distinct look; Material segmented buttons are outlined per-button and behave differently in multi-select.",
        defaultSeverity: "nice",
      },
      {
        id: "comp-date-picker",
        check: "Date pickers",
        iosPattern: "Spinner wheels (date/time drums).",
        androidPattern:
          "Material calendar date picker, or the input date picker for compact forms.",
        rationale:
          "Spinner wheels are the strongest 'ported from iOS' signal in forms. Switch to the calendar picker users expect.",
        defaultSeverity: "must",
      },
      {
        id: "comp-switch",
        check: "Switches",
        iosPattern: "iOS switch: pill track, circular thumb, green on-state.",
        androidPattern:
          "Material switch: 52×32dp, track with optional on/off icons, thumb with correct elevation.",
        rationale:
          "Close cousins, but the Material switch has distinct track styling and optional state icons — restyle to avoid the iOS look.",
        defaultSeverity: "nice",
      },
    ],
  },
  {
    id: "touch-layout",
    name: "Touch targets & layout",
    checks: [
      {
        id: "touch-targets",
        check: "Minimum touch target size",
        iosPattern: "44×44pt minimum touch targets.",
        androidPattern: "48×48dp minimum touch targets.",
        rationale:
          "44pt controls fail Android accessibility scanners and feel cramped on denser Android displays. Bump interactive targets to 48dp.",
        defaultSeverity: "must",
      },
      {
        id: "layout-safe-area",
        check: "Safe area vs edge-to-edge",
        iosPattern: "Content inset to the iOS safe area, letterboxed below the home indicator.",
        androidPattern:
          "Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts.",
        rationale:
          "iOS-style letterboxing wastes screen on Android. Go edge-to-edge and handle insets per-component instead of padding the whole screen.",
        defaultSeverity: "should",
      },
      {
        id: "layout-status-bar",
        check: "Status and navigation bar treatment",
        iosPattern: "Opaque status bar background matched to the nav bar.",
        androidPattern:
          "Transparent status bar over edge-to-edge content with light/dark icon control via WindowInsetsController.",
        rationale:
          "Hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.",
        defaultSeverity: "nice",
      },
    ],
  },
  {
    id: "motion",
    name: "Motion",
    checks: [
      {
        id: "motion-transitions",
        check: "Screen transition patterns",
        iosPattern: "Push/pop with spring curves tied to the swipe-back gesture.",
        androidPattern:
          "Material emphasized easing with container transform, fade-through, or shared-axis transitions matched to the navigation relationship.",
        rationale:
          "iOS springs feel wrong on Android. Pick the Material transition that matches the relationship (container transform for cards, shared axis for lateral moves).",
        defaultSeverity: "should",
      },
      {
        id: "motion-duration",
        check: "Duration and easing tokens",
        iosPattern: "iOS default durations and spring damping tuned by feel.",
        androidPattern:
          "Material motion tokens: short/medium/long durations with standard and emphasized easing curves.",
        rationale:
          "A shared motion token system keeps transitions consistent across the app and feeling native to the platform.",
        defaultSeverity: "nice",
      },
    ],
  },
  {
    id: "iconography",
    name: "Iconography",
    checks: [
      {
        id: "icon-symbols",
        check: "Icon set (SF Symbols)",
        iosPattern: "SF Symbols with Apple-defined weights and variants.",
        androidPattern:
          "Material Symbols: outlined and filled variants, optical sizes, and weights chosen per usage.",
        rationale:
          "SF Symbols are Apple-licensed and unavailable on Android. Replace with Material Symbols, using filled vs outlined to signal active state.",
        defaultSeverity: "must",
      },
      {
        id: "icon-tab-sizing",
        check: "Tab icon sizing and feedback",
        iosPattern: "iOS tab-bar icons sized to Apple's metrics, selection shown by tint only.",
        androidPattern:
          "Material icons with state layers providing touch feedback and the active-indicator pill for selection.",
        rationale:
          "Selection feedback differs between platforms — add state layers so pressed and selected states read correctly on Android.",
        defaultSeverity: "nice",
      },
    ],
  },
];

/** Flat lookup of every check by id. */
export const CHECKS_BY_ID: Record<string, TaxonomyCheck> = Object.fromEntries(
  TAXONOMY.flatMap((category) =>
    category.checks.map((check) => [check.id, check]),
  ),
);

/** Category name lookup by check id. */
export const CATEGORY_BY_CHECK_ID: Record<string, string> = Object.fromEntries(
  TAXONOMY.flatMap((category) =>
    category.checks.map((check) => [check.id, category.name]),
  ),
);
