// Deterministic presence colors. The same seed (a Supabase user id or a
// per-tab guest id) always maps to the same color, so a given person shows up
// in one consistent color across every connected client.

// A fixed palette of distinct, legible hues (Apple-system-ish accent colors).
const PALETTE = [
  "#ff3b30", // red
  "#ff9500", // orange
  "#ffcc00", // yellow
  "#34c759", // green
  "#00c7be", // teal
  "#30b0c7", // cyan
  "#5ac8fa", // light blue
  "#007aff", // blue
  "#5856d6", // indigo
  "#af52de", // purple
  "#ff2d55", // pink
  "#a2845e", // brown
];

// FNV-1a — small, stable string hash. We only need an even-ish spread over the
// palette, not cryptographic quality.
function hashString(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function colorForSeed(seed: string): string {
  return PALETTE[hashString(seed) % PALETTE.length] ?? "#007aff";
}
