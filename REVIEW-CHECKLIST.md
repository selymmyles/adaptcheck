# AdaptCheck — Bidirectional Checklist (red-pen draft)

Myles — this is the knowledge base the AI checks screenshots against, now in **both directions**. Your UX eye is the product here: mark anything that's wrong, missing, mis-severitized, or phrased like an engineer instead of a designer.
Severity key: 🔴 must fix · 🟡 should fix · ⚪ consider polishing.

How to read each line: **check title** + severity — source pattern → target pattern. *Why* gives the rationale.

---

# Direction: iOS → Android (19 checks)

## Navigation

- **Back gesture and behavior** 🔴 `[nav-back-behavior]` — iOS: Edge-swipe from the left plus an in-app back chevron; interactive pop transition tied to the gesture. → Android: System predictive back (Android 14+) that previews the previous destination; back applies to the whole task stack. *Why: Android users rely on the system back affordance. Duplicating an in-app chevron on every screen creates conflicting navigation and breaks predictive-back previews.*
- **Bottom tab bar styling** 🟡 `[nav-tab-bar]` — iOS: Translucent bottom tab bar, icon above label, no selection container. → Android: Material navigation bar on a tonal surface container with an active-indicator pill behind the selected icon. *Why: An iOS-styled tab bar reads as a port. The active-indicator pill is the platform signal for selection on Android.*
- **Large collapsing titles** 🟡 `[nav-large-titles]` — iOS: Large title that collapses into the navigation bar on scroll. → Android: Material top app bar with a scroll behavior (small, center-aligned, medium, or large) matched to the screen's hierarchy. *Why: iOS large titles don't collapse the Material way. A medium or large top app bar gives the same hierarchy without looking ported.*
- **Modal presentation and dismissal** 🔴 `[nav-modal]` — iOS: Card-style modal that slides up and dismisses with a swipe-down gesture. → Android: Modal bottom sheet with a drag handle and scrim, or a full-screen dialog for complex flows. *Why: Swipe-to-dismiss cards don't exist in Material. Bottom sheets with drag handles are the expected dismiss gesture on Android.*

## Typography

- **System font swap (SF Pro)** 🔴 `[type-font]` — iOS: SF Pro / SF Pro Rounded as the system typeface. → Android: Roboto, or the brand font with a proper Android license. *Why: SF Pro is not licensed for Android. Ship Roboto or re-license the brand font — silent fallback to Roboto looks broken.*
- **Type scale roles** 🟡 `[type-scale]` — iOS: iOS text styles (large title, title 1–3, headline, body, callout, footnote). → Android: Material 3 type-scale roles (display, headline, title, body, label — large/medium/small). *Why: Mapping sizes by eye produces inconsistent hierarchy. Re-mapping to Material roles keeps text, spacing, and accessibility scaling coherent.*

## Components

- **Alerts** 🟡 `[comp-alert]` — iOS: Centered alert with vertically stacked action buttons. → Android: Material dialog: tonal container, title and body, actions as right-aligned text buttons. *Why: iOS-style stacked-button alerts are an instant 'ported' signal. Material dialogs use text-button actions aligned to the trailing edge.*
- **Action sheets** 🟡 `[comp-action-sheet]` — iOS: iOS action sheet sliding up from the bottom with a cancel row. → Android: Modal bottom sheet: list of options, drag handle, scrim; no separate cancel row needed. *Why: Action sheets map almost 1:1 to bottom sheets — keep the option list, restyle the container and drop the iOS cancel pattern.*
- **Floating action button** ⚪ `[comp-fab]` — iOS: No iOS equivalent — commonly added as a floating circular button. → Android: Material FAB: bottom-trailing, 16dp margins, above the navigation bar, carrying the single primary action; correct elevation and size variant. *Why: Adding a FAB is fine, but it must follow Material placement, elevation, and size rules — not float like an iOS overlay.*
- **Steppers and segmented controls** ⚪ `[comp-segmented]` — iOS: iOS stepper and segmented control (pill-in-track look). → Android: Material segmented buttons: individually outlined buttons in single-select or multi-select configuration. *Why: The iOS pill-in-track segmented control has a distinct look; Material segmented buttons are outlined per-button and behave differently in multi-select.*
- **Date pickers** 🔴 `[comp-date-picker]` — iOS: Spinner wheels (date/time drums). → Android: Material calendar date picker, or the input date picker for compact forms. *Why: Spinner wheels are the strongest 'ported from iOS' signal in forms. Switch to the calendar picker users expect.*
- **Switches** ⚪ `[comp-switch]` — iOS: iOS switch: pill track, circular thumb, green on-state. → Android: Material switch: 52×32dp, track with optional on/off icons, thumb with correct elevation. *Why: Close cousins, but the Material switch has distinct track styling and optional state icons — restyle to avoid the iOS look.*

## Touch targets & layout

- **Minimum touch target size** 🔴 `[touch-targets]` — iOS: 44×44pt minimum touch targets. → Android: 48×48dp minimum touch targets. *Why: 44pt controls fail Android accessibility scanners and feel cramped on denser Android displays. Bump interactive targets to 48dp.*
- **Safe area vs edge-to-edge** 🟡 `[layout-safe-area]` — iOS: Content inset to the iOS safe area, letterboxed below the home indicator. → Android: Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts. *Why: iOS-style letterboxing wastes screen on Android. Go edge-to-edge and handle insets per-component instead of padding the whole screen.*
- **Status and navigation bar treatment** ⚪ `[layout-status-bar]` — iOS: Opaque status bar background matched to the nav bar. → Android: Transparent status bar over edge-to-edge content with light/dark icon control via WindowInsetsController. *Why: Hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.*

## Motion

- **Screen transition patterns** 🟡 `[motion-transitions]` — iOS: Push/pop with spring curves tied to the swipe-back gesture. → Android: Material emphasized easing with container transform, fade-through, or shared-axis transitions matched to the navigation relationship. *Why: iOS springs feel wrong on Android. Pick the Material transition that matches the relationship (container transform for cards, shared axis for lateral moves).*
- **Duration and easing tokens** ⚪ `[motion-duration]` — iOS: iOS default durations and spring damping tuned by feel. → Android: Material motion tokens: short/medium/long durations with standard and emphasized easing curves. *Why: A shared motion token system keeps transitions consistent across the app and feeling native to the platform.*

## Iconography

- **Icon set (SF Symbols)** 🔴 `[icon-symbols]` — iOS: SF Symbols with Apple-defined weights and variants. → Android: Material Symbols: outlined and filled variants, optical sizes, and weights chosen per usage. *Why: SF Symbols are Apple-licensed and unavailable on Android. Replace with Material Symbols, using filled vs outlined to signal active state.*
- **Tab icon sizing and feedback** ⚪ `[icon-tab-sizing]` — iOS: iOS tab-bar icons sized to Apple's metrics, selection shown by tint only. → Android: Material icons with state layers providing touch feedback and the active-indicator pill for selection. *Why: Selection feedback differs between platforms — add state layers so pressed and selected states read correctly on Android.*

---

# Direction: Android → iOS (19 checks)

## Navigation

- **Back behavior: system back → explicit chevron** 🔴 `[a2i-nav-back]` — Android: System back gesture or button; predictive back preview on Android 14+. Screens often ship with no in-app back affordance at all. → iOS: Explicit back chevron in the navigation bar on every pushed screen, plus iOS edge-swipe-to-go-back. There is no system back to fall back on. *Why: Android-first designs frequently omit back affordances entirely. On iOS that strands the user — every pushed screen needs its own chevron.*
- **Navigation drawer → tab bar** 🔴 `[a2i-nav-drawer]` — Android: Modal navigation drawer opened from a hamburger icon, listing every destination. → iOS: Tab bar with up to 5 primary destinations; overflow goes to a More tab. HIG has no drawer convention. *Why: Drawers don't exist in iOS conventions — iOS users won't look behind a hamburger. Promote destinations to a tab bar.*
- **Material tab row → segmented control** 🟡 `[a2i-nav-tabs]` — Android: Material tab row with an underline indicator on the active tab, scrollable or fixed. → iOS: Segmented control for switching views within a screen. iOS has no underline-indicator tab convention. *Why: The Material indicator tab reads as Android. iOS uses segmented controls for in-screen view switching.*
- **Bottom navigation bar styling** 🟡 `[a2i-nav-bottombar]` — Android: Material navigation bar on a tonal container with an active-indicator pill behind the selected icon. → iOS: iOS tab bar: translucent, icon above label, selection shown by tint only — no pill, no tonal container. *Why: The active-indicator pill is a Material signal. iOS selection is tint-only on a translucent bar.*

## Typography

- **System font swap (Roboto → SF)** 🔴 `[a2i-type-font]` — Android: Roboto as the system typeface. → iOS: SF Pro for UI text, SF Pro Text at small sizes; adopt HIG text styles throughout. *Why: Roboto on iOS is an instant port signal. SF is expected, free, and tuned for Apple text rendering.*
- **Type scale roles** 🟡 `[a2i-type-scale]` — Android: Material 3 type-scale roles (display, headline, title, body, label — large/medium/small). → iOS: HIG text styles (large title, title 1–3, headline, body, callout, subheadline, footnote, caption). *Why: Material roles don't map 1:1 to HIG styles. Re-mapping keeps hierarchy, spacing, and Dynamic Type scaling coherent.*

## Components

- **Floating action button → promoted action** 🔴 `[a2i-comp-fab]` — Android: FAB: bottom-trailing circular button carrying the screen's primary action, with Material elevation. → iOS: No FAB convention on iOS — promote the action to a navigation-bar button, toolbar item, or a primary button in content. *Why: A floating circle on iOS looks alien; HIG has no FAB. The action must live in the nav bar, toolbar, or content — not float over it.*
- **Material You dynamic color → fixed palette** 🟡 `[a2i-comp-dynamic-color]` — Android: Dynamic color: palette generated from the user's wallpaper at runtime (seed → tonal palettes). → iOS: Fixed light/dark palettes with semantic colors resolved at design time. No runtime palette generation on iOS. *Why: Dynamic color doesn't exist on iOS. Designs that depend on it need a resolved static palette or they'll ship unstyled.*
- **Material dialogs → alerts and action sheets** 🟡 `[a2i-comp-dialog]` — Android: Material dialog: tonal container, title and body, actions as trailing text buttons. → iOS: iOS alert: centered, with stacked (or side-by-side for two) action buttons; option lists become action sheets. *Why: Trailing text-button dialogs read as Android. iOS alerts stack their actions; lists of options belong in action sheets.*
- **Elevated cards → grouped backgrounds** 🟡 `[a2i-comp-cards]` — Android: Elevated cards with tonal surface colors and shadows to communicate hierarchy. → iOS: Flat grouped backgrounds with hairline separators. iOS uses minimal elevation — hierarchy comes from grouping, not shadow depth. *Why: Material's elevation language doesn't translate. HIG builds hierarchy with grouped backgrounds and separators, not shadows.*
- **Switches, checkboxes, and ripples** ⚪ `[a2i-comp-switch]` — Android: Material switch (52×32dp), Material checkboxes, and ripple touch feedback on pressables. → iOS: iOS switch: pill track, circular thumb, green on-state; iOS selection styling; pressed-state opacity instead of ripples. *Why: Ripples don't exist on iOS — they're the subtlest port signal. Swap to the iOS switch and replace ripples with highlight/opacity feedback.*
- **Snackbar → iOS transient feedback** ⚪ `[a2i-comp-snackbar]` — Android: Snackbar: transient bottom message above the navigation bar, often with an action. → iOS: No snackbar on iOS — use in-content banners, or minimal transient feedback that doesn't mimic a bottom bar. *Why: The bottom snackbar is a Material idiom. iOS has no equivalent; forcing one in reads as a port.*

## Touch targets & layout

- **Touch target size (48dp → 44pt)** ⚪ `[a2i-touch-targets]` — Android: 48×48dp minimum touch targets. → iOS: 44×44pt minimum touch targets on iOS. *Why: Going down in size is usually safe, but verify nothing lands below 44pt — and don't just scale everything down; re-check spacing and rhythm.*
- **Edge-to-edge → safe area** 🟡 `[a2i-layout-edge]` — Android: Edge-to-edge layout with WindowInsets handling for the status bar, gesture nav bar, and display cutouts. → iOS: Respect the iOS safe area — content inset below the notch/Dynamic Island and above the home indicator. Letterboxing here is correct, not wasteful. *Why: On Android, letterboxing wastes screen; on iOS the safe area is the convention. Don't bleed content into the notch or the home indicator.*
- **Status bar treatment** ⚪ `[a2i-layout-statusbar]` — Android: Transparent status bar over edge-to-edge content, icon colors controlled via WindowInsetsController. → iOS: iOS status bar style set per screen (.default / .lightContent). No transparency games — the system manages it. *Why: Android's programmatic status-bar control has no iOS equivalent. Set the style per screen and let the system handle the rest.*

## Motion

- **Material transitions → iOS navigation motion** 🟡 `[a2i-motion-transitions]` — Android: Material emphasized easing with container transform, fade-through, or shared-axis transitions. → iOS: iOS push/pop with ease-in-out and the interactive swipe-back gesture; modals slide up as sheets. *Why: Material transitions feel technical on iOS. Match the iOS navigation model: horizontal push/pop between peers, sheets from the bottom.*
- **Motion tokens → iOS animation curves** ⚪ `[a2i-motion-tokens]` — Android: Material motion tokens: short/medium/long durations with standard and emphasized easing. → iOS: UIView animation curves (ease-in-out, spring with damping and velocity). iOS has no shared token system by default — define one. *Why: Port the token discipline, not the token values. iOS springs and easing have a different feel than Material emphasized curves.*

## Iconography

- **Icon set (Material Symbols → SF Symbols)** 🔴 `[a2i-icon-symbols]` — Android: Material Symbols: outlined and filled variants, optical sizes, weights chosen per usage. → iOS: SF Symbols with Apple-defined weights and variants; match the symbol weight to the surrounding text style. *Why: Material Symbols on iOS are an instant port signal. SF Symbols are free and render correctly at every Apple-defined weight.*
- **Adaptive icons → squircle** 🟡 `[a2i-icon-adaptive]` — Android: Adaptive icon: foreground/background layers masked by the OEM (circle, squircle, teardrop, …). → iOS: Single squircle asset with continuous corners. iOS applies its own mask — there are no shape variants to design. *Why: Android's adaptive-icon system has no iOS equivalent. Ship one proper squircle; don't reuse an asset masked for a Pixel.*

---

*Reply with corrections (wrong / missing / wrong severity / rephrase), per check id. I'll fold them into `src/lib/taxonomy.ts` — check ids stay stable so the backend keeps working.*
