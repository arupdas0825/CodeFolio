'use client';

import { useState } from 'react';
import { Check, ChevronDown, Download, FileText, Loader2, Share2 } from 'lucide-react';
import { exportCardToPDF, exportCardToPNG, isUserAuthenticated } from '@/lib/exportCard';
import { resolveTierTheme } from './finishTheme';
import type { DeveloperCardData, DeveloperTier } from '../DeveloperCard';

// Action row styled after gitfut's CardActions.tsx (split Download button +
// brand share icons), simplified to what DevTrack needs (PNG/PDF export + link
// share) and wired through DevTrack's existing sign-in gate (onRequireAuth).
export default function CardActionsPanel({
  data,
  cardRef,
  onRequireAuth,
}: {
  data: DeveloperCardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onRequireAuth?: (action: string) => void;
}) {
  const [busy, setBusy] = useState<'png' | 'pdf' | 'share' | null>(null);
  const [done, setDone] = useState<'png' | 'pdf' | 'share' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier: DeveloperTier = data.tier || 'Bronze';
  const tint = resolveTierTheme(tier).ink;

  const finish = (id: 'png' | 'pdf' | 'share') => {
    setDone(id);
    setTimeout(() => setDone((d) => (d === id ? null : d)), 1500);
  };

  const guardAuth = (action: string) => {
    if (!isUserAuthenticated()) {
      onRequireAuth?.(action);
      return false;
    }
    return true;
  };

  const downloadPng = async () => {
    if (!guardAuth('Download PNG') || busy) return;
    if (!cardRef.current) return;
    setBusy('png');
    setError(null);
    setMenuOpen(false);
    try {
      await exportCardToPNG(cardRef.current, data.username);
      finish('png');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNG export failed.');
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    if (!guardAuth('Download PDF') || busy) return;
    if (!cardRef.current) return;
    setBusy('pdf');
    setError(null);
    setMenuOpen(false);
    try {
      await exportCardToPDF(cardRef.current, data.username);
      finish('pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF export failed.');
    } finally {
      setBusy(null);
    }
  };

  const shareCard = async () => {
    if (!guardAuth('Share Card') || busy) return;
    setBusy('share');
    setError(null);
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const shareText = `Check out my DevTrack developer card, @${data.username}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'DevTrack developer card', text: shareText, url }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      finish('share');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed.');
    } finally {
      setBusy(null);
    }
  };

  const mainLabel = busy === 'png' ? 'Saving…' : done === 'png' ? 'Saved' : 'Download';

  return (
    <div className="flex w-full flex-col gap-2.5" data-export-exclude="true">
      <button
        type="button"
        onClick={shareCard}
        disabled={!!busy}
        className="font-display group relative flex h-[46px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[15px] font-bold tracking-[.03em] text-slate-950 shadow-[0_10px_28px_-6px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
      >
        {busy === 'share' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : done === 'share' ? (
          <Check size={16} strokeWidth={2.6} />
        ) : (
          <Share2 size={16} strokeWidth={2.5} />
        )}
        <span>{done === 'share' ? 'Link copied' : 'SHARE MY CARD'}</span>
      </button>

      <div className="relative flex w-full gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={!!busy}
          title="Download your card as a PNG"
          className="flex h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-l-xl border text-[13px] font-bold tracking-[.01em] transition-all disabled:opacity-60"
          style={{ color: tint, borderColor: `${tint}66`, background: `${tint}1f` }}
        >
          {busy === 'png' ? (
            <Loader2 size={15} className="animate-spin" />
          ) : done === 'png' ? (
            <Check size={15} strokeWidth={2.6} />
          ) : (
            <Download size={15} strokeWidth={2.4} />
          )}
          <span className="truncate">{mainLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={!!busy}
          title="More export options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-[44px] w-[38px] shrink-0 items-center justify-center rounded-r-xl border transition-all disabled:opacity-60"
          style={{ color: tint, borderColor: `${tint}66`, background: `${tint}1f` }}
        >
          <ChevronDown size={15} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-1 shadow-[0_14px_36px_-10px_rgba(0,0,0,.8)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={downloadPdf}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              {busy === 'pdf' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : done === 'pdf' ? (
                <Check size={14} />
              ) : (
                <FileText size={14} />
              )}
              Download PDF
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-center text-[11.5px] leading-snug text-rose-400">{error}</p>}
    </div>
  );
}
