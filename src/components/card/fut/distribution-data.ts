// Illustrative "where you stand" distribution for the Codefolio numericScore
// (0-100). gitfut's DistributionPanel samples a real dataset of scored GitHub
// accounts (data/distribution-data.json); Codefolio doesn't have that population
// telemetry, so this module generates a plausible, clearly-approximate curve
// instead: most accounts cluster in the 15-45 range (a handful of repos, a
// modest star/follower count), with a long thin tail toward 90+. Swap this for
// a real sampled dataset later if Codefolio starts tracking one.

export const DIST_MIN = 0;
export const DIST_MAX = 100;

function shape(score: number): number {
  // Skewed unimodal curve peaking around ~24, long right tail — loosely modeled
  // on how the repoPts/starPts/forkPts/followerPts formula in
  // github-card.service.ts tends to distribute across real GitHub accounts.
  const peak = 24;
  const spread = score < peak ? 14 : 30;
  const z = (score - peak) / spread;
  return Math.exp(-0.5 * z * z);
}

const RAW: number[] = [];
for (let s = DIST_MIN; s <= DIST_MAX; s++) RAW.push(shape(s));

export const DIST_N = 50000;
export const DIST_COUNTS: number[] = (() => {
  const total = RAW.reduce((a, b) => a + b, 0);
  return RAW.map((w) => Math.round((w / total) * DIST_N));
})();

// "Active" subset (illustrative: active devs skew a bit higher-scoring).
export const DIST_ACTIVE_N = 18000;
export const DIST_ACTIVE_COUNTS: number[] = (() => {
  const activeShape = (score: number) => shape(score) * (0.4 + score / 130);
  const raw = [];
  for (let s = DIST_MIN; s <= DIST_MAX; s++) raw.push(activeShape(s));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => Math.round((w / total) * DIST_ACTIVE_N));
})();
