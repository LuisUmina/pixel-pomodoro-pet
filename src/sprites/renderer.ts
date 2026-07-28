import {
  CLEAR,
  TRANSPARENT,
  type SpriteGrid,
  type SpritePalette,
  type SpritePatch,
} from "./types";

/** Composes a base sprite with the overlays of the current expression. */
export function applyPatches(base: SpriteGrid, patches: readonly SpritePatch[]): SpriteGrid {
  if (patches.length === 0) {
    return base;
  }

  const rows = base.map((row) => [...row]);

  for (const patch of patches) {
    patch.rows.forEach((patchRow, dy) => {
      const target = rows[patch.y + dy];
      if (!target) {
        return;
      }

      for (let dx = 0; dx < patchRow.length; dx += 1) {
        const key = patchRow[dx];
        if (key === undefined || key === TRANSPARENT) {
          continue;
        }

        const x = patch.x + dx;
        if (x < 0 || x >= target.length) {
          continue;
        }

        target[x] = key === CLEAR ? TRANSPARENT : key;
      }
    });
  }

  return rows.map((row) => row.join(""));
}

export interface DrawOptions {
  /** Device pixels per sprite pixel. */
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** Paints a sprite as opaque rectangles — no image smoothing, no assets. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  grid: SpriteGrid,
  palette: SpritePalette,
  options: DrawOptions,
): void {
  const { scale, x: originX, y: originY } = options;

  for (let row = 0; row < grid.length; row += 1) {
    const line = grid[row];
    if (!line) {
      continue;
    }

    for (let col = 0; col < line.length; col += 1) {
      const key = line[col];
      if (key === undefined || key === TRANSPARENT) {
        continue;
      }

      const color = palette[key];
      if (!color) {
        continue;
      }

      ctx.fillStyle = color;
      ctx.fillRect(originX + col * scale, originY + row * scale, scale, scale);
    }
  }
}
