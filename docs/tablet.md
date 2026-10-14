# layerling on phones and tablets

This fork adds first-class support for iPhone, iPad and Android: a compact
phone layout, finger (Touch) and Apple Pencil input, palm rejection,
long-press menus and on-screen modifier keys.

## Install it like an app

- **iPhone / iPad (Safari):** open the site, tap **Share → Add to Home Screen**.
  It opens full screen with its own icon and keeps working offline after the
  first load.
- **Android (Chrome):** open the site, tap **⋮ → Install app** (or "Add to
  Home screen").

## Phone layout

Turns on by itself on phone-sized screens (portrait or landscape). Toggle it
with the 📱 button in the bottom bar or in **Settings → Appearance → Phone
layout** (Automatic / Always on / Off).

- The tool ribbon folds behind **☰ Tools**; it closes again after you pick a
  tool or touch the plate. **Add shape** opens the shape library as a sheet.
- Properties of the selected shape sit in a drawer at the bottom (a side panel
  in landscape). Tap its header to open or fold it.
- Footer, language picker and brand text are hidden; the view cube is smaller;
  the camera buttons start tucked away (tap **›** to open them).

## Touch and Pencil modes

Switch with the mode button in the bottom bar (☝️ Touch / ✏️ Pencil) or in
**Settings → Appearance → Touch input**. Pencil mode switches on by itself the
first time a pen touches the screen.

| Gesture | Touch mode | Pencil mode |
| --- | --- | --- |
| Pen / Apple Pencil | same as a mouse | select, drag, handles, sketch |
| One finger on a shape or handle | moves / resizes it | turns the view |
| One finger on the empty plate | turns the view | turns the view |
| Two fingers | pan, pinch to zoom | pan, pinch to zoom |
| Palm while the pen is down | — | ignored |
| Hold still (finger or pen) | right-click menu | right-click menu |

Fingers also get a little extra reach on the small transform handles.

## Tablet keys

The bottom bar stands in for the keyboard:

- **Shift / Alt / Ctrl** – tap once to hold the key for the next touch, tap
  twice to lock it on, tap again to release.
  - Alt + drag: drag a copy. Shift + drag: stay on one axis / keep proportions.
  - Shift + tap: add to the selection.
- **Undo, Redo, Duplicate, Delete, Search commands, Cancel**.
- On a phone the bar scrolls sideways; **⌄** hides it.

The bar only appears on touch devices or in the phone layout.

## Code

- `apps/web/src/lib/tabletInput.ts` – virtual modifiers, Touch/Pencil mode, palm rejection.
- `apps/web/src/lib/phoneMode.ts` – phone layout state (`<html data-phone>`).
- `apps/web/src/components/TabletBar.tsx` – the bottom bar.
- `apps/web/src/components/WorkplaneViewport.tsx` – finger routing, touch gate for the camera, long press.
- `apps/web/src/app/globals.css` – "Phone layout" and "Tablet keys" sections.
- `tests/unit/tabletInput.test.ts`, `tests/unit/phoneMode.test.ts` – unit tests.
