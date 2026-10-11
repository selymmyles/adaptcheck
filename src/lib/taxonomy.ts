/**
 * Bidirectional iOS ⇄ Android adaptation taxonomy.
 *
 * Structured encoding of the design differences a designer must address when
 * porting a screen between iOS (Apple HIG) and Android (Material Design 3).
 * Every check carries a `direction`: the platform the screenshot comes FROM.
 * Check ids are stable and shared with the backend analysis engine — the
 * original 19 `ios-to-android` ids are unchanged; the mirrored set uses the
 * `a2i-` prefix.
 *
 * This file is pure data — the worker builds its analysis prompt from it, so
 * keep ids stable once shipped.
 */

export type Severity = "must" | "should" | "nice";

/** A conversion direction: the platform the source screenshot comes FROM. */
export type AnalysisDirection = "ios-to-android" | "android-to-ios";

/** What the frontend may request: an explicit direction, or auto-detect. */
export type DirectionRequest = AnalysisDirection | "auto";

export interface TaxonomyCheck {
  /** Stable id — shared with the backend analysis engine. Do not rename. */
  id: string;
  /** Short imperative name of the check, shown in UI. */
  check: string;
  /** Which conversion this check belongs to. */
  direction: AnalysisDirection;
  /** The pattern as it appears in the source platform's screenshot. */
  sourcePattern: string;
  /** What it must become on the target platform. */
  targetPattern: string;
  rationale: string;
  defaultSeverity: Severity;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  checks: TaxonomyCheck[];
}

export interface DirectionMeta {
  /** "iOS → Android" — shown in result headers. */
  arrow: string;
  /** Short source platform name: "iOS". */
  sourceShort: string;
  /** Short target platform name: "Android". */
  targetShort: string;
  /** "iOS pattern" — label for the source-pattern box. */
  sourcePatternLabel: string;
  /** "Android · Material 3" — label for the target-pattern box. */
  targetPatternLabel: string;
  /** Full source design system name, for prompts. */
  sourceSystem: string;
  /** Full target design system name, for prompts. */
  targetSystem: string;
  /** Severity-group blurb for "must". */
  brokenBlurb: string;
  /** Severity-group blurb for "should". */
  portedBlurb: string;
}

export const DIRECTION_META: Record<AnalysisDirection, DirectionMeta> = {
  "ios-to-android": {
    arrow: "iOS → Android",
    sourceShort: "iOS",
    targetShort: "Android",
    sourcePatternLabel: "iOS pattern",
    targetPatternLabel: "Android · Material 3",
    sourceSystem: "Apple's Human Interface Guidelines (HIG)",
    targetSystem: "Material Design 3",
    brokenBlurb: "Reads as broken on Android — address before shipping.",
    portedBlurb:
      "Clearly ported from iOS — worth addressing for a native feel.",
  },
  "android-to-ios": {
    arrow: "Android → iOS",
    sourceShort: "Android",
    targetShort: "iOS",
    sourcePatternLabel: "Android pattern",
    targetPatternLabel: "iOS · HIG",
    sourceSystem: "Material Design 3",
    targetSystem: "Apple's Human Interface Guidelines (HIG)",
    brokenBlurb: "Reads as broken on iOS — address before shipping.",
    portedBlurb:
      "Clearly ported from Android — worth addressing for a native feel.",
  },
};

export const TAXONOMY: TaxonomyCategory[] = [
  {
    id: "navigation",
    name: "Navigation",
    checks: [
      {
        id: "nav-back-behavior",
        check: "Back gesture and behavior",
        direction: "ios-to-android",
        sourcePattern:
          "Edge-swipe from the left plus an in-app back chevron; interactive pop transition tied to the gesture.",
        targetPattern:
          "System predictive back (Android 14+) that previews the previous destination; back applies to the whole task stack.",
        rationale:
          "Android users rely on the system back affordance. Duplicating an in-app chevron on every screen creates conflicting navigation and breaks predictive-back previews.",
        defaultSeverity: "must",
      },
      {
        id: "nav-tab-bar",
        check: "Bottom tab bar styling",
        direction: "ios-to-android",
        sourcePattern:
          "Translucent bottom tab bar, icon above label, no selection container.",
        targetPattern:
          "Material navigation bar on a tonal surface container with an active-indicator pill behind the selected icon.",
        rationale:
          "An iOS-styled tab bar reads as a port. The active-indicator pill is the platform signal for selection on Android.",
        defaultSeverity: "should",
      },
      {
        id: "nav-large-titles",
        check: "Large collapsing titles",
        direction: "ios-to-android",
        sourcePattern:
          "Large title that collapses into the navigation bar on scroll.",
        targetPattern:
          "Material top app bar with a scroll behavior (small, center-aligned, medium, or large) matched to the screen's hierarchy.",
        rationale:
          "iOS large titles don't collapse the Material way. A medium or large top app bar gives the same hierarchy without looking ported.",
        defaultSeverity: "should",
      },
      {
        id: "nav-modal",
        check: "Modal presentation and dismissal",
        direction: "ios-to-android",
        sourcePattern:
          "Card-style modal that slides up and dismisses with a swipe-down gesture.",
        targetPattern:
          "Modal bottom sheet with a drag handle and scrim, or a full-screen dialog for complex flows.",
        rationale:
          "Swipe-to-dismiss cards don't exist in Material. Bottom sheets with drag handles are the expected dismiss gesture on Android.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-nav-back",
        check: "Back behavior: system back → explicit chevron",
        direction: "android-to-ios",
        sourcePattern:
          "System back gesture or button; predictive back preview on Android 14+. Screens often ship with no in-app back affordance at all.",
        targetPattern:
          "Explicit back chevron in the navigation bar on every pushed screen, plus iOS edge-swipe-to-go-back. There is no system back to fall back on.",
        rationale:
          "Android-first designs frequently omit back affordances entirely. On iOS that strands the user — every pushed screen needs its own chevron.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-nav-drawer",
        check: "Navigation drawer → tab bar",
        direction: "android-to-ios",
        sourcePattern:
          "Modal navigation drawer opened from a hamburger icon, listing every destination.",
        targetPattern:
          "Tab bar with up to 5 primary destinations; overflow goes to a More tab. HIG has no drawer convention.",
        rationale:
          "Drawers don't exist in iOS conventions — iOS users won't look behind a hamburger. Promote destinations to a tab bar.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-nav-tabs",
        check: "Material tab row → segmented control",
        direction: "android-to-ios",
        sourcePattern:
          "Material tab row with an underline indicator on the active tab, scrollable or fixed.",
        targetPattern:
          "Segmented control for switching views within a screen. iOS has no underline-indicator tab convention.",
        rationale:
          "The Material indicator tab reads as Android. iOS uses segmented controls for in-screen view switching.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-nav-bottombar",
        check: "Bottom navigation bar styling",
        direction: "android-to-ios",
        sourcePattern:
          "Material navigation bar on a tonal container with an active-indicator pill behind the selected icon.",
        targetPattern:
          "iOS tab bar: translucent, icon above label, selection shown by tint only — no pill, no tonal container.",
        rationale:
          "The active-indicator pill is a Material signal. iOS selection is tint-only on a translucent bar.",
        defaultSeverity: "should",
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
        direction: "ios-to-android",
        sourcePattern: "SF Pro / SF Pro Rounded as the system typeface.",
        targetPattern: "Roboto, or the brand font with a proper Android license.",
        rationale:
          "SF Pro is not licensed for Android. Ship Roboto or re-license the brand font — silent fallback to Roboto looks broken.",
        defaultSeverity: "must",
      },
      {
        id: "type-scale",
        check: "Type scale roles",
        direction: "ios-to-android",
        sourcePattern:
          "iOS text styles (large title, title 1–3, headline, body, callout, footnote).",
        targetPattern:
          "Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).",
        rationale:
          "Mapping sizes by eye produces inconsistent hierarchy. Re-mapping to Material roles keeps text, spacing, and accessibility scaling coherent.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-type-font",
        check: "System font swap (Roboto → SF)",
        direction: "android-to-ios",
        sourcePattern: "Roboto as the system typeface.",
        targetPattern:
          "SF Pro for UI text, SF Pro Text at small sizes; adopt HIG text styles throughout.",
        rationale:
          "Roboto on iOS is an instant port signal. SF is expected, free, and tuned for Apple text rendering.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-type-scale",
        check: "Type scale roles",
        direction: "android-to-ios",
        sourcePattern:
          "Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).",
        targetPattern:
          "HIG text styles (large title, title 1–3, headline, body, callout, subheadline, footnote, caption).",
        rationale:
          "Material roles don't map 1:1 to HIG styles. Re-mapping keeps hierarchy, spacing, and Dynamic Type scaling coherent.",
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
        direction: "ios-to-android",
        sourcePattern: "Centered alert with vertically stacked action buttons.",
        targetPattern:
          "Material dialog: tonal container, title and body, actions as right-aligned text buttons.",
        rationale:
          "iOS-style stacked-button alerts are an instant 'ported' signal. Material dialogs use text-button actions aligned to the trailing edge.",
        defaultSeverity: "should",
      },
      {
        id: "comp-action-sheet",
        check: "Action sheets",
        direction: "ios-to-android",
        sourcePattern:
          "iOS action sheet sliding up from the bottom with a cancel row.",
        targetPattern:
          "Modal bottom sheet: list of options, drag handle, scrim; no separate cancel row needed.",
        rationale:
          "Action sheets map almost 1:1 to bottom sheets — keep the option list, restyle the container and drop the iOS cancel pattern.",
        defaultSeverity: "should",
      },
      {
        id: "comp-fab",
        check: "Floating action button",
        direction: "ios-to-android",
        sourcePattern:
          "No iOS equivalent — commonly added as a floating circular button.",
        targetPattern:
          "Material FAB: bottom-trailing, 16dp margins, above the navigation bar, carrying the single primary action; correct elevation and size variant.",
        rationale:
          "Adding a FAB is fine, but it must follow Material placement, elevation, and size rules — not float like an iOS overlay.",
        defaultSeverity: "nice",
      },
      {
        id: "comp-segmented",
        check: "Steppers and segmented controls",
        direction: "ios-to-android",
        sourcePattern: "iOS stepper and segmented control (pill-in-track look).",
        targetPattern:
          "Material segmented buttons: individually outlined buttons in single-select or multi-select configuration.",
        rationale:
          "The iOS pill-in-track segmented control has a distinct look; Material segmented buttons are outlined per-button and behave differently in multi-select.",
        defaultSeverity: "nice",
      },
      {
        id: "comp-date-picker",
        check: "Date pickers",
        direction: "ios-to-android",
        sourcePattern: "Spinner wheels (date/time drums).",
        targetPattern:
          "Material calendar date picker, or the input date picker for compact forms.",
        rationale:
          "Spinner wheels are the strongest 'ported from iOS' signal in forms. Switch to the calendar picker users expect.",
        defaultSeverity: "must",
      },
      {
        id: "comp-switch",
        check: "Switches",
        direction: "ios-to-android",
        sourcePattern: "iOS switch: pill track, circular thumb, green on-state.",
        targetPattern:
          "Material switch: 52×32dp, track with optional on/off icons, thumb with correct elevation.",
        rationale:
          "Close cousins, but the Material switch has distinct track styling and optional state icons — restyle to avoid the iOS look.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-comp-fab",
        check: "Floating action button → promoted action",
        direction: "android-to-ios",
        sourcePattern:
          "FAB: bottom-trailing circular button carrying the screen's primary action, with Material elevation.",
        targetPattern:
          "No FAB convention on iOS — promote the action to a navigation-bar button, toolbar item, or a primary button in content.",
        rationale:
          "A floating circle on iOS looks alien; HIG has no FAB. The action must live in the nav bar, toolbar, or content — not float over it.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-comp-dynamic-color",
        check: "Material You dynamic color → fixed palette",
        direction: "android-to-ios",
        sourcePattern:
          "Dynamic color: palette generated from the user's wallpaper at runtime (seed → tonal palettes).",
        targetPattern:
          "Fixed light/dark palettes with semantic colors resolved at design time. No runtime palette generation on iOS.",
        rationale:
          "Dynamic color doesn't exist on iOS. Designs that depend on it need a resolved static palette or they'll ship unstyled.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-comp-dialog",
        check: "Material dialogs → alerts and action sheets",
        direction: "android-to-ios",
        sourcePattern:
          "Material dialog: tonal container, title and body, actions as trailing text buttons.",
        targetPattern:
          "iOS alert: centered, with stacked (or side-by-side for two) action buttons; option lists become action sheets.",
        rationale:
          "Trailing text-button dialogs read as Android. iOS alerts stack their actions; lists of options belong in action sheets.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-comp-cards",
        check: "Elevated cards → grouped backgrounds",
        direction: "android-to-ios",
        sourcePattern:
          "Elevated cards with tonal surface colors and shadows to communicate hierarchy.",
        targetPattern:
          "Flat grouped backgrounds with hairline separators. iOS uses minimal elevation — hierarchy comes from grouping, not shadow depth.",
        rationale:
          "Material's elevation language doesn't translate. HIG builds hierarchy with grouped backgrounds and separators, not shadows.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-comp-switch",
        check: "Switches, checkboxes, and ripples",
        direction: "android-to-ios",
        sourcePattern:
          "Material switch (52×32dp), Material checkboxes, and ripple touch feedback on pressables.",
        targetPattern:
          "iOS switch: pill track, circular thumb, green on-state; iOS selection styling; pressed-state opacity instead of ripples.",
        rationale:
          "Ripples don't exist on iOS — they're the subtlest port signal. Swap to the iOS switch and replace ripples with highlight/opacity feedback.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-comp-snackbar",
        check: "Snackbar → iOS transient feedback",
        direction: "android-to-ios",
        sourcePattern:
          "Snackbar: transient bottom message above the navigation bar, often with an action.",
        targetPattern:
          "No snackbar on iOS — use in-content banners, or minimal transient feedback that doesn't mimic a bottom bar.",
        rationale:
          "The bottom snackbar is a Material idiom. iOS has no equivalent; forcing one in reads as a port.",
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
        direction: "ios-to-android",
        sourcePattern: "44×44pt minimum touch targets.",
        targetPattern: "48×48dp minimum touch targets.",
        rationale:
          "44pt controls fail Android accessibility scanners and feel cramped on denser Android displays. Bump interactive targets to 48dp.",
        defaultSeverity: "must",
      },
      {
        id: "layout-safe-area",
        check: "Safe area vs edge-to-edge",
        direction: "ios-to-android",
        sourcePattern:
          "Content inset to the iOS safe area, letterboxed below the home indicator.",
        targetPattern:
          "Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts.",
        rationale:
          "iOS-style letterboxing wastes screen on Android. Go edge-to-edge and handle insets per-component instead of padding the whole screen.",
        defaultSeverity: "should",
      },
      {
        id: "layout-status-bar",
        check: "Status and navigation bar treatment",
        direction: "ios-to-android",
        sourcePattern: "Opaque status bar background matched to the nav bar.",
        targetPattern:
          "Transparent status bar over edge-to-edge content with light/dark icon control via WindowInsetsController.",
        rationale:
          "Hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-touch-targets",
        check: "Touch target size (48dp → 44pt)",
        direction: "android-to-ios",
        sourcePattern: "48×48dp minimum touch targets.",
        targetPattern: "44×44pt minimum touch targets on iOS.",
        rationale:
          "Going down in size is usually safe, but verify nothing lands below 44pt — and don't just scale everything down; re-check spacing and rhythm.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-layout-edge",
        check: "Edge-to-edge → safe area",
        direction: "android-to-ios",
        sourcePattern:
          "Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts.",
        targetPattern:
          "Respect the iOS safe area — content inset below the notch/Dynamic Island and above the home indicator. Letterboxing here is correct, not wasteful.",
        rationale:
          "On Android, letterboxing wastes screen; on iOS the safe area is the convention. Don't bleed content into the notch or the home indicator.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-layout-statusbar",
        check: "Status bar treatment",
        direction: "android-to-ios",
        sourcePattern:
          "Transparent status bar over edge-to-edge content, icon colors controlled via WindowInsetsController.",
        targetPattern:
          "iOS status bar style set per screen (.default / .lightContent). No transparency games — the system manages it.",
        rationale:
          "Android's programmatic status-bar control has no iOS equivalent. Set the style per screen and let the system handle the rest.",
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
        direction: "ios-to-android",
        sourcePattern: "Push/pop with spring curves tied to the swipe-back gesture.",
        targetPattern:
          "Material emphasized easing with container transform, fade-through, or shared-axis transitions matched to the navigation relationship.",
        rationale:
          "iOS springs feel wrong on Android. Pick the Material transition that matches the relationship (container transform for cards, shared axis for lateral moves).",
        defaultSeverity: "should",
      },
      {
        id: "motion-duration",
        check: "Duration and easing tokens",
        direction: "ios-to-android",
        sourcePattern: "iOS default durations and spring damping tuned by feel.",
        targetPattern:
          "Material motion tokens: short/medium/long durations with standard and emphasized easing curves.",
        rationale:
          "A shared motion token system keeps transitions consistent across the app and feeling native to the platform.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-motion-transitions",
        check: "Material transitions → iOS navigation motion",
        direction: "android-to-ios",
        sourcePattern:
          "Material emphasized easing with container transform, fade-through, or shared-axis transitions.",
        targetPattern:
          "iOS push/pop with ease-in-out and the interactive swipe-back gesture; modals slide up as sheets.",
        rationale:
          "Material transitions feel technical on iOS. Match the iOS navigation model: horizontal push/pop between peers, sheets from the bottom.",
        defaultSeverity: "should",
      },
      {
        id: "a2i-motion-tokens",
        check: "Motion tokens → iOS animation curves",
        direction: "android-to-ios",
        sourcePattern:
          "Material motion tokens: short/medium/long durations with standard and emphasized easing.",
        targetPattern:
          "UIView animation curves (ease-in-out, spring with damping and velocity). iOS has no shared token system by default — define one.",
        rationale:
          "Port the token discipline, not the token values. iOS springs and easing have a different feel than Material emphasized curves.",
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
        direction: "ios-to-android",
        sourcePattern: "SF Symbols with Apple-defined weights and variants.",
        targetPattern:
          "Material Symbols: outlined and filled variants, optical sizes, and weights chosen per usage.",
        rationale:
          "SF Symbols are Apple-licensed and unavailable on Android. Replace with Material Symbols, using filled vs outlined to signal active state.",
        defaultSeverity: "must",
      },
      {
        id: "icon-tab-sizing",
        check: "Tab icon sizing and feedback",
        direction: "ios-to-android",
        sourcePattern:
          "iOS tab-bar icons sized to Apple's metrics, selection shown by tint only.",
        targetPattern:
          "Material icons with state layers providing touch feedback and the active-indicator pill for selection.",
        rationale:
          "Selection feedback differs between platforms — add state layers so pressed and selected states read correctly on Android.",
        defaultSeverity: "nice",
      },
      {
        id: "a2i-icon-symbols",
        check: "Icon set (Material Symbols → SF Symbols)",
        direction: "android-to-ios",
        sourcePattern:
          "Material Symbols: outlined and filled variants, optical sizes, weights chosen per usage.",
        targetPattern:
          "SF Symbols with Apple-defined weights and variants; match the symbol weight to the surrounding text style.",
        rationale:
          "Material Symbols on iOS are an instant port signal. SF Symbols are free and render correctly at every Apple-defined weight.",
        defaultSeverity: "must",
      },
      {
        id: "a2i-icon-adaptive",
        check: "Adaptive icons → squircle",
        direction: "android-to-ios",
        sourcePattern:
          "Adaptive icon: foreground/background layers masked by the OEM (circle, squircle, teardrop, …).",
        targetPattern:
          "Single squircle asset with continuous corners. iOS applies its own mask — there are no shape variants to design.",
        rationale:
          "Android's adaptive-icon system has no iOS equivalent. Ship one proper squircle; don't reuse an asset masked for a Pixel.",
        defaultSeverity: "should",
      },
    ],
  },
];

/** Flat lookup of every check by id (both directions). */
export const CHECKS_BY_ID: Record<string, TaxonomyCheck> = Object.fromEntries(
  TAXONOMY.flatMap((category) =>
    category.checks.map((check) => [check.id, check]),
  ),
);

/** Category name lookup by check id (both directions). */
export const CATEGORY_BY_CHECK_ID: Record<string, string> = Object.fromEntries(
  TAXONOMY.flatMap((category) =>
    category.checks.map((check) => [check.id, category.name]),
  ),
);

/** Per-direction flat lookup of checks by id. */
export const CHECKS_BY_DIRECTION: Record<
  AnalysisDirection,
  Record<string, TaxonomyCheck>
> = {
  "ios-to-android": Object.fromEntries(
    TAXONOMY.flatMap((category) =>
      category.checks
        .filter((check) => check.direction === "ios-to-android")
        .map((check) => [check.id, check]),
    ),
  ),
  "android-to-ios": Object.fromEntries(
    TAXONOMY.flatMap((category) =>
      category.checks
        .filter((check) => check.direction === "android-to-ios")
        .map((check) => [check.id, check]),
    ),
  ),
};

/** Direction lookup by check id. */
export const DIRECTION_BY_CHECK_ID: Record<string, AnalysisDirection> =
  Object.fromEntries(
    TAXONOMY.flatMap((category) =>
      category.checks.map((check) => [check.id, check.direction]),
    ),
  );

/** Categories filtered to one direction's checks (shared 6-category shape). */
export function taxonomyFor(direction: AnalysisDirection): TaxonomyCategory[] {
  return TAXONOMY.map((category) => ({
    ...category,
    checks: category.checks.filter((check) => check.direction === direction),
  })).filter((category) => category.checks.length > 0);
}
