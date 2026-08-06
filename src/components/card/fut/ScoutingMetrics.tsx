'use client';

import type { DeveloperCardData, DeveloperTier } from '../DeveloperCard';
import { resolveTierTheme } from './finishTheme';

// Styled after gitfut's right-column "Scouting Metrics" panel (ScoutReport.tsx):
// a labeled bar + score per signal. gitfut's numbers are the scoring engine's
// per-stat percentile; Codefolio doesn't run that engine, so each bar here is a
// simple illustrative 0-99 signal derived from the same log-scale shape
// github-card.service.ts already uses for the overall numericScore — clearly a
// "how strong is this signal" indicator, not a literal population percentile.

function parseNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const m = v.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

const clamp99 = (n: number) => Math.max(0, Math.min(99, Math.round(n)));

interface Row {
  label: string;
  raw: string;
  score: number;
}

function buildRows(data: DeveloperCardData): Row[] {
  const repos = data.publicRepos ?? 0;
  const stars = data.totalStars ?? 0;
  const forks = data.totalForks ?? 0;
  const followers = data.followers ?? 0;
  const prs = parseNum(data.pullRequests);
  const contributions = parseNum(data.totalContributions);
  const streak = parseNum(data.currentStreak);
  const langs = data.topLanguages?.length ?? 0;

  return [
    { label: 'Repositories', raw: `${repos} repos`, score: clamp99(repos * 5) },
    { label: 'Stars earned', raw: `${stars.toLocaleString()} stars`, score: clamp99(Math.log10(stars + 1) * 35) },
    { label: 'Forks', raw: `${forks.toLocaleString()} forks`, score: clamp99(Math.log10(forks + 1) * 30) },
    { label: 'Followers', raw: `${followers.toLocaleString()} followers`, score: clamp99(Math.log10(followers + 1) * 30) },
    {
      label: 'Pull requests',
      raw: typeof data.pullRequests === 'string' ? data.pullRequests : `${prs} PRs`,
      score: clamp99(prs * 8),
    },
    {
      label: 'Contributions',
      raw: contributions ? `${contributions.toLocaleString()} contributions` : 'Not available',
      score: clamp99(Math.log10(contributions + 1) * 22),
    },
    { label: 'Current streak', raw: streak ? `${streak} days` : 'Not available', score: clamp99(streak * 1.5) },
    { label: 'Languages', raw: `${langs} languages`, score: clamp99(langs * 25) },
  ];
}

export default function ScoutingMetrics({ data }: { data: DeveloperCardData }) {
  const tier: DeveloperTier = data.tier || 'Bronze';
  const accent = resolveTierTheme(tier).ink;
  const rows = buildRows(data);

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-[9px]">
        <span className="h-[2px] w-4 rounded-full" style={{ background: accent }} />
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.22em] text-slate-400">
          Scouting Metrics
        </h3>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-slate-200">{r.label}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{r.raw}</span>
              <span className="w-6 shrink-0 text-right font-mono text-[13px] font-bold text-white">{r.score}</span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${r.score}%`, background: accent, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
