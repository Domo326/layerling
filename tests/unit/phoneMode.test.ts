// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PhoneModule = typeof import("@/lib/phoneMode");
let phone: PhoneModule;
let uninstall: () => void;
let phoneSized = false;
const mediaListeners = new Set<() => void>();

function setScreen(isPhone: boolean) {
  phoneSized = isPhone;
  mediaListeners.forEach((listener) => listener());
}

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  delete document.documentElement.dataset.phone;
  delete document.documentElement.dataset.phoneTools;
  delete document.documentElement.dataset.ribbon;
  phoneSized = false;
  mediaListeners.clear();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return phoneSized;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
  phone = await import("@/lib/phoneMode");
});

afterEach(() => uninstall?.());

describe("phone mode", () => {
  it("follows the screen size on auto", () => {
    uninstall = phone.installPhoneMode();
    expect(phone.isPhoneModeActive()).toBe(false);
    expect(document.documentElement.dataset.phone).toBe("off");
    setScreen(true);
    expect(phone.isPhoneModeActive()).toBe(true);
    expect(document.documentElement.dataset.phone).toBe("on");
  });

  it("can be forced on or off and remembers it", () => {
    uninstall = phone.installPhoneMode();
    phone.setPhoneModePreference("on");
    expect(phone.isPhoneModeActive()).toBe(true);
    expect(window.localStorage.getItem("layerling.phoneMode")).toBe("on");
    setScreen(true);
    phone.setPhoneModePreference("off");
    expect(phone.isPhoneModeActive()).toBe(false);
  });

  it("reads a saved preference on start", async () => {
    window.localStorage.setItem("layerling.phoneMode", "on");
    vi.resetModules();
    phone = await import("@/lib/phoneMode");
    uninstall = phone.installPhoneMode();
    expect(phone.getPhoneModeState().preference).toBe("on");
    expect(phone.isPhoneModeActive()).toBe(true);
  });

  it("opens and closes the tool drawer only while phone mode is on", () => {
    uninstall = phone.installPhoneMode();
    phone.togglePhoneTools();
    expect(phone.getPhoneModeState().toolsOpen).toBe(false);
    phone.setPhoneModePreference("on");
    phone.togglePhoneTools();
    expect(document.documentElement.dataset.phoneTools).toBe("open");
    phone.setPhoneModePreference("off");
    expect(phone.getPhoneModeState().toolsOpen).toBe(false);
    expect(document.documentElement.dataset.phoneTools).toBeUndefined();
  });
});

describe("folding the toolbar by hand", () => {
  it("folds on a tablet, drops down for one pick, and is remembered", async () => {
    uninstall = phone.installPhoneMode();
    expect(document.documentElement.dataset.ribbon).toBeUndefined();
    phone.setRibbonFolded(true);
    expect(document.documentElement.dataset.ribbon).toBe("folded");
    expect(document.documentElement.dataset.phone).toBe("off");
    phone.togglePhoneTools();
    expect(document.documentElement.dataset.phoneTools).toBe("open");
    expect(window.localStorage.getItem("layerling.ribbonFolded")).toBe("1");

    uninstall();
    vi.resetModules();
    phone = await import("@/lib/phoneMode");
    uninstall = phone.installPhoneMode();
    expect(phone.getPhoneModeState().ribbonFolded).toBe(true);
    expect(phone.getPhoneModeState().toolsOpen).toBe(false);
  });

  it("unfolding closes the drop-down and clears the fold", () => {
    uninstall = phone.installPhoneMode();
    phone.setRibbonFolded(true);
    phone.togglePhoneTools();
    phone.setRibbonFolded(false);
    expect(document.documentElement.dataset.ribbon).toBeUndefined();
    expect(document.documentElement.dataset.phoneTools).toBeUndefined();
  });
});

