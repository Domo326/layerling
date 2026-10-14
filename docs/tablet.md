# layerling on iPad and Android tablets

This fork adds first-class tablet support: Apple Pencil / stylus input, palm
rejection, finger camera gestures, long-press menus and on-screen modifier keys.

## Install it like an app

- **iPad (Safari):** open the site, tap **Share → Add to Home Screen**. It opens
  full screen with its own icon and keeps working offline after the first load.
- **Android (Chrome):** open the site, tap **⋮ → Install app** (or "Add to Home
  screen").

## Pencil mode

Pencil mode switches on by itself the first time a pen touches the screen
(toggle it with the ✏️ button in the tablet keys).

| Input | Pencil mode on | Pencil mode off |
| --- | --- | --- |
| Pen / Apple Pencil | select, drag, handles, sketch | same as a mouse |
| One finger | turn the view | select and drag |
| Two fingers | zoom and pan | zoom and pan |
| Palm while the pen is down | ignored | — |
| Hold still (finger or pen) | right-click menu | right-click menu |

Pencil hover (on iPads and Pencils that support it) shows the same hover
highlights a mouse does.

## Tablet keys

A floating bar at the bottom of the editor stands in for the keyboard:

- **Shift / Alt / Ctrl** – tap once to hold the key for the next touch, tap
  twice to lock it on, tap again to release.
  - Alt + drag: drag a copy. Shift + drag: stay on one axis / keep proportions.
    Ctrl + drag: pan the view.
- **Undo, Redo, Duplicate, Delete, Search commands, Cancel**.
- **⌄** hides the bar; tap the small button to bring it back.

The bar only appears on touch devices.

## Code

- `apps/web/src/lib/tabletInput.ts` – virtual modifiers, Pencil mode, palm rejection.
- `apps/web/src/components/TabletBar.tsx` – the on-screen keys.
- `apps/web/src/components/WorkplaneViewport.tsx` – Pencil-mode finger routing and long press.
- `tests/unit/tabletInput.test.ts` – unit tests.
