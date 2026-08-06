'use client';

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import TiltCard from './fut/TiltCard';
import PlayerCardFrame from './fut/PlayerCardFrame';
import ScoutingMetrics from './fut/ScoutingMetrics';
import DistributionPanel from './fut/DistributionPanel';
import CardActionsPanel from './fut/CardActionsPanel';
import { resolveTierTheme } from './fut/finishTheme';

// Codefolio's "Generate your developer card" feature — visual system ported
// from gitfut (github.com/<gitfut>), a FUT/FIFA-Ultimate-Team-style card
// generator with a much more polished, professional card frame than Codefolio's
// old badge-and-stat-grid layout. The FIFA stats (PAC/SHO/PAS/DRI/DEF/PHY) were
// intentionally NOT carried over — Codefolio keeps its own metrics (Repos,
// Stars, Grade, Streak, etc.); only gitfut's card frame, fonts, avatar
// masking, tilt/hover, country flag, language logo, and PNG/PDF/share export
// pipeline were ported "as is". See src/components/card/fut/ for the ported
// pieces.

export type DeveloperTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Emerald';
export type DeveloperGrade = 'A+' | 'A' | 'B+' | 'B' | 'C';

export interface DeveloperCardData {
  username: string;
  name: string;
  avatarUrl: string;
  location?: string | null;
  blog?: string | null;
  company?: string | null;
  publicRepos: number;
  totalStars: number;
  totalForks?: number;
  followers: number;
  following?: number;
  pullRequests?: number | string | null;
  totalContributions?: number | string | null;
  currentStreak?: number | string | null;
  tier?: DeveloperTier;
  tierEmoji?: string;
  grade?: DeveloperGrade;
  numericScore?: number;
  topLanguages: { name: string; percent: number; color: string }[];
  createdAt?: string;
  // Legacy / fallback fields
  bio?: string | null;
  score?: number;
  rankTitle?: string;
  archetype?: string;
  stars?: number;
  topLanguage?: string;
  level?: number;
  totalCommits?: number | null;
  contributions?: number[] | null;
}

export function getDeveloperCardInfo(user: any): DeveloperCardData {
  const totalStars = user?.totalStars || user?.stars || 140;
  const totalForks = user?.totalForks || 45;
  const followers = user?.followers || 85;
  const publicRepos = user?.publicRepos || 18;

  const repoPts = Math.min(25, publicRepos * 1.5);
  const starPts = Math.min(30, totalStars > 0 ? Math.log10(totalStars + 1) * 12 : 0);
  const forkPts = Math.min(20, totalForks > 0 ? Math.log10(totalForks + 1) * 8 : 0);
  const followerPts = Math.min(25, followers > 0 ? Math.log10(followers + 1) * 10 : 0);

  const numericScore = Math.min(100, Math.round(repoPts + starPts + forkPts + followerPts));

  let tier: DeveloperTier = 'Silver';
  let tierEmoji = '🥈';
  if (numericScore >= 90) { tier = 'Emerald'; tierEmoji = '💚'; }
  else if (numericScore >= 80) { tier = 'Diamond'; tierEmoji = '💎'; }
  else if (numericScore >= 60) { tier = 'Gold'; tierEmoji = '🥇'; }
  else if (numericScore >= 30) { tier = 'Silver'; tierEmoji = '🥈'; }
  else { tier = 'Bronze'; tierEmoji = '🥉'; }

  let grade: DeveloperGrade = 'B+';
  if (numericScore >= 90) grade = 'A+';
  else if (numericScore >= 75) grade = 'A';
  else if (numericScore >= 60) grade = 'B+';
  else if (numericScore >= 40) grade = 'B';
  else grade = 'C';

  return {
    username: user?.username || 'developer',
    name: user?.displayName || user?.username || 'Software Engineer',
    avatarUrl: user?.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username || 'dev'}`,
    location: user?.location || null,
    blog: user?.blog || null,
    publicRepos,
    totalStars,
    totalForks,
    followers,
    following: user?.following || 20,
    pullRequests: null,
    totalContributions: null,
    currentStreak: null,
    tier,
    tierEmoji,
    grade,
    numericScore,
    topLanguages: [
      { name: 'TypeScript', percent: 65, color: '#3178C6' },
      { name: 'Python', percent: 20, color: '#3572A5' },
      { name: 'Go', percent: 15, color: '#00ADD8' },
    ],
  };
}

interface DeveloperCardProps {
  data: DeveloperCardData;
  isLoading?: boolean;
  onRequireAuth?: (action: string) => void;
  onClose?: () => void;
  interactive?: boolean;
  /** 'full' (default): FUT card + scouting metrics + distribution + export
   *  actions, as in the standalone card generator / profile pages.
   *  'compact': just the FUT card + tier/grade strip, for tight spaces like
   *  the side-by-side developer battle view. */
  variant?: 'full' | 'compact';
}

export const DeveloperCard: React.FC<DeveloperCardProps> = ({
  data,
  isLoading = false,
  onRequireAuth,
  onClose,
  interactive = true,
  variant = 'full',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const calculatedInfo = getDeveloperCardInfo(data);
  const tier: DeveloperTier = (data.tier as DeveloperTier) || calculatedInfo.tier;
  const grade: DeveloperGrade = (data.grade as DeveloperGrade) || calculatedInfo.grade;
  const topLanguages = (data.topLanguages && data.topLanguages.length > 0) ? data.topLanguages : calculatedInfo.topLanguages;

  const resolved: DeveloperCardData = { ...calculatedInfo, ...data, tier, grade, topLanguages };
  const theme = resolveTierTheme(tier);

  return (
    <div className="relative w-full max-w-[380px] sm:max-w-[420px] mx-auto text-slate-100">
      {(onClose || isLoading) && (
        <div className="mb-2.5 flex items-center justify-between">
          <span
            className="rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide"
            style={{ borderColor: `${theme.ink}55`, background: `${theme.ink}1a`, color: theme.ink }}
          >
            {tier} Developer
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="mx-auto w-[78%] sm:w-[68%]">
        <TiltCard>
          <div ref={cardRef}>
            <PlayerCardFrame data={resolved} />
          </div>
        </TiltCard>
      </div>

      {isLoading && (
        <p className="mt-3 text-center text-xs font-mono text-slate-400 animate-pulse">Fetching live GitHub telemetry…</p>
      )}

      {variant === 'full' && !isLoading && (
        <div className="mt-4 space-y-3">
          <ScoutingMetrics data={resolved} />
          <DistributionPanel data={resolved} />

          {interactive && (
            <CardActionsPanel data={resolved} cardRef={cardRef} onRequireAuth={onRequireAuth} />
          )}
        </div>
      )}
    </div>
  );
};

export default DeveloperCard;
