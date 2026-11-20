"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Download, ExternalLink, Link2 } from "lucide-react";
import { CodefolioLogo } from "@/components/ui/CodefolioLogo";
import type { PortfolioProfile } from "@/services/github/github-portfolio.service";
import type { Developer } from "../preview";
import { Avatar, Tags } from "../SocialUI";
import styles from "./portfolio.module.css";
import socialStyles from "../social.module.css";

export function IdentityCard({ person, headline, profile, skills, verified, notice }: {
  person: Developer;
  headline?: string | null;
  profile?: PortfolioProfile | null;
  skills: string[];
  verified: boolean;
  notice: (message: string) => void;
}) {
  const card = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  async function download() {
    if (!card.current || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const image = await toPng(card.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `codefolio-${person.username}.png`;
      link.href = image;
      link.click();
    } catch {
      notice("Couldn’t export the developer card. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(`/u/${encodeURIComponent(person.username)}#developer-card`, window.location.origin).href);
      notice("Developer card link copied");
    } catch {
      notice("Couldn’t copy the developer card link.");
    }
  }

  return <section className={styles.section} id="developer-card">
    <div className={styles.sectionTitle}>
      <h2>Developer identity card</h2>
      <div className={styles.actions}>
        <button type="button" className={socialStyles.secondary} onClick={share}><Link2 size={15} /> Share</button>
        <button type="button" className={socialStyles.secondary} onClick={download} disabled={exporting}><Download size={15} />{exporting ? "Exporting…" : "Download PNG"}</button>
      </div>
    </div>
    <article ref={card} className={styles.identityCard}>
      <div className={styles.cardTop}>
        <span><CodefolioLogo size={27} /> CodeFolio</span>
        {verified && <span><BadgeCheck size={15} /> GitHub verified</span>}
      </div>
      <div className={styles.cardIdentity}>
        <Avatar name={person.name} src={person.avatar} size={67} />
        <div><strong>{person.name}</strong><span>@{person.username}</span>{headline && <p>{headline}</p>}</div>
      </div>
      {profile && <div className={styles.cardMetrics}>
        <span><strong>{profile.public_repos.toLocaleString()}</strong>Public repos</span>
        <span><strong>{profile.followers.toLocaleString()}</strong>GitHub followers</span>
        <span><strong>{profile.following.toLocaleString()}</strong>GitHub following</span>
      </div>}
      {skills.length > 0 && <Tags tags={skills.slice(0, 6)} />}
      {profile && <a href={profile.html_url} target="_blank" rel="noreferrer" className={styles.cardLink}>github.com/{profile.login} <ExternalLink size={13} /></a>}
    </article>
  </section>;
}
