import type { DevFeedPost } from "@/types/devfeed";
import type { CodefolioUser } from "@/types/user";

export interface Developer {
  uid: string;
  username: string;
  name: string;
  avatar: string | null;
  bio?: string | null;
  headline?: string | null;
  skills?: string[];
  privacy?: "public" | "unlisted" | "private";
  location?: string | null;
  company?: string | null;
  website?: string | null;
  github?: string | null;
}

const maya: Developer = {
  uid: "maya", username: "maya-chen", name: "Maya Chen", avatar: "/social/maya.jpg",
  headline: "Independent developer · Creator of Patchwork",
  bio: "I build tools that make the hidden parts of software easier to work with. Right now, I’m building Patchwork, an open-source dashboard for background jobs. I care about small teams, good documentation, and a calmer on-call experience.",
  skills: ["TypeScript", "React", "Redis"], location: "San Francisco, CA",
};
const jordan: Developer = {
  uid: "jordan", username: "jordan-lee", name: "Jordan Lee", avatar: "/social/jordan.jpg",
  headline: "Backend engineer", bio: "Systems, APIs, and all things Go.", skills: ["Go", "PostgreSQL", "Docker"],
  location: "Toronto, Canada",
};
const priya: Developer = {
  uid: "priya", username: "priya-nair", name: "Priya Nair", avatar: "/social/priya.jpg",
  headline: "Open-source maintainer", bio: "Design systems and accessible developer tools.",
  skills: ["TypeScript", "React", "Go"], location: "Bengaluru, India",
};
const alex: Developer = {
  uid: "alex", username: "alex-morgan", name: "Alex Morgan", avatar: "/social/alex.jpg",
  headline: "Product engineer", bio: "I build for the web and write about developer experience.",
  skills: ["TypeScript", "React", "Next.js"], location: "Brooklyn, NY",
};

export const previewPeople: Developer[] = [
  maya, jordan, priya,
  { uid: "leo", username: "leo-martins", name: "Leo Martins", avatar: "/social/leo.jpg", headline: "Platform engineer", bio: "Making deployments routine for small teams.", skills: ["Docker", "Go", "Kubernetes"], location: "Lisbon, Portugal" },
  { uid: "sana", username: "sana-ahmed", name: "Sana Ahmed", avatar: "/social/sana.jpg", headline: "Machine learning engineer", bio: "Building thoughtful interfaces for applied ML.", skills: ["Python", "PyTorch", "React"], location: "London, UK" },
  { uid: "noah", username: "noah-williams", name: "Noah Williams", avatar: "/social/noah.jpg", headline: "Developer experience engineer", bio: "Documentation, CLIs, and the glue between tools.", skills: ["Rust", "TypeScript", "Docker"], location: "Austin, TX" },
  alex,
];

export const previewUser: CodefolioUser = {
  uid: alex.uid, username: alex.username, displayName: alex.name, photoURL: alex.avatar, email: null,
};

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
