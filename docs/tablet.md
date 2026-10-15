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

## More room for the model (any screen)

- **⌃** in the top bar folds the whole toolbar (Home, Modify, Arrange,
  Manage, Help …) away; only the 3D Editor / Sketch tabs stay.
- **☰ Tools** then drops the toolbar down over the model for one pick and
  tucks it away again afterwards.
- **📌** brings the toolbar back for good. The choice is remembered; the
  toolbar starts open until you fold it.

## Icon names

- **Hold** any icon (finger or Pencil) for a moment and its name pops up.
  Lift while the name shows and nothing happens; a quick tap still runs it.
  Works on greyed-out icons too.
- **Hover** the Pencil over an icon (on iPads that support Pencil hover) to
  see its name.

## Touch and Pencil modes

Switch with the mode button in the bottom bar (☝️ Touch / ✏️ Pencil) or in
**Settings → Appearance → Touch input**. Pencil mode switches on by itself the
first time a pen touches the screen. The pen follows Shapr3D's rule, "your
finger is for the view, the Pencil is for creating", and behaves the same in
both modes.

### The pen

| Pen | Does |
| --- | --- |
| Tap a shape | Selects it and shows the quick bar |
| Tap empty space | Clears the selection |
| Quick drag on empty space | Turns the view (like a finger) |
| Hold still ~⅓ s, then drag | Selection box (a ring shows when it is ready) |
| Drag a shape or handle | Moves / resizes it (ignores small wobbles) |
| Double-tap a group or sketch | Opens it for editing |

### Fingers

| Gesture | Touch mode | Pencil mode |
| --- | --- | --- |
| Tap a shape | Selects it | Selects it |
| Tap empty space | Clears the selection | Clears the selection |
| One finger on a shape or handle | Moves / resizes it | Turns the view |
| One finger on empty space | Turns the view | Turns the view |
| Two fingers | Pan, pinch to zoom | Pan, pinch to zoom |
| Double-tap a shape | Opens a group / sketch | Zooms to the shape |
| Hold still on a shape | Right-click menu | — (use the quick bar's More) |
| Three fingers swipe left / right | Undo / redo | Undo / redo |
| Palm while the pen is down | — | Ignored |

### Quick bar

Tapping a shape with the pen or a finger shows a small bar beside it: **Copy,
Hole/Solid, Group** (several selected) or **Ungroup** (one group), **Round**
(fillet), **More** (the full right-click menu) and **Delete**. It goes away
when you touch the plate again.

The Apple Pencil Pro squeeze and the barrel double-tap only reach Apple's
native apps, not web pages, so they do nothing here.

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
