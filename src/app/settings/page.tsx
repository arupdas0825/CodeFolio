"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, Monitor, Moon, RefreshCw, Sun, UserRound } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { useTheme, type ThemeMode } from "@/components/ui/ThemeContext";
import { syncUserAndReposInFirestore } from "@/lib/firebase";
import { Avatar } from "@/components/social/SocialUI";
import { useWorkspace } from "@/components/social/Workspace";
import styles from "@/components/social/social.module.css";

const appearance = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Monitor },
] satisfies { mode: ThemeMode; label: string; icon: typeof Sun }[];

export default function SettingsPage() {
  const { social, requireAuth } = useWorkspace();
  const { mode, setMode } = useTheme();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const user = social.user;
  const profile = social.currentProfile;

  async function syncProfile() {
    if (!user || social.preview || syncing) return;
    setSyncing(true);
    setSyncStatus("");
    try {
      await syncUserAndReposInFirestore(user.uid, user.username, user.token);
      setSyncStatus("GitHub profile and repositories synced.");
    } catch {
      setSyncStatus("Couldn’t sync GitHub data. Try again in a moment.");
    } finally {
      setSyncing(false);
    }
  }

  function exportProfile() {
    if (!user || !profile) return;
    const file = new Blob([JSON.stringify({
      username: user.username,
      name: profile.name,
      headline: profile.headline,
      about: profile.bio,
      technologies: profile.skills,
      location: profile.location,
      website: profile.website,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codefolio-${user.username}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className={styles.content + " " + styles.settingsPage}>
    <header className={styles.pageHeading}><div><h1>Settings</h1><p>Manage your account and how CodeFolio looks.</p></div></header>
    <section className={styles.toolPanel}>
      <div className={styles.settingsHeading}><UserRound size={20} /><div><h2>Profile</h2><p>Edit your headline, about section, and technologies.</p></div></div>
      {profile ? <div className={styles.settingRow}>
        <Avatar name={profile.name} src={profile.avatar} size={42} />
        <div><strong>{profile.name}</strong><small>{social.preview ? "Preview account" : `@${profile.username}`}</small></div>
        <Link href="/profile" className={styles.secondary}>View profile <ArrowUpRight size={15} /></Link>
      </div> : <button className={styles.primary} onClick={requireAuth}>Sign in with GitHub</button>}
    </section>
    <section className={styles.toolPanel}>
      <div className={styles.settingsHeading}><Sun size={20} /><div><h2>Appearance</h2><p>Choose a theme for this device.</p></div></div>
      <div className={styles.themeChoices} aria-label="Color mode">
        {appearance.map(({ mode: option, label, icon: Icon }) => <button type="button" key={option} aria-pressed={mode === option} onClick={() => setMode(option)}><Icon size={19} /> {label}</button>)}
      </div>
    </section>
    <section className={styles.toolPanel}>
      <div className={styles.settingsHeading}><GithubIcon className={styles.icon18} /><div><h2>GitHub connection</h2><p>{social.preview ? "GitHub sync is unavailable in preview mode." : user ? `Connected as @${user.username}` : "Sign in to import your GitHub profile and repositories."}</p></div></div>
      {user && !social.preview && <button type="button" className={styles.secondary} disabled={syncing} onClick={syncProfile}><RefreshCw size={16} />{syncing ? "Syncing…" : "Sync from GitHub"}</button>}
      {syncStatus && <p role="status" className={styles.settingStatus}>{syncStatus}</p>}
    </section>
    <section className={styles.toolPanel}>
      <div className={styles.settingsHeading}><Download size={20} /><div><h2>Profile export</h2><p>Download your CodeFolio profile fields as JSON.</p></div></div>
      <button type="button" className={styles.secondary} onClick={exportProfile} disabled={!profile}><Download size={16} /> Download JSON</button>
    </section>
  </main>;
}
