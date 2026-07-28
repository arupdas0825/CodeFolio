'use client';

import { memo, type CSSProperties } from 'react';
import type { DeveloperCardData, DeveloperTier, DeveloperGrade } from '../DeveloperCard';
import { resolveTierTheme } from './finishTheme';
import { countryForLogin } from './geo';
import { languageLogoUrl, logoSlugFor } from './languages';

// Faithful port of gitfut's 540x820 FUT card layout (components/PlayerCard.tsx),
// re-wired for DevTrack: the six stat slots show DevTrack's own metrics
// (Repos/Stars/Forks/Followers/PRs/Streak) instead of FIFA PAC/SHO/PAS/DRI/DEF/PHY,
// and the "position" slot under the rating shows the DevTrack Grade instead of a
// football position. Positions are percentages of the card (x/540, y/820); font
// sizes are cqw so the card scales fluidly with its container.

const AVATAR_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="%23000" fill-opacity="0"/><circle cx="160" cy="128" r="62" fill="%23ffffff" fill-opacity="0.18"/><rect x="58" y="206" width="204" height="150" rx="80" fill="%23ffffff" fill-opacity="0.18"/></svg>',
  );

const FONT_MEDIUM = "var(--font-din-medium), 'Saira Condensed', sans-serif";
const FONT_COND = "var(--font-din-cond), 'Saira Condensed', sans-serif";
const FONT_BOLD = "var(--font-din-bold), 'Saira Condensed', sans-serif";

const AVATAR_MASK_FEATHER = 'radial-gradient(ellipse 66% 88% at 52% 40%, #000 56%, transparent 80%)';
const AVATAR_MASK_BOTTOM_FADE = 'linear-gradient(220deg, #000 70%, transparent 100%)';
const AVATAR_MASK_TOP_FADE = 'linear-gradient(180deg, transparent 1%, #000 22%)';

// Display-name shortening, ported from gitfut's lib/text.ts cardDisplayName.
function cardDisplayName(name: string): string {
  const full = name.trim();
  if (full.length <= 9) return full;
  const [first, ...rest] = full.split(/\s+/);
  if (rest.length === 0) return full;
  const surname = rest.join(' ');
  const tooBig = surname.length > 13 || rest.length > 3;
  return tooBig ? first : surname;
}

// Compact formatting for potentially large DevTrack counts (stars, contributions)
// so they still read cleanly in the narrow FUT stat slots designed for 2-digit
// FIFA ratings.
function formatStatValue(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined) return '–';
  let n: number;
  if (typeof raw === 'string') {
    const m = raw.match(/-?\d+/);
    if (!m) return raw.length > 6 ? `${raw.slice(0, 6)}…` : raw;
    n = parseInt(m[0], 10);
  } else {
    n = raw;
  }
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  }
  return String(n);
}

interface StatCell {
  label: string;
  value: string;
  vx: number;
  lx: number;
  vy: number;
  ly: number;
}

const H_LINES: [number, number, number][] = [
  [19.44, 31.1, 10.19], // under position/grade
  [19.44, 40.85, 10.19], // under flag/language
  [16.67, 64.02, 66.67], // under name
  [44.44, 89.63, 11.11], // under stats
];

const hideOnError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  e.currentTarget.style.visibility = 'hidden';
};

const onTierArtError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  console.error(`[devtrack] tier card art failed to load: ${e.currentTarget.src}`);
  e.currentTarget.style.visibility = 'hidden';
};

function PlayerCardFrame({ data }: { data: DeveloperCardData }) {
  const tier: DeveloperTier = data.tier || 'Bronze';
  const grade: DeveloperGrade = data.grade || 'B';
  const overall = Math.max(0, Math.min(99, Math.round(data.numericScore ?? 0)));
  const t = resolveTierTheme(tier);
  const ink = t.ink;
  const displayName = cardDisplayName(data.name || data.username).toUpperCase();
  const country = countryForLogin(data.username, data.location);
  const topLangName = data.topLanguages?.[0]?.name;
  const langSlug = topLangName ? logoSlugFor(topLangName) : null;

  const statCells: StatCell[] = [
    { label: 'REPO', value: formatStatValue(data.publicRepos), vx: 21.3, lx: 32.41, vy: 64.63, ly: 65.24 },
    { label: 'STAR', value: formatStatValue(data.totalStars), vx: 56.48, lx: 67.59, vy: 64.63, ly: 65.24 },
    { label: 'FORK', value: formatStatValue(data.totalForks), vx: 21.3, lx: 32.41, vy: 72.2, ly: 72.8 },
    { label: 'FLW', value: formatStatValue(data.followers), vx: 56.48, lx: 67.59, vy: 72.2, ly: 72.8 },
    { label: 'PR', value: formatStatValue(data.pullRequests), vx: 21.3, lx: 32.41, vy: 79.76, ly: 80.37 },
    { label: 'STRK', value: formatStatValue(data.currentStreak), vx: 56.48, lx: 67.59, vy: 79.76, ly: 80.37 },
  ];

  const onAvatarError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = AVATAR_FALLBACK;
  };

  const wrap: CSSProperties = {
    containerType: 'inline-size',
    position: 'relative',
    width: '100%',
    aspectRatio: '540 / 820',
    filter: `drop-shadow(0 7cqw 10cqw rgba(0,0,0,.5)) drop-shadow(0 0 6cqw ${t.glow})`,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  };

  const at = (left: number, top: number): CSSProperties => ({
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
  });

  return (
    <div className="dt-card-frame" style={wrap} data-dt-avatar-root>
      {/* tier background art */}
      <img
        src={t.bg}
        alt=""
        aria-hidden
        onError={onTierArtError}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
      />

      <div
        data-dt-avatar
        style={{
          position: 'absolute',
          inset: 0,
          background: t.glow,
          WebkitMaskImage: `url("${t.bg}")`,
          maskImage: `url("${t.bg}")`,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '27cqw',
            top: '13cqw',
            width: '68cqw',
            height: '70cqw',
            WebkitMaskImage: AVATAR_MASK_FEATHER,
            maskImage: AVATAR_MASK_FEATHER,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              WebkitMaskImage: AVATAR_MASK_BOTTOM_FADE,
              maskImage: AVATAR_MASK_BOTTOM_FADE,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                WebkitMaskImage: AVATAR_MASK_TOP_FADE,
                maskImage: AVATAR_MASK_TOP_FADE,
                filter: `drop-shadow(0 3cqw 6cqw rgba(0,0,0,.5)) drop-shadow(0 0 5cqw ${t.avatarHalo})`,
              }}
            >
              <img
                src={data.avatarUrl}
                onError={onAvatarError}
                alt={data.username}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: t.avatarTint }} />
            </div>
          </div>
        </div>
      </div>

      {/* separator lines */}
      {H_LINES.map(([l, top, w], i) => (
        <div key={i} style={{ ...at(l, top), width: `${w}%`, height: '0.3cqw', background: ink, opacity: 0.5 }} />
      ))}
      <div style={{ ...at(50, 66.46), width: '0.3cqw', height: '20.12%', background: ink, opacity: 0.5 }} />

      {/* overall (DevTrack numericScore, 0-99) */}
      <div
        style={{
          ...at(16.3, 9.76),
          fontFamily: FONT_MEDIUM,
          fontSize: '22.2cqw',
          fontWeight: 500,
          lineHeight: 1,
          color: ink,
        }}
      >
        {String(overall).padStart(2, '0')}
      </div>

      {/* grade, in the slot gitfut uses for football position */}
      <div
        style={{
          ...at(25, 23.78),
          transform: 'translateX(-50%)',
          fontFamily: FONT_COND,
          fontSize: '9.3cqw',
          fontWeight: 500,
          letterSpacing: '.02em',
          color: ink,
        }}
      >
        {grade}
      </div>

      {/* country flag — resolved from the GitHub location string */}
      {country && (
        <img
          src={`/badges/flags/${country}.png`}
          onError={hideOnError}
          alt={country}
          style={{ ...at(17.59, 33.17), width: '14.81%', height: '5.73%', objectFit: 'contain' }}
        />
      )}

      {/* top language logo, under the flag */}
      {langSlug && topLangName && (
        <img
          src={languageLogoUrl(langSlug)}
          crossOrigin="anonymous"
          onError={hideOnError}
          alt={topLangName}
          title={topLangName}
          style={{ ...at(19.06, 42.25), width: '11.875%', height: '7.5%', objectFit: 'contain' }}
        />
      )}

      {/* name */}
      <div
        style={{
          ...at(50, 53.66),
          transform: 'translateX(-50%)',
          fontFamily: FONT_BOLD,
          fontSize: '13cqw',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: ink,
        }}
      >
        {displayName}
      </div>

      {/* six DevTrack stats: Repos / Stars / Forks / Followers / PRs / Streak */}
      {statCells.map((c) => (
        <div key={c.label}>
          <span
            style={{
              ...at(c.vx, c.vy),
              fontFamily: FONT_BOLD,
              fontSize: '10.2cqw',
              fontWeight: 700,
              color: ink,
              whiteSpace: 'nowrap',
            }}
          >
            {c.value}
          </span>
          <span
            style={{
              ...at(c.lx, c.ly),
              fontFamily: FONT_COND,
              fontSize: '9.3cqw',
              fontWeight: 500,
              letterSpacing: '.02em',
              color: ink,
            }}
          >
            {c.label}
          </span>
        </div>
      ))}

      {/* signature — hidden on the live card, revealed only on the export clone
          (tagged `.dt-capturing` by lib exportCapture.ts + the .dt-signature
          rule in globals.css), so it lands in every download but never on screen. */}
      <div className="dt-signature">
        <div
          style={{
            ...at(8, 94.8),
            fontFamily: FONT_BOLD,
            fontSize: '4.1cqw',
            fontWeight: 700,
            letterSpacing: '.1em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: ink,
            opacity: 0.62,
          }}
        >
          DEVTRACK.APP
        </div>
        <div
          style={{
            position: 'absolute',
            right: '8%',
            top: '94.8%',
            maxWidth: '40%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: FONT_BOLD,
            fontSize: '4.1cqw',
            fontWeight: 700,
            letterSpacing: '.1em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: ink,
            opacity: 0.62,
          }}
        >
          @{data.username}
        </div>
      </div>
    </div>
  );
}

export default memo(PlayerCardFrame);
