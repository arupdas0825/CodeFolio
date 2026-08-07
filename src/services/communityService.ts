// Codefolio Community Ecosystem Service
import { db } from "@/lib/firebase";

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorTitle: string;
  content: string;
  type: "milestone" | "launch" | "discussion" | "feedback" | "general";
  createdAt: string;
  likes: string[]; // User IDs who liked
  commentsCount: number;
  bookmarks: string[]; // User IDs who bookmarked
  codeSnippet?: string;
  codeLanguage?: string;
  likesCount?: number;
}

export interface DiscussionThread {
  id: string;
  title: string;
  category: "frontend" | "backend" | "ai" | "ml" | "opensource" | "devops" | "cloud" | "career" | "interview" | "projects" | "hackathons" | "programming";
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  upvotes: string[];
  downvotes: string[];
  repliesCount: number;
  tags: string[];
  acceptedAnswerId: string | null;
}

export interface ForumReply {
  id: string;
  parentId: string; // post ID or discussion ID
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  isAnswer: boolean;
}

export interface DirectMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  codeSnippet?: string;
  codeLanguage?: string;
  reactions: Record<string, string[]>; // emoji -> user IDs
}

export interface JobListing {
  id: string;
  company: string;
  role: string;
  salary: string;
  location: string;
  experience: string;
  applyLink: string;
  requirements: string[];
}

export interface CommunityDeveloper {
  uid: string;
  username: string;
  displayName: string;
  avatar: string;
  title: string;
  grade: string;
  reputation: number;
  followers: string[];
  following: string[];
  skills: string[];
}

// Community data templates (starts empty for live user content)
const INITIAL_DEVELOPERS: CommunityDeveloper[] = [];
const INITIAL_POSTS: CommunityPost[] = [];
const INITIAL_DISCUSSIONS: DiscussionThread[] = [];
const INITIAL_JOBS: JobListing[] = [];


export const CommunityService = {
  // Local storage keys
  getStorageKey(username: string, suffix: string): string {
    return `codefolio_community_${username}_${suffix}`;
  },

  // 1. Developers Directory
  getDevelopers(username: string): CommunityDeveloper[] {
    if (typeof window === "undefined") return INITIAL_DEVELOPERS;
    const key = this.getStorageKey(username, "developers");
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    localStorage.setItem(key, JSON.stringify(INITIAL_DEVELOPERS));
    return INITIAL_DEVELOPERS;
  },

  saveDevelopers(username: string, devs: CommunityDeveloper[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(username, "developers");
    localStorage.setItem(key, JSON.stringify(devs));
  },

  // 2. Social Posts
  getPosts(username: string): CommunityPost[] {
    if (typeof window === "undefined") return INITIAL_POSTS;
    const key = this.getStorageKey(username, "posts");
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    localStorage.setItem(key, JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  },

  savePosts(username: string, posts: CommunityPost[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(username, "posts");
    localStorage.setItem(key, JSON.stringify(posts));
  },

  createPost(username: string, postData: Omit<CommunityPost, "id" | "createdAt" | "likes" | "commentsCount" | "bookmarks">): CommunityPost {
    const posts = this.getPosts(username);
    const newPost: CommunityPost = {
      ...postData,
      id: `post-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      likes: [],
      commentsCount: 0,
      bookmarks: []
    };
    const updated = [newPost, ...posts];
    this.savePosts(username, updated);
    return newPost;
  },

  toggleLikePost(username: string, postId: string, userId: string): CommunityPost[] {
    const posts = this.getPosts(username);
    const updated = posts.map(p => {
      if (p.id === postId) {
        const isLiked = p.likes.includes(userId);
        const newLikes = isLiked ? p.likes.filter(id => id !== userId) : [...p.likes, userId];
        return { ...p, likes: newLikes };
      }
      return p;
    });
    this.savePosts(username, updated);
    return updated;
  },

  toggleBookmarkPost(username: string, postId: string, userId: string): CommunityPost[] {
    const posts = this.getPosts(username);
    const updated = posts.map(p => {
      if (p.id === postId) {
        const isBookmarked = p.bookmarks.includes(userId);
        const newBookmarks = isBookmarked ? p.bookmarks.filter(id => id !== userId) : [...p.bookmarks, userId];
        return { ...p, bookmarks: newBookmarks };
      }
      return p;
    });
    this.savePosts(username, updated);
    return updated;
  },

  // 3. Discussions Forum
  getDiscussions(username: string): DiscussionThread[] {
    if (typeof window === "undefined") return INITIAL_DISCUSSIONS;
    const key = this.getStorageKey(username, "discussions");
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    localStorage.setItem(key, JSON.stringify(INITIAL_DISCUSSIONS));
    return INITIAL_DISCUSSIONS;
  },

  saveDiscussions(username: string, discs: DiscussionThread[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(username, "discussions");
    localStorage.setItem(key, JSON.stringify(discs));
  },

  createDiscussion(username: string, discData: Omit<DiscussionThread, "id" | "createdAt" | "upvotes" | "downvotes" | "repliesCount" | "acceptedAnswerId">): DiscussionThread {
    const discussions = this.getDiscussions(username);
    const newDisc: DiscussionThread = {
      ...discData,
      id: `disc-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      upvotes: [],
      downvotes: [],
      repliesCount: 0,
      acceptedAnswerId: null
    };
    const updated = [newDisc, ...discussions];
    this.saveDiscussions(username, updated);
    return newDisc;
  },

  toggleUpvoteDiscussion(username: string, discId: string, userId: string): DiscussionThread[] {
    const discussions = this.getDiscussions(username);
    const updated = discussions.map(d => {
      if (d.id === discId) {
        const isUpvoted = d.upvotes.includes(userId);
        const newUpvotes = isUpvoted ? d.upvotes.filter(id => id !== userId) : [...d.upvotes, userId];
        const newDownvotes = d.downvotes.filter(id => id !== userId);
        return { ...d, upvotes: newUpvotes, downvotes: newDownvotes };
      }
      return d;
    });
    this.saveDiscussions(username, updated);
    return updated;
  },

  // 4. Replies & Comments
  getReplies(username: string, parentId: string): ForumReply[] {
    if (typeof window === "undefined") return [];
    const key = this.getStorageKey(username, `replies_${parentId}`);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    // Default reply for demonstration
    const defaults: ForumReply[] = parentId === "disc-1" ? [
      { id: "rep-1", parentId, authorId: "dev-yyx", authorName: "Evan You", authorAvatar: "E", content: "To diagnose hydration issues quickly, try using `react-hydration-error-helper` or check for date-related values by wrapping server timestamps in `useEffect` or turning off hydration dynamically using `dynamic(() => ..., { ssr: false })`.", createdAt: new Date(Date.now() - 3600000 * 7).toISOString(), isAnswer: true },
      { id: "rep-2", parentId, authorId: "dev-alex", authorName: "Alex Coder", authorAvatar: "A", content: "Thanks Evan! Turning off hydration on some dynamic items works perfectly.", createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), isAnswer: false }
    ] : [];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  },

  saveReplies(username: string, parentId: string, reps: ForumReply[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(username, `replies_${parentId}`);
    localStorage.setItem(key, JSON.stringify(reps));
  },

  addReply(username: string, parentId: string, replyData: Omit<ForumReply, "id" | "createdAt" | "isAnswer" | "parentId">): ForumReply {
    const replies = this.getReplies(username, parentId);
    const newReply: ForumReply = {
      ...replyData,
      parentId,
      id: `rep-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      isAnswer: false
    };

    const updated = [...replies, newReply];
    this.saveReplies(username, parentId, updated);

    // Update parent repliesCount
    const posts = this.getPosts(username);
    if (posts.some(p => p.id === parentId)) {
      this.savePosts(username, posts.map(p => p.id === parentId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    }
    const discussions = this.getDiscussions(username);
    if (discussions.some(d => d.id === parentId)) {
      this.saveDiscussions(username, discussions.map(d => d.id === parentId ? { ...d, repliesCount: d.repliesCount + 1 } : d));
    }

    return newReply;
  },

  acceptAnswer(username: string, discId: string, replyId: string): { discussions: DiscussionThread[]; replies: ForumReply[] } {
    const discussions = this.getDiscussions(username);
    const updatedDiscussions = discussions.map(d => d.id === discId ? { ...d, acceptedAnswerId: replyId } : d);
    this.saveDiscussions(username, updatedDiscussions);

    const replies = this.getReplies(username, discId);
    const updatedReplies = replies.map(r => r.id === replyId ? { ...r, isAnswer: true } : { ...r, isAnswer: false });
    this.saveReplies(username, discId, updatedReplies);

    return { discussions: updatedDiscussions, replies: updatedReplies };
  },

  // 5. Follows
  followUser(username: string, myUserId: string, targetUserId: string): CommunityDeveloper[] {
    const devs = this.getDevelopers(username);
    const updated = devs.map(d => {
      if (d.uid === targetUserId) {
        const isFollowing = d.followers.includes(myUserId);
        const newFollowers = isFollowing ? d.followers.filter(id => id !== myUserId) : [...d.followers, myUserId];
        return { ...d, followers: newFollowers };
      }
      if (d.uid === myUserId) {
        const isFollowing = d.following.includes(targetUserId);
        const newFollowing = isFollowing ? d.following.filter(id => id !== targetUserId) : [...d.following, targetUserId];
        return { ...d, following: newFollowing };
      }
      return d;
    });
    this.saveDevelopers(username, updated);
    return updated;
  },

  // 6. Direct Messaging (Chat Threads)
  getMessages(username: string, chatId: string): DirectMessage[] {
    if (typeof window === "undefined") return [];
    const key = this.getStorageKey(username, `messages_${chatId}`);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    const defaults: DirectMessage[] = [
      { id: "msg-1", chatId, senderId: "dev-yyx", content: "Hey! Loved your Codefolio profile score.", createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), reactions: {} },
      { id: "msg-2", chatId, senderId: "self", content: "Thanks Evan! Vite is awesome, by the way.", createdAt: new Date(Date.now() - 3600000 * 23).toISOString(), reactions: {} },
      { id: "msg-3", chatId, senderId: "dev-yyx", content: "Check out this TypeScript wrapper block I structured recently.", createdAt: new Date(Date.now() - 3600000 * 22).toISOString(), codeSnippet: `// TypeScript generic interface helper\nexport interface ApiResponse<T> {\n  status: 'success' | 'error';\n  payload: T;\n}`, codeLanguage: "typescript", reactions: {} }
    ];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  },

  saveMessages(username: string, chatId: string, msgs: DirectMessage[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(username, `messages_${chatId}`);
    localStorage.setItem(key, JSON.stringify(msgs));
  },

  sendMessage(username: string, chatId: string, senderId: string, content: string, codeSnippet?: string, codeLanguage?: string): DirectMessage {
    const msgs = this.getMessages(username, chatId);
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      chatId,
      senderId,
      content,
      createdAt: new Date().toISOString(),
      codeSnippet,
      codeLanguage,
      reactions: {}
    };
    const updated = [...msgs, newMsg];
    this.saveMessages(username, chatId, updated);
    return newMsg;
  },

  // 7. Jobs Matching calculation
  getJobsWithMatching(myLanguages: Array<{ name: string; percentage: number }>): Array<JobListing & { matchScore: number }> {
    const userLangs = myLanguages.map(l => l.name.toLowerCase());
    
    return INITIAL_JOBS.map(job => {
      let matched = 0;
      job.requirements.forEach(req => {
        // Simple keywords check
        const reqLower = req.toLowerCase();
        if (userLangs.includes(reqLower)) {
          matched++;
        } else if (reqLower.includes("typescript") && userLangs.includes("typescript")) {
          matched++;
        } else if (reqLower.includes("react") && userLangs.includes("typescript")) {
          matched++; // estimation overlap
        } else if (reqLower.includes("python") && userLangs.includes("python")) {
          matched++;
        } else if (reqLower.includes("postgresql") && userLangs.includes("sql")) {
          matched++;
        }
      });
      // Match percentage
      const matchScore = Math.round((matched / Math.max(1, job.requirements.length)) * 100);
      return {
        ...job,
        matchScore: Math.min(100, Math.max(15, matchScore + 15)) // Ensure a realistic baseline score
      };
    });
  }
};
export type { JobListing as CommunityJobListing };
