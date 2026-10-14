/**
 * Phone mode: a compact editor layout for small screens.
 *
 * "auto" turns it on for phone-sized screens (narrow, or short in landscape);
 * "on" and "off" force it. While it is on, <html data-phone="on"> lets the
 * stylesheet fold the tool ribbon behind a Tools button, turn the properties
 * panel into a pull-up drawer, hide the footer and shrink the overlays.
 */

export type PhoneModePreference = "auto" | "on" | "off";

export type PhoneModeState = {
  preference: PhoneModePreference;
  /** The resolved state: is the compact layout on right now? */
  active: boolean;
  /** Phone mode only: the full tool ribbon is unfolded over the plate. */
  toolsOpen: boolean;
};

const STORAGE_KEY = "layerling.phoneMode";
/** Phones: narrow in portrait, or short in landscape. An iPad mini is neither. */
const PHONE_QUERY = "(max-width: 600px), (max-height: 500px)";

let state: PhoneModeState = { preference: "auto", active: false, toolsOpen: false };
const listeners = new Set<() => void>();
let installed = false;
let media: MediaQueryList | null = null;

function readPreference(): PhoneModePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off" || stored === "auto") return stored;
  } catch {
    // Storage blocked: auto.
  }
  return "auto";
}

function resolve(preference: PhoneModePreference): boolean {
  if (preference === "on") return true;
  if (preference === "off") return false;
  return media?.matches ?? false;
}

function applyToDocument() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.phone = state.active ? "on" : "off";
  if (state.active && state.toolsOpen) root.dataset.phoneTools = "open";
  else delete root.dataset.phoneTools;
}

function setState(next: Partial<PhoneModeState>) {
  const merged = { ...state, ...next };
  if (!merged.active) merged.toolsOpen = false;
  if (merged.preference === state.preference && merged.active === state.active && merged.toolsOpen === state.toolsOpen) return;
  state = merged;
  applyToDocument();
  listeners.forEach((listener) => listener());
}

export function getPhoneModeState(): PhoneModeState {
  return state;
}

export function subscribePhoneMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isPhoneModeActive(): boolean {
  return state.active;
}

export function setPhoneModePreference(preference: PhoneModePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not remembered.
  }
  setState({ preference, active: resolve(preference) });
}

export function setPhoneToolsOpen(open: boolean) {
  setState({ toolsOpen: open });
}

export function togglePhoneTools() {
  setState({ toolsOpen: !state.toolsOpen });
}

/** Read the preference, watch the screen size and keep <html data-phone> current. Safe to call repeatedly. */
export function installPhoneMode(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;
  media = window.matchMedia?.(PHONE_QUERY) ?? null;
  const preference = readPreference();
  state = { preference, active: resolve(preference), toolsOpen: false };
  applyToDocument();
  listeners.forEach((listener) => listener());
  const onChange = () => setState({ active: resolve(state.preference) });
  media?.addEventListener?.("change", onChange);
  return () => {
    installed = false;
    media?.removeEventListener?.("change", onChange);
  };
}
