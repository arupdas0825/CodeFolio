"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, FolderOpen, Link2, MapPin, Pencil, Plus, UserRound } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { getPostsByUsername } from "@/services/devfeedService";
import { GitHubUserService } from "@/services/github/github-user.service";
import { GitHubRepositoryService } from "@/services/github/github-repository.service";
import type { DevFeedPost, PostType } from "@/types/devfeed";
import type { GitHubRepository } from "@/types/github";
import { ActivityCard, Avatar, Empty, FollowControl, Loading, More, ProjectCard, safeUrl } from "./SocialUI";
import { findDeveloper, type SocialState } from "./useSocial";
import type { Developer } from "./preview";
import styles from "./social.module.css";

const tabLabels = { overview: "Overview", projects: "Projects", posts: "Posts", repositories: "Repositories" };
type Tab = keyof typeof tabLabels;

export function Profile({ slug, initialTab, social, openComposer, requireAuth }: {
  slug?: string; initialTab?: string; social: SocialState;
  openComposer: (type?: PostType) => void; requireAuth: () => void;
}) {
  const username = slug || social.user?.username;
  const own = Boolean(username && username === social.user?.username);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab === "pinned" ? "repositories" : initialTab && Object.hasOwn(tabLabels, initialTab) ? initialTab as Tab : "overview");
  const [resolved, setResolved] = useState<{ user: string; developer: Developer | null }>();
  const [remoteRepos, setRemoteRepos] = useState<{ username: string; repos: GitHubRepository[] | null }>();
  const [remoteActivity, setRemoteActivity] = useState<{
    key: string; posts: DevFeedPost[]; cursor: string | null; error?: boolean;
  }>();
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState<string>();
  const [aboutInput, setAboutInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const listed = social.people.find((person) => person.username === username);
  const activityKey = JSON.stringify([username, loadVersion]);
  const activity = remoteActivity?.key === activityKey ? remoteActivity : null;
  const nextCursor = activity?.cursor;
  const postsError = activity?.error;
  const postsLoading = !social.preview && Boolean(username) && !activity;
  const repos = remoteRepos?.username === username ? remoteRepos?.repos : undefined;

  useEffect(() => {
    if (!username || (social.preview && listed)) return;
    let active = true;
    (async () => {
      const member = await findDeveloper(username).catch(() => null);
      if (member) return member;
      if (!/^[a-z0-9-]{1,39}$/i.test(username)) return null;
      const github = await GitHubUserService.fetchUserProfile(username);
      return {
        uid: "", username: github.login, name: github.name || github.login, avatar: github.avatar_url,
        bio: github.bio, location: github.location, company: github.company, website: github.blog, github: github.html_url,
      } satisfies Developer;
    })().then((developer) => { if (active) setResolved({ user: username, developer }); })
      .catch(() => { if (active) setResolved({ user: username, developer: null }); });
    return () => { active = false; };
  }, [username, social.preview, listed]);

  useEffect(() => {
    if (!username || social.preview) return;
    let active = true;
    getPostsByUsername(username).then(({ posts, nextCursor }) => {
      if (active) setRemoteActivity({ key: activityKey, posts, cursor: nextCursor });
    }).catch(() => {
      if (active) setRemoteActivity({ key: activityKey, posts: [], cursor: null, error: true });
    });
    return () => { active = false; };
  }, [username, social.preview, activityKey]);

  useEffect(() => {
    if (!username || (social.preview && listed) || activeTab !== "repositories" || repos !== undefined) return;
    let active = true;
    GitHubRepositoryService.fetchUserProfileRepos(username).then((items) => {
      if (active) setRemoteRepos({ username, repos: items.filter((repo) => !repo.private).slice(0, 12) });
    }).catch(() => { if (active) setRemoteRepos({ username, repos: null }); });
    return () => { active = false; };
  }, [activeTab, listed, social.preview, username, repos]);

  const fallback = own && social.user ? {
    uid: social.user.uid, username: social.user.username, name: social.user.displayName || social.user.username,
    avatar: social.user.photoURL, github: `https://github.com/${social.user.username}`,
  } satisfies Developer : undefined;
  const person: Developer | null | undefined = (resolved?.user === username ? resolved?.developer : null) || listed || fallback;
  const publicAbout = about ?? (own && social.preview ? social.localAbout : undefined) ?? person?.bio ?? "";
  const recent = social.posts.filter((post) => post.authorUsername === username);
  const recentIds = new Set(recent.map((post) => post.id));
  const posts = [...recent, ...(activity?.posts || []).filter((post) => !recentIds.has(post.id))];
  const projects = posts.filter((post) => post.type === "launch");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!own || saving) return;
    setSaving(true);
    try {
      await social.saveAbout(aboutInput.trim());
      setAbout(aboutInput.trim());
      setEditing(false);
    } catch {
      social.setNotice("Couldn’t save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function loadMore() {
    if (!username || !nextCursor || more) return;
    setMore(true);
    try {
      const { posts, nextCursor: cursor } = await getPostsByUsername(username, nextCursor);
      setRemoteActivity((current) => current?.key === activityKey ? {
        ...current, cursor, posts: [...current.posts, ...posts.filter((post) => !current.posts.some((entry) => entry.id === post.id))],
      } : current);
    } catch {
      social.setNotice("Couldn’t load more activity.");
    } finally {
      setMore(false);
    }
  }

  if (!username) return <Empty title="Create your developer profile" description="Connect your GitHub account to publish projects and share updates." action={<button className={styles.primary} onClick={requireAuth}>Sign in with GitHub</button>} />;
  if (!person) return resolved ? <Empty title="Developer profile unavailable" description={`We couldn’t find a profile for @${username}.`} action={<Link className={styles.secondary} href="/network">Browse developers</Link>} /> : <Loading />;

  const website = safeUrl(person.website) || (person.website && !person.website.includes("://") ? safeUrl(`https://${person.website}`) : null);
  const previewPerson = social.preview && Boolean(listed);

  return <div className={styles.profile}>
    <section className={styles.profileHero}>
      <div className={styles.profileCover} aria-hidden="true"><div /><span>&lt;/&gt;</span></div>
      <div className={styles.profileIdentity}>
        <div className={styles.profileTopLine}>
          <Avatar name={person.name} src={person.avatar} size={86} />
          <div className={styles.profileCtas}>
            {own ? <button className={styles.secondary} onClick={() => { setEditing(!editing); setAboutInput(publicAbout); }}><Pencil size={16} /> Edit profile</button>
              : <FollowControl person={person} social={social} requireAuth={requireAuth} />}
            {!previewPerson && <a className={styles.secondary} href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer" aria-label="GitHub profile"><GithubIcon className={styles.icon18} /></a>}
          </div>
        </div>
        <h1>{person.name}</h1>
        <p className={styles.handle}>@{person.username}</p>
        {publicAbout && <p className={styles.profileBio}>{publicAbout}</p>}
        <div className={styles.profileMetadata}>
          {person.company && <span><Building2 size={16} />{person.company}</span>}
          {person.location && <span><MapPin size={16} />{person.location}</span>}
          {website && <a href={website} target="_blank" rel="noreferrer"><Link2 size={16} />{new URL(website).hostname}</a>}
        </div>
        {editing && <form className={styles.editPanel} onSubmit={save}>
          <label>About<textarea value={aboutInput} onChange={(event) => setAboutInput(event.target.value)} rows={3} maxLength={500} /></label>
          <button type="button" className={styles.secondary} onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          <button className={styles.primary} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>}
      </div>
      <div className={styles.tabs} aria-label="Profile sections">
        {(Object.entries(tabLabels) as [Tab, string][]).filter(([key]) => !previewPerson || key !== "repositories").map(([value, label]) => (
          <button key={value} aria-pressed={activeTab === value} onClick={() => setActiveTab(value)}>{label}</button>
        ))}
      </div>
    </section>

    <div className={styles.profileLayout}>
      <div className={styles.profileMain}>
        {(activeTab === "overview" || activeTab === "projects") && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}>
            <h2>{activeTab === "overview" ? "Featured work" : "Projects"}</h2>
            {own && <button className={styles.secondary} onClick={() => openComposer("launch")}><Plus size={16} /> Add project</button>}
          </div>
          {projects.length ? <div className={styles.profileProjects}>
            {(activeTab === "overview" ? projects.slice(0, 2) : projects).map((post) => <ProjectCard key={post.id} post={post} />)}
          </div> : !postsLoading && !postsError && <Empty title="No projects published yet" />}
          {activeTab === "overview" && projects.length > 2 && <button className={styles.secondary} onClick={() => setActiveTab("projects")}>View all projects</button>}
        </section>}
        {(activeTab === "overview" || activeTab === "posts") && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}><h2>{activeTab === "overview" ? "Recent activity" : "Posts"}</h2>
            {activeTab === "overview" && posts.length > 2 && <button className={styles.secondary} onClick={() => setActiveTab("posts")}>All posts</button>}
          </div>
          {(activeTab === "overview" ? posts.slice(0, 2) : posts).map((post) => <ActivityCard key={post.id} post={post} social={social} requireAuth={requireAuth} />)}
          {!posts.length && !postsLoading && !postsError && <Empty title="No activity yet" action={own ? <button className={styles.secondary} onClick={() => openComposer()}>Create a post</button> : undefined} />}
        </section>}
        {activeTab !== "repositories" && <>
          {postsLoading && <Loading />}
          {postsError && <Empty title="Couldn’t load profile activity" action={<button className={styles.secondary} onClick={() => setLoadVersion((n) => n + 1)}>Retry</button>} />}
          {activeTab !== "overview" && nextCursor && <More pending={more} onClick={loadMore} />}
        </>}
        {activeTab === "repositories" && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}><h2>Public GitHub repositories</h2></div>
          {repos === undefined && <Loading />}
          {repos === null && <Empty title="Couldn’t load repositories" action={<button className={styles.secondary} onClick={() => setRemoteRepos(undefined)}>Retry</button>} />}
          {repos?.length === 0 && <Empty title="No public repositories found" />}
          {repos?.map((repo) => <a className={styles.repoRow} key={repo.full_name} href={repo.html_url} target="_blank" rel="noreferrer">
            <FolderOpen size={19} /><div><strong>{repo.name}</strong><p>{repo.description || repo.language || "View repository on GitHub"}</p></div><ArrowUpRight size={16} />
          </a>)}
        </section>}
      </div>
      <aside className={styles.profileAside}>
        <section className={styles.sidePanel}>
          <div className={styles.sideHeading}><h2>On CodeFolio</h2><UserRound size={17} /></div>
          <div className={styles.profileCounts}>
            <button onClick={() => setActiveTab("projects")}><strong>{projects.length}{nextCursor ? "+" : ""}</strong> Projects</button>
            <button onClick={() => setActiveTab("posts")}><strong>{posts.length}{nextCursor ? "+" : ""}</strong> Posts</button>
          </div>
          {!previewPerson && <Link href={`/insights/${username}`} className={styles.panelLink}>GitHub insights <ArrowUpRight size={15} /></Link>}
        </section>
      </aside>
    </div>
  </div>;
}
