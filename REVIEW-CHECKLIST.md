# AdaptCheck — iOS → Material 3 Checklist (red-pen draft)

Myles — this is the knowledge base the AI will check screenshots against. Your UX eye is the product here: mark anything that's wrong, missing, mis-severitized, or phrased like an engineer instead of a designer. Severity key: 🔴 must fix · 🟡 should fix · ⚪ consider polishing.

## Navigation

- **Back gesture and behavior** 🔴 — iOS: edge-swipe from the left + in-app back chevron, interactive pop tied to the gesture. → Android: system predictive back (Android 14+) previewing the previous destination; back applies to the whole task stack. *Why: Android users rely on the system back affordance; duplicating an in-app chevron on every screen creates conflicting navigation and breaks predictive-back previews.*
- **Modal presentation and dismissal** 🔴 — iOS: card-style modal, swipe-down to dismiss. → Android: modal bottom sheet with drag handle and scrim, or full-screen dialog for complex flows. *Why: swipe-to-dismiss cards don't exist in Material; bottom sheets with drag handles are the expected dismiss gesture.*
- **Bottom tab bar styling** 🟡 — iOS: translucent bar, icon above label, no selection container. → Android: navigation bar on a tonal surface container with an active-indicator pill behind the selected icon. *Why: an iOS-styled tab bar reads as a port; the active-indicator pill is the platform signal for selection.*
- **Large collapsing titles** 🟡 — iOS: large title collapsing into the nav bar on scroll. → Android: top app bar with a scroll behavior (small, center-aligned, medium, or large) matched to the screen's hierarchy. *Why: iOS large titles don't collapse the Material way; a medium/large top app bar gives the same hierarchy without looking ported.*

## Typography

- **System font swap (SF Pro)** 🔴 — iOS: SF Pro / SF Pro Rounded. → Android: Roboto, or the brand font with a proper Android license. *Why: SF Pro isn't licensed for Android — silent fallback to Roboto looks broken.*
- **Type scale roles** 🟡 — iOS: large title, title 1–3, headline, body, callout, footnote. → Android: Material 3 roles (display, headline, title, body, label — large/medium/small). *Why: mapping sizes by eye produces inconsistent hierarchy; Material roles keep text, spacing, and accessibility scaling coherent.*

## Components

- **Date pickers** 🔴 — iOS: spinner wheels (date/time drums). → Android: Material calendar date picker, or the input picker for compact forms. *Why: spinner wheels are the strongest "ported from iOS" signal in forms.*
- **Alerts** 🟡 — iOS: centered alert, vertically stacked action buttons. → Android: Material dialog — tonal container, title + body, actions as right-aligned text buttons. *Why: stacked-button alerts are an instant "ported" signal.*
- **Action sheets** 🟡 — iOS: sheet sliding up from the bottom with a cancel row. → Android: modal bottom sheet — option list, drag handle, scrim; no separate cancel row. *Why: near 1:1 mapping — keep the option list, restyle the container, drop the iOS cancel pattern.*
- **Steppers and segmented controls** ⚪ — iOS: stepper and segmented control (pill-in-track look). → Android: segmented buttons — individually outlined, single- or multi-select. *Why: the iOS pill-in-track has a distinct look; Material's are outlined per-button and behave differently in multi-select.*
- **Switches** ⚪ — iOS: pill track, circular thumb, green on-state. → Android: Material switch, 52×32dp, track with optional on/off icons, elevated thumb. *Why: close cousins, but Material's track styling and state icons differ — restyle to avoid the iOS look.*
- **Floating action button** ⚪ — iOS: no equivalent (commonly added as a floating circular button). → Android: FAB bottom-trailing, 16dp margins, above the nav bar, single primary action, correct elevation and size variant. *Why: adding a FAB is fine, but it must follow Material placement/elevation/size rules, not float like an iOS overlay.*

## Touch targets & layout

- **Minimum touch target size** 🔴 — iOS: 44×44pt. → Android: 48×48dp. *Why: 44pt controls fail Android accessibility scanners and feel cramped on denser displays.*
- **Safe area vs edge-to-edge** 🟡 — iOS: content inset to the safe area, letterboxed below the home indicator. → Android: edge-to-edge with WindowInsets handling for status bar, gesture nav bar, and cutouts. *Why: iOS-style letterboxing wastes screen; go edge-to-edge and handle insets per-component.*
- **Status and navigation bar treatment** ⚪ — iOS: opaque status bar background matched to the nav bar. → Android: transparent status bar over edge-to-edge content, light/dark icon control via WindowInsetsController. *Why: hardcoded status-bar backgrounds clash with edge-to-edge layouts and gesture navigation.*

## Motion

- **Screen transition patterns** 🟡 — iOS: push/pop with spring curves tied to swipe-back. → Android: Material emphasized easing with container transform, fade-through, or shared-axis transitions matched to the navigation relationship. *Why: iOS springs feel wrong on Android; pick the Material transition matching the relationship.*
- **Duration and easing tokens** ⚪ — iOS: default durations and spring damping tuned by feel. → Android: Material motion tokens — short/medium/long durations with standard and emphasized easing curves. *Why: shared tokens keep transitions consistent and feeling native.*

## Iconography

- **Icon set (SF Symbols)** 🔴 — iOS: SF Symbols with Apple-defined weights/variants. → Android: Material Symbols — outlined and filled variants, optical sizes, weights per usage. *Why: SF Symbols are Apple-licensed and unavailable on Android; use filled vs outlined to signal active state.*
- **Tab icon sizing and feedback** ⚪ — iOS: Apple metrics, selection shown by tint only. → Android: Material icons with state layers for touch feedback and the active-indicator pill for selection. *Why: selection feedback differs — add state layers so pressed/selected states read correctly.*

---

*Reply with corrections (wrong / missing / wrong severity / rephrase). I'll fold them into `src/lib/taxonomy.ts` — check ids stay stable so the future backend keeps working.*
