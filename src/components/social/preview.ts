import type { DevFeedPost } from "@/types/devfeed";
import type { CodefolioUser } from "@/types/user";

export interface Developer {
  uid: string;
  username: string;
  name: string;
  avatar: string | null;
  bio?: string | null;
  location?: string | null;
  company?: string | null;
  website?: string | null;
  github?: string | null;
}

export const previewPeople: Developer[] = [
  { uid: "maya", username: "maya-chen", name: "Maya Chen", avatar: "/social/maya.jpg", bio: "Building thoughtful tools for developers.", location: "San Francisco, CA", company: "Independent developer" },
  { uid: "jordan", username: "jordan-lee", name: "Jordan Lee", avatar: "/social/jordan.jpg", bio: "Systems, APIs, and all things Go.", location: "Toronto, Canada", company: "Backend engineer" },
  { uid: "priya", username: "priya-nair", name: "Priya Nair", avatar: "/social/priya.jpg", bio: "Open source maintainer and design systems engineer.", location: "Bengaluru, India" },
  { uid: "alex", username: "alex-morgan", name: "Alex Morgan", avatar: "/social/alex.jpg", bio: "Software engineer interested in the web and developer experience." },
];

const alex = previewPeople[3];
export const previewUser: CodefolioUser = {
  uid: alex.uid, username: alex.username, displayName: alex.name, photoURL: alex.avatar, email: null,
};

const [maya, jordan, priya] = previewPeople;

export const previewPosts: DevFeedPost[] = [
  {
    id: "patchwork",
    authorId: maya.uid,
    authorUsername: maya.username,
    authorDisplayName: maya.name,
    authorAvatarUrl: maya.avatar,
    type: "launch",
    content: "I just shipped Patchwork, an open-source dashboard for monitoring background jobs. It started as a weekend project after one too many evenings digging through queue logs. I’d love feedback from anyone running Redis in production.",
    project: { title: "Patchwork", stack: ["TypeScript", "React", "Redis"], repoUrl: null, demoUrl: null },
    imageUrl: "/social/patchwork.webp",
    codeSnippet: null,
    codeLanguage: null,
    likesCount: 24,
    commentsCount: 1,
    createdAt: "2026-11-18T10:00:00Z",
  },
  {
    id: "structured-logs",
    authorId: jordan.uid,
    authorUsername: jordan.username,
    authorDisplayName: jordan.name,
    authorAvatarUrl: jordan.avatar,
    type: "learning",
    content: "A small Go tip I keep coming back to: pass your request ID into structured logs once, at the middleware layer. Every log downstream gets the right context for free.",
    imageUrl: null,
    codeSnippet: 'logger := slog.With("request_id", requestID)\nlogger.Info("request started", "path", r.URL.Path)',
    codeLanguage: "go",
    likesCount: 16,
    commentsCount: 0,
    createdAt: "2026-11-18T08:00:00Z",
  },
  {
    id: "relay",
    authorId: priya.uid,
    authorUsername: priya.username,
    authorDisplayName: priya.name,
    authorAvatarUrl: priya.avatar,
    type: "launch",
    content: "Relay is a lightweight toolkit for reliable webhooks. See deliveries, retry events, and debug failures in one place.",
    project: { title: "Relay", stack: ["Go", "PostgreSQL"], repoUrl: null, demoUrl: null },
    imageUrl: "/social/relay.webp",
    codeSnippet: null,
    codeLanguage: null,
    likesCount: 19,
    commentsCount: 0,
    createdAt: "2026-11-17T12:00:00Z",
  },
];
