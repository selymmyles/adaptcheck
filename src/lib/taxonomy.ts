/**
 * Bidirectional iOS ⇄ Android adaptation taxonomy.
 *
 * Structured encoding of the design differences a designer must address when
 * porting a screen between iOS (Apple HIG) and Android (Material Design 3).
 * Every check carries a `direction`: the platform the screenshot comes FROM.
 * Check ids are stable and shared with the backend analysis engine — the
 * original 23 `ios-to-android` ids and 23 `android-to-ios` ids (46 total); the mirrored set uses the
 * `a2i-` prefix. Every check carries official-doc `sources`; see the grounding notes.
 *
 * Every finding is required — Janus means "look native", so there are no
 * severity tiers. Findings are grouped by category in taxonomy order.
 *
 * This file is pure data — the worker builds its analysis prompt from it, so
 * keep ids stable once shipped.
 */

/** A conversion direction: the platform the source screenshot comes FROM. */
export type AnalysisDirection = "ios-to-android" | "android-to-ios";

/** What the frontend may request: an explicit direction, or auto-detect. */
export type DirectionRequest = AnalysisDirection | "auto";

/** An official-documentation citation grounding a check. */
export interface TaxonomySource {
  label: string;
  url: string;
}

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
  /** One-line fix in plain language: Change X to Y. Shown as the FIX line. */
  fix: string;
  /** Official-doc citations (Apple HIG / Material 3 / Android docs). */
  sources: TaxonomySource[];
  /**
   * True when the check cannot be grounded in official docs — a community
   * convention rather than a documented guideline. Shown as such in the UI.
   */
  unverified?: boolean;
  /** One-line note explaining why the check is unverified. */
  unverifiedNote?: string;
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
  /** Display label for the source platform box: "iOS 26" / "Material 3". */
  sourcePlatform: string;
  /** Display label for the target platform box: "Material 3" / "iOS 26". */
  targetPlatform: string;
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
    sourcePlatform: "iOS 26",
    targetPlatform: "Material 3",
  },
  "android-to-ios": {
    arrow: "Android → iOS",
    sourceShort: "Android",
    targetShort: "iOS",
    sourcePatternLabel: "Android pattern",
    targetPatternLabel: "iOS · HIG",
    sourceSystem: "Material Design 3",
    targetSystem: "Apple's Human Interface Guidelines (HIG)",
    sourcePlatform: "Material 3",
    targetPlatform: "iOS 26",
  },
};

export const TAXONOMY: TaxonomyCategory[] = [
  {
    id: "navigation",
    name: "Navigation",
    checks: [
      {
        id: "nav-back-behavior",
        check: "Top navigation bar and back behavior",
        direction: "ios-to-android",
        sourcePattern:
          "Top-of-screen navigation cluster — in-app back chevron, title, and right-side action buttons as separate floating elements — plus an edge-swipe pop gesture.",
        targetPattern:
          "A single Material top app bar: the back chevron becomes the navigation icon and the right-side buttons become actions, all in one bar. System predictive back (Android 14+) replaces the in-app edge-swipe pop.",
        rationale:
          "On iOS the top buttons are separate elements; on Material they become one top app bar — navigation icon plus actions in a single bar. The in-app edge-swipe pop duplicates the system predictive-back gesture.",
        fix:
          "Change the floating top buttons to a Material top app bar — the back chevron becomes the navigation icon and the right-side buttons become actions — and use the system predictive back gesture instead of the in-app edge-swipe pop.",
        sources: [
          { label: "Android Developers — Predictive back gesture", url: "https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture" },
          { label: "Material 3 — Top app bar guidelines", url: "https://m3.material.io/components/app-bars/guidelines" },
          { label: "Apple HIG — Toolbars", url: "https://developer.apple.com/design/human-interface-guidelines/toolbars" },
        ],
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
        fix:
          "Change the translucent iOS tab bar to the Material navigation bar with the active-indicator pill.",
        sources: [
          { label: "Material 3 — Navigation bar guidelines", url: "https://m3.material.io/components/navigation-bar/guidelines" },
          { label: "Material 3 — Navigation bar overview", url: "https://m3.material.io/components/navigation-bar/overview" },
          { label: "Apple HIG — Tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars" },
        ],
      },
      {
        id: "nav-large-titles",
        check: "Large collapsing titles",
        direction: "ios-to-android",
        sourcePattern:
          "Large title that collapses into the navigation bar on scroll.",
        targetPattern: "Material top app bar (small, center-aligned, medium flexible, or large flexible) matched to the screen's hierarchy; medium flexible and large flexible compress to the small bar on scroll",
        rationale:
          "iOS large titles don't collapse the Material way. A medium or large top app bar gives the same hierarchy without looking ported.",
        fix:
          "Change the collapsing large title to a Material top app bar (medium or large flexible).",
        sources: [
          { label: "Material 3 — Top app bar guidelines", url: "https://m3.material.io/components/app-bars/guidelines" },
          { label: "Apple HIG — Toolbars", url: "https://developer.apple.com/design/human-interface-guidelines/toolbars" },
        ],
      },
      {
        id: "nav-modal",
        check: "Modal presentation and dismissal",
        direction: "ios-to-android",
        sourcePattern:
          "Card-style modal that slides up and dismisses with a swipe-down gesture.",
        targetPattern:
          "Modal bottom sheet with a drag handle and scrim, or a full-screen dialog for complex flows.",
        rationale: "Material's analog is a modal bottom sheet (scrim + optional drag handle) or a full-screen dialog for complex flows. Swipe-down dismissal does exist in Material — a modal bottom sheet can be dismissed by swiping it down — but the drag handle and scrim are the expected affordances.",
        fix:
          "Change the card-style swipe-to-dismiss modal to a Material bottom sheet with a drag handle.",
        sources: [
          { label: "Material 3 — Bottom sheets guidelines", url: "https://m3.material.io/components/bottom-sheets/guidelines" },
          { label: "Material 3 — Dialogs guidelines", url: "https://m3.material.io/components/dialogs/guidelines" },
          { label: "Apple HIG — Sheets", url: "https://developer.apple.com/design/human-interface-guidelines/sheets" },
        ],
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
        fix:
          "Change the system-back-only navigation to an explicit back chevron plus iOS edge-swipe on every pushed screen.",
        sources: [
          { label: "Apple HIG — Toolbars", url: "https://developer.apple.com/design/human-interface-guidelines/toolbars" },
          { label: "Apple HIG — Navigation", url: "https://developer.apple.com/design/human-interface-guidelines/navigation" },
          { label: "Android Developers — Predictive back gesture", url: "https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture" },
        
        ],
      },
      {
        id: "a2i-nav-drawer",
        check: "Navigation drawer → tab bar",
        direction: "android-to-ios",
        sourcePattern:
          "Modal navigation drawer opened from a hamburger icon, listing every destination.",
        targetPattern: "Tab bar with about five or fewer primary destinations; do not overflow into a 'More' tab — restructure the IA (use a sidebar for complex hierarchies on larger layouts). iOS has no iPhone drawer convention; hamburger-hidden navigation strands users.",
        rationale:
          "Drawers don't exist in iOS conventions — iOS users won't look behind a hamburger. Promote destinations to a tab bar.",
        fix:
          "Change the hamburger navigation drawer to a tab bar with five or fewer destinations.",
        sources: [
          { label: "Apple HIG — Tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars" },
          { label: "Material 3 — Navigation bar guidelines", url: "https://m3.material.io/components/navigation-bar/guidelines" },
        ],
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
        fix:
          "Change the Material underline tab row to an iOS segmented control.",
        sources: [
          { label: "Material 3 — Tabs guidelines", url: "https://m3.material.io/components/tabs/guidelines" },
          { label: "Apple HIG — Segmented controls", url: "https://developer.apple.com/design/human-interface-guidelines/segmented-controls" },
        ],
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
        fix:
          "Change the Material navigation bar to the Apple tab bar: translucent, tint-only selection, no pill.",
        sources: [
          { label: "Apple HIG — Tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars" },
          { label: "Material 3 — Navigation bar guidelines", url: "https://m3.material.io/components/navigation-bar/guidelines" },
        ],
      },
      {
        id: "a2i-nav-fullscreen-dialog",
        check: "Full-screen dialog close affordance",
        direction: "android-to-ios",
        sourcePattern: "Material full-screen dialog with an X close icon in the app bar, confirm-by-basic-dialog on unsaved discard",
        targetPattern: "iOS full-screen cover with Cancel (leading) / Done or Save (trailing) in the navigation bar — no X icon; swipe-down disabled for completion-required flows",
        rationale: "Material's full-screen dialog convention (X icon, discard-confirmation dialog) doesn't exist on iOS. HIG sheets use Cancel-leading/confirm-trailing placement and explicit Done/Cancel; importing the X affordance plus a confirmation dialog reads as Android.",
        fix:
          "Change the Material full-screen dialog (X close icon) to an iOS full-screen cover with Cancel/Done.",
        sources: [
          { label: "Material 3 — Dialogs guidelines", url: "https://m3.material.io/components/dialogs/guidelines" },
          { label: "Apple HIG — Sheets", url: "https://developer.apple.com/design/human-interface-guidelines/sheets" },
        ],
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
        fix:
          "Change SF Pro to Roboto (or your licensed brand font).",
        sources: [
          { label: "Apple Fonts", url: "https://developer.apple.com/fonts/" },
          { label: "Material 3 — Typography overview", url: "https://m3.material.io/styles/typography/overview" },
        ],
      },
      {
        id: "type-scale",
        check: "Type scale roles",
        direction: "ios-to-android",
        sourcePattern: "iOS text styles (Large Title, Title 1-3, Headline, Body, Callout, Subheadline, Footnote, Caption 1-2)",
        targetPattern:
          "Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).",
        rationale:
          "Mapping sizes by eye produces inconsistent hierarchy. Re-mapping to Material roles keeps text, spacing, and accessibility scaling coherent.",
        fix:
          "Change the iOS text styles to Material 3 type-scale roles.",
        sources: [
          { label: "Apple HIG — Typography", url: "https://developer.apple.com/design/human-interface-guidelines/typography" },
          { label: "Material 3 — Typography overview", url: "https://m3.material.io/styles/typography/overview" },
        ],
      },
      {
        id: "a2i-type-font",
        check: "System font swap (Roboto → SF)",
        direction: "android-to-ios",
        sourcePattern: "Roboto as the system typeface.",
        targetPattern:
          "SF Pro for UI text, SF Pro Text at small sizes; adopt HIG text styles throughout.",
        rationale: "Roboto on iOS is an instant port signal. SF (system font) is expected and optically tuned for Apple text rendering — SF Pro Text below 20pt, SF Pro Display at/above 20pt; adopt HIG text styles throughout.",
        fix:
          "Change Roboto to SF Pro (SF Pro Text at small sizes).",
        sources: [
          { label: "Apple HIG — Typography", url: "https://developer.apple.com/design/human-interface-guidelines/typography" },
          { label: "Apple Fonts", url: "https://developer.apple.com/fonts/" },
          { label: "Material 3 — Typography overview", url: "https://m3.material.io/styles/typography/overview" },
        
        ],
      },
      {
        id: "a2i-type-scale",
        check: "Type scale roles",
        direction: "android-to-ios",
        sourcePattern:
          "Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).",
        targetPattern: "HIG text styles (Large Title, Title 1-3, Headline, Body, Callout, Subheadline, Footnote, Caption 1-2)",
        rationale:
          "Material roles don't map 1:1 to HIG styles. Re-mapping keeps hierarchy, spacing, and Dynamic Type scaling coherent.",
        fix:
          "Change the Material 3 type-scale roles to HIG text styles.",
        sources: [
          { label: "Apple HIG — Typography", url: "https://developer.apple.com/design/human-interface-guidelines/typography" },
          { label: "Material 3 — Typography overview", url: "https://m3.material.io/styles/typography/overview" },
        ],
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
        targetPattern: "Material dialog: surfaceContainerHigh container, headline and supporting text, actions as right-aligned text buttons",
        rationale: "iOS-style stacked-button alerts are an instant 'ported' signal. Material dialogs use text-button actions aligned to the trailing edge (confirmation closest to the edge); stacked actions are a documented Caution for long button text (confirming above dismissing), not forbidden.",
        fix:
          "Change the centered iOS alert to a Material dialog with right-aligned text buttons.",
        sources: [
          { label: "Material 3 — Dialogs", url: "https://m3.material.io/components/dialogs/overview" },
          { label: "Material 3 — Buttons guidelines", url: "https://m3.material.io/components/buttons/guidelines" },
          { label: "Apple HIG — Alerts", url: "https://developer.apple.com/design/human-interface-guidelines/alerts" },
        ],
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
        fix:
          "Change the iOS action sheet to a Material modal bottom sheet.",
        sources: [
          { label: "Apple HIG — Action sheets", url: "https://developer.apple.com/design/human-interface-guidelines/action-sheets" },
          { label: "Material 3 — Bottom sheets", url: "https://m3.material.io/components/bottom-sheets/overview" },
        ],
      },
      {
        id: "comp-list",
        check: "Grouped lists",
        direction: "ios-to-android",
        sourcePattern:
          "Inset grouped list: rounded card sections floating on a tinted background, rows with leading icons, labels, and trailing chevrons or values.",
        targetPattern:
          "Material list: full-bleed rows from edge to edge with dividers, section headers as list subheaders — no inset rounded card floating on a tinted background.",
        rationale:
          "The inset grouped list is one of the most recognizable iOS patterns. Material lists are flat and full-bleed; keeping the floating card with side margins reads instantly as an iOS port, even when every row icon is swapped.",
        fix:
          "Change the inset grouped list to a flat Material list: full-bleed rows with dividers and subheaders, no floating card.",
        sources: [
          { label: "Apple HIG — Lists and tables", url: "https://developer.apple.com/design/human-interface-guidelines/lists-and-tables" },
          { label: "Material 3 — Lists", url: "https://m3.material.io/components/lists/overview" },
        ],
      },
      {
        id: "comp-menu",
        check: "Pop-up menus",
        direction: "ios-to-android",
        sourcePattern:
          "iOS pop-up/context menu: floating rounded card anchored to a control, rows with labels and trailing SF Symbol icons.",
        targetPattern:
          "Material menu: standard menu container (shape, elevation, surface color), items with LEADING icons and labels; anchored dropdown or overflow menu.",
        rationale:
          "iOS menus put icons on the trailing edge inside a distinctly rounded, translucent card. Material menus lead with the icon and use the opaque menu container — a trailing-icon floating card is a visible port tell even when the glyphs are swapped.",
        fix:
          "Change the iOS pop-up menu to a Material menu: leading icons, standard menu container and elevation.",
        sources: [
          { label: "Apple HIG — Menus", url: "https://developer.apple.com/design/human-interface-guidelines/menus" },
          { label: "Material 3 — Menus", url: "https://m3.material.io/components/menus/overview" },
        ],
      },
      {
        id: "comp-fab",
        check: "Floating action button",
        direction: "ios-to-android",
        sourcePattern:
          "No iOS equivalent — commonly added as a floating circular button.",
        targetPattern:
          "Material FAB: bottom-trailing, 16dp margins, above the navigation bar, carrying the single primary action; correct elevation and size variant. EXCEPTION: when the floating button sits beside a bottom text-input bar (AI prompt bar pattern), do not float separate FABs — convert the whole cluster into a Material 3 Search Bar instead.",
        rationale:
          "Adding a FAB is fine, but it must follow Material placement, elevation, and size rules — not float like an iOS overlay. A bottom input cluster (prompt bar with adjacent circular buttons) is not a FAB case at all: Material's Search Bar already provides leading/trailing icon slots for those actions.",
        fix:
          "Change the floating circular button to a Material FAB: bottom-trailing, 16dp margins. If it sits beside a bottom text-input bar, convert the cluster into a Material 3 Search Bar instead (56dp fully-rounded container; actions become the bar's leading/trailing icon buttons).",
        sources: [
          { label: "Material 3 — FAB", url: "https://m3.material.io/components/floating-action-button/overview" },
          { label: "Material 3 — Search bar", url: "https://m3.material.io/components/search/overview" },
          { label: "Material Components Android — FloatingActionButton", url: "https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md" },
          { label: "Apple HIG — Buttons", url: "https://developer.apple.com/design/human-interface-guidelines/buttons" },
        
        ],
      },
      {
        id: "comp-searchbar",
        check: "Search bar / prompt bar",
        direction: "ios-to-android",
        sourcePattern:
          "iOS search field (rounded, magnifier + placeholder) or a floating bottom prompt bar (e.g. AI chat trigger) with detached circular action buttons beside it.",
        targetPattern:
          "Material 3 Search Bar: 56dp fully-rounded container, surfaceContainerHigh, leading icon button, supporting text, up to two trailing icons. Detached buttons fold into the bar's leading/trailing slots; tapping the bar opens the full input surface (SearchView pattern).",
        rationale:
          "An iOS search field or floating prompt cluster has no direct iOS-transplant equivalent; Material's Search Bar is the native container, and its leading/trailing slots absorb the adjacent action buttons instead of floating separate FABs.",
        fix: "Change the search field / prompt bar cluster to a Material 3 Search Bar: 56dp fully-rounded container; move adjacent buttons into the leading/trailing icon slots.",
        sources: [
          { label: "Material 3 — Search", url: "https://m3.material.io/components/search/overview" },
          { label: "Apple HIG — Search fields", url: "https://developer.apple.com/design/human-interface-guidelines/search-fields" },
        ],
      },
      {
        id: "comp-segmented",
        check: "Segmented controls",
        direction: "ios-to-android",
        sourcePattern: "iOS stepper and segmented control (pill-in-track look).",
        targetPattern: "Material segmented buttons: one outlined container split into segments with shared borders; selection shown with a checkmark (Selected icon); single-select (exactly one) or multi-select (none to all). Note: M3 Expressive no longer recommends segmented buttons — use the connected button group instead.",
        rationale:
          "The iOS pill-in-track segmented control has a distinct look; Material segmented buttons are outlined per-button and behave differently in multi-select.",
        fix:
          "Change the iOS segmented control to Material segmented buttons.",
        sources: [
          { label: "Material 3 — Segmented buttons", url: "https://m3.material.io/components/segmented-buttons/overview" },
          { label: "Apple HIG — Segmented controls", url: "https://developer.apple.com/design/human-interface-guidelines/segmented-controls" },
        ],
      },
      {
        id: "comp-date-picker",
        check: "Date pickers",
        direction: "ios-to-android",
        sourcePattern: "Spinner wheels (date/time drums).",
        targetPattern: "Material date picker: modal calendar dialog for casual selection; modal date input (keyboard entry) when the user knows the exact date; docked picker on medium/expanded screens; full-screen for ranges",
        rationale:
          "Spinner wheels are the strongest 'ported from iOS' signal in forms. Switch to the calendar picker users expect.",
        fix:
          "Change the spinner date wheels to the Material calendar date picker.",
        sources: [
          { label: "Material 3 — Date pickers", url: "https://m3.material.io/components/date-pickers/overview" },
          { label: "Apple HIG — Pickers", url: "https://developer.apple.com/design/human-interface-guidelines/pickers" },
        ],
      },
      {
        id: "comp-switch",
        check: "Switches",
        direction: "ios-to-android",
        sourcePattern: "iOS switch: pill track, circular thumb, green on-state.",
        targetPattern: "Material switch: 52x32dp track, handle (M3's term — 'thumb' is the old name; 16dp unselected / 24dp selected / 28dp pressed), optional state icon (X / checkmark) inside the handle",
        rationale:
          "Close cousins, but the Material switch has distinct track styling and optional state icons — restyle to avoid the iOS look.",
        fix:
          "Change the iOS switch to the Material switch (52x32dp, icon in the handle).",
        sources: [
          { label: "Material 3 — Switch", url: "https://m3.material.io/components/switch/overview" },
          { label: "Apple HIG — Toggles", url: "https://developer.apple.com/design/human-interface-guidelines/toggles" },
        ],
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
        fix:
          "Change the FAB to a navigation-bar button, toolbar item, or primary button in content.",
        sources: [
          { label: "Apple HIG — Toolbars", url: "https://developer.apple.com/design/human-interface-guidelines/toolbars" },
          { label: "Apple HIG — Buttons", url: "https://developer.apple.com/design/human-interface-guidelines/buttons" },
          { label: "Material 3 — FAB", url: "https://m3.material.io/components/floating-action-button/overview" },
        
        ],
      },
      {
        id: "a2i-comp-searchbar",
        check: "Search bar → iOS search field",
        direction: "android-to-ios",
        sourcePattern:
          "Material 3 Search Bar: 56dp fully-rounded container with leading/trailing icon slots, opening a full-screen search view.",
        targetPattern:
          "Native iOS search field: rounded editable field with magnifier icon, clear button, and placeholder text; scope bars/tokens where applicable. A bottom prompt cluster is rebuilt in native iOS style, not as a Material bar.",
        rationale:
          "The Material Search Bar's slots, container treatment, and search-view pattern don't exist on iOS; iOS uses its own search field idiom.",
        fix: "Change the Material Search Bar to a native iOS search field (magnifier, clear button, placeholder).",
        sources: [
          { label: "Apple HIG — Search fields", url: "https://developer.apple.com/design/human-interface-guidelines/search-fields" },
          { label: "Material 3 — Search", url: "https://m3.material.io/components/search/overview" },
        ],
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
        fix:
          "Change the wallpaper-generated dynamic palette to fixed light/dark palettes.",
        sources: [
          { label: "Material 3 — Color system", url: "https://m3.material.io/styles/color/system/overview" },
          { label: "Apple HIG — Color", url: "https://developer.apple.com/design/human-interface-guidelines/color" },
        ],
      },
      {
        id: "a2i-comp-dialog",
        check: "Material dialogs → alerts and action sheets",
        direction: "android-to-ios",
        sourcePattern: "Material dialog: surfaceContainerHigh container, headline and supporting text, actions as trailing text buttons",
        targetPattern:
          "iOS alert: centered, with stacked (or side-by-side for two) action buttons; option lists become action sheets.",
        rationale:
          "Trailing text-button dialogs read as Android. iOS alerts stack their actions; lists of options belong in action sheets.",
        fix:
          "Change the Material dialog to a centered iOS alert with stacked action buttons.",
        sources: [
          { label: "Material 3 — Dialogs", url: "https://m3.material.io/components/dialogs/overview" },
          { label: "Apple HIG — Alerts", url: "https://developer.apple.com/design/human-interface-guidelines/alerts" },
        ],
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
        fix:
          "Change the elevated cards to flat grouped backgrounds with hairline separators.",
        sources: [
          { label: "Apple HIG — Lists and tables", url: "https://developer.apple.com/design/human-interface-guidelines/lists-and-tables" },
          { label: "Material 3 — Cards", url: "https://m3.material.io/components/cards/overview" },
        ],
      },
      {
        id: "a2i-comp-list",
        check: "Lists → grouped lists",
        direction: "android-to-ios",
        sourcePattern:
          "Flat full-bleed Material list: edge-to-edge rows with dividers, leading icons or avatars on a single surface.",
        targetPattern:
          "iOS list style for the context: inset grouped list (Settings-style screens) with rounded sections, or a plain list with inset separators; trailing chevron marks navigation rows.",
        rationale:
          "The flat full-bleed list is Material's default; on iOS, settings and content lists use grouped or plain styles with inset separators. Keeping the Android list untouched reads as a port.",
        fix:
          "Change the flat Material list to the iOS grouped list style with inset separators.",
        sources: [
          { label: "Material 3 — Lists", url: "https://m3.material.io/components/lists/overview" },
          { label: "Apple HIG — Lists and tables", url: "https://developer.apple.com/design/human-interface-guidelines/lists-and-tables" },
        ],
      },
      {
        id: "a2i-comp-menu",
        check: "Menus → iOS menus",
        direction: "android-to-ios",
        sourcePattern:
          "Material menu: opaque container, items with leading icons, dividers between groups.",
        targetPattern:
          "iOS menu: floating rounded card anchored to the control, items with TRAILING SF Symbol icons, separators between groups.",
        rationale:
          "Material leads menu items with icons; iOS menus trail them and float as a rounded card. A leading-icon opaque menu on iOS is a clear port tell.",
        fix:
          "Change the Material menu to an iOS menu: trailing icons, floating rounded card.",
        sources: [
          { label: "Material 3 — Menus", url: "https://m3.material.io/components/menus/overview" },
          { label: "Apple HIG — Menus", url: "https://developer.apple.com/design/human-interface-guidelines/menus" },
        ],
      },
      {
        id: "a2i-comp-switch",
        check: "Switches, checkboxes, and ripples",
        direction: "android-to-ios",
        sourcePattern:
          "Material switch (52×32dp), Material checkboxes, and ripple touch feedback on pressables.",
        targetPattern: "iOS switch: pill track, circular thumb, green on-state — and use the switch style ONLY in a list row; iOS selection styling (rounded-square checkbox, blue fill, white checkmark); system press-state highlight instead of ripples",
        rationale:
          "Ripples don't exist on iOS — they're the subtlest port signal. Swap to the iOS switch and replace ripples with highlight/opacity feedback.",
        fix:
          "Change the Material switch to the iOS switch — and only use it in a list row.",
        sources: [
          { label: "Apple HIG — Toggles", url: "https://developer.apple.com/design/human-interface-guidelines/toggles" },
          { label: "Apple HIG — Buttons", url: "https://developer.apple.com/design/human-interface-guidelines/buttons" },
          { label: "Material 3 — Switch", url: "https://m3.material.io/components/switch/overview" },
        ],
      },
      {
        id: "a2i-comp-snackbar",
        check: "Snackbar → iOS transient feedback",
        direction: "android-to-ios",
        sourcePattern:
          "Snackbar: transient bottom message above the navigation bar, often with an action.",
        targetPattern: "No snackbar on iOS — use in-content status indicators (the HIG's Mail-offline pattern), never a bottom bar",
        rationale:
          "The bottom snackbar is a Material idiom. iOS has no equivalent; forcing one in reads as a port.",
        fix:
          "Change the snackbar to an in-content status indicator.",
        sources: [
          { label: "Material 3 — Snackbar", url: "https://m3.material.io/components/snackbar/overview" },
          { label: "Apple HIG — Alerts", url: "https://developer.apple.com/design/human-interface-guidelines/alerts" },
        ],
      },
      {
        id: "comp-time-picker",
        check: "Time pickers",
        direction: "ios-to-android",
        sourcePattern: "iOS spinner drums (wheels style) for hour/minute/AM-PM",
        targetPattern: "Material dial time picker (clock-face dial selector) or input time picker (keyboard entry); keyboard icon toggles between them",
        rationale: "Same ported-signal class as date pickers: iOS drums have no M3 equivalent. M3 time selection is a dial mimicking a watch face, with keyboard input as the fallback.",
        fix:
          "Change the iOS time spinner drums to the Material dial time picker.",
        sources: [
          { label: "Material 3 — Time pickers", url: "https://m3.material.io/components/time-pickers/overview" },
          { label: "Apple HIG — Pickers", url: "https://developer.apple.com/design/human-interface-guidelines/pickers" },
        ],
      },
      {
        id: "comp-stepper",
        check: "Steppers",
        direction: "ios-to-android",
        sourcePattern: "iOS stepper: two-segment +/- control sitting next to the value field it changes",
        targetPattern: "No M3 stepper exists — rebuild with paired icon buttons, or a slider when the value is a range",
        rationale: "M3's value-selection control is the slider (standard/centered/range); a stepper ports as paired +/- icon buttons.",
        fix:
          "Change the iOS stepper to paired Material icon buttons (or a slider for ranges).",
        sources: [
          { label: "Apple HIG — Steppers", url: "https://developer.apple.com/design/human-interface-guidelines/steppers" },
          { label: "Material 3 — Sliders", url: "https://m3.material.io/components/sliders/overview" },
        ],
      },
      {
        id: "a2i-comp-buttons",
        check: "Button styles → iOS button hierarchy",
        direction: "android-to-ios",
        sourcePattern: "M3's five emphasis-ordered button styles: elevated, filled, tonal, outlined, text",
        targetPattern: "iOS button styles: one .borderedProminent button per view for the primary action, .bordered for secondary, .borderless/.plain for tertiary; title-style capitalization (M3 uses sentence case)",
        rationale: "M3's filled/tonal/outlined/text ladder has no 1:1 iOS mapping; porting it verbatim yields off-hierarchy buttons. HIG reserves the prominent style for the single most likely action.",
        fix:
          "Change the five M3 button styles to iOS button styles (one .borderedProminent primary per view).",
        sources: [
          { label: "Material 3 — Buttons guidelines", url: "https://m3.material.io/components/buttons/guidelines" },
          { label: "Apple HIG — Buttons", url: "https://developer.apple.com/design/human-interface-guidelines/buttons" },
        ],
      },
      {
        id: "a2i-comp-pickers",
        check: "Date/time pickers → iOS picker styles",
        direction: "android-to-ios",
        sourcePattern: "Material modal calendar date picker and dial time picker",
        targetPattern: "iOS picker styles: compact (button opening a calendar/time modal), inline (calendar view or wheels), or wheels (scrolling drums)",
        rationale: "The reverse of the date/time checks: an M3 calendar dialog or clock dial on iOS reads as Android. iOS offers compact, inline, and wheels styles.",
        fix:
          "Change the Material calendar/dial pickers to the iOS picker style (compact, inline, or wheels).",
        sources: [
          { label: "Apple HIG — Pickers", url: "https://developer.apple.com/design/human-interface-guidelines/pickers" },
          { label: "Material 3 — Date pickers", url: "https://m3.material.io/components/date-pickers/overview" },
        ],
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
        sourcePattern: "44x44pt recommended hit region (HIG Accessibility: iOS default control size 44x44pt; hard minimum 28x28pt)",
        targetPattern: "48×48dp minimum touch targets.",
        rationale: "44pt controls fall below Android's 48dp accessibility floor and get flagged by Google's Accessibility Scanner. (Note: dp and pt are both density-independent, so there is no 'denser display' size difference — 44pt and 44dp are the same physical size.) Bump interactive targets to 48dp.",
        fix:
          "Change 44pt touch targets to 48dp minimum touch targets.",
        sources: [
          { label: "Apple HIG — Buttons", url: "https://developer.apple.com/design/human-interface-guidelines/buttons" },
          { label: "Apple HIG — Accessibility", url: "https://developer.apple.com/design/human-interface-guidelines/accessibility" },
          { label: "Material 3 — Touch target sizes", url: "https://m3.material.io/foundations/designing/structure" },
        ],
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
        fix:
          "Change the letterboxed safe-area layout to edge-to-edge with WindowInsets handling.",
        sources: [
          { label: "Android Developers — Window insets", url: "https://developer.android.com/develop/ui/views/layout/insets" },
          { label: "Android Developers — Edge-to-edge", url: "https://developer.android.com/develop/ui/views/layout/edge-to-edge" },
          { label: "Apple HIG — Layout", url: "https://developer.apple.com/design/human-interface-guidelines/layout" },
        
        ],
      },
      {
        id: "layout-status-bar",
        check:
          "Status and navigation bar treatment — only when the app itself paints an opaque background behind the status bar (e.g. nav-bar color extending under the time). Never flag the phone's own system status bar (time, wifi, battery icons); that is device chrome, not the app.",
        direction: "ios-to-android",
        sourcePattern: "Opaque status bar background matched to the nav bar.",
        targetPattern:
          "Transparent status bar over edge-to-edge content with light/dark icon control via WindowInsetsController.",
        rationale:
          "Hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.",
        fix:
          "Change the opaque status bar to a transparent one over edge-to-edge content.",
        sources: [
          { label: "Android Developers — Edge-to-edge", url: "https://developer.android.com/develop/ui/views/layout/edge-to-edge" },
          { label: "Android Developers — WindowInsetsController", url: "https://developer.android.com/reference/android/view/WindowInsetsController" },
          { label: "Apple HIG — Layout", url: "https://developer.apple.com/design/human-interface-guidelines/layout" },
        
        ],
      },
      {
        id: "a2i-touch-targets",
        check: "Touch target size (48dp → 44pt)",
        direction: "android-to-ios",
        sourcePattern: "48×48dp minimum touch targets.",
        targetPattern: "44×44pt minimum touch targets on iOS.",
        rationale:
          "Going down in size is usually safe, but verify nothing lands below 44pt — and don't just scale everything down; re-check spacing and rhythm.",
        fix:
          "Change 48dp touch targets to 44pt minimum touch targets.",
        sources: [
          { label: "Apple HIG — Accessibility", url: "https://developer.apple.com/design/human-interface-guidelines/accessibility" },
          { label: "Material 3 — Touch target sizes", url: "https://m3.material.io/foundations/designing/structure" },
        ],
      },
      {
        id: "a2i-layout-edge",
        check: "Edge-to-edge → safe area",
        direction: "android-to-ios",
        sourcePattern:
          "Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts.",
        targetPattern: "Respect the iOS safe area — keep interactive content below the notch/Dynamic Island and above the home indicator, while letting backgrounds and scrolling content extend edge to edge. Do NOT add black bars/letterbox to hide the notch or home indicator",
        rationale:
          "On Android, letterboxing wastes screen; on iOS the safe area is the convention. Don't bleed content into the notch or the home indicator.",
        fix:
          "Change the edge-to-edge layout to respect the iOS safe area (notch, Dynamic Island, home indicator).",
        sources: [
          { label: "Apple HIG — Layout", url: "https://developer.apple.com/design/human-interface-guidelines/layout" },
          { label: "Android Developers — Edge-to-edge", url: "https://developer.android.com/develop/ui/views/layout/edge-to-edge" },
        
        ],
      },
      {
        id: "a2i-layout-statusbar",
        check:
          "Status bar treatment — only when the app itself manages the status bar area programmatically. Never flag the phone's own system status bar (time, wifi, battery icons); that is device chrome, not the app.",
        direction: "android-to-ios",
        sourcePattern:
          "Transparent status bar over edge-to-edge content, icon colors controlled via WindowInsetsController.",
        targetPattern: "iOS status bar style set per screen via preferredStatusBarStyle (.default / .lightContent / .darkContent). No transparency games — the system manages it",
        rationale:
          "Android's programmatic status-bar control has no iOS equivalent. Set the style per screen and let the system handle the rest.",
        fix:
          "Change the transparent status bar to per-screen preferredStatusBarStyle.",
        sources: [
          { label: "Apple HIG — Layout", url: "https://developer.apple.com/design/human-interface-guidelines/layout" },
          { label: "Android Developers — Edge-to-edge", url: "https://developer.android.com/develop/ui/views/layout/edge-to-edge" },
        
        ],
      },
      {
        id: "layout-gesture-insets",
        check: "System gesture insets vs edge gestures",
        direction: "ios-to-android",
        sourcePattern: "Edge-swipe gestures (e.g. swipe-back) freely usable near screen edges",
        targetPattern: "Keep interactive controls, tap targets, and app-owned horizontal swipes clear of system gesture insets — those edge zones take priority for the system back/home gestures",
        rationale: "On Android the system reserves gesture-navigation edge zones; app gestures there are overridden by the OS.",
        fix:
          "Change edge-adjacent controls to clear the system gesture insets.",
        sources: [
          { label: "Android Developers — Window insets", url: "https://developer.android.com/develop/ui/views/layout/insets" },
          { label: "Apple HIG — Layout", url: "https://developer.apple.com/design/human-interface-guidelines/layout" },
        
        ],
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
        targetPattern: "Material emphasized easing with the M3 transition pattern matched to the navigation relationship: container transform (card/list to detail), forward and backward (hierarchical push/pop), lateral (peer content like tabs), top level (unrelated destinations, e.g. nav-bar switches)",
        rationale: "iOS springs feel wrong on Android. Pick the Material transition that matches the relationship (container transform for cards, lateral for peer moves, top level for destination switches).",
        fix:
          "Change the iOS push/pop spring transitions to the matching Material motion pattern.",
        sources: [
          { label: "Material 3 — Transition patterns", url: "https://m3.material.io/styles/motion/transitions/transition-patterns" },
          { label: "Material 3 — Easing and duration", url: "https://m3.material.io/styles/motion/easing-and-duration/tokens-specs" },
          { label: "Apple HIG — Motion", url: "https://developer.apple.com/design/human-interface-guidelines/motion" },
        
        ],
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
        fix:
          "Change feel-tuned iOS durations to Material motion tokens.",
        sources: [
          { label: "Material 3 — Easing and duration", url: "https://m3.material.io/styles/motion/easing-and-duration/tokens-specs" },
          { label: "Material Components Android — Motion theming", url: "https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md" },
          { label: "Apple HIG — Motion", url: "https://developer.apple.com/design/human-interface-guidelines/motion" },
        
        ],
      },
      {
        id: "a2i-motion-transitions",
        check: "Material transitions → iOS navigation motion",
        direction: "android-to-ios",
        sourcePattern: "Material emphasized easing with M3 transitions (container transform, forward and backward, lateral, top level)",
        targetPattern: "iOS push/pop with the system's parallax transition and the interactive swipe-back gesture; modals present as sheets from the bottom",
        rationale:
          "Material transitions feel technical on iOS. Match the iOS navigation model: horizontal push/pop between peers, sheets from the bottom.",
        fix:
          "Change the Material transitions to the iOS parallax push/pop with interactive swipe-back.",
        sources: [
          { label: "Material 3 — Transition patterns", url: "https://m3.material.io/styles/motion/transitions/transition-patterns" },
          { label: "Apple HIG — Motion", url: "https://developer.apple.com/design/human-interface-guidelines/motion" },
        
        ],
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
        fix:
          "Change the Material motion tokens to UIView animation curves (ease-in-out, spring).",
        sources: [
          { label: "Material 3 — Easing and duration", url: "https://m3.material.io/styles/motion/easing-and-duration/tokens-specs" },
          { label: "Apple HIG — Motion", url: "https://developer.apple.com/design/human-interface-guidelines/motion" },
        
        ],
      },
      {
        id: "motion-predictive-back",
        check: "Back-gesture animation (custom swipe-back)",
        direction: "ios-to-android",
        sourcePattern: "Swipe-from-left-edge interactive pop tied to the navigation stack",
        targetPattern: "Predictive back gesture: opt in via android:enableOnBackInvokedCallback and the Navigation component's built-in handling — the system drives the back animation and previews the destination; do not re-implement a custom swipe-back",
        rationale: "Android's back model is system-owned and animated by the OS, including cross-activity transitions. A hand-rolled swipe-back fights the platform gesture, duplicates the system animation, and breaks predictive-back previews.",
        fix:
          "Change the custom swipe-back handling to opt into the predictive back gesture.",
        sources: [
          { label: "Android Developers — Predictive back gesture", url: "https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture" },
          { label: "Material 3 — Transition patterns", url: "https://m3.material.io/styles/motion/transitions/transition-patterns" },
          { label: "Apple HIG — Motion", url: "https://developer.apple.com/design/human-interface-guidelines/motion" },
        
        ],
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
        targetPattern: "Material Symbols: outlined, rounded, and sharp styles; fill, weight, grade, and optical-size axes chosen per usage",
        rationale: "SF Symbols are system-provided images licensed solely for apps on Apple platforms (Xcode and Apple SDKs Agreement section 2.10) — not permitted in Android apps. Replace with Material Symbols (Apache 2.0), using filled vs outlined to signal active state",
        fix:
          "Change SF Symbols to Material Symbols (outlined, rounded, or sharp).",
        sources: [
          { label: "Apple — SF Symbols", url: "https://developer.apple.com/sf-symbols/" },
          { label: "Material 3 — Icons overview", url: "https://m3.material.io/styles/icons/overview" },
          { label: "Google — material-design-icons (Apache 2.0)", url: "https://github.com/google/material-design-icons" },
        ],
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
        fix:
          "Change tint-only tab icons to Material icons with state layers and the active-indicator pill.",
        sources: [
          { label: "Material 3 — Navigation bar specs", url: "https://m3.material.io/components/navigation-bar/specs" },
          { label: "Apple HIG — Tab bars", url: "https://developer.apple.com/design/human-interface-guidelines/tab-bars" },
        
        ],
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
        fix:
          "Change Material Symbols to SF Symbols, matching weight to the text style.",
        sources: [
          { label: "Apple HIG — SF Symbols", url: "https://developer.apple.com/design/human-interface-guidelines/sf-symbols" },
          { label: "Material 3 — Icons overview", url: "https://m3.material.io/styles/icons/overview" },
          { label: "Google — material-design-icons (Apache 2.0)", url: "https://github.com/google/material-design-icons" },
        ],
      },
      {
        id: "a2i-icon-adaptive",
        check: "Adaptive icons → squircle",
        direction: "android-to-ios",
        sourcePattern: "Adaptive icon: foreground/background layers (108x108dp each, 66x66dp safe zone, 18dp reserved per side) masked by the OEM (circle, squircle, teardrop, ...); optional monochrome layer for themed icons",
        targetPattern: "Single full-bleed square 1024x1024 asset with NO pre-rounded corners. iOS applies its own rounded-rectangle mask (continuous corners); providing pre-masked layers double-applies the mask and degrades specular effects",
        rationale:
          "Android's adaptive-icon system has no iOS equivalent. Ship one proper squircle; don't reuse an asset masked for a Pixel.",
        fix:
          "Change the adaptive icon layers to a single full-bleed 1024x1024 square asset.",
        sources: [
          { label: "Android Developers — Adaptive icons", url: "https://developer.android.com/develop/ui/compose/system/icon_design_adaptive" },
          { label: "Apple HIG — App icons", url: "https://developer.apple.com/design/human-interface-guidelines/app-icons" },
        ],
      },
      {
        id: "a2i-icon-themed",
        check: "Themed/monochrome icon layer",
        direction: "android-to-ios",
        sourcePattern: "Adaptive icon with a monochrome layer enabling Android 13+ themed icons (Material You tinting)",
        targetPattern: "No themed-icon equivalent on iOS — drop the monochrome layer and ship one full-color square asset; iOS handles light/dark/tinted appearances itself",
        rationale: "The monochrome layer exists only for Android's user-theming pipeline. Porting it (or leaving it as the only asset) produces a wrong-looking iOS icon; iOS applies its own appearance treatments to the single full-bleed asset.",
        fix:
          "Change the themed/monochrome icon to a single full-color square asset.",
        sources: [
          { label: "Android Developers — Adaptive icons", url: "https://developer.android.com/develop/ui/compose/system/icon_design_adaptive" },
          { label: "Apple HIG — App icons", url: "https://developer.apple.com/design/human-interface-guidelines/app-icons" },
        ],
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

/** Order index of each check id: category order, then check order within category. */
export const CHECK_ORDER: Record<string, number> = Object.fromEntries(
  TAXONOMY.flatMap((category, ci) =>
    category.checks.map((check, i) => [check.id, ci * 1000 + i]),
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
