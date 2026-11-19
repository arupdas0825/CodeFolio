"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, Search } from "lucide-react";
import { DeveloperCard, type DeveloperCardData } from "@/components/card/DeveloperCard";
import { GitHubCardService } from "@/services/github/github-card.service";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { Empty } from "@/components/social/SocialUI";
import { useWorkspace } from "@/components/social/Workspace";
import styles from "@/components/social/social.module.css";

export default function CardPage() {
  const { social, requireAuth } = useWorkspace();
  const username = social.user?.username;
  const input = useRef<HTMLInputElement>(null);
  const [card, setCard] = useState<DeveloperCardData | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate(handle: string) {
    const username = handle.trim().replace(/^@/, "");
    if (pending) return;
    if (!/^[a-z0-9-]{1,39}$/i.test(username)) {
      setError("Enter a valid GitHub username.");
      return;
    }
    setPending(true);
    setError("");
    try {
      setCard(await GitHubCardService.fetchRealDeveloperCardData(username, social.preview ? undefined : social.user?.token));
    } catch {
      setError(`Couldn’t load GitHub data for @${username}. Check the username and try again.`);
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generate(input.current?.value || "");
  }

  return <main className={styles.content}>
    <header className={styles.pageHeading}><div><h1>Developer cards</h1><p>Turn your public GitHub activity into a shareable card.</p></div></header>
    <div className={styles.cardStudio}>
      <section className={styles.toolPanel}>
        <div className={styles.settingsHeading}><GithubIcon className={styles.icon18} /><div><h2>Look up a GitHub profile</h2><p>Enter a public username to generate a card.</p></div></div>
        <form className={styles.studioForm} onSubmit={submit}>
          <label className={styles.sectionSearch}><Search size={17} /><input ref={input} aria-label="GitHub username" placeholder={social.preview ? "e.g. torvalds" : social.user?.username || "GitHub username"} maxLength={40} required /></label>
          <button className={styles.primary} disabled={pending}>{pending ? "Generating…" : "Generate card"}</button>
        </form>
        {username && !social.preview && <button className={styles.secondary} disabled={pending} onClick={() => {
          if (input.current) input.current.value = username;
          void generate(username);
        }}>Use my GitHub profile</button>}
        {error && <p className={styles.formError} role="alert">{error}</p>}
      </section>
      <section className={styles.toolPanel}>
        <div className={styles.sectionHeading}><h2>Card preview</h2>{card && <Link href={`/u/${encodeURIComponent(card.username)}`} className={styles.secondary}>View profile <ArrowUpRight size={14} /></Link>}</div>
        {card ? <DeveloperCard data={card} isLoading={pending} onRequireAuth={requireAuth} />
          : <Empty icon={<CreditCard size={22} />} title={pending ? "Loading card…" : "Your card will appear here"} />}
      </section>
    </div>
  </main>;
}
