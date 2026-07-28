import font from "../sprites/font.json";
import { drawSprite } from "../sprites/renderer";
import type { SpriteGrid, SpritePalette } from "../sprites/types";

/**
 * A bitmap font for the clock, drawn through the same renderer as the mascot.
 * Embedding a real pixel typeface would mean shipping a binary asset and
 * loosening the CSP; eleven glyphs of data cost neither.
 */
const GLYPHS = font.glyphs as Readonly<Record<string, SpriteGrid>>;

export const FONT_HEIGHT: number = font.height;

const LETTER_SPACING = 1;

function glyphWidth(glyph: SpriteGrid): number {
  return glyph[0]?.length ?? 0;
}

/** Width of `text` in sprite pixels. Unknown characters are skipped. */
export function measureText(text: string): number {
  let width = 0;

  for (const char of text) {
    const glyph = GLYPHS[char];
    if (glyph) {
      width += glyphWidth(glyph) + LETTER_SPACING;
    }
  }

  return Math.max(0, width - LETTER_SPACING);
}

export interface TextOptions {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  options: TextOptions,
): void {
  const palette: SpritePalette = { x: color };
  let cursor = options.x;

  for (const char of text) {
    const glyph = GLYPHS[char];
    if (!glyph) {
      continue;
    }

    drawSprite(ctx, glyph, palette, { scale: options.scale, x: cursor, y: options.y });
    cursor += (glyphWidth(glyph) + LETTER_SPACING) * options.scale;
  }
}
