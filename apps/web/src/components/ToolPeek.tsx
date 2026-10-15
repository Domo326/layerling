"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Names for icons on touch screens, where there is no mouse to hover with.
 *
 * - Hold a finger or the Pencil on an icon for a moment: its name pops up
 *   above it. Lift while the name shows and nothing runs - it was a peek.
 *   A quick tap runs the button as always.
 * - Hover the Pencil over an icon (on iPads that report Pencil hover): the
 *   name shows, the same way a mouse shows the browser's tooltip.
 *
 * The name comes from the button's data-peek, aria-label or title.
 */
const HOLD_MS = 420;
const HOVER_MS = 280;
const MOVE_CANCEL_PIXELS = 12;
const PEEK_SELECTOR = "button, [role='button'], [role='tab'], [role='menuitem']";
/** The plate and the panels' number fields keep their own long press. */
const SKIP_SELECTOR = ".three-workplane-host, input, textarea, select, .quick-action-bar";

type Peek = { text: string; left: number; top: number; below: boolean };

function labelFor(element: Element): string | null {
  const text = element.getAttribute("data-peek") || element.getAttribute("aria-label") || element.getAttribute("title");
  return text?.trim() || null;
}

function peekFor(element: Element): Peek | null {
  const text = labelFor(element);
  if (!text) return null;
  const rect = element.getBoundingClientRect();
  const below = rect.top < 64;
  return { text, left: rect.left + rect.width / 2, top: below ? rect.bottom + 8 : rect.top - 8, below };
}

function targetFor(event: PointerEvent): Element | null {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(SKIP_SELECTOR)) return null;
  const button = target.closest(PEEK_SELECTOR);
  if (button && labelFor(button)) return button;
  // A greyed-out button ignores touches (pointer-events: none), so the touch
  // lands on the row behind it. Its name is still worth a peek: find the
  // button in that row whose box holds the point.
  const row = target.closest(".toolbar-section-tools, .camera-controls, .tablet-bar, .toolbar-section") ?? target;
  const { clientX: x, clientY: y } = event;
  const under = Array.from(row.querySelectorAll(PEEK_SELECTOR)).find((element) => {
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
  return under && labelFor(under) ? under : null;
}

export function ToolPeek() {
  const [peek, setPeek] = useState<Peek | null>(null);

  useEffect(() => {
    let holdTimer: number | null = null;
    let hoverTimer: number | null = null;
    let press: { pointerId: number; x: number; y: number; element: Element } | null = null;
    let peeked = false;
    let hovered: Element | null = null;

    const clearHold = () => {
      if (holdTimer !== null) window.clearTimeout(holdTimer);
      holdTimer = null;
    };
    const clearHover = () => {
      if (hoverTimer !== null) window.clearTimeout(hoverTimer);
      hoverTimer = null;
    };

    const onDown = (event: PointerEvent) => {
      clearHover();
      hovered = null;
      if (event.pointerType === "mouse") {
        setPeek(null);
        return;
      }
      const element = targetFor(event);
      clearHold();
      peeked = false;
      setPeek(null);
      if (!element) {
        press = null;
        return;
      }
      press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, element };
      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        if (!press) return;
        peeked = true;
        setPeek(peekFor(press.element));
      }, HOLD_MS);
    };

    const onMove = (event: PointerEvent) => {
      if (press && event.pointerId === press.pointerId) {
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_CANCEL_PIXELS) {
          clearHold();
          if (!peeked) press = null;
        }
        return;
      }
      // Pencil hover: a pen moving with nothing pressed.
      if (event.pointerType !== "pen" || event.buttons !== 0) return;
      const element = targetFor(event);
      if (element === hovered) return;
      hovered = element;
      clearHover();
      setPeek(null);
      if (element) hoverTimer = window.setTimeout(() => setPeek(peekFor(element)), HOVER_MS);
    };

    const onUp = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.pointerId) return;
      clearHold();
      press = null;
      if (peeked) {
        // It was a peek: swallow the click this lift would make.
        const swallow = (click: MouseEvent) => {
          click.preventDefault();
          click.stopImmediatePropagation();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);
        window.setTimeout(() => setPeek(null), 700);
        peeked = false;
      }
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "pen" && hovered && !(event.relatedTarget instanceof Element && hovered.contains(event.relatedTarget))) {
        const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest(PEEK_SELECTOR) : null;
        if (related !== hovered) {
          hovered = null;
          clearHover();
          setPeek(null);
        }
      }
    };

    const onCancel = () => {
      clearHold();
      press = null;
      peeked = false;
      setPeek(null);
    };

    // iOS shows its own callout menu on a long press of a link-like button.
    const onContextMenu = (event: Event) => {
      if (peeked || press) event.preventDefault();
    };

    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("pointerout", onLeave, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("scroll", onCancel, true);
    return () => {
      clearHold();
      clearHover();
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("pointerout", onLeave, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("scroll", onCancel, true);
    };
  }, []);

  if (!peek || typeof document === "undefined") return null;
  // On <body>, above every layer: the editor body is its own stacking layer
  // and sits under the toolbar, so a name drawn inside it would be hidden.
  return createPortal(
    <div
      className={`tool-peek${peek.below ? " is-below" : ""}`}
      role="tooltip"
      style={{ left: peek.left, top: peek.top }}
    >
      {peek.text}
    </div>,
    document.body,
  );
}
