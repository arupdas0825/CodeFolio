import type { DeveloperTier } from '../DeveloperCard';

// Ported from gitfut's components/finishTheme.ts. Each Codefolio tier maps to a
// FUT background image (public/cards — the same art gitfut ships), the text ink
// the original Python generator used for that finish, a glow for the card's
// drop-shadow, and a radial avatar tint/halo so the GitHub avatar blends into
// the card art instead of sitting on top of it as a flat rectangle.
//
// Codefolio has 5 tiers (Bronze/Silver/Gold/Diamond/Emerald) vs gitfut's FUT
// finishes (bronze/silver/gold/totw/toty/icon/founder) — we don't have unique
// art for Diamond/Emerald, so we reuse gitfut's "toty" (blue) art for Diamond
// and "icon" (legend) art for Emerald, tinted toward each tier's own identity
// color via ink + glow rather than new artwork.
export interface CardTheme {
  bg: string;
  ink: string;
  glow: string;
  avatarTint: string;
  avatarHalo: string;
}

export const TIER_THEME: Record<DeveloperTier, CardTheme> = {
  Bronze: {
    bg: '/cards/bronze.png',
    ink: '#3a2717',
    glow: 'rgba(190,120,60,.45)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(106,69,39,.26) 78%, rgba(50,31,14,.44))',
    avatarHalo: 'rgba(214,163,110,.4)',
  },
  Silver: {
    bg: '/cards/silver.png',
    ink: '#303536',
    glow: 'rgba(170,188,210,.5)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(170,188,210,.22) 78%, rgba(70,78,90,.42))',
    avatarHalo: 'rgba(220,228,238,.4)',
  },
  Gold: {
    bg: '/cards/gold.png',
    ink: '#46390c',
    glow: 'rgba(225,185,80,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(243,214,121,.24) 78%, rgba(156,118,33,.44))',
    avatarHalo: 'rgba(243,214,121,.45)',
  },
  Diamond: {
    bg: '/cards/toty.webp',
    ink: '#cfe8ff',
    glow: 'rgba(90,170,255,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(74,150,210,.22) 78%, rgba(14,45,80,.46))',
    avatarHalo: 'rgba(127,198,255,.45)',
  },
  Emerald: {
    bg: '/cards/legend.png',
    ink: '#0e3d24',
    glow: 'rgba(16,185,129,.55)',
    avatarTint:
      'radial-gradient(ellipse 72% 76% at 52% 40%, transparent 46%, rgba(52,211,153,.24) 78%, rgba(6,60,40,.46))',
    avatarHalo: 'rgba(52,211,153,.5)',
  },
};

export function resolveTierTheme(tier: DeveloperTier): CardTheme {
  return TIER_THEME[tier] ?? TIER_THEME.Bronze;
}
