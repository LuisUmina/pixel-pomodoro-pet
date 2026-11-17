import { applyPatches } from "./renderer";
import type { SpriteGrid, SpritePatch } from "./types";

/** Patch-name list identity; order matters because overlays apply in order. */
export function framePatchSignature(names: readonly string[]): string {
  return names.join("\0");
}

export function memoizedComposedGrid(
  cache: Map<string, SpriteGrid>,
  signature: string,
  compose: () => SpriteGrid,
): SpriteGrid {
  const hit = cache.get(signature);
  if (hit) {
    return hit;
  }

  const grid = compose();
  cache.set(signature, grid);
  return grid;
}

/**
 * Draw path: prefer the grid parsed once at load time. The fallback keeps a
 * hand-built `PetFrame` (tests, or a character that skipped parse) working.
 */
export function spriteGridForFrame(
  frame: { readonly grid?: SpriteGrid; readonly patches: readonly SpritePatch[] },
  base: SpriteGrid,
): SpriteGrid {
  return frame.grid ?? applyPatches(base, frame.patches);
}
