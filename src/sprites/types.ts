/**
 * Sprites are authored as plain character grids so they stay diffable in git
 * and can be recoloured per theme instead of being baked into image files.
 */

/** One string per row; each character is a key into a {@link SpritePalette}. */
export type SpriteGrid = readonly string[];

/**
 * A partial overwrite of a {@link SpriteGrid}, anchored at (`x`, `y`).
 *
 * Inside a patch `.` keeps whatever the base sprite had and a space clears the
 * pixel; every other character is a palette key. This is what lets the mascot's
 * expressions be a handful of eye-sized overlays instead of a full grid each.
 */
export interface SpritePatch {
  readonly x: number;
  readonly y: number;
  readonly rows: SpriteGrid;
}

/** In a grid this character means "transparent"; in a patch, "keep". */
export const TRANSPARENT = ".";

/** Inside a patch: force the pixel underneath back to transparent. */
export const CLEAR = " ";

/** Palette keys to CSS colours. Unmapped keys are skipped when drawing. */
export type SpritePalette = Readonly<Record<string, string>>;
