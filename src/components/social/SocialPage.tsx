"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, Braces, ImageIcon, LayoutGrid, MapPin, Plus, Rocket, Search, Users,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { getEveryoneFeed, getFeedForUser, getPost } from "@/services/devfeedService";
import type { DevFeedPost, PostType } from "@/types/devfeed";
import { ActivityCard, Avatar, DeveloperRow, Empty, ProjectCard, ProjectCover, Tags, Loading, More } from "./SocialUI";
import { Network } from "./Network";
import { useWorkspace, WorkspaceLinks } from "./Workspace";
import { Profile } from "./Profile";
import type { SocialState } from "./useSocial";
import styles from "./social.module.css";

type Page = "feed" | "projects" | "project" | "post" | "profile" | "network" | "saved" | "search";
type OpenComposer = (type?: PostType, field?: "code" | "image") => void;
type GetPosts = (cursor?: string) => Promise<{ posts: DevFeedPost[]; nextCursor: string | null }>;

export function SocialPage({ page, slug, initialTab }: { page: Page; slug?: string; initialTab?: string }) {
  const { social, openComposer, requireAuth } = useWorkspace();

  let content: ReactNode;
  switch (page) {
    case "feed": content = <Feed social={social} openComposer={openComposer} requireAuth={requireAuth} />; break;
    case "projects": content = <Projects social={social} openComposer={openComposer} />; break;
    case "project":
    case "post": content = <PostDetail key={slug} slug={slug || ""} project={page === "project"} social={social} requireAuth={requireAuth} />; break;
    case "profile": content = <Profile key={slug || social.user?.username || "me"} slug={slug} initialTab={initialTab} social={social} openComposer={openComposer} requireAuth={requireAuth} />; break;
    case "network": content = <Network key={initialTab} social={social} requireAuth={requireAuth} initialTab={initialTab} />; break;
    case "search": content = <SearchResults key={slug} search={slug || ""} social={social} />; break;
    case "saved": content = <Saved social={social} requireAuth={requireAuth} />; break;
  }

  return <main className={styles.content}>{content}</main>;
}

function Heading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className={styles.pageHeading}>
    <div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </header>;
}

function usePostPage(getPage: GetPosts | null, key: string) {
  const [result, setResult] = useState<{ key: string; posts: DevFeedPost[]; cursor: string | null } | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!getPage) return;
    let active = true;
    getPage().then(({ posts, nextCursor }) => {
      if (active) setResult({ key, posts, cursor: nextCursor });
    }).catch(() => { if (active) setIssue(key); });
    return () => { active = false; };
  }, [getPage, key, retryCount]);

  const current = result?.key === key ? result : null;

  async function loadMore() {
    if (!getPage || !current?.cursor || more) return;
    setMore(true);
    try {
      const { posts, nextCursor } = await getPage(current.cursor);
      setIssue(null);
      setResult((previous) => previous?.key === key ? {
        key, cursor: nextCursor, posts: mergePosts(previous.posts, posts),
      } : previous);
    } catch {
      setIssue(key);
    } finally {
      setMore(false);
    }
  }

  return {
    posts: current?.posts || [], pending: Boolean(getPage && !current && issue !== key),
    error: issue === key, cursor: current?.cursor, loadMore, more,
    retry: () => { setIssue(null); setRetryCount((count) => count + 1); },
  };
}

function mergePosts(first: DevFeedPost[], second: DevFeedPost[]) {
  const ids = new Set(first.map((post) => post.id));
  return [...first, ...second.filter((post) => !ids.has(post.id))];
}

function Feed({ social, openComposer, requireAuth }: { social: SocialState; openComposer: OpenComposer; requireAuth: () => void }) {
  const [filter, setFilter] = useState<"latest" | "following" | "launches">("latest");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const canLoad = !social.preview && (filter !== "following" || Boolean(social.user));

  return <>
    <Heading title="Developer feed" description="Follow the people and projects moving your craft forward."
      action={social.preview && <span className={styles.previewBadge}>Preview mode</span>} />
    <div className={styles.feedLayout}>
      <FeedSidebar social={social} requireAuth={requireAuth} />
      <div className={styles.feedColumn}>
      <section className={styles.quickComposer} aria-label="Create a post">
        <div className={styles.quickInput}>
          <Avatar name={social.user?.displayName || social.user?.username || "You"} src={social.user?.photoURL} size={42} />
          <button onClick={() => openComposer()}>What are you building?</button>
        </div>
        <div className={styles.quickTools}>
          <div>
            <button onClick={() => openComposer("launch")}><Rocket size={17} /> <span>Project launch</span></button>
            <button onClick={() => openComposer("learning", "code")}><Braces size={17} /> <span>Code snippet</span></button>
            <button onClick={() => openComposer("general", "image")}><ImageIcon size={17} /> <span>Image</span></button>
          </div>
          <button className={styles.primary} onClick={() => openComposer()}>Post</button>
        </div>
      </section>

      <div className={styles.feedControls}>
        <div className={styles.tabs} aria-label="Feed filter">
          {(["latest", "following", "launches"] as const).map((item) => (
            <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item === "latest" ? "All posts" : item === "following" ? "Following" : "Launches"}
            </button>
          ))}
        </div>
        <label className={styles.sort}><ArrowDownUp size={14} />
          <select aria-label="Sort loaded posts" value={sort} onChange={(event) => setSort(event.target.value === "popular" ? "popular" : "recent")}>
            <option value="recent">Latest</option><option value="popular">Most liked</option>
          </select>
        </label>
      </div>

        <FeedEntries key={`${filter}-${social.user?.uid || "guest"}`} social={social} canLoad={canLoad} filter={filter} sort={sort} requireAuth={requireAuth} />
      </div>
      <Discover social={social} requireAuth={requireAuth} />
    </div>
  </>;
}

function FeedSidebar({ social, requireAuth }: { social: SocialState; requireAuth: () => void }) {
  const profile = social.currentProfile;

  return <aside className={styles.feedSidebar} aria-label="Your workspace">
    <section className={styles.sidePanel}>
      <div className={styles.miniCover} aria-hidden="true" />
      {profile ? <>
        <div className={styles.miniProfile}>
          <Link href={`/u/${encodeURIComponent(profile.username)}`} aria-label={`View ${profile.name}’s profile`}><Avatar name={profile.name} src={profile.avatar} size={61} /></Link>
          <h2><Link href={`/u/${encodeURIComponent(profile.username)}`}>{profile.name}</Link></h2>
          <p>{profile.headline || `@${profile.username}`}</p>
          {profile.location && <span className={styles.location}><MapPin size={13} />{profile.location}</span>}
        </div>
        <Link className={styles.panelLink} href={`/u/${encodeURIComponent(profile.username)}`}>View my profile <ArrowUpRight size={15} /></Link>
      </> : <div className={styles.miniProfile + " " + styles.guestProfile}>
        <h2>Join CodeFolio</h2>
        <p>Publish projects and follow developers.</p>
        <button type="button" className={styles.secondary} onClick={requireAuth}><GithubIcon className={styles.icon18} /> Sign in</button>
      </div>}
    </section>
    <section className={styles.sidePanel}>
      <div className={styles.sideHeading}><h2>Your workspace</h2></div>
      <Link href="/network?tab=following" className={styles.sideRow}><Users size={17} /><span>Following</span><strong>{social.following.length}</strong></Link>
      <Link href="/saved" className={styles.sideRow}><Bookmark size={17} /><span>Saved posts</span><strong>{social.savedPosts.length}</strong></Link>
      <Link href="/projects" className={styles.sideRow}><LayoutGrid size={17} /><span>Project gallery</span><ArrowUpRight size={14} /></Link>
    </section>
  </aside>;
}

function FeedEntries({ social, canLoad, filter, sort, requireAuth }: {
  social: SocialState; canLoad: boolean; filter: "latest" | "following" | "launches";
  sort: "recent" | "popular"; requireAuth: () => void;
}) {
  const uid = social.user?.uid;
  const followingKey = filter === "following" ? social.following.join(",") : "";
  const getPage = useFeedQuery(canLoad, filter, uid);
  const feed = usePostPage(getPage, `${filter}:${followingKey}`);
  const localPosts = social.posts.filter((post) => {
    if (filter === "launches") return post.type === "launch";
    if (filter === "following") return social.following.includes(post.authorId) || post.authorId === uid;
    return true;
  });
  const posts = mergePosts(localPosts, feed.posts);
  const ordered = sort === "popular" ? [...posts].sort((a, b) => b.likesCount - a.likesCount) : posts;

  if (filter === "following" && !social.user) return <Empty title="See posts from people you follow" action={<button className={styles.primary} onClick={requireAuth}>Sign in</button>} />;
  return <div className={styles.postList} aria-busy={feed.pending}>
    {ordered.map((post) => <ActivityCard key={post.id} post={post} social={social} requireAuth={requireAuth} />)}
    {feed.pending && <Loading />}
    {feed.error && <Empty title="Couldn’t load posts" action={<button className={styles.secondary} onClick={feed.retry}>Retry</button>} />}
    {!feed.pending && !feed.error && ordered.length === 0 && (
      filter === "following"
        ? <Empty title="Your following feed is quiet" description="Follow developers to see their posts here." action={<Link href="/network" className={styles.secondary}>Find developers <ArrowRight size={16} /></Link>} />
        : <Empty title={filter === "launches" ? "No launches yet" : "No posts yet"} description="Be the first to share what you’re building." />
    )}
    {feed.cursor && !feed.error && <More pending={feed.more} onClick={feed.loadMore} />}
  </div>;
}

function useFeedQuery(enabled: boolean, filter: "latest" | "following" | "launches", uid?: string) {
  return useMemo<GetPosts | null>(() => {
    if (!enabled) return null;
    if (filter === "following" && uid) return (cursor) => getFeedForUser(uid, cursor);
    return (cursor) => getEveryoneFeed(cursor, 20, filter === "launches");
  }, [enabled, filter, uid]);
}

function Discover({ social, requireAuth }: { social: SocialState; requireAuth: () => void }) {
  const launchQuery = useFeedQuery(!social.preview, "launches");
  const launches = usePostPage(launchQuery, "featured");
  const featured = social.preview ? social.posts.find((post) => post.id === "relay") : mergePosts(social.posts, launches.posts).find((post) => post.type === "launch");
  const suggestions = social.people.filter((person) => person.uid !== social.user?.uid && !social.following.includes(person.uid)).slice(0, 3);
  return <aside className={styles.discover} aria-label="Discover CodeFolio">
    <section className={styles.sidePanel}>
      <div className={styles.sideHeading}><h2>Project spotlight</h2><Rocket size={17} /></div>
      {featured ? <>
        <Link href={`/projects/${featured.id}`} className={styles.featureCover}><ProjectCover post={featured} /></Link>
        <div className={styles.featureInfo}>
          <Link href={`/projects/${featured.id}`} className={styles.featureTitle}>{featured.project?.title || "Project launch"} <ArrowUpRight size={16} /></Link>
          <p>{social.preview ? "A lightweight toolkit for reliable webhooks." : featured.content}</p>
          <Tags tags={featured.project?.stack} />
        </div>
      </> : <p className={styles.sideEmpty}>{launches.pending ? "Loading projects…" : "New launches will appear here."}</p>}
      <Link className={styles.panelLink} href="/projects">Explore projects <ArrowRight size={15} /></Link>
    </section>

    <section className={styles.sidePanel}>
      <div className={styles.sideHeading}><h2>Developers to follow</h2><Users size={17} /></div>
      <div className={styles.suggestions}>
        {suggestions.map((person) => <DeveloperRow key={person.uid} person={person} social={social} requireAuth={requireAuth} compact />)}
        {!suggestions.length && <p className={styles.sideEmpty}>Find more developers in your network.</p>}
      </div>
      <Link className={styles.panelLink} href="/network">Explore network <ArrowRight size={15} /></Link>
    </section>

    <WorkspaceLinks />
  </aside>;
}

function Projects({ social, openComposer }: { social: SocialState; openComposer: OpenComposer }) {
  const [search, setSearch] = useState("");
  const [technology, setTechnology] = useState("");
  const getPage = useFeedQuery(!social.preview, "launches");
  const feed = usePostPage(getPage, "projects");
  const launches = mergePosts(social.posts, feed.posts).filter((post) => post.type === "launch");
  const technologies = [...new Set(launches.flatMap((post) => post.project?.stack || []))].sort();
  const projects = launches.filter((post) => isProjectMatch(post, search) && (!technology || post.project?.stack.includes(technology)));
  return <>
    <Heading title="Projects" description="Discover what the community has shipped." action={
      <button className={styles.primary} onClick={() => openComposer("launch")}><Plus size={18} /> Showcase a project</button>
    } />
    <div className={styles.projectTools}>
      <label className={styles.sectionSearch}><Search size={18} /><input type="search" aria-label="Filter by project or technology" placeholder="Search projects or technologies" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      {technologies.length > 0 && <select className={styles.skillFilter} aria-label="Filter projects by technology" value={technology} onChange={(event) => setTechnology(event.target.value)}>
        <option value="">All technologies</option>
        {technologies.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>}
    </div>
    {projects.length > 0 && <div className={styles.projectGrid}>
      {projects.map((post) => <ProjectCard key={post.id} post={post} />)}
    </div>}
    {feed.pending && <Loading />}
    {feed.error && <Empty title="Couldn’t load projects" action={<button className={styles.secondary} onClick={feed.retry}>Retry</button>} />}
    {!feed.pending && !feed.error && projects.length === 0 && <Empty title={search || technology ? "No matching projects" : "No projects yet"} />}
    {feed.cursor && !feed.error && <More pending={feed.more} onClick={feed.loadMore} />}
  </>;
}

function PostDetail({ slug, project, social, requireAuth }: { slug: string; project: boolean; social: SocialState; requireAuth: () => void }) {
  const [result, setResult] = useState<DevFeedPost | null | undefined>();
  const [error, setError] = useState(false);
  const local = social.posts.find((post) => post.id === slug);

  useEffect(() => {
    if (social.preview || local) return;
    let active = true;
    getPost(slug).then((post) => { if (active) setResult(post); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [slug, social.preview, local]);

  const post = local || result;
  return <div className={styles.detailColumn}>
    <Link href={project ? "/projects" : "/feed"} className={styles.backLink}>{project ? "← All projects" : "← Developer feed"}</Link>
    {error ? <Empty title={project ? "Couldn’t load this project" : "Couldn’t load this post"} /> : post && (!project || post.type === "launch") ? <>
      <Heading title={project ? post.project?.title || "Project launch" : "Post"} description={`Published by ${post.authorDisplayName || post.authorUsername}`} />
      <ActivityCard post={post} social={social} requireAuth={requireAuth} detail />
    </> : social.preview || result !== undefined ? <Empty title={project ? "Project not found" : "Post not found"} /> : <Loading />}
  </div>;
}

function SearchResults({ search, social }: { search: string; social: SocialState }) {
  const getPage = useFeedQuery(!social.preview, "launches");
  const feed = usePostPage(getPage, "search");
  const query = search.trim().toLowerCase();
  const handle = query.replace(/^@/, "");
  const people = query ? social.people.filter((person) =>
    [person.name, person.username, person.headline, ...(person.skills || [])].join(" ").toLowerCase().includes(handle)
  ) : [];
  const posts = query ? mergePosts(social.posts, feed.posts).filter((post) => post.type === "launch" && isProjectMatch(post, query)) : [];
  return <>
    <Heading title="Search" description={query ? `Results for “${search}”` : "Find developers and projects."} />
    {people.length > 0 && <section className={styles.searchSection}>
      <h2>Developers</h2>
      <div className={styles.networkGrid}>{people.map((person) => (
        <Link key={person.uid} className={styles.searchPerson} href={`/u/${person.username}`}>
          <Avatar name={person.name} src={person.avatar} size={40} /><div><strong>{person.name}</strong><small>@{person.username}</small></div><ArrowUpRight size={16} />
        </Link>
      ))}</div>
    </section>}
    {posts.length > 0 && <section className={styles.searchSection}><h2>Projects</h2><div className={styles.projectGrid}>
      {posts.map((post) => <ProjectCard key={post.id} post={post} />)}
    </div></section>}
    {feed.pending && <Loading />}
    {feed.error && <Empty title="Couldn’t load projects" action={<button className={styles.secondary} onClick={feed.retry}>Retry</button>} />}
    {!posts.length && !people.length && !feed.pending && !feed.error && <Empty title={query ? "No matches in CodeFolio" : "Enter a search term"} action={
      /^[\w-]+$/.test(handle) ? <Link href={`/u/${encodeURIComponent(handle)}`} className={styles.secondary}>Look up @{handle} on GitHub <ArrowUpRight size={16} /></Link> : undefined
    } />}
    {feed.cursor && !feed.error && query && <More pending={feed.more} onClick={feed.loadMore} />}
  </>;
}

function Saved({ social, requireAuth }: { social: SocialState; requireAuth: () => void }) {
  return <div className={styles.detailColumn}>
    <Heading title="Saved posts" description="Keep launches, snippets, and updates you want to revisit." />
    {social.savedPosts.length > 0 ? <div className={styles.postList}>
      {social.savedPosts.map((post) => <ActivityCard key={post.id} post={post} social={social} requireAuth={requireAuth} />)}
    </div> : <Empty icon={<Bookmark size={22} />} title={social.user ? "No saved posts yet" : "Sign in to see saved posts"} action={
      social.user ? <Link className={styles.secondary} href="/feed">Browse feed <ArrowRight size={16} /></Link> : <button className={styles.primary} onClick={requireAuth}>Sign in</button>
    } />}
  </div>;
}

function isProjectMatch(post: DevFeedPost, search: string) {
  return [post.project?.title, post.content, post.authorUsername, ...(post.project?.stack || [])].join(" ").toLowerCase().includes(search.trim().toLowerCase());
}
