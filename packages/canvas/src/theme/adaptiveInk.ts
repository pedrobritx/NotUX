// Render-time "smart ink": near-neutral dark ink flips to near-white on dark
// paper (and vice versa) so handwriting and outlines stay readable when the
// board switches appearance — like Apple Freeform. Stored shape colors are
// never mutated; this mapping is applied only where shapes are painted.

const DARK_INK = "#1c1c1e"; // matches the default pen color
const LIGHT_INK = "#f2f2f7";

// Only adapt near-neutral colors; chromatic inks (reds, blues, sticky
// yellows…) are the author's deliberate choice and pass through.
const MAX_CHROMA = 32;
const DARK_LUMINANCE = 0.25; // below this on dark paper → flip to light ink
const LIGHT_LUMINANCE = 0.82; // above this on light paper → flip to dark ink

const cache = new Map<string, string>();

function parseHex(color: string): { r: number; g: number; b: number } | null {
  const t = color.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(t);
  if (m && m[1]) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  m = /^#([0-9a-f]{3})$/i.exec(t);
  if (m && m[1]) {
    const s = m[1];
    return {
      r: parseInt(s[0]! + s[0], 16),
      g: parseInt(s[1]! + s[1], 16),
      b: parseInt(s[2]! + s[2], 16),
    };
  }
  return null;
}

export function resolveInkColor(color: string, darkCanvas: boolean): string {
  const key = `${color}|${darkCanvas ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let out = color;
  const rgb = parseHex(color);
  if (rgb) {
    const { r, g, b } = rgb;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma <= MAX_CHROMA) {
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (darkCanvas && lum < DARK_LUMINANCE) out = LIGHT_INK;
      else if (!darkCanvas && lum > LIGHT_LUMINANCE) out = DARK_INK;
    }
  }
  cache.set(key, out);
  return out;
}
