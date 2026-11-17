import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_WIDGET_WIDTH, MAX_UI_SCALE } from "../src/scale";
import { ResizeGrip } from "../src/ui/resize-grip";

type Handler = (event: PointerEvent) => void;

function pointerEvent(screenX: number): PointerEvent {
  return { preventDefault() {}, screenX } as PointerEvent;
}

describe("ResizeGrip", () => {
  const windowListeners: Record<string, Set<Handler>> = {};
  let handleDown: Handler | undefined;

  beforeEach(() => {
    for (const key of Object.keys(windowListeners)) {
      delete windowListeners[key];
    }
    handleDown = undefined;
    vi.stubGlobal("window", {
      addEventListener(type: string, fn: Handler) {
        (windowListeners[type] ??= new Set()).add(fn);
      },
      removeEventListener(type: string, fn: Handler) {
        windowListeners[type]?.delete(fn);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function grip(onPreview = vi.fn(), onCommit = vi.fn()) {
    const handle = {
      addEventListener(type: string, fn: Handler) {
        if (type === "pointerdown") handleDown = fn;
      },
    } as unknown as HTMLElement;
    const instance = new ResizeGrip(handle, onPreview, onCommit);
    instance.setScale(1);
    return { onPreview, onCommit };
  }

  it("does not preview when clamped scale has not changed", () => {
    const { onPreview } = grip();
    handleDown?.(pointerEvent(100));

    const moves = windowListeners["pointermove"];
    expect(moves?.size).toBe(1);
    const move = [...(moves ?? [])][0];
    move?.(pointerEvent(100));
    expect(onPreview).not.toHaveBeenCalled();

    move?.(pointerEvent(100 + BASE_WIDGET_WIDTH * 0.25));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(1.25);

    onPreview.mockClear();
    move?.(pointerEvent(100 + BASE_WIDGET_WIDTH * 0.25));
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("stops previewing once the drag is past the max scale", () => {
    const { onPreview } = grip();
    handleDown?.(pointerEvent(0));
    const move = [...(windowListeners["pointermove"] ?? [])][0];

    move?.(pointerEvent(BASE_WIDGET_WIDTH * (MAX_UI_SCALE - 1)));
    expect(onPreview).toHaveBeenLastCalledWith(MAX_UI_SCALE);

    onPreview.mockClear();
    move?.(pointerEvent(BASE_WIDGET_WIDTH * 4));
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("commits the last previewed scale on pointerup without an extra preview", () => {
    const { onPreview, onCommit } = grip();
    handleDown?.(pointerEvent(10));
    const move = [...(windowListeners["pointermove"] ?? [])][0];
    const up = [...(windowListeners["pointerup"] ?? [])][0];

    move?.(pointerEvent(10 + BASE_WIDGET_WIDTH * 0.5));
    expect(onPreview).toHaveBeenCalledTimes(1);
    up?.(pointerEvent(10 + BASE_WIDGET_WIDTH * 0.5));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1.5);
    expect(onPreview).toHaveBeenCalledTimes(1);
  });
});
