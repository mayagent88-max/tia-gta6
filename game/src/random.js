// Seeded RNG (mulberry32) so the city, traffic and missions are identical
// for a given seed — screenshots and tests are reproducible.
// Final-build note (re-record, 2026-11-19): one seed drives the whole city, so
// the four judged screenshots are reproducible shot for shot — the same seed
// always stages the same traffic, pedestrians and cover frame.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    // Fisher-Yates shuffle, in place, driven by this seed.
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    // Pick one entry from [[value, weight], ...] by weight.
    weightedPick: (pairs) => {
      let total = 0;
      for (const [, w] of pairs) total += w;
      let r = next() * total;
      for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; }
      return pairs[pairs.length - 1][0];
    },
  };
}
