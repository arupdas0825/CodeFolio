'use client';

import { DIST_ACTIVE_COUNTS, DIST_ACTIVE_N, DIST_COUNTS, DIST_MIN, DIST_N } from './distribution-data';
import { resolveTierTheme } from './finishTheme';
import type { DeveloperCardData, DeveloperTier } from '../DeveloperCard';

// Small "where you stand" histogram, ported from gitfut's DistributionPanel.
// Ported 1:1 in spirit — sqrt-scaled bar heights, dashed marker line, "Top X%"
// copy — but plotted against DIST_MIN..100 (DevTrack's numericScore range) and
// the illustrative synthetic dataset in ./distribution-data instead of a real
// sampled population.
const W = 328;
const H = 64;
const PAD_TOP = 14;
const X_MAX = 100;

export default function DistributionPanel({ data }: { data: DeveloperCardData }) {
  const tier: DeveloperTier = data.tier || 'Bronze';
  const accent = resolveTierTheme(tier).ink;
  const overall = Math.max(0, Math.min(100, Math.round(data.numericScore ?? 0)));

  const maxCount = Math.max(...DIST_COUNTS);
  const span = X_MAX - DIST_MIN;
  const barW = W / span;
  const xFor = (rating: number) => ((Math.min(Math.max(rating, DIST_MIN), X_MAX) - DIST_MIN) / span) * W;
  const hFor = (c: number) => (Math.sqrt(c) / Math.sqrt(maxCount)) * (H - PAD_TOP);

  const meX = xFor(overall + 0.5);

  const fmtPct = (p: number) => (p >= 10 ? `${Math.round(p)}` : p >= 1 ? p.toFixed(1) : p.toFixed(2));
  const top = (counts: number[], n: number) => {
    const atOrAbove = counts.reduce((s, c, i) => s + (DIST_MIN + i >= overall ? c : 0), 0);
    const pct = atOrAbove > 0 ? (100 * atOrAbove) / n : (100 * 3) / n;
    return { atOrAbove, label: `Top ${atOrAbove > 0 ? '' : '< '}${fmtPct(pct)}%` };
  };
  const all = top(DIST_COUNTS, DIST_N);
  const act = top(DIST_ACTIVE_COUNTS, DIST_ACTIVE_N);

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-[9px]">
        <span className="h-[2px] w-4 rounded-full" style={{ background: accent }} />
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-slate-400">Distribution</h3>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H + 16}`}
        className="w-full"
        role="img"
        aria-label={`Score ${overall} versus an illustrative DevTrack score distribution`}
      >
        {DIST_COUNTS.map((c, i) =>
          c === 0 ? null : (
            <rect
              key={i}
              x={xFor(DIST_MIN + i) + 0.5}
              y={H - hFor(c)}
              width={Math.max(barW - 1, 1.5)}
              height={hFor(c)}
              rx={1}
              className="fill-white/25"
            />
          ),
        )}
        <line
          x1={meX}
          y1={PAD_TOP - 2}
          x2={meX}
          y2={H}
          stroke={accent}
          strokeWidth={1.4}
          strokeDasharray="3 2.5"
          opacity={0.9}
        />
        <circle cx={meX} cy={H} r={3} fill={accent} />
        <text
          x={meX}
          y={PAD_TOP - 6}
          textAnchor={overall > 88 ? 'end' : overall < 12 ? 'start' : 'middle'}
          fill={accent}
          fontSize={9.5}
          fontWeight={700}
          letterSpacing={1}
        >
          {data.username.toLowerCase()} · {overall}
        </text>
        {[0, 20, 40, 60, 80, 100].map((x) => (
          <text
            key={x}
            x={xFor(x)}
            y={H + 12}
            textAnchor={x === 100 ? 'end' : x === 0 ? 'start' : 'middle'}
            fontSize={8.5}
            className="fill-slate-500"
          >
            {x}
          </text>
        ))}
      </svg>
      <p className="mt-[7px] text-[11.5px] leading-snug text-slate-400">
        <span className="font-mono text-[11px] font-bold tracking-[.14em]" style={{ color: accent }}>
          {all.label.toUpperCase()}
        </span>
        <span className="ml-1.5">of DevTrack (est.)</span>
        <span aria-hidden className="mx-2 inline-block h-2.5 w-px bg-white/15 align-[-1px]" />
        <span className="font-mono text-[11px] font-bold tracking-[.14em]" style={{ color: accent }}>
          {act.label.toUpperCase()}
        </span>
        <span className="ml-1.5">of active devs (est.)</span>
      </p>
    </section>
  );
}
