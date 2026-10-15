"use client";

import { useEffect, useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import {
  getPhoneModeState,
  installPhoneMode,
  setRibbonFolded,
  subscribePhoneMode,
  togglePhoneTools,
} from "@/lib/phoneMode";

const SERVER_STATE = getPhoneModeState();

/**
 * Fold the tool ribbon away for more room on the plate, on any screen.
 * Open: one ⌃ button folds it. Folded: "☰ Tools" drops the ribbon down over
 * the plate for one pick (it tucks itself away again after), and the pin
 * keeps it open for good. Phones have their own Tools button in the bottom
 * bar, so these stay out of the way there.
 */
export function RibbonFoldControls() {
  const phone = useSyncExternalStore(subscribePhoneMode, getPhoneModeState, () => SERVER_STATE);
  useEffect(() => installPhoneMode(), []);
  if (phone.active) return null;

  if (!phone.ribbonFolded) {
    return (
      <button
        type="button"
        className="ribbon-fold-button"
        aria-label={t("ribbon.fold")}
        data-peek={t("ribbon.fold")}
        onClick={() => setRibbonFolded(true)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    );
  }

  return (
    <span className="ribbon-fold-group">
      <button
        type="button"
        className={`ribbon-fold-button ribbon-tools-button${phone.toolsOpen ? " is-on" : ""}`}
        aria-expanded={phone.toolsOpen}
        aria-label={phone.toolsOpen ? t("tablet.toolsHide") : t("tablet.tools")}
        onClick={togglePhoneTools}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span>{t("tablet.tools")}</span>
      </button>
      <button
        type="button"
        className="ribbon-fold-button"
        aria-label={t("ribbon.unfold")}
        data-peek={t("ribbon.unfold")}
        onClick={() => setRibbonFolded(false)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 4h6l-1 6 3 3H7l3-3-1-6Z" />
          <path d="M12 13v7" />
        </svg>
      </button>
    </span>
  );
}
