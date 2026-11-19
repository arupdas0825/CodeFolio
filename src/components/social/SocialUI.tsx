"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Bookmark, Braces, FolderOpen, Heart, Link2, MessageCircle, Rocket, UserPlus } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { addComment, getComments } from "@/services/devfeedService";
import type { DevFeedComment, DevFeedPost } from "@/types/devfeed";
import type { Developer } from "./preview";
import type { SocialState } from "./useSocial";
import styles from "./social.module.css";

export function Avatar({ name, src, size }: { name: string; src?: string | null; size: number }) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size }}>
    {src && src !== brokenSrc ? <img src={src} alt="" onError={() => setBrokenSrc(src)} /> : initials}
  </span>;
}

export function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return <div className={styles.tags}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>;
}

export function ProjectCover({ post }: { post: DevFeedPost }) {
  const [failed, setFailed] = useState(false);
  const image = safeImage(post.imageUrl);
  return <div className={styles.projectCover}>
    {image && !failed ? <img src={image} alt={`${post.project?.title || "Project"} preview`} onError={() => setFailed(true)} /> : (
      <div className={styles.coverFallback}><Rocket size={30} /><strong>{post.project?.title || "Project launch"}</strong></div>
    )}
  </div>;
}

export function ProjectCard({ post }: { post: DevFeedPost }) {
  return <article className={styles.projectCard}>
    <Link href={`/projects/${post.id}`} aria-label={`View ${post.project?.title || "project"}`}><ProjectCover post={post} /></Link>
    <div className={styles.projectCardBody}>
      <h2><Link href={`/projects/${post.id}`}>{post.project?.title || "Project launch"} <ArrowUpRight size={18} /></Link></h2>
      <p>{post.content}</p>
      <Tags tags={post.project?.stack} />
      <Link className={styles.projectAuthor} href={`/u/${post.authorUsername}`}>
        <Avatar name={post.authorDisplayName || post.authorUsername} src={post.authorAvatarUrl} size={26} />
        {post.authorDisplayName || post.authorUsername}
      </Link>
    </div>
  </article>;
}

export function DeveloperRow({ person, social, requireAuth, compact = false }: {
  person: Developer; social: SocialState; requireAuth: () => void; compact?: boolean;
}) {
  return <article className={compact ? styles.personRow : styles.personCard}>
    <Link href={`/u/${person.username}`} className={styles.personLink}>
      <Avatar name={person.name} src={person.avatar} size={compact ? 34 : 43} />
      <span><strong>{person.name}</strong><small>{person.headline || person.company || `@${person.username}`}</small></span>
    </Link>
    <FollowControl person={person} social={social} requireAuth={requireAuth} compact={compact} />
    {!compact && person.bio && <p>{person.bio}</p>}
  </article>;
}

export function FollowControl({ person, social, requireAuth, compact = false }: {
  person: Developer; social: SocialState; requireAuth: () => void; compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (person.uid === social.user?.uid || !person.uid) return null;
  const following = social.following.includes(person.uid);

  return <button className={compact ? styles.followSmall : styles.secondary} disabled={busy} aria-pressed={following}
    aria-label={following ? `Unfollow ${person.name}` : `Follow ${person.name}`}
    onClick={async () => {
      if (!social.user) return requireAuth();
      setBusy(true);
      try {
        await social.follow(person);
      } catch {
        social.setNotice("Couldn’t update your following list.");
      } finally {
        setBusy(false);
      }
    }}>
    {!compact && !following && <UserPlus size={16} />}{following ? "Following" : "Follow"}
  </button>;
}

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const typeLabels = { general: "Update", launch: "Project launch", learning: "Learning", milestone: "Milestone" };
const previewComment: DevFeedComment = {
  id: "patchwork-comment", postId: "patchwork", authorId: "priya", authorUsername: "priya-nair",
  authorDisplayName: "Priya Nair", authorAvatarUrl: "/social/priya.jpg",
  content: "The retry history looks great. I’d love to try this with a few BullMQ queues.",
  createdAt: "2026-11-18T10:30:00Z",
};

export function ActivityCard({ post, social, requireAuth, detail = false }: {
  post: DevFeedPost; social: SocialState; requireAuth: () => void; detail?: boolean;
}) {
  const [likes, setLikes] = useState(post.likesCount);
  const [pending, setPending] = useState<"like" | "save" | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentList, setCommentList] = useState<DevFeedComment[] | null>(null);
  const [commentError, setCommentError] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [badImage, setBadImage] = useState(false);
  const liked = social.liked.includes(post.id);
  const saved = social.savedPosts.some((item) => item.id === post.id);
  const author = post.authorDisplayName || post.authorUsername;
  const localComments = social.comments[post.id] || [];
  const shownComments = social.preview ? [...(post.id === "patchwork" ? [previewComment] : []), ...localComments] : commentList;
  const commentCount = social.preview ? post.commentsCount + localComments.length : commentList?.length ?? post.commentsCount;
  const image = safeImage(post.imageUrl);
  const date = new Date(post.createdAt);
  const publisherUrl = `/u/${post.authorUsername}`;
  const permalink = post.type === "launch" ? `/projects/${post.id}` : `/posts/${post.id}`;

  async function apply(action: "like" | "save") {
    if (!social.user) return requireAuth();
    setPending(action);
    try {
      if (action === "like") {
        const reacted = await social.like(post.id);
        if (reacted !== null) setLikes((value) => Math.max(0, value + (reacted ? 1 : -1)));
      } else {
        await social.bookmark(post);
      }
    } catch {
      social.setNotice(action === "like" ? "Couldn’t react to this post." : "Couldn’t update saved posts.");
    } finally {
      setPending(null);
    }
  }

  async function loadComments() {
    setCommentError(false);
    try {
      setCommentList(await getComments(post.id));
    } catch {
      setCommentError(true);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!social.user) return requireAuth();
    const body = comment.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      if (social.preview) social.commentLocally(post.id, body);
      else {
        const response = await addComment(post.id, social.user, body);
        setCommentList((current) => [...(current || []), response]);
      }
      setComment("");
    } catch {
      social.setNotice("Couldn’t post your reply.");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(permalink, window.location.origin).href);
      social.setNotice("Link copied");
    } catch {
      social.setNotice("Couldn’t copy the link.");
    }
  }

  return <article className={styles.post} id={`post-${post.id}`}>
    <div className={styles.postHeader}>
      <Link href={publisherUrl} aria-label={author}><Avatar name={author} src={post.authorAvatarUrl} size={42} /></Link>
      <div className={styles.authorDetails}>
        <Link href={publisherUrl}>{author}</Link>
        <div><span>@{post.authorUsername}</span><span aria-hidden="true">·</span><time dateTime={post.createdAt}>{Number.isNaN(date.getTime()) ? "Recent" : dateFormat.format(date)}</time></div>
      </div>
      {post.type !== "general" && <span className={post.type === "launch" ? styles.launchBadge : styles.postBadge}>
        {post.type === "launch" ? <Rocket size={13} /> : post.type === "learning" ? <Braces size={13} /> : null}
        {typeLabels[post.type] || "Update"}
      </span>}
    </div>

    <p className={styles.postText}>{post.content}</p>

    {post.type === "launch" ? (
      <div className={styles.postProject}>
        {detail ? <ProjectCover post={post} /> : <Link href={permalink}><ProjectCover post={post} /></Link>}
        {post.project && <div className={styles.postProjectInfo}>
          <div>{!detail && <Link href={permalink}>{post.project.title}</Link>}<Tags tags={post.project.stack} /></div>
          {detail ? <div className={styles.detailLinks}>
            {safeUrl(post.project.repoUrl) && <a className={styles.secondary} href={post.project.repoUrl!} target="_blank" rel="noreferrer"><GithubIcon className={styles.icon18} /> Source</a>}
            {safeUrl(post.project.demoUrl) && <a className={styles.secondary} href={post.project.demoUrl!} target="_blank" rel="noreferrer">Live demo <ArrowUpRight size={16} /></a>}
          </div> : <Link href={permalink} className={styles.projectArrow} aria-label={`View ${post.project.title}`}><ArrowUpRight size={18} /></Link>}
        </div>}
      </div>
    ) : image && !badImage && <img className={styles.postImage} src={image} alt="Post attachment" onError={() => setBadImage(true)} />}

    {post.codeSnippet && <div className={styles.codeBlock}>
      <div><Braces size={15} /> {post.codeLanguage || "Code"}</div><pre><code>{post.codeSnippet}</code></pre>
    </div>}

    <div className={styles.postActions}>
      <button type="button" disabled={pending !== null} aria-pressed={liked} aria-label={liked ? "Unlike post" : "Like post"} onClick={() => apply("like")}>
        <Heart size={17} fill={liked ? "currentColor" : "none"} /> <span>{social.preview ? likes + Number(liked) : likes}</span>
      </button>
      <button type="button" aria-expanded={commentsOpen} aria-label={commentsOpen ? "Hide comments" : "Show comments"} onClick={() => {
        setCommentsOpen(!commentsOpen);
        if (!commentsOpen && !social.preview && !commentList) void loadComments();
      }}><MessageCircle size={17} /> <span>{commentCount}</span></button>
      <button type="button" onClick={copyLink} aria-label="Share post"><Link2 size={17} /><span className={styles.shareLabel}>Share</span></button>
      <button type="button" disabled={pending !== null} className={styles.saveAction} aria-pressed={saved} aria-label={saved ? "Unsave post" : "Save post"} onClick={() => apply("save")}>
        <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
      </button>
    </div>

    {commentsOpen && <section className={styles.comments} aria-label="Comments">
      <h3>Comments</h3>
      {commentError ? <button className={styles.secondary} onClick={loadComments}>Retry loading comments</button> : !shownComments ? (
        <p role="status">Loading comments…</p>
      ) : shownComments.length ? shownComments.map((entry) => (
        <div className={styles.comment} key={entry.id}>
          <Avatar name={entry.authorDisplayName || entry.authorUsername} src={entry.authorAvatarUrl} size={28} />
          <div><Link href={`/u/${entry.authorUsername}`}>{entry.authorDisplayName || entry.authorUsername}</Link><p>{entry.content}</p></div>
        </div>
      )) : <p>No comments yet.</p>}
      {social.user ? <form onSubmit={submit}>
        <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment…" aria-label="Comment" maxLength={500} />
        <button className={styles.primary} disabled={!comment.trim() || sending || (!social.preview && !commentList)}>{sending ? "Sending…" : "Reply"}</button>
      </form> : <button className={styles.secondary} onClick={requireAuth}>Sign in to reply</button>}
    </section>}
  </article>;
}

export function safeUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function safeImage(value: string | null) {
  return value?.startsWith("/social/") ? value : safeUrl(value);
}

export function Empty({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className={styles.empty}>
    <span>{icon || <FolderOpen size={22} />}</span>
    <h2>{title}</h2>{description && <p>{description}</p>}{action}
  </div>;
}

export function Loading() {
  return <div className={styles.loading} role="status">Loading…</div>;
}

export function More({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <button className={styles.secondary + " " + styles.more} disabled={pending} onClick={onClick}>{pending ? "Loading…" : "Load more"} <ArrowDown size={16} /></button>;
}
