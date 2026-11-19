"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bookmark, LayoutGrid, MapPin, Search, Users, UserRound } from "lucide-react";
import { Avatar, Empty, FollowControl, Loading, Tags } from "./SocialUI";
import { WorkspaceLinks } from "./Workspace";
import type { Developer } from "./preview";
import type { SocialState } from "./useSocial";
import styles from "./social.module.css";

export function Network({ social, requireAuth, initialTab }: { social: SocialState; requireAuth: () => void; initialTab?: string }) {
  const [filter, setFilter] = useState<"discover" | "following">(initialTab === "following" ? "following" : "discover");
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const candidates = social.people.filter((person) => person.uid !== social.user?.uid);
  const skills = [...new Set(candidates.flatMap((person) => person.skills || []))].sort((a, b) => a.localeCompare(b));
  const term = search.trim().toLowerCase().replace(/^@/, "");
  const developers = candidates.filter((person) =>
    (filter === "discover" || social.following.includes(person.uid)) &&
    (!skill || person.skills?.includes(skill)) &&
    [person.name, person.username, person.headline, person.bio, person.location, ...(person.skills || [])]
      .join(" ").toLowerCase().includes(term)
  );

  function selectTab(tab: typeof filter) {
    setFilter(tab);
    setSearch("");
    setSkill("");
  }

  return <>
    <header className={styles.pageHeading}>
      <div><h1>Developer network</h1><p>Find people building what you’re curious about.</p></div>
      {social.preview && <span className={styles.previewBadge}>Preview mode</span>}
    </header>

    <div className={styles.networkLayout}>
      <aside className={styles.networkSidebar} aria-label="Your network">
        <section className={styles.sidePanel}>
          <div className={styles.sideHeading}><h2>Your network</h2><Users size={17} /></div>
          <button type="button" className={styles.sideRow} onClick={() => selectTab("following")}>
            <UserRound size={17} /><span>Following</span><strong>{social.following.length}</strong>
          </button>
          <Link href="/saved" className={styles.sideRow}><Bookmark size={17} /><span>Saved posts</span><strong>{social.savedPosts.length}</strong></Link>
          <Link href="/projects" className={styles.sideRow}><LayoutGrid size={17} /><span>Explore projects</span><ArrowUpRight size={14} /></Link>
        </section>
        <WorkspaceLinks />
      </aside>

      <section className={styles.networkMain} aria-label="Developers">
        <div className={styles.directoryTools}>
          <div className={styles.tabs} aria-label="Network filter">
            <button type="button" aria-pressed={filter === "discover"} onClick={() => selectTab("discover")}>Discover</button>
            <button type="button" aria-pressed={filter === "following"} onClick={() => selectTab("following")}>Following <span>{social.following.length}</span></button>
          </div>
          <div className={styles.directoryFilters}>
            <label className={styles.sectionSearch}><Search size={17} />
              <input type="search" aria-label="Search developers" placeholder="Search by name, skill, or location" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {skills.length > 0 && <select className={styles.skillFilter} value={skill} onChange={(event) => setSkill(event.target.value)} aria-label="Filter by technology">
              <option value="">All technologies</option>
              {skills.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>}
          </div>
        </div>

        {social.directoryError ? <Empty title="Couldn’t load the directory" action={<button className={styles.secondary} onClick={social.retryDirectory}>Retry</button>} />
          : !social.directoryLoaded ? <Loading />
          : filter === "following" && !social.user ? <Empty title="Sign in to see who you follow" icon={<Users size={21} />} action={<button className={styles.primary} onClick={requireAuth}>Sign in</button>} />
          : developers.length ? <>
            <div className={styles.directoryHeading}><h2>{filter === "discover" ? "Explore developers" : "People you follow"}</h2><span>{developers.length} {developers.length === 1 ? "developer" : "developers"}</span></div>
            <div className={styles.directoryGrid}>
              {developers.map((person, index) => <DeveloperCard key={person.uid} person={person} tone={index % 4} social={social} requireAuth={requireAuth} />)}
            </div>
          </> : <Empty
            icon={<Users size={21} />}
            title={term || skill ? "No matching developers" : filter === "following" ? "You haven’t followed anyone yet" : "No developers listed yet"}
            action={term || skill ? <button className={styles.secondary} onClick={() => { setSearch(""); setSkill(""); }}>Clear filters</button>
              : filter === "following" ? <button className={styles.secondary} onClick={() => selectTab("discover")}>Explore developers <ArrowRight size={16} /></button>
              : undefined}
          />}
      </section>
    </div>
  </>;
}

function DeveloperCard({ person, tone, social, requireAuth }: {
  person: Developer; tone: number; social: SocialState; requireAuth: () => void;
}) {
  const href = `/u/${encodeURIComponent(person.username)}`;
  return <article className={styles.directoryCard}>
    <div className={styles.directoryCover} data-tone={tone} aria-hidden="true" />
    <div className={styles.directoryCardBody}>
      <div className={styles.directoryIdentity}>
        <Link href={href} aria-label={person.name}><Avatar name={person.name} src={person.avatar} size={60} /></Link>
        <Link href={href} className={styles.headerIcon} aria-label={`View ${person.name}’s profile`}><ArrowUpRight size={18} /></Link>
      </div>
      <h3><Link href={href}>{person.name}</Link></h3>
      <p className={styles.directoryRole}>{person.headline || person.company || `@${person.username}`}</p>
      {person.bio && <p className={styles.directoryBio}>{person.bio}</p>}
      {person.location && <span className={styles.location}><MapPin size={14} />{person.location}</span>}
      <Tags tags={person.skills?.slice(0, 3)} />
      <div className={styles.directoryAction}><FollowControl person={person} social={social} requireAuth={requireAuth} /></div>
    </div>
  </article>;
}
