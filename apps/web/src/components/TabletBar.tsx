"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import {
  getTabletInputState,
  installTabletInput,
  sendShortcut,
  setPencilMode,
  subscribeTabletInput,
  tapModifier,
  type ModifierName,
  type ModifierState,
} from "@/lib/tabletInput";

const COLLAPSED_STORAGE_KEY = "layerling.tablet.barCollapsed";

const SERVER_STATE = getTabletInputState();

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  undo: <Icon><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>,
  redo: <Icon><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icon>,
  duplicate: <Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></Icon>,
  delete: <Icon><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></Icon>,
  search: <Icon><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>,
  escape: <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>,
  pencil: <Icon><path d="M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20Z" /><path d="m14.5 6 3.5 3.5" /></Icon>,
  collapse: <Icon><path d="m6 9 6 6 6-6" /></Icon>,
  expand: <Icon><path d="m6 15 6-6 6 6" /></Icon>,
};

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function ModifierButton({ name, label, hint, state }: { name: ModifierName; label: string; hint: string; state: ModifierState }) {
  const stateLabel = state === "locked" ? t("tablet.locked") : state === "once" ? t("tablet.once") : "";
  return (
    <button
      type="button"
      className={`tablet-bar-key tablet-bar-modifier is-${state}`}
      aria-pressed={state !== "off"}
      aria-label={stateLabel ? `${label} (${stateLabel})` : label}
      title={hint}
      onClick={() => tapModifier(name)}
    >
      <span className="tablet-bar-modifier-label">{label}</span>
      <span className="tablet-bar-modifier-dot" aria-hidden="true" />
    </button>
  );
}

function ActionButton({ label, icon, onClick, danger }: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`tablet-bar-key${danger ? " is-danger" : ""}`} aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
}

/**
 * The floating keyboard stand-in for tablets: Shift, Alt and Ctrl as tap keys,
 * the everyday shortcuts as buttons, and the Pencil mode switch. It only shows
 * on devices with a touch screen or once a pen has been used.
 */
export function TabletBar() {
  const tablet = useSyncExternalStore(subscribeTabletInput, getTabletInputState, () => SERVER_STATE);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => installTabletInput(), []);
  useEffect(() => setCollapsed(readCollapsed()), []);

  if (!tablet.tabletDetected) return null;

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Not remembered; harmless.
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="tablet-bar is-collapsed" data-tablet-bar="" role="toolbar" aria-label={t("tablet.bar")}>
        <ActionButton label={t("tablet.expand")} icon={ICONS.expand} onClick={toggleCollapsed} />
      </div>
    );
  }

  const { modifiers } = tablet;
  return (
    <div className="tablet-bar" data-tablet-bar="" role="toolbar" aria-label={t("tablet.bar")}>
      <div className="tablet-bar-group">
        <ModifierButton name="shift" label={t("tablet.shift")} hint={t("tablet.shiftHint")} state={modifiers.shift} />
        <ModifierButton name="alt" label={t("tablet.alt")} hint={t("tablet.altHint")} state={modifiers.alt} />
        <ModifierButton name="ctrl" label={t("tablet.ctrl")} hint={t("tablet.ctrlHint")} state={modifiers.ctrl} />
      </div>
      <span className="tablet-bar-divider" aria-hidden="true" />
      <div className="tablet-bar-group">
        <ActionButton label={t("tablet.undo")} icon={ICONS.undo} onClick={() => sendShortcut("z", { ctrl: true, code: "KeyZ" })} />
        <ActionButton label={t("tablet.redo")} icon={ICONS.redo} onClick={() => sendShortcut("y", { ctrl: true, code: "KeyY" })} />
      </div>
      <span className="tablet-bar-divider" aria-hidden="true" />
      <div className="tablet-bar-group">
        <ActionButton label={t("tablet.duplicate")} icon={ICONS.duplicate} onClick={() => sendShortcut("d", { ctrl: true, code: "KeyD" })} />
        <ActionButton label={t("tablet.delete")} icon={ICONS.delete} danger onClick={() => sendShortcut("Delete", { code: "Delete" })} />
      </div>
      <span className="tablet-bar-divider" aria-hidden="true" />
      <div className="tablet-bar-group">
        <ActionButton label={t("tablet.search")} icon={ICONS.search} onClick={() => sendShortcut("k", { ctrl: true, code: "KeyK" })} />
        <ActionButton label={t("tablet.escape")} icon={ICONS.escape} onClick={() => sendShortcut("Escape", { code: "Escape" })} />
      </div>
      <span className="tablet-bar-divider" aria-hidden="true" />
      <div className="tablet-bar-group">
        <button
          type="button"
          className={`tablet-bar-key tablet-bar-pencil${tablet.pencilMode ? " is-on" : ""}`}
          aria-pressed={tablet.pencilMode}
          aria-label={tablet.pencilMode ? t("tablet.pencilOn") : t("tablet.pencilOff")}
          title={t("tablet.pencilHint")}
          onClick={() => setPencilMode(!tablet.pencilMode)}
        >
          {ICONS.pencil}
        </button>
        <ActionButton label={t("tablet.collapse")} icon={ICONS.collapse} onClick={toggleCollapsed} />
      </div>
    </div>
  );
}
