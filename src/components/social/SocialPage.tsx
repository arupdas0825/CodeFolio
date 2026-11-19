"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, Braces, Code2, House,
  ImageIcon, LayoutGrid, Plus, Rocket, Search, Settings, UserRound, Users, X,
} from "lucide-react";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { logOutUser } from "@/lib/firebase";
import { getEveryoneFeed, getFeedForUser, getPost } from "@/services/devfeedService";
import type { DevFeedPost, PostType } from "@/types/devfeed";
import { ActivityCard, Avatar, DeveloperRow, Empty, ProjectCard, ProjectCover, Tags, Loading, More } from "./SocialUI";
import { Composer } from "./Composer";
import { Profile } from "./Profile";
import { useSocial, type SocialState } from "./useSocial";
import styles from "./social.module.css";

type Page = "feed" | "projects" | "project" | "post" | "profile" | "network" | "saved" | "search";
type OpenComposer = (type?: PostType, field?: "code" | "image") => void;
type GetPosts = (cursor?: string) => Promise<{ posts: DevFeedPost[]; nextCursor: string | null }>;

export function SocialPage({ page, slug, initialTab }: { page: Page; slug?: string; initialTab?: string }) {
  const social = useSocial();
  const { openAuthModal } = useAuthModal();
  const [composer, setComposer] = useState<{ type: PostType; field?: "code" | "image" } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const requireAuth = () => openAuthModal({ title: "Join CodeFolio", message: "Connect your GitHub account to join the developer network." });
  const openComposer: OpenComposer = (type = "general", field) => {
    if (!social.user) return requireAuth();
    setComposer({ type, field });
  };

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setAccountOpen(false);
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchRef.current?.value.trim();
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  const mainLinks = [
    { href: "/feed", label: "Feed", icon: House, active: page === "feed" },
    { href: "/projects", label: "Projects", icon: LayoutGrid, active: page === "projects" || page === "project" },
    { href: "/network", label: "Network", icon: Users, active: page === "network" },
  ];
  const profileUrl = social.user ? `/u/${social.user.username}` : "/profile";
  const profileActive = page === "profile" && (!slug || slug === social.user?.username);
  const personalLinks = [
    { href: profileUrl, label: "My profile", icon: UserRound, active: profileActive },
    { href: "/saved", label: "Saved posts", icon: Bookmark, active: page === "saved" },
  ];

  let content: ReactNode;
  switch (page) {
    case "feed": content = <Feed social={social} openComposer={openComposer} requireAuth={requireAuth} />; break;
    case "projects": content = <Projects social={social} openComposer={openComposer} />; break;
    case "project":
    case "post": content = <PostDetail key={slug} slug={slug || ""} project={page === "project"} social={social} requireAuth={requireAuth} />; break;
    case "profile": content = <Profile key={slug || social.user?.username || "me"} slug={slug} initialTab={initialTab} social={social} openComposer={openComposer} requireAuth={requireAuth} />; break;
    case "network": content = <Network social={social} requireAuth={requireAuth} />; break;
    case "search": content = <SearchResults key={slug} search={slug || ""} social={social} />; break;
    case "saved": content = <Saved social={social} requireAuth={requireAuth} />; break;
  }

  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main-content">Skip to content</a>
      <aside className={styles.rail}>
        <Link href="/feed" className={styles.brand}>
          <span className={styles.brandIcon}><Code2 size={21} strokeWidth={2.35} /></span>
          <span>CodeFolio<span className={styles.brandDot}>.</span></span>
        </Link>

        <nav aria-label="Main navigation" className={styles.railNav}>
          <span className={styles.navLabel}>Workspace</span>
          {mainLinks.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} className={styles.navLink} href={href} aria-label={label} aria-current={active ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
          <span className={styles.navLabel}>Personal</span>
          {personalLinks.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} className={styles.navLink} href={href} aria-label={label} aria-current={active ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
        </nav>

        <button className={styles.primary + " " + styles.railCreate} aria-label="New post" onClick={() => openComposer()}>
          <Plus size={18} /> New post
        </button>

        <div className={styles.railBottom}>
          <Link className={styles.navLink} href="/settings" aria-label="Settings"><Settings size={18} /><span>Settings</span></Link>
          {social.user ? (
            <Link className={styles.railAccount} href={profileUrl}>
              <Avatar name={social.user.displayName || social.user.username} src={social.user.photoURL} size={34} />
              <span>
                <strong>{social.user.displayName || social.user.username}</strong>
                <small>{social.preview ? "Preview account" : `@${social.user.username}`}</small>
              </span>
            </Link>
          ) : (
            <button className={styles.navLink} onClick={requireAuth}><GithubIcon className={styles.icon18} /> Sign in</button>
          )}
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <Link href="/feed" className={styles.mobileBrand} aria-label="CodeFolio feed"><span className={styles.brandIcon}><Code2 size={20} /></span></Link>
            <form className={styles.globalSearch} role="search" onSubmit={search}>
              <Search size={18} />
              <input ref={searchRef} type="search" aria-label="Search CodeFolio" placeholder="Search people and projects" defaultValue={page === "search" ? slug : ""} />
              <kbd>Ctrl K</kbd>
            </form>
            <div className={styles.topActions}>
              {social.preview ? <span className={styles.previewBadge}><i /> Preview mode</span> : social.user ? (
                <div className={styles.accountMenu}>
                  <button className={styles.iconButton} aria-label="Account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}>
                    <Avatar name={social.user.displayName || social.user.username} src={social.user.photoURL} size={33} />
                  </button>
                  {accountOpen && <div className={styles.dropdown}>
                    <Link href={profileUrl}>My profile</Link>
                    <Link href="/settings">Settings</Link>
                    <button onClick={() => {
                      logOutUser().then(() => setAccountOpen(false)).catch(() => social.setNotice("Couldn’t sign out. Try again."));
                    }}>Sign out</button>
                  </div>}
                </div>
              ) : (
                <button className={styles.secondary} onClick={requireAuth}><GithubIcon className={styles.icon18} /> Sign in</button>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className={styles.content}>{content}</main>
      </div>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {mainLinks.map(({ href, label, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>
        ))}
        <Link href={profileUrl} aria-current={profileActive ? "page" : undefined}><UserRound size={20} /><span>Profile</span></Link>
        <Link href="/saved" aria-current={page === "saved" ? "page" : undefined}><Bookmark size={20} /><span>Saved</span></Link>
      </nav>

      {composer && <Composer start={composer} close={() => setComposer(null)} social={social} />}
      {social.notice && <div className={styles.toast} role="status">
        {social.notice}<button aria-label="Dismiss notification" onClick={() => social.setNotice("")}><X size={16} /></button>
      </div>}
    </div>
  );
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

  return <div className={styles.feedLayout}>
    <div className={styles.feedColumn}>
      <Heading title="Developer feed" description="See what developers are building, shipping, and learning." />
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
  </div>;
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
      <div className={styles.sideHeading}><h2>Featured project</h2><Rocket size={17} /></div>
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
      <div className={styles.sideHeading}><h2>Who to follow</h2><Users size={17} /></div>
      <div className={styles.suggestions}>
        {suggestions.map((person) => <DeveloperRow key={person.uid} person={person} social={social} requireAuth={requireAuth} compact />)}
        {!suggestions.length && <p className={styles.sideEmpty}>Find more developers in your network.</p>}
      </div>
      <Link className={styles.panelLink} href="/network">Explore network <ArrowRight size={15} /></Link>
    </section>

    <footer className={styles.railFooter}>
      <Link href="/card">Developer cards</Link><Link href="/settings">Settings</Link>
      <small>© 2026 CodeFolio</small>
    </footer>
  </aside>;
}

function Projects({ social, openComposer }: { social: SocialState; openComposer: OpenComposer }) {
  const [search, setSearch] = useState("");
  const getPage = useFeedQuery(!social.preview, "launches");
  const feed = usePostPage(getPage, "projects");
  const projects = mergePosts(social.posts, feed.posts).filter((post) => post.type === "launch" && isProjectMatch(post, search));
  return <>
    <Heading title="Projects" description="Discover what the community has shipped." action={
      <button className={styles.primary} onClick={() => openComposer("launch")}><Plus size={18} /> Showcase a project</button>
    } />
    <label className={styles.sectionSearch}><Search size={18} /><input type="search" aria-label="Filter by project or technology" placeholder="Filter by project or technology" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {projects.length > 0 && <div className={styles.projectGrid}>
      {projects.map((post) => <ProjectCard key={post.id} post={post} />)}
    </div>}
    {feed.pending && <Loading />}
    {feed.error && <Empty title="Couldn’t load projects" action={<button className={styles.secondary} onClick={feed.retry}>Retry</button>} />}
    {!feed.pending && !feed.error && projects.length === 0 && <Empty title={search ? "No matching projects" : "No projects yet"} />}
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

function Network({ social, requireAuth }: { social: SocialState; requireAuth: () => void }) {
  const [filter, setFilter] = useState<"discover" | "following">("discover");
  const [search, setSearch] = useState("");
  const people = social.people.filter((person) => person.uid !== social.user?.uid &&
    (filter === "discover" || social.following.includes(person.uid)) &&
    `${person.name} ${person.username} ${person.bio || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <Heading title="Developer network" description="Connect with the people building the things you use." />
    <label className={styles.sectionSearch}><Search size={18} /><input type="search" aria-label="Find a developer" placeholder="Find a developer" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    <div className={styles.tabs} aria-label="Network filter">
      <button aria-pressed={filter === "discover"} onClick={() => setFilter("discover")}>Discover</button>
      <button aria-pressed={filter === "following"} onClick={() => setFilter("following")}>Following</button>
    </div>
    {people.length > 0 ? <div className={styles.networkGrid}>
      {people.map((person) => <DeveloperRow key={person.uid} person={person} social={social} requireAuth={requireAuth} />)}
    </div> : <Empty title={filter === "following" && !search ? "You haven’t followed anyone yet" : "No developers found"} />}
  </>;
}

function SearchResults({ search, social }: { search: string; social: SocialState }) {
  const getPage = useFeedQuery(!social.preview, "launches");
  const feed = usePostPage(getPage, "search");
  const query = search.trim().toLowerCase();
  const handle = query.replace(/^@/, "");
  const people = query ? social.people.filter((person) => `${person.name} ${person.username}`.toLowerCase().includes(handle)) : [];
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
