"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";

/**
 * Shapr3D-style quick actions: tap a body with the pen or a finger and the
 * most used commands appear right beside it. It replaces "hold for the menu",
 * which a careful pen kept triggering by accident.
 *
 * It listens for the "layerling:tap" event the workplane sends after a tap
 * (never a mouse click) and goes away on the next touch of the plate, when the
 * selection empties, or after a command.
 */
export type QuickActionBarProps = {
  selectionCount: number;
  allHoles: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleHole: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onFillet: () => void;
  /** Opens the full right-click menu at this point. */
  onMore: (clientX: number, clientY: number) => void;
};

type TapDetail = { clientX: number; clientY: number; pointerType: string; shapeId: string | null };

const MARGIN = 10;
const OFFSET_Y = 70;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function QuickActionBar(props: QuickActionBarProps) {
  const { selectionCount } = props;
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onTap = (event: Event) => {
      const detail = (event as CustomEvent<TapDetail>).detail;
      if (!detail || detail.pointerType === "mouse") return;
      setAnchor(detail.shapeId ? { x: detail.clientX, y: detail.clientY } : null);
    };
    const hideOnPlate = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".quick-action-bar")) return;
      setAnchor(null);
    };
    const hide = () => setAnchor(null);
    window.addEventListener("layerling:tap", onTap);
    window.addEventListener("pointerdown", hideOnPlate, true);
    window.addEventListener("keydown", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("layerling:tap", onTap);
      window.removeEventListener("pointerdown", hideOnPlate, true);
      window.removeEventListener("keydown", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  useEffect(() => {
    if (selectionCount === 0) setAnchor(null);
  }, [selectionCount]);

  // Above the tap, kept on screen; below it when there is no room above.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!anchor || !bar) {
      setPosition(null);
      return;
    }
    const width = bar.offsetWidth;
    const height = bar.offsetHeight;
    let top = anchor.y - OFFSET_Y - height / 2;
    if (top < MARGIN + 50) top = anchor.y + OFFSET_Y - height / 2;
    const left = Math.min(Math.max(anchor.x - width / 2, MARGIN), window.innerWidth - width - MARGIN);
    setPosition({ left, top: Math.min(Math.max(top, MARGIN), window.innerHeight - height - MARGIN) });
  }, [anchor, props.canGroup, props.canUngroup]);

  if (!anchor || selectionCount === 0) return null;

  const run = (action: () => void, keepOpen = false) => () => {
    action();
    if (!keepOpen) setAnchor(null);
  };

  return (
    <div
      ref={barRef}
      className="quick-action-bar"
      role="toolbar"
      aria-label={t("quick.bar")}
      style={position ? { left: position.left, top: position.top } : { visibility: "hidden" }}
    >
      <button type="button" onClick={run(props.onDuplicate)} aria-label={t("tablet.duplicate")}>
        <Icon><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></Icon>
        <span>{t("quick.duplicate")}</span>
      </button>
      <button type="button" onClick={run(props.onToggleHole, true)} aria-label={props.allHoles ? t("quick.makeSolid") : t("quick.makeHole")}>
        {props.allHoles ? (
          <Icon><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fillOpacity="0.25" /></Icon>
        ) : (
          <Icon><rect x="5" y="5" width="14" height="14" rx="2" strokeDasharray="3 2.5" /></Icon>
        )}
        <span>{props.allHoles ? t("quick.solid") : t("quick.hole")}</span>
      </button>
      {props.canGroup ? (
        <button type="button" onClick={run(props.onGroup)} aria-label={t("quick.group")}>
          <Icon><rect x="3.5" y="3.5" width="10" height="10" rx="1.5" /><rect x="10.5" y="10.5" width="10" height="10" rx="1.5" /></Icon>
          <span>{t("quick.group")}</span>
        </button>
      ) : null}
      {props.canUngroup ? (
        <button type="button" onClick={run(props.onUngroup)} aria-label={t("quick.ungroup")}>
          <Icon><rect x="3.5" y="3.5" width="8" height="8" rx="1.5" /><rect x="12.5" y="12.5" width="8" height="8" rx="1.5" /></Icon>
          <span>{t("quick.ungroup")}</span>
        </button>
      ) : null}
      <button type="button" onClick={run(props.onFillet)} aria-label={t("quick.fillet")}>
        <Icon><path d="M4 20V10a6 6 0 0 1 6-6h10" /></Icon>
        <span>{t("quick.fillet")}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          const at = anchor;
          setAnchor(null);
          if (at) window.setTimeout(() => props.onMore(at.x, at.y), 0);
        }}
        aria-label={t("quick.more")}
      >
        <Icon><circle cx="5.5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" /></Icon>
        <span>{t("quick.more")}</span>
      </button>
      <button type="button" className="is-danger" onClick={run(props.onDelete)} aria-label={t("tablet.delete")}>
        <Icon><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></Icon>
        <span>{t("quick.delete")}</span>
      </button>
    </div>
  );
}
