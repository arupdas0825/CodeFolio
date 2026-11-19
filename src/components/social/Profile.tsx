"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, FolderOpen, Layers3, Link2, MapPin, Pencil, Plus } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { getPostsByUsername } from "@/services/devfeedService";
import { GitHubUserService } from "@/services/github/github-user.service";
import { GitHubRepositoryService } from "@/services/github/github-repository.service";
import type { DevFeedPost, PostType } from "@/types/devfeed";
import type { GitHubRepository } from "@/types/github";
import type { PublicProfileDetails } from "@/types/user";
import { ActivityCard, Avatar, Empty, FollowControl, Loading, More, ProjectCard, Tags, safeUrl } from "./SocialUI";
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
  const [editor, setEditor] = useState({ headline: "", about: "", skills: "" });
  const [saving, setSaving] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const listed = social.people.find((person) => person.username === username);
  const previewPerson = social.preview && Boolean(listed);
  const selectedTab = previewPerson && activeTab === "repositories" ? "overview" : activeTab;
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
    if (!username || (social.preview && listed) || selectedTab !== "repositories" || repos !== undefined) return;
    let active = true;
    GitHubRepositoryService.fetchUserProfileRepos(username).then((items) => {
      if (active) setRemoteRepos({ username, repos: items.filter((repo) => !repo.private).slice(0, 12) });
    }).catch(() => { if (active) setRemoteRepos({ username, repos: null }); });
    return () => { active = false; };
  }, [selectedTab, listed, social.preview, username, repos]);

  const person = (own ? social.currentProfile : (resolved?.user === username ? resolved?.developer : null) || listed);
  const publicAbout = person?.bio ?? "";
  const recent = social.posts.filter((post) => post.authorUsername === username);
  const recentIds = new Set(recent.map((post) => post.id));
  const posts = [...recent, ...(activity?.posts || []).filter((post) => !recentIds.has(post.id))];
  const projects = posts.filter((post) => post.type === "launch");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!own || saving) return;
    setSaving(true);
    try {
      const skills = [...new Set(editor.skills.split(",").map((skill) => skill.trim().slice(0, 32)).filter(Boolean))].slice(0, 10);
      const details: PublicProfileDetails = { headline: editor.headline.trim(), about: editor.about.trim(), skills };
      await social.saveProfile(details);
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
  if (person?.privacy === "private" && !own) return <Empty title="This CodeFolio profile is private" action={<Link className={styles.secondary} href="/network">Browse developers</Link>} />;
  if (!person) return resolved ? <Empty title="Developer profile unavailable" description={`We couldn’t find a profile for @${username}.`} action={<Link className={styles.secondary} href="/network">Browse developers</Link>} /> : <Loading />;

  const website = safeUrl(person.website) || (person.website && !person.website.includes("://") ? safeUrl(`https://${person.website}`) : null);
  const skills = person.skills?.length ? person.skills : [...new Set(projects.flatMap((project) => project.project?.stack || []))].slice(0, 10);
  const gitHubPage = previewPerson ? null : safeUrl(person.github) || `https://github.com/${encodeURIComponent(username)}`;

  function editProfile() {
    setEditor({ headline: person?.headline || "", about: publicAbout, skills: (person?.skills || []).join(", ") });
    setEditing(true);
  }

  async function copyProfile() {
    try {
      await navigator.clipboard.writeText(new URL(`/u/${encodeURIComponent(username || "")}`, window.location.origin).href);
      social.setNotice("Profile link copied");
    } catch {
      social.setNotice("Couldn’t copy the profile link.");
    }
  }

  return <div className={styles.profile}>
    <section className={styles.profileHero} aria-label="Developer profile">
      <div className={styles.profileCover} aria-hidden="true" />
      <div className={styles.profileIdentity}>
        <div className={styles.profileTopLine}>
          <Avatar name={person.name} src={person.avatar} size={103} />
          <div className={styles.profileCtas}>
            <button type="button" className={styles.secondary} onClick={copyProfile} aria-label="Copy profile link"><Link2 size={17} /><span>Share</span></button>
            {own ? <button type="button" className={styles.primary} onClick={editProfile}><Pencil size={16} /> Edit profile</button>
              : <FollowControl person={person} social={social} requireAuth={requireAuth} />}
          </div>
        </div>
        <div className={styles.profileName}>
          <h1>{person.name}</h1>
          <p>@{person.username}</p>
        </div>
        {person.headline && <p className={styles.profileHeadline}>{person.headline}</p>}
        <div className={styles.profileMetadata}>
          {person.location && <span><MapPin size={16} />{person.location}</span>}
          {person.company && <span><Building2 size={16} />{person.company}</span>}
          {website && <a href={website} target="_blank" rel="noreferrer"><Link2 size={16} />{new URL(website).hostname}</a>}
          {gitHubPage && <a href={gitHubPage} target="_blank" rel="noreferrer"><GithubIcon className={styles.icon18} /> GitHub</a>}
        </div>
        {editing && <form className={styles.editPanel} onSubmit={save}>
          <label>Headline<input value={editor.headline} onChange={(event) => setEditor({ ...editor, headline: event.target.value })} maxLength={100} autoFocus /></label>
          <label>About<textarea aria-label="About" value={editor.about} onChange={(event) => setEditor({ ...editor, about: event.target.value })} rows={3} maxLength={500} /></label>
          <label>Technologies <small>Separate with commas</small><input value={editor.skills} onChange={(event) => setEditor({ ...editor, skills: event.target.value })} maxLength={260} /></label>
          <button type="button" className={styles.secondary} onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          <button className={styles.primary} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>}
      </div>
      <div className={styles.tabs} aria-label="Profile sections">
        {(Object.entries(tabLabels) as [Tab, string][]).filter(([key]) => !previewPerson || key !== "repositories").map(([value, label]) => (
          <button key={value} type="button" aria-pressed={selectedTab === value} onClick={() => setActiveTab(value)}>{label}</button>
        ))}
      </div>
    </section>

    <div className={styles.profileLayout}>
      <div className={styles.profileMain}>
        {selectedTab === "overview" && (publicAbout || own) && <section className={styles.aboutPanel}>
          <div className={styles.sectionHeading}><h2>About</h2>{own && <button type="button" className={styles.headerIcon} onClick={editProfile} aria-label="Edit about"><Pencil size={16} /></button>}</div>
          <p>{publicAbout || "Add a short introduction so other developers can learn what you work on."}</p>
        </section>}
        {(selectedTab === "overview" || selectedTab === "projects") && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}>
            <h2>{selectedTab === "overview" ? "Featured work" : "Projects"}</h2>
            {own && <button className={styles.secondary} onClick={() => openComposer("launch")}><Plus size={16} /> Add project</button>}
          </div>
          {projects.length ? <div className={styles.profileProjects}>
            {(selectedTab === "overview" ? projects.slice(0, 2) : projects).map((post) => <ProjectCard key={post.id} post={post} />)}
          </div> : !postsLoading && !postsError && <Empty title="No projects published yet" />}
          {selectedTab === "overview" && projects.length > 2 && <button className={styles.secondary} onClick={() => setActiveTab("projects")}>View all projects</button>}
        </section>}
        {(selectedTab === "overview" || selectedTab === "posts") && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}><h2>{selectedTab === "overview" ? "Recent activity" : "Posts"}</h2>
            {selectedTab === "overview" && posts.length > 2 && <button className={styles.secondary} onClick={() => setActiveTab("posts")}>All posts</button>}
          </div>
          {(selectedTab === "overview" ? posts.slice(0, 2) : posts).map((post) => <ActivityCard key={post.id} post={post} social={social} requireAuth={requireAuth} />)}
          {!posts.length && !postsLoading && !postsError && <Empty title="No activity yet" action={own ? <button className={styles.secondary} onClick={() => openComposer()}>Create a post</button> : undefined} />}
        </section>}
        {selectedTab !== "repositories" && <>
          {postsLoading && <Loading />}
          {postsError && <Empty title="Couldn’t load profile activity" action={<button className={styles.secondary} onClick={() => setLoadVersion((n) => n + 1)}>Retry</button>} />}
          {selectedTab !== "overview" && nextCursor && <More pending={more} onClick={loadMore} />}
        </>}
        {selectedTab === "repositories" && <section className={styles.profileSection}>
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
          <div className={styles.sideHeading}><h2>On CodeFolio</h2></div>
          <div className={styles.profileCounts}>
            <button type="button" onClick={() => setActiveTab("projects")}><strong>{projects.length}{nextCursor ? "+" : ""}</strong> Projects</button>
            <button type="button" onClick={() => setActiveTab("posts")}><strong>{posts.length}{nextCursor ? "+" : ""}</strong> Posts</button>
          </div>
          {!previewPerson && <Link href={`/insights/${encodeURIComponent(username)}`} className={styles.panelLink}>GitHub insights <ArrowUpRight size={15} /></Link>}
        </section>
        {(skills.length > 0 || own) && <section className={styles.sidePanel}>
          <div className={styles.sideHeading}><h2>Tech stack</h2><Layers3 size={17} /></div>
          <div className={styles.profileSkills}>
            {skills.length ? <Tags tags={skills} /> : <button type="button" className={styles.secondary} onClick={editProfile}><Plus size={15} /> Add technologies</button>}
          </div>
        </section>}
      </aside>
    </div>
  </div>;
}
