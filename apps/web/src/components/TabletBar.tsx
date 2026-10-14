"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import {
  getPhoneModeState,
  installPhoneMode,
  setPhoneModePreference,
  setPhoneToolsOpen,
  subscribePhoneMode,
  togglePhoneTools,
} from "@/lib/phoneMode";
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
const SERVER_PHONE_STATE = getPhoneModeState();

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
  tools: <Icon><path d="M4 7h16M4 12h16M4 17h16" /></Icon>,
  shapes: <Icon><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></Icon>,
  touch: <Icon><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2" /><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.5L4.3 15.2a1.5 1.5 0 0 1 2.4-1.8L9 15.5V11" /></Icon>,
  phone: <Icon><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></Icon>,
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
  const phone = useSyncExternalStore(subscribePhoneMode, getPhoneModeState, () => SERVER_PHONE_STATE);
  const [collapsed, setCollapsed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  useEffect(() => installTabletInput(), []);
  useEffect(() => installPhoneMode(), []);
  useEffect(() => setCollapsed(readCollapsed()), []);

  // Phone mode: the unfolded tool ribbon closes again once a tool is picked or
  // the plate is touched, so the view comes straight back.
  useEffect(() => {
    if (!phone.toolsOpen) return;
    const ribbon = () => document.querySelector(".toolbar-mode-content");
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest("button");
      if (!button || !ribbon()?.contains(button)) return;
      // These two open a menu of their own; it needs the ribbon to stay.
      if (button.matches(".shape-menu-trigger, .visibility-menu-trigger")) return;
      window.setTimeout(() => setPhoneToolsOpen(false), 0);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || ribbon()?.contains(target) || target.closest("[data-tablet-bar], .toolbar-title-row, [role=dialog], .visibility-menu")) return;
      setPhoneToolsOpen(false);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [phone.toolsOpen]);

  if (!tablet.tabletDetected && !phone.active) return null;

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

  const openShapes = () => {
    setPhoneToolsOpen(false);
    // The Shapes button lives in the folded ribbon; pressing it opens the
    // library, which phone mode shows as a sheet of its own.
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(".toolbar-mode-content .shape-menu-trigger")?.click();
    }, 0);
  };

  const barClass = `tablet-bar${phone.active ? " is-phone" : ""}`;

  if (collapsed) {
    return (
      <div className={`${barClass} is-collapsed`} data-tablet-bar="" role="toolbar" aria-label={t("tablet.bar")}>
        <ActionButton label={t("tablet.expand")} icon={ICONS.expand} onClick={toggleCollapsed} />
      </div>
    );
  }

  const { modifiers } = tablet;
  const modifierGroup = (
    <div className="tablet-bar-group">
      <ModifierButton name="shift" label={t("tablet.shift")} hint={t("tablet.shiftHint")} state={modifiers.shift} />
      <ModifierButton name="alt" label={t("tablet.alt")} hint={t("tablet.altHint")} state={modifiers.alt} />
      <ModifierButton name="ctrl" label={t("tablet.ctrl")} hint={t("tablet.ctrlHint")} state={modifiers.ctrl} />
    </div>
  );
  const historyGroup = (
    <div className="tablet-bar-group">
      <ActionButton label={t("tablet.undo")} icon={ICONS.undo} onClick={() => sendShortcut("z", { ctrl: true, code: "KeyZ" })} />
      <ActionButton label={t("tablet.redo")} icon={ICONS.redo} onClick={() => sendShortcut("y", { ctrl: true, code: "KeyY" })} />
    </div>
  );
  const editGroup = (
    <div className="tablet-bar-group">
      <ActionButton label={t("tablet.duplicate")} icon={ICONS.duplicate} onClick={() => sendShortcut("d", { ctrl: true, code: "KeyD" })} />
      <ActionButton label={t("tablet.delete")} icon={ICONS.delete} danger onClick={() => sendShortcut("Delete", { code: "Delete" })} />
    </div>
  );
  const commandGroup = (
    <div className="tablet-bar-group">
      <ActionButton label={t("tablet.search")} icon={ICONS.search} onClick={() => sendShortcut("k", { ctrl: true, code: "KeyK" })} />
      <ActionButton label={t("tablet.escape")} icon={ICONS.escape} onClick={() => sendShortcut("Escape", { code: "Escape" })} />
    </div>
  );
  const modeButton = (
      <button
        type="button"
        className={`tablet-bar-key tablet-bar-mode ${tablet.pencilMode ? "is-pencil" : "is-touch"}`}
        aria-label={tablet.pencilMode ? t("tablet.pencilOn") : t("tablet.touchOn")}
        title={tablet.pencilMode ? t("tablet.pencilHint") : t("tablet.touchHint")}
        onClick={() => setPencilMode(!tablet.pencilMode)}
      >
        {tablet.pencilMode ? ICONS.pencil : ICONS.touch}
        <span className="tablet-bar-mode-label">{tablet.pencilMode ? t("tablet.pencilShort") : t("tablet.touchShort")}</span>
      </button>
  );
  const phoneButton = (
      <button
        type="button"
        className={`tablet-bar-key tablet-bar-phone${phone.active ? " is-on" : ""}`}
        aria-pressed={phone.active}
        aria-label={phone.active ? t("tablet.phoneOn") : t("tablet.phoneOff")}
        title={t("tablet.phoneHint")}
        onClick={() => setPhoneModePreference(phone.active ? "off" : "on")}
      >
        {ICONS.phone}
      </button>
  );
  const modeGroup = (
    <div className="tablet-bar-group">
      {modeButton}
      {phoneButton}
      <ActionButton label={t("tablet.collapse")} icon={ICONS.collapse} onClick={toggleCollapsed} />
    </div>
  );
  const divider = (key: string) => <span key={key} className="tablet-bar-divider" aria-hidden="true" />;

  if (phone.active) {
    return (
      <div
        className={`${barClass}${scrolledToEnd ? " is-scrolled-end" : ""}`}
        data-tablet-bar=""
        role="toolbar"
        aria-label={t("tablet.bar")}
        onScroll={(event) => {
          const bar = event.currentTarget;
          setScrolledToEnd(bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 4);
        }}
      >
        <div className="tablet-bar-group">
          <button
            type="button"
            className={`tablet-bar-key tablet-bar-tools${phone.toolsOpen ? " is-on" : ""}`}
            aria-expanded={phone.toolsOpen}
            aria-label={phone.toolsOpen ? t("tablet.toolsHide") : t("tablet.tools")}
            title={t("tablet.tools")}
            onClick={togglePhoneTools}
          >
            {ICONS.tools}
          </button>
          <ActionButton label={t("tablet.shapes")} icon={ICONS.shapes} onClick={openShapes} />
        </div>
        {divider("d1")}
        {historyGroup}
        <div className="tablet-bar-group">
          <ActionButton label={t("tablet.delete")} icon={ICONS.delete} danger onClick={() => sendShortcut("Delete", { code: "Delete" })} />
          {modeButton}
        </div>
        {divider("d2")}
        {modifierGroup}
        {divider("d3")}
        <div className="tablet-bar-group">
          <ActionButton label={t("tablet.duplicate")} icon={ICONS.duplicate} onClick={() => sendShortcut("d", { ctrl: true, code: "KeyD" })} />
          <ActionButton label={t("tablet.search")} icon={ICONS.search} onClick={() => sendShortcut("k", { ctrl: true, code: "KeyK" })} />
          <ActionButton label={t("tablet.escape")} icon={ICONS.escape} onClick={() => sendShortcut("Escape", { code: "Escape" })} />
          {phoneButton}
          <ActionButton label={t("tablet.collapse")} icon={ICONS.collapse} onClick={toggleCollapsed} />
        </div>
      </div>
    );
  }

  return (
    <div className={barClass} data-tablet-bar="" role="toolbar" aria-label={t("tablet.bar")}>
      {modifierGroup}
      {divider("d1")}
      {historyGroup}
      {divider("d2")}
      {editGroup}
      {divider("d3")}
      {commandGroup}
      {divider("d4")}
      {modeGroup}
    </div>
  );
}
