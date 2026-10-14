/**
 * Tablet input: Apple Pencil / stylus, palm rejection and on-screen modifier keys.
 *
 * Layerling reads Shift, Alt and Ctrl straight off pointer events (Alt-drag copies,
 * Shift locks an axis, Ctrl-drag pans). A tablet without a keyboard has none of
 * these, so the tablet bar can switch them on "virtually": while one is active,
 * every pointer and mouse event that reaches the page reports it as held. The
 * flag is laid over the event in a window capture listener, the very first stop
 * of every event, so React and OrbitControls both see it.
 *
 * Modifiers work like the Shift key on an iPad keyboard: one tap arms it for the
 * next gesture, a double tap locks it until it is tapped again.
 *
 * Pencil mode: once a pen has touched the screen, the pen does the precise work
 * (select, drag, handles) and fingers only steer the camera - one finger turns
 * the view, two zoom and pan. While the pen is down, finger touches are dropped
 * entirely, so a resting palm cannot move or select anything.
 */

export type ModifierName = "shift" | "alt" | "ctrl";
export type ModifierState = "off" | "once" | "locked";

export type TabletInputState = {
  modifiers: Record<ModifierName, ModifierState>;
  /** A pen has been used on this device (or the user switched the mode on). */
  pencilMode: boolean;
  /** The user switched Pencil mode off by hand; a pen touch no longer turns it back on. */
  pencilModeDismissed: boolean;
  /** The device reports a touch screen or a pen has been seen. */
  tabletDetected: boolean;
};

const PENCIL_MODE_STORAGE_KEY = "layerling.tablet.pencilMode";
const BAR_EXCLUDE_SELECTOR = "[data-tablet-bar]";
const POINTER_EVENTS = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "mousedown",
  "mousemove",
  "mouseup",
  "click",
  "dblclick",
  "contextmenu",
] as const;

let state: TabletInputState = {
  modifiers: { shift: "off", alt: "off", ctrl: "off" },
  pencilMode: false,
  pencilModeDismissed: false,
  tabletDetected: false,
};
const listeners = new Set<() => void>();
const activePens = new Set<number>();
const rejectedTouches = new Set<number>();
let installed = false;
let releaseTimer: number | null = null;
let gestureUsedModifier = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: Partial<TabletInputState>) {
  state = { ...state, ...next };
  emit();
}

function readStoredPencilMode(): boolean | null {
  try {
    const stored = window.localStorage.getItem(PENCIL_MODE_STORAGE_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
  } catch {
    // Private mode or blocked storage: fall back to detection.
  }
  return null;
}

function storePencilMode(on: boolean) {
  try {
    window.localStorage.setItem(PENCIL_MODE_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Not fatal; the mode just is not remembered.
  }
}

export function getTabletInputState(): TabletInputState {
  return state;
}

export function subscribeTabletInput(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while fingers should only steer the camera (a pen does the editing). */
export function isPencilMode(): boolean {
  return state.pencilMode;
}

/** Touch mode: fingers edit what they land on and turn the view on the empty plate. */
export function isTouchMode(): boolean {
  return !state.pencilMode;
}

/** True while a pen is pressed against the screen. */
export function isPenDown(): boolean {
  return activePens.size > 0;
}

export function setPencilMode(on: boolean) {
  storePencilMode(on);
  setState({ pencilMode: on, pencilModeDismissed: !on });
}

/**
 * One tap: off -> once. Tap again while armed: locked (a double tap).
 * Tap while locked: off.
 */
export function tapModifier(name: ModifierName) {
  const current = state.modifiers[name];
  const next: ModifierState = current === "off" ? "once" : current === "once" ? "locked" : "off";
  setState({ modifiers: { ...state.modifiers, [name]: next } });
}

export function clearModifiers() {
  setState({ modifiers: { shift: "off", alt: "off", ctrl: "off" } });
}

function anyModifierActive(): boolean {
  const { shift, alt, ctrl } = state.modifiers;
  return shift !== "off" || alt !== "off" || ctrl !== "off";
}

function releaseOnceModifiers() {
  const { modifiers } = state;
  const next = {
    shift: modifiers.shift === "once" ? "off" : modifiers.shift,
    alt: modifiers.alt === "once" ? "off" : modifiers.alt,
    ctrl: modifiers.ctrl === "once" ? "off" : modifiers.ctrl,
  } as Record<ModifierName, ModifierState>;
  if (next.shift !== modifiers.shift || next.alt !== modifiers.alt || next.ctrl !== modifiers.ctrl) {
    setState({ modifiers: next });
  }
}

function fromTabletBar(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && target.closest(BAR_EXCLUDE_SELECTOR) !== null;
}

function overlayModifiers(event: Event) {
  const { shift, alt, ctrl } = state.modifiers;
  const define = (key: "shiftKey" | "altKey" | "ctrlKey") => {
    try {
      Object.defineProperty(event, key, { value: true, configurable: true });
    } catch {
      // A frozen or exotic event; leave it alone.
    }
  };
  if (shift !== "off") define("shiftKey");
  if (alt !== "off") define("altKey");
  if (ctrl !== "off") define("ctrlKey");
}

function handlePointerLike(event: Event) {
  const pointer = event instanceof PointerEvent ? event : null;

  // Track pens and turn Pencil mode on the first time one touches down.
  if (pointer?.pointerType === "pen") {
    if (event.type === "pointerdown") {
      activePens.add(pointer.pointerId);
      if (!state.tabletDetected) setState({ tabletDetected: true });
      if (!state.pencilMode && !state.pencilModeDismissed) {
        storePencilMode(true);
        setState({ pencilMode: true });
      }
    } else if (event.type === "pointerup" || event.type === "pointercancel") {
      activePens.delete(pointer.pointerId);
    }
  }

  // Palm rejection: while a pen is down, finger touches never reach the app.
  if (pointer?.pointerType === "touch") {
    if (event.type === "pointerdown" && activePens.size > 0 && !fromTabletBar(event)) {
      rejectedTouches.add(pointer.pointerId);
    }
    if (rejectedTouches.has(pointer.pointerId)) {
      if (event.type === "pointerup" || event.type === "pointercancel") rejectedTouches.delete(pointer.pointerId);
      event.stopImmediatePropagation();
      if (event.cancelable) event.preventDefault();
      return;
    }
  }

  if (!anyModifierActive() || fromTabletBar(event)) return;
  overlayModifiers(event);

  if (event.type === "pointerdown") gestureUsedModifier = true;
  if ((event.type === "pointerup" || event.type === "pointercancel") && gestureUsedModifier && pointer?.isPrimary !== false) {
    gestureUsedModifier = false;
    // Keep the modifier for the click that follows the pointerup, then let a
    // one-shot modifier go.
    if (releaseTimer !== null) window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      releaseTimer = null;
      releaseOnceModifiers();
    }, 350);
  }
}

/** Fire a keyboard shortcut as if it had been typed, for the tablet bar buttons. */
export function sendShortcut(key: string, options: { ctrl?: boolean; shift?: boolean; alt?: boolean; code?: string } = {}) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  const init: KeyboardEventInit = {
    key,
    code: options.code,
    bubbles: true,
    cancelable: true,
    shiftKey: Boolean(options.shift),
    altKey: Boolean(options.alt),
    // The editor treats Ctrl and Cmd alike; send the one this platform would.
    ctrlKey: Boolean(options.ctrl) && !isMac,
    metaKey: Boolean(options.ctrl) && isMac,
  };
  const target = document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", init));
  target.dispatchEvent(new KeyboardEvent("keyup", init));
}

function detectTablet(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(any-pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 1;
}

/** Install the window listeners once. Safe to call repeatedly. */
export function installTabletInput(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;
  const stored = readStoredPencilMode();
  setState({
    tabletDetected: detectTablet(),
    pencilMode: stored === true,
    pencilModeDismissed: stored === false,
  });
  POINTER_EVENTS.forEach((name) => window.addEventListener(name, handlePointerLike, { capture: true }));
  const media = window.matchMedia?.("(any-pointer: coarse)");
  const onMediaChange = () => setState({ tabletDetected: detectTablet() || state.tabletDetected });
  media?.addEventListener?.("change", onMediaChange);
  return () => {
    installed = false;
    POINTER_EVENTS.forEach((name) => window.removeEventListener(name, handlePointerLike, { capture: true }));
    media?.removeEventListener?.("change", onMediaChange);
  };
}
