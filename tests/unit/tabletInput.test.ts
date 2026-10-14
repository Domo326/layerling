// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom may lack PointerEvent; a MouseEvent with the pointer fields is enough here.
if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  (globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}

type TabletModule = typeof import("@/lib/tabletInput");
let tablet: TabletModule;
let uninstall: () => void;

function pointer(type: string, init: PointerEventInit, target: EventTarget = document.body) {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  document.body.innerHTML = "";
  tablet = await import("@/lib/tabletInput");
  uninstall = tablet.installTabletInput();
});

afterEach(() => {
  uninstall();
  vi.useRealTimers();
});

describe("tablet modifier keys", () => {
  it("cycles off -> once -> locked -> off", () => {
    expect(tablet.getTabletInputState().modifiers.shift).toBe("off");
    tablet.tapModifier("shift");
    expect(tablet.getTabletInputState().modifiers.shift).toBe("once");
    tablet.tapModifier("shift");
    expect(tablet.getTabletInputState().modifiers.shift).toBe("locked");
    tablet.tapModifier("shift");
    expect(tablet.getTabletInputState().modifiers.shift).toBe("off");
  });

  it("lays an armed modifier over pointer events and releases a one-shot after the gesture", () => {
    vi.useFakeTimers();
    tablet.tapModifier("alt");
    let seenAlt = false;
    document.body.addEventListener("pointerdown", (event) => {
      seenAlt = event.altKey;
    });
    pointer("pointerdown", { pointerType: "pen", pointerId: 7 });
    expect(seenAlt).toBe(true);
    pointer("pointerup", { pointerType: "pen", pointerId: 7 });
    expect(tablet.getTabletInputState().modifiers.alt).toBe("once");
    vi.advanceTimersByTime(400);
    expect(tablet.getTabletInputState().modifiers.alt).toBe("off");
  });

  it("keeps a locked modifier across gestures", () => {
    vi.useFakeTimers();
    tablet.tapModifier("ctrl");
    tablet.tapModifier("ctrl");
    pointer("pointerdown", { pointerType: "touch", pointerId: 2 });
    pointer("pointerup", { pointerType: "touch", pointerId: 2 });
    vi.advanceTimersByTime(400);
    expect(tablet.getTabletInputState().modifiers.ctrl).toBe("locked");
  });

  it("leaves events on the tablet bar itself untouched", () => {
    const bar = document.createElement("div");
    bar.setAttribute("data-tablet-bar", "");
    const button = document.createElement("button");
    bar.appendChild(button);
    document.body.appendChild(bar);
    tablet.tapModifier("shift");
    const event = pointer("pointerdown", { pointerType: "touch" }, button);
    expect(event.shiftKey).toBe(false);
  });
});

describe("pencil mode and palm rejection", () => {
  it("turns on with the first pen touch and is remembered", () => {
    expect(tablet.isPencilMode()).toBe(false);
    pointer("pointerdown", { pointerType: "pen", pointerId: 3 });
    expect(tablet.isPencilMode()).toBe(true);
    expect(tablet.isPenDown()).toBe(true);
    pointer("pointerup", { pointerType: "pen", pointerId: 3 });
    expect(tablet.isPenDown()).toBe(false);
    expect(window.localStorage.getItem("layerling.tablet.pencilMode")).toBe("on");
  });

  it("stays off after the user switched it off, even when a pen is used", () => {
    tablet.setPencilMode(false);
    pointer("pointerdown", { pointerType: "pen", pointerId: 3 });
    expect(tablet.isPencilMode()).toBe(false);
  });

  it("drops finger touches while the pen is down", () => {
    const seen: string[] = [];
    document.body.addEventListener("pointerdown", (event) => seen.push(event.pointerType));
    document.body.addEventListener("pointermove", (event) => seen.push(`move:${event.pointerType}`));
    pointer("pointerdown", { pointerType: "pen", pointerId: 3 });
    pointer("pointerdown", { pointerType: "touch", pointerId: 9 });
    pointer("pointermove", { pointerType: "touch", pointerId: 9 });
    pointer("pointerup", { pointerType: "touch", pointerId: 9 });
    pointer("pointerup", { pointerType: "pen", pointerId: 3 });
    expect(seen).toEqual(["pen"]);
    // After the pen is lifted, fingers get through again.
    pointer("pointerdown", { pointerType: "touch", pointerId: 10 });
    expect(seen).toEqual(["pen", "touch"]);
  });
});

describe("shortcut buttons", () => {
  it("dispatches a keydown the editor's window listeners receive", () => {
    const keys: string[] = [];
    const listener = (event: KeyboardEvent) => keys.push(`${event.ctrlKey || event.metaKey ? "mod+" : ""}${event.key}`);
    window.addEventListener("keydown", listener);
    tablet.sendShortcut("z", { ctrl: true });
    tablet.sendShortcut("Delete");
    window.removeEventListener("keydown", listener);
    expect(keys).toEqual(["mod+z", "Delete"]);
  });
});

describe("three-finger swipe", () => {
  function swipe(dx: number) {
    [1, 2, 3].forEach((id) => pointer("pointerdown", { pointerType: "touch", pointerId: 20 + id, clientX: 100 * id, clientY: 300 }));
    for (let step = 1; step <= 6; step += 1) {
      [1, 2, 3].forEach((id) => pointer("pointermove", { pointerType: "touch", pointerId: 20 + id, clientX: 100 * id + (dx * step) / 6, clientY: 300 }));
    }
    [1, 2, 3].forEach((id) => pointer("pointerup", { pointerType: "touch", pointerId: 20 + id, clientX: 100 * id + dx, clientY: 300 }));
  }

  it("undoes when swiped left and redoes when swiped right, once per swipe", () => {
    const keys: string[] = [];
    const listener = (event: KeyboardEvent) => keys.push(event.key);
    window.addEventListener("keydown", listener);
    swipe(-120);
    swipe(120);
    window.removeEventListener("keydown", listener);
    expect(keys).toEqual(["z", "y"]);
  });

  it("ignores a short or mostly vertical three-finger move", () => {
    const keys: string[] = [];
    const listener = (event: KeyboardEvent) => keys.push(event.key);
    window.addEventListener("keydown", listener);
    swipe(-30);
    window.removeEventListener("keydown", listener);
    expect(keys).toEqual([]);
  });
});
