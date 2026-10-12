# Janus — Bidirectional Checklist (red-pen draft)

Myles — this is the knowledge base Janus checks screenshots against, now with a one-line **FIX** per check. Your job: red-pen the FIX lines and the patterns for product judgment — clarity, plain language, anything missing. The official docs supply the authority (citations under each check).

Format per check: **Title** — source pattern → target pattern. **Fix:** the one-liner. *Why* gives the rationale.

## Navigation — iOS → Android (4 checks)

- **Top navigation bar and back behavior** `[nav-back-behavior]` — Top-of-screen navigation cluster — in-app back chevron, title, and right-side action buttons as separate floating elements — plus an edge-swipe pop gesture. → A single Material top app bar: the back chevron becomes the navigation icon and the right-side buttons become actions, all in one bar. System predictive back (Android 14+) replaces the in-app edge-swipe pop.
  - **Fix:** Change the floating top buttons to a Material top app bar — the back chevron becomes the navigation icon and the right-side buttons become actions — and use the system predictive back gesture instead of the in-app edge-swipe pop.
  - *Why: On iOS the top buttons are separate elements; on Material they become one top app bar — navigation icon plus actions in a single bar. The in-app edge-swipe pop duplicates the system predictive-back gesture.*
  - Sources: [Material 3 — Top app bar guidelines](https://m3.material.io/components/app-bars/guidelines); [Android Developers — Predictive back gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture); [Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- **Bottom tab bar styling** `[nav-tab-bar]` — Translucent bottom tab bar, icon above label, no selection container. → Material navigation bar on a tonal surface container with an active-indicator pill behind the selected icon.
  - **Fix:** Change the translucent iOS tab bar to the Material navigation bar with the active-indicator pill.
  - *Why: An iOS-styled tab bar reads as a port. The active-indicator pill is the platform signal for selection on Android.*
  - Sources: [Material 3 — Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines); [Material 3 — Navigation bar overview](https://m3.material.io/components/navigation-bar/overview); [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- **Large collapsing titles** `[nav-large-titles]` — Large title that collapses into the navigation bar on scroll. → Material top app bar (small, center-aligned, medium flexible, or large flexible) matched to the screen's hierarchy; medium flexible and large flexible compress to the small bar on scroll
  - **Fix:** Change the collapsing large title to a Material top app bar (medium or large flexible).
  - *Why: iOS large titles don't collapse the Material way. A medium or large top app bar gives the same hierarchy without looking ported.*
  - Sources: [Material 3 — Top app bar guidelines](https://m3.material.io/components/app-bars/guidelines); [Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- **Modal presentation and dismissal** `[nav-modal]` — Card-style modal that slides up and dismisses with a swipe-down gesture. → Modal bottom sheet with a drag handle and scrim, or a full-screen dialog for complex flows.
  - **Fix:** Change the card-style swipe-to-dismiss modal to a Material bottom sheet with a drag handle.
  - *Why: Material's analog is a modal bottom sheet (scrim + optional drag handle) or a full-screen dialog for complex flows. Swipe-down dismissal does exist in Material — a modal bottom sheet can be dismissed by swiping it down — but the drag handle and scrim are the expected affordances.*
  - Sources: [Material 3 — Bottom sheets guidelines](https://m3.material.io/components/bottom-sheets/guidelines); [Material 3 — Dialogs guidelines](https://m3.material.io/components/dialogs/guidelines); [Apple HIG — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

## Navigation — Android → iOS (5 checks)

- **Back behavior: system back → explicit chevron** `[a2i-nav-back]` — System back gesture or button; predictive back preview on Android 14+. Screens often ship with no in-app back affordance at all. → Explicit back chevron in the navigation bar on every pushed screen, plus iOS edge-swipe-to-go-back. There is no system back to fall back on.
  - **Fix:** Change the system-back-only navigation to an explicit back chevron plus iOS edge-swipe on every pushed screen.
  - *Why: Android-first designs frequently omit back affordances entirely. On iOS that strands the user — every pushed screen needs its own chevron.*
  - Sources: [Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars); [Apple HIG — Navigation](https://developer.apple.com/design/human-interface-guidelines/navigation)
- **Navigation drawer → tab bar** `[a2i-nav-drawer]` — Modal navigation drawer opened from a hamburger icon, listing every destination. → Tab bar with about five or fewer primary destinations; do not overflow into a 'More' tab — restructure the IA (use a sidebar for complex hierarchies on larger layouts). iOS has no iPhone drawer convention; hamburger-hidden navigation strands users.
  - **Fix:** Change the hamburger navigation drawer to a tab bar with five or fewer destinations.
  - *Why: Drawers don't exist in iOS conventions — iOS users won't look behind a hamburger. Promote destinations to a tab bar.*
  - Sources: [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars); [Material 3 — Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines)
- **Material tab row → segmented control** `[a2i-nav-tabs]` — Material tab row with an underline indicator on the active tab, scrollable or fixed. → Segmented control for switching views within a screen. iOS has no underline-indicator tab convention.
  - **Fix:** Change the Material underline tab row to an iOS segmented control.
  - *Why: The Material indicator tab reads as Android. iOS uses segmented controls for in-screen view switching.*
  - Sources: [Material 3 — Tabs guidelines](https://m3.material.io/components/tabs/guidelines); [Apple HIG — Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
- **Bottom navigation bar styling** `[a2i-nav-bottombar]` — Material navigation bar on a tonal container with an active-indicator pill behind the selected icon. → iOS tab bar: translucent, icon above label, selection shown by tint only — no pill, no tonal container.
  - **Fix:** Change the Material navigation bar to the Apple tab bar: translucent, tint-only selection, no pill.
  - *Why: The active-indicator pill is a Material signal. iOS selection is tint-only on a translucent bar.*
  - Sources: [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars); [Material 3 — Navigation bar guidelines](https://m3.material.io/components/navigation-bar/guidelines)
- **Full-screen dialog close affordance** `[a2i-nav-fullscreen-dialog]` — Material full-screen dialog with an X close icon in the app bar, confirm-by-basic-dialog on unsaved discard → iOS full-screen cover with Cancel (leading) / Done or Save (trailing) in the navigation bar — no X icon; swipe-down disabled for completion-required flows
  - **Fix:** Change the Material full-screen dialog (X close icon) to an iOS full-screen cover with Cancel/Done.
  - *Why: Material's full-screen dialog convention (X icon, discard-confirmation dialog) doesn't exist on iOS. HIG sheets use Cancel-leading/confirm-trailing placement and explicit Done/Cancel; importing the X affordance plus a confirmation dialog reads as Android.*
  - Sources: [Material 3 — Dialogs guidelines](https://m3.material.io/components/dialogs/guidelines); [Apple HIG — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

## Typography — iOS → Android (2 checks)

- **System font swap (SF Pro)** `[type-font]` — SF Pro / SF Pro Rounded as the system typeface. → Roboto, or the brand font with a proper Android license.
  - **Fix:** Change SF Pro to Roboto (or your licensed brand font).
  - *Why: SF Pro is not licensed for Android. Ship Roboto or re-license the brand font — silent fallback to Roboto looks broken.*
  - Sources: [Apple Fonts](https://developer.apple.com/fonts/); [Material 3 — Typography overview](https://m3.material.io/styles/typography/overview)
- **Type scale roles** `[type-scale]` — iOS text styles (Large Title, Title 1-3, Headline, Body, Callout, Subheadline, Footnote, Caption 1-2) → Material 3 type-scale roles (display, headline, title, body, label — large/medium/small).
  - **Fix:** Change the iOS text styles to Material 3 type-scale roles.
  - *Why: Mapping sizes by eye produces inconsistent hierarchy. Re-mapping to Material roles keeps text, spacing, and accessibility scaling coherent.*
  - Sources: [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography); [Material 3 — Typography overview](https://m3.material.io/styles/typography/overview)

## Typography — Android → iOS (2 checks)

- **System font swap (Roboto → SF)** `[a2i-type-font]` — Roboto as the system typeface. → SF Pro for UI text, SF Pro Text at small sizes; adopt HIG text styles throughout.
  - **Fix:** Change Roboto to SF Pro (SF Pro Text at small sizes).
  - *Why: Roboto on iOS is an instant port signal. SF (system font) is expected and optically tuned for Apple text rendering — SF Pro Text below 20pt, SF Pro Display at/above 20pt; adopt HIG text styles throughout.*
  - Sources: [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography); [Apple Fonts](https://developer.apple.com/fonts/)
- **Type scale roles** `[a2i-type-scale]` — Material 3 type-scale roles (display, headline, title, body, label — large/medium/small). → HIG text styles (Large Title, Title 1-3, Headline, Body, Callout, Subheadline, Footnote, Caption 1-2)
  - **Fix:** Change the Material 3 type-scale roles to HIG text styles.
  - *Why: Material roles don't map 1:1 to HIG styles. Re-mapping keeps hierarchy, spacing, and Dynamic Type scaling coherent.*
  - Sources: [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography); [Material 3 — Typography overview](https://m3.material.io/styles/typography/overview)

## Components — iOS → Android (9 checks)

- **Alerts** `[comp-alert]` — Centered alert with vertically stacked action buttons. → Material dialog: surfaceContainerHigh container, headline and supporting text, actions as right-aligned text buttons
  - **Fix:** Change the centered iOS alert to a Material dialog with right-aligned text buttons.
  - *Why: iOS-style stacked-button alerts are an instant 'ported' signal. Material dialogs use text-button actions aligned to the trailing edge (confirmation closest to the edge); stacked actions are a documented Caution for long button text (confirming above dismissing), not forbidden.*
  - Sources: [Material 3 — Dialogs](https://m3.material.io/components/dialogs/overview); [Material 3 — Buttons guidelines](https://m3.material.io/components/buttons/guidelines); [Apple HIG — Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- **Action sheets** `[comp-action-sheet]` — iOS action sheet sliding up from the bottom with a cancel row. → Modal bottom sheet: list of options, drag handle, scrim; no separate cancel row needed.
  - **Fix:** Change the iOS action sheet to a Material modal bottom sheet.
  - *Why: Action sheets map almost 1:1 to bottom sheets — keep the option list, restyle the container and drop the iOS cancel pattern.*
  - Sources: [Apple HIG — Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets); [Material 3 — Bottom sheets](https://m3.material.io/components/bottom-sheets/overview)
- **Floating action button** `[comp-fab]` — No iOS equivalent — commonly added as a floating circular button. → Material FAB: bottom-trailing, 16dp margins, above the navigation bar, carrying the single primary action; correct elevation and size variant.
  - **Fix:** Change the floating circular button to a Material FAB: bottom-trailing, 16dp margins. If it sits beside a bottom bar that opens an input modal, convert the cluster into a Material 3 Search Bar instead (56dp fully-rounded container; actions become the bar's leading/trailing icon buttons; tapping it opens the full input surface, the SearchView pattern).
  - *Why: Adding a FAB is fine, but it must follow Material placement, elevation, and size rules — not float like an iOS overlay.*
  - Sources: [Material 3 — FAB](https://m3.material.io/components/floating-action-button/overview); [Material Components Android — FloatingActionButton](https://github.com/material-components/material-components-android/blob/master/docs/components/FloatingActionButton.md)
- **Search bar / prompt bar** `[comp-searchbar]` — iOS search field (rounded, magnifier + placeholder) or a floating bottom prompt bar (e.g. AI chat trigger) with detached circular action buttons beside it. → Material 3 Search Bar: 56dp fully-rounded container, leading icon button, supporting text, up to two trailing icons; detached buttons fold into the bar's leading/trailing slots, and tapping the bar opens the full input surface (SearchView pattern).
  - **Fix:** Change the search field / prompt bar cluster to a Material 3 Search Bar: 56dp fully-rounded container; move adjacent buttons into the leading/trailing icon slots.
  - *Why: An iOS search field or floating prompt cluster has no direct transplant equivalent; Material's Search Bar is the native container, and its leading/trailing slots absorb the adjacent action buttons instead of floating separate FABs.*
  - Sources: [Material 3 — Search](https://m3.material.io/components/search/overview); [Apple HIG — Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)
- **Segmented controls** `[comp-segmented]` — iOS stepper and segmented control (pill-in-track look). → Material segmented buttons: one outlined container split into segments with shared borders; selection shown with a checkmark (Selected icon); single-select (exactly one) or multi-select (none to all). Note: M3 Expressive no longer recommends segmented buttons — use the connected button group instead.
  - **Fix:** Change the iOS segmented control to Material segmented buttons.
  - *Why: The iOS pill-in-track segmented control has a distinct look; Material segmented buttons are outlined per-button and behave differently in multi-select.*
  - Sources: [Material 3 — Segmented buttons](https://m3.material.io/components/segmented-buttons/overview); [Apple HIG — Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
- **Date pickers** `[comp-date-picker]` — Spinner wheels (date/time drums). → Material date picker: modal calendar dialog for casual selection; modal date input (keyboard entry) when the user knows the exact date; docked picker on medium/expanded screens; full-screen for ranges
  - **Fix:** Change the spinner date wheels to the Material calendar date picker.
  - *Why: Spinner wheels are the strongest 'ported from iOS' signal in forms. Switch to the calendar picker users expect.*
  - Sources: [Material 3 — Date pickers](https://m3.material.io/components/date-pickers/overview); [Apple HIG — Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)
- **Switches** `[comp-switch]` — iOS switch: pill track, circular thumb, green on-state. → Material switch: 52x32dp track, handle (M3's term — 'thumb' is the old name; 16dp unselected / 24dp selected / 28dp pressed), optional state icon (X / checkmark) inside the handle
  - **Fix:** Change the iOS switch to the Material switch (52x32dp, icon in the handle).
  - *Why: Close cousins, but the Material switch has distinct track styling and optional state icons — restyle to avoid the iOS look.*
  - Sources: [Material 3 — Switch](https://m3.material.io/components/switch/overview); [Apple HIG — Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)
- **Time pickers** `[comp-time-picker]` — iOS spinner drums (wheels style) for hour/minute/AM-PM → Material dial time picker (clock-face dial selector) or input time picker (keyboard entry); keyboard icon toggles between them
  - **Fix:** Change the iOS time spinner drums to the Material dial time picker.
  - *Why: Same ported-signal class as date pickers: iOS drums have no M3 equivalent. M3 time selection is a dial mimicking a watch face, with keyboard input as the fallback.*
  - Sources: [Material 3 — Time pickers](https://m3.material.io/components/time-pickers/overview); [Apple HIG — Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers)
- **Steppers** `[comp-stepper]` — iOS stepper: two-segment +/- control sitting next to the value field it changes → No M3 stepper exists — rebuild with paired icon buttons, or a slider when the value is a range
  - **Fix:** Change the iOS stepper to paired Material icon buttons (or a slider for ranges).
  - *Why: M3's value-selection control is the slider (standard/centered/range); a stepper ports as paired +/- icon buttons.*
  - Sources: [Apple HIG — Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers); [Material 3 — Sliders](https://m3.material.io/components/sliders/overview)

## Components — Android → iOS (9 checks)

- **Floating action button → promoted action** `[a2i-comp-fab]` — FAB: bottom-trailing circular button carrying the screen's primary action, with Material elevation. → No FAB convention on iOS — promote the action to a navigation-bar button, toolbar item, or a primary button in content.
  - **Fix:** Change the FAB to a navigation-bar button, toolbar item, or primary button in content.
  - *Why: A floating circle on iOS looks alien; HIG has no FAB. The action must live in the nav bar, toolbar, or content — not float over it.*
  - Sources: [Apple HIG — Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars); [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- **Material You dynamic color → fixed palette** `[a2i-comp-dynamic-color]` — Dynamic color: palette generated from the user's wallpaper at runtime (seed → tonal palettes). → Fixed light/dark palettes with semantic colors resolved at design time. No runtime palette generation on iOS.
  - **Fix:** Change the wallpaper-generated dynamic palette to fixed light/dark palettes.
  - *Why: Dynamic color doesn't exist on iOS. Designs that depend on it need a resolved static palette or they'll ship unstyled.*
  - Sources: [Material 3 — Color system](https://m3.material.io/styles/color/system/overview); [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color)
- **Search bar → iOS search field** `[a2i-comp-searchbar]` — Material 3 Search Bar: 56dp fully-rounded container with leading/trailing icon slots, opening a full-screen search view. → Native iOS search field: rounded editable field with magnifier icon, clear button, and placeholder text; scope bars/tokens where applicable.
  - **Fix:** Change the Material Search Bar to a native iOS search field (magnifier, clear button, placeholder).
  - *Why: The Material Search Bar's slots, container treatment, and search-view pattern don't exist on iOS; iOS uses its own search field idiom.*
  - Sources: [Apple HIG — Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields); [Material 3 — Search](https://m3.material.io/components/search/overview)
- **Material dialogs → alerts and action sheets** `[a2i-comp-dialog]` — Material dialog: surfaceContainerHigh container, headline and supporting text, actions as trailing text buttons → iOS alert: centered, with stacked (or side-by-side for two) action buttons; option lists become action sheets.
  - **Fix:** Change the Material dialog to a centered iOS alert with stacked action buttons.
  - *Why: Trailing text-button dialogs read as Android. iOS alerts stack their actions; lists of options belong in action sheets.*
  - Sources: [Material 3 — Dialogs](https://m3.material.io/components/dialogs/overview); [Apple HIG — Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- **Elevated cards → grouped backgrounds** `[a2i-comp-cards]` — Elevated cards with tonal surface colors and shadows to communicate hierarchy. → Flat grouped backgrounds with hairline separators. iOS uses minimal elevation — hierarchy comes from grouping, not shadow depth.
  - **Fix:** Change the elevated cards to flat grouped backgrounds with hairline separators.
  - *Why: Material's elevation language doesn't translate. HIG builds hierarchy with grouped backgrounds and separators, not shadows.*
  - Sources: [Apple HIG — Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables); [Material 3 — Cards](https://m3.material.io/components/cards/overview)
- **Switches, checkboxes, and ripples** `[a2i-comp-switch]` — Material switch (52×32dp), Material checkboxes, and ripple touch feedback on pressables. → iOS switch: pill track, circular thumb, green on-state — and use the switch style ONLY in a list row; iOS selection styling (rounded-square checkbox, blue fill, white checkmark); system press-state highlight instead of ripples
  - **Fix:** Change the Material switch to the iOS switch — and only use it in a list row.
  - *Why: Ripples don't exist on iOS — they're the subtlest port signal. Swap to the iOS switch and replace ripples with highlight/opacity feedback.*
  - Sources: [Apple HIG — Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles); [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons); [Material 3 — Switch](https://m3.material.io/components/switch/overview)
- **Snackbar → iOS transient feedback** `[a2i-comp-snackbar]` — Snackbar: transient bottom message above the navigation bar, often with an action. → No snackbar on iOS — use in-content status indicators (the HIG's Mail-offline pattern), never a bottom bar
  - **Fix:** Change the snackbar to an in-content status indicator.
  - *Why: The bottom snackbar is a Material idiom. iOS has no equivalent; forcing one in reads as a port.*
  - Sources: [Material 3 — Snackbar](https://m3.material.io/components/snackbar/overview); [Apple HIG — Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
- **Button styles → iOS button hierarchy** `[a2i-comp-buttons]` — M3's five emphasis-ordered button styles: elevated, filled, tonal, outlined, text → iOS button styles: one .borderedProminent button per view for the primary action, .bordered for secondary, .borderless/.plain for tertiary; title-style capitalization (M3 uses sentence case)
  - **Fix:** Change the five M3 button styles to iOS button styles (one .borderedProminent primary per view).
  - *Why: M3's filled/tonal/outlined/text ladder has no 1:1 iOS mapping; porting it verbatim yields off-hierarchy buttons. HIG reserves the prominent style for the single most likely action.*
  - Sources: [Material 3 — Buttons guidelines](https://m3.material.io/components/buttons/guidelines); [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- **Date/time pickers → iOS picker styles** `[a2i-comp-pickers]` — Material modal calendar date picker and dial time picker → iOS picker styles: compact (button opening a calendar/time modal), inline (calendar view or wheels), or wheels (scrolling drums)
  - **Fix:** Change the Material calendar/dial pickers to the iOS picker style (compact, inline, or wheels).
  - *Why: The reverse of the date/time checks: an M3 calendar dialog or clock dial on iOS reads as Android. iOS offers compact, inline, and wheels styles.*
  - Sources: [Apple HIG — Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers); [Material 3 — Date pickers](https://m3.material.io/components/date-pickers/overview)

## Touch targets & layout — iOS → Android (4 checks)

- **Minimum touch target size** `[touch-targets]` — 44x44pt recommended hit region (HIG Accessibility: iOS default control size 44x44pt; hard minimum 28x28pt) → 48×48dp minimum touch targets.
  - **Fix:** Change 44pt touch targets to 48dp minimum touch targets.
  - *Why: 44pt controls fall below Android's 48dp accessibility floor and get flagged by Google's Accessibility Scanner. (Note: dp and pt are both density-independent, so there is no 'denser display' size difference — 44pt and 44dp are the same physical size.) Bump interactive targets to 48dp.*
  - Sources: [Apple HIG — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons); [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility); [Material 3 — Accessible design](https://m3.material.io/foundations/designing/structure)
- **Safe area vs edge-to-edge** `[layout-safe-area]` — Content inset to the iOS safe area, letterboxed below the home indicator. → Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts.
  - **Fix:** Change the letterboxed safe-area layout to edge-to-edge with WindowInsets handling.
  - *Why: iOS-style letterboxing wastes screen on Android. Go edge-to-edge and handle insets per-component instead of padding the whole screen.*
  - Sources: [Android Developers — Window insets](https://developer.android.com/develop/ui/views/layout/insets); [Android Developers — Edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- **Status and navigation bar treatment** `[layout-status-bar]` — only when the app itself paints an opaque background behind the status bar (e.g. nav-bar color extending under the time). Never flag the phone's own system status bar (time, wifi, battery icons); that is device chrome, not the app. Opaque status bar background matched to the nav bar. → Transparent status bar over edge-to-edge content with light/dark icon control via WindowInsetsController.
  - **Fix:** Change the opaque status bar to a transparent one over edge-to-edge content.
  - *Why: Hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.*
  - Sources: [Android Developers — Edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge); [Android Developers — WindowInsetsController](https://developer.android.com/reference/android/view/WindowInsetsController)
- **System gesture insets vs edge gestures** `[layout-gesture-insets]` — Edge-swipe gestures (e.g. swipe-back) freely usable near screen edges → Keep interactive controls, tap targets, and app-owned horizontal swipes clear of system gesture insets — those edge zones take priority for the system back/home gestures
  - **Fix:** Change edge-adjacent controls to clear the system gesture insets.
  - *Why: On Android the system reserves gesture-navigation edge zones; app gestures there are overridden by the OS.*
  - Sources: [Android Developers — Window insets](https://developer.android.com/develop/ui/views/layout/insets)

## Touch targets & layout — Android → iOS (3 checks)

- **Touch target size (48dp → 44pt)** `[a2i-touch-targets]` — 48×48dp minimum touch targets. → 44×44pt minimum touch targets on iOS.
  - **Fix:** Change 48dp touch targets to 44pt minimum touch targets.
  - *Why: Going down in size is usually safe, but verify nothing lands below 44pt — and don't just scale everything down; re-check spacing and rhythm.*
  - Sources: [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility); [Material 3 — Accessible design](https://m3.material.io/foundations/designing/structure)
- **Edge-to-edge → safe area** `[a2i-layout-edge]` — Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts. → Respect the iOS safe area — keep interactive content below the notch/Dynamic Island and above the home indicator, while letting backgrounds and scrolling content extend edge to edge. Do NOT add black bars/letterbox to hide the notch or home indicator
  - **Fix:** Change the edge-to-edge layout to respect the iOS safe area (notch, Dynamic Island, home indicator).
  - *Why: On Android, letterboxing wastes screen; on iOS the safe area is the convention. Don't bleed content into the notch or the home indicator.*
  - Sources: [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- **Status bar treatment** `[a2i-layout-statusbar]` — only when the app itself manages the status bar area programmatically. Never flag the phone's own system status bar (time, wifi, battery icons); that is device chrome, not the app. Transparent status bar over edge-to-edge content, icon colors controlled via WindowInsetsController. → iOS status bar style set per screen via preferredStatusBarStyle (.default / .lightContent / .darkContent). No transparency games — the system manages it
  - **Fix:** Change the transparent status bar to per-screen preferredStatusBarStyle.
  - *Why: Android's programmatic status-bar control has no iOS equivalent. Set the style per screen and let the system handle the rest.*
  - Sources: [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

## Motion — iOS → Android (3 checks)

- **Screen transition patterns** `[motion-transitions]` — Push/pop with spring curves tied to the swipe-back gesture. → Material emphasized easing with the M3 transition pattern matched to the navigation relationship: container transform (card/list to detail), forward and backward (hierarchical push/pop), lateral (peer content like tabs), top level (unrelated destinations, e.g. nav-bar switches)
  - **Fix:** Change the iOS push/pop spring transitions to the matching Material motion pattern.
  - *Why: iOS springs feel wrong on Android. Pick the Material transition that matches the relationship (container transform for cards, lateral for peer moves, top level for destination switches).*
  - Sources: [Material 3 — Transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns); [Material 3 — Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
- **Duration and easing tokens** `[motion-duration]` — iOS default durations and spring damping tuned by feel. → Material motion tokens: short/medium/long durations with standard and emphasized easing curves.
  - **Fix:** Change feel-tuned iOS durations to Material motion tokens.
  - *Why: A shared motion token system keeps transitions consistent across the app and feeling native to the platform.*
  - Sources: [Material 3 — Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs); [Material Components Android — Motion theming](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
- **Back-gesture animation (custom swipe-back)** `[motion-predictive-back]` — Swipe-from-left-edge interactive pop tied to the navigation stack → Predictive back gesture: opt in via android:enableOnBackInvokedCallback and the Navigation component's built-in handling — the system drives the back animation and previews the destination; do not re-implement a custom swipe-back
  - **Fix:** Change the custom swipe-back handling to opt into the predictive back gesture.
  - *Why: Android's back model is system-owned and animated by the OS, including cross-activity transitions. A hand-rolled swipe-back fights the platform gesture, duplicates the system animation, and breaks predictive-back previews.*
  - Sources: [Android Developers — Predictive back gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture); [Material 3 — Transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns)

## Motion — Android → iOS (2 checks)

- **Material transitions → iOS navigation motion** `[a2i-motion-transitions]` — Material emphasized easing with M3 transitions (container transform, forward and backward, lateral, top level) → iOS push/pop with the system's parallax transition and the interactive swipe-back gesture; modals present as sheets from the bottom
  - **Fix:** Change the Material transitions to the iOS parallax push/pop with interactive swipe-back.
  - *Why: Material transitions feel technical on iOS. Match the iOS navigation model: horizontal push/pop between peers, sheets from the bottom.*
  - Sources: [Material 3 — Transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns)
- **Motion tokens → iOS animation curves** `[a2i-motion-tokens]` — Material motion tokens: short/medium/long durations with standard and emphasized easing. → UIView animation curves (ease-in-out, spring with damping and velocity). iOS has no shared token system by default — define one.
  - **Fix:** Change the Material motion tokens to UIView animation curves (ease-in-out, spring).
  - *Why: Port the token discipline, not the token values. iOS springs and easing have a different feel than Material emphasized curves.*
  - Sources: [Material 3 — Easing and duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)

## Iconography — iOS → Android (2 checks)

- **Icon set (SF Symbols)** `[icon-symbols]` — SF Symbols with Apple-defined weights and variants. → Material Symbols: outlined, rounded, and sharp styles; fill, weight, grade, and optical-size axes chosen per usage
  - **Fix:** Change SF Symbols to Material Symbols (outlined, rounded, or sharp).
  - *Why: SF Symbols are system-provided images licensed solely for apps on Apple platforms (Xcode and Apple SDKs Agreement section 2.10) — not permitted in Android apps. Replace with Material Symbols (Apache 2.0), using filled vs outlined to signal active state*
  - Sources: [Apple — SF Symbols](https://developer.apple.com/sf-symbols/); [Apple — Xcode and Apple SDKs Agreement](https://www.apple.com/legal/sla/docs/xcode.pdf); [Google — material-design-icons (Apache 2.0)](https://github.com/google/material-design-icons)
- **Tab icon sizing and feedback** `[icon-tab-sizing]` — iOS tab-bar icons sized to Apple's metrics, selection shown by tint only. → Material icons with state layers providing touch feedback and the active-indicator pill for selection.
  - **Fix:** Change tint-only tab icons to Material icons with state layers and the active-indicator pill.
  - *Why: Selection feedback differs between platforms — add state layers so pressed and selected states read correctly on Android.*
  - Sources: [Material 3 — Navigation bar specs](https://m3.material.io/components/navigation-bar/specs)

## Iconography — Android → iOS (3 checks)

- **Icon set (Material Symbols → SF Symbols)** `[a2i-icon-symbols]` — Material Symbols: outlined and filled variants, optical sizes, weights chosen per usage. → SF Symbols with Apple-defined weights and variants; match the symbol weight to the surrounding text style.
  - **Fix:** Change Material Symbols to SF Symbols, matching weight to the text style.
  - *Why: Material Symbols on iOS are an instant port signal. SF Symbols are free and render correctly at every Apple-defined weight.*
  - Sources: [Apple HIG — SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols/overview/); [Google — material-design-icons (Apache 2.0)](https://github.com/google/material-design-icons)
- **Adaptive icons → squircle** `[a2i-icon-adaptive]` — Adaptive icon: foreground/background layers (108x108dp each, 66x66dp safe zone, 18dp reserved per side) masked by the OEM (circle, squircle, teardrop, ...); optional monochrome layer for themed icons → Single full-bleed square 1024x1024 asset with NO pre-rounded corners. iOS applies its own rounded-rectangle mask (continuous corners); providing pre-masked layers double-applies the mask and degrades specular effects
  - **Fix:** Change the adaptive icon layers to a single full-bleed 1024x1024 square asset.
  - *Why: Android's adaptive-icon system has no iOS equivalent. Ship one proper squircle; don't reuse an asset masked for a Pixel.*
  - Sources: [Android Developers — Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive); [Apple HIG — App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- **Themed/monochrome icon layer** `[a2i-icon-themed]` — Adaptive icon with a monochrome layer enabling Android 13+ themed icons (Material You tinting) → No themed-icon equivalent on iOS — drop the monochrome layer and ship one full-color square asset; iOS handles light/dark/tinted appearances itself
  - **Fix:** Change the themed/monochrome icon to a single full-color square asset.
  - *Why: The monochrome layer exists only for Android's user-theming pipeline. Porting it (or leaving it as the only asset) produces a wrong-looking iOS icon; iOS applies its own appearance treatments to the single full-bleed asset.*
  - Sources: [Android Developers — Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive); [Apple HIG — App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
