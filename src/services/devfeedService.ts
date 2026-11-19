/**
 * devfeedService.ts
 * Firestore queries and mutations for posts, likes, comments, follows, and bookmarks.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  documentId,
  runTransaction,
  writeBatch,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DevFeedPost,
  DevFeedLike,
  DevFeedComment,
  DevFeedFollow,
  CreatePostInput,
} from "@/types/devfeed";
import { CodefolioUser } from "@/types/user";

const isFirebaseEnabled =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// ─── helpers ──────────────────────────────────────────────────────────────────

function assertFirebase(): void {
  if (!isFirebaseEnabled || !db) {
    throw new Error(
      "Firebase is not initialized or configured. Cannot perform DevFeed operation."
    );
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function docToPost(snap: DocumentSnapshot<DocumentData>): DevFeedPost {
  const d = snap.data()!;
  return {
    id: snap.id,
    authorId: d.authorId,
    authorUsername: d.authorUsername,
    authorDisplayName: d.authorDisplayName ?? null,
    authorAvatarUrl: d.authorAvatarUrl ?? null,
    content: d.content,
    type: d.type,
    codeSnippet: d.codeSnippet ?? null,
    codeLanguage: d.codeLanguage ?? null,
    imageUrl: d.imageUrl ?? null,
    ...(d.project ? { project: d.project } : {}),
    likesCount: d.likesCount ?? 0,
    commentsCount: d.commentsCount ?? 0,
    createdAt: d.createdAt,
  };
}

function docToComment(snap: QueryDocumentSnapshot<DocumentData>): DevFeedComment {
  const d = snap.data();
  return {
    id: snap.id,
    postId: d.postId,
    authorId: d.authorId,
    authorUsername: d.authorUsername,
    authorDisplayName: d.authorDisplayName ?? null,
    authorAvatarUrl: d.authorAvatarUrl ?? null,
    content: d.content,
    createdAt: d.createdAt,
  };
}

// ─── posts ────────────────────────────────────────────────────────────────────

/**
 * Creates a new post authored by the given user.
 */
export async function createPost(
  author: CodefolioUser,
  input: CreatePostInput
): Promise<DevFeedPost> {
  assertFirebase();

  const postsRef = collection(db!, "posts");
  const postRef = doc(postsRef);
  const now = new Date().toISOString();

  const payload: Omit<DevFeedPost, "id"> = {
    authorId: author.uid,
    authorUsername: author.username,
    authorDisplayName: author.displayName ?? null,
    authorAvatarUrl: author.photoURL ?? null,
    content: input.content,
    type: input.type,
    codeSnippet: input.codeSnippet ?? null,
    codeLanguage: input.codeLanguage ?? null,
    imageUrl: input.imageUrl ?? null,
    ...(input.project ? { project: input.project } : {}),
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
  };

  const batch = writeBatch(db!);
  batch.set(postRef, payload);
  batch.set(doc(db!, "users", author.uid), { postsCount: increment(1) }, { merge: true });
  await batch.commit();

  return { id: postRef.id, ...payload };
}

// ─── feed ─────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20;

/** Public posts ordered by publication time and document ID. */
export async function getEveryoneFeed(cursor?: string, pageSize = DEFAULT_PAGE_SIZE, launchesOnly = false) {
  assertFirebase();
  const constraints = launchesOnly ? [where("type", "==", "launch")] : [];
  return slicePage(await readPostPage(constraints, cursor, pageSize), pageSize);
}

async function readPostPage(constraints: QueryConstraint[], cursor: string | undefined, pageSize: number) {
  const [createdAt, id] = cursor ? (JSON.parse(cursor) as [string, string]) : [];
  const postsRef = collection(db!, "posts");
  const snapshot = await getDocs(query(
    postsRef,
    ...constraints,
    orderBy("createdAt", "desc"),
    orderBy(documentId(), "desc"),
    ...(createdAt && id ? [startAfter(createdAt, id)] : []),
    limit(pageSize + 1)
  ));
  return snapshot.docs.map(docToPost);
}

function slicePage(entries: DevFeedPost[], pageSize: number) {
  const posts = entries.slice(0, pageSize);
  const last = posts.at(-1);
  return {
    posts,
    nextCursor: last && entries.length > pageSize ? JSON.stringify([last.createdAt, last.id]) : null,
  };
}

export async function getPost(id: string): Promise<DevFeedPost | null> {
  assertFirebase();
  const snapshot = await getDoc(doc(db!, "posts", id));
  return snapshot.exists() ? docToPost(snapshot) : null;
}

export async function getBookmarks(userId: string): Promise<DevFeedPost[]> {
  assertFirebase();
  const snapshot = await getDocs(query(collection(db!, "users", userId, "bookmarks"), orderBy("createdAt", "desc")));
  const posts = await getPostsByIds(snapshot.docs.map((entry) => entry.id));
  const byId = new Map(posts.map((post) => [post.id, post]));
  return snapshot.docs.flatMap((entry) => {
    const post = byId.get(entry.id);
    return post ? [post] : [];
  });
}

export async function setBookmark(userId: string, postId: string, saved: boolean): Promise<void> {
  assertFirebase();
  const reference = doc(db!, "users", userId, "bookmarks", postId);
  if (saved) await setDoc(reference, { createdAt: new Date().toISOString() });
  else await deleteDoc(reference);
}

/** Includes the user's own posts and posts from developers they follow. */
export async function getFeedForUser(uid: string, cursor?: string, pageSize = DEFAULT_PAGE_SIZE) {
  assertFirebase();

  const follows = await getDocs(query(collection(db!, "follows"), where("followerId", "==", uid)));
  const authors = [...new Set([uid, ...follows.docs.map((entry) => (entry.data() as DevFeedFollow).followingId)])];
  const pages = await Promise.all(chunkArray(authors, 30).map((chunk) =>
    readPostPage([where("authorId", "in", chunk)], cursor, pageSize)
  ));

  // Match Firestore's string ordering, including the document-ID tiebreaker.
  const ordered = pages.flat().sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? -1 : 1;
    return a.id === b.id ? 0 : a.id > b.id ? -1 : 1;
  });
  return slicePage(ordered, pageSize);
}

/** Fetches recent public activity for the developer profile. */
export async function getPostsByUsername(username: string, cursor?: string, pageSize = DEFAULT_PAGE_SIZE) {
  assertFirebase();
  const entries = await readPostPage([where("authorUsername", "==", username.toLowerCase())], cursor, pageSize);
  return slicePage(entries, pageSize);
}

// ─── likes ────────────────────────────────────────────────────────────────────

/**
 * Toggles a like on a post. Uses a write batch to atomically update the like
 * doc and the post's likesCount via increment() — safe under concurrent writes.
 */
export async function toggleLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean }> {
  assertFirebase();

  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db!, "likes", likeId);
  const postRef = doc(db!, "posts", postId);

  return runTransaction(db!, async (transaction) => {
    const existing = await transaction.get(likeRef);
    const liked = !existing.exists();

    if (liked) {
      const payload: DevFeedLike = { postId, userId, createdAt: new Date().toISOString() };
      transaction.set(likeRef, payload);
    } else {
      transaction.delete(likeRef);
    }
    transaction.update(postRef, { likesCount: increment(liked ? 1 : -1) });
    return { liked };
  });
}

/**
 * Checks if a user has liked a specific post.
 */
export async function isLiked(postId: string, userId: string): Promise<boolean> {
  assertFirebase();
  const likeRef = doc(db!, "likes", `${postId}_${userId}`);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

// ─── comments ─────────────────────────────────────────────────────────────────

/**
 * Adds a comment to a post. Atomically increments the post's commentsCount.
 */
export async function addComment(
  postId: string,
  author: CodefolioUser,
  content: string
): Promise<DevFeedComment> {
  assertFirebase();

  const commentsRef = collection(db!, "comments");
  const commentRef = doc(commentsRef);
  const postRef = doc(db!, "posts", postId);
  const now = new Date().toISOString();

  const payload: Omit<DevFeedComment, "id"> = {
    postId,
    authorId: author.uid,
    authorUsername: author.username,
    authorDisplayName: author.displayName ?? null,
    authorAvatarUrl: author.photoURL ?? null,
    content,
    createdAt: now,
  };

  const batch = writeBatch(db!);
  batch.set(commentRef, payload);
  batch.update(postRef, { commentsCount: increment(1), lastCommentId: commentRef.id });
  await batch.commit();

  return { id: commentRef.id, ...payload };
}

/**
 * Fetches all comments for a post, ordered by createdAt ascending.
 */
export async function getComments(postId: string): Promise<DevFeedComment[]> {
  assertFirebase();

  const q = query(
    collection(db!, "comments"),
    where("postId", "==", postId)
  );
  const snap = await getDocs(q);
  const comments: DevFeedComment[] = [];
  snap.forEach((s) => comments.push(docToComment(s)));
  return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ─── follows ──────────────────────────────────────────────────────────────────

/**
 * Toggles a follow relationship. Atomically updates devFeedFollowersCount /
 * devFeedFollowingCount on both user docs.
 */
export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean }> {
  assertFirebase();

  const followId = `${followerId}_${followingId}`;
  const followRef = doc(db!, "follows", followId);
  const followerUserRef = doc(db!, "users", followerId);
  const followingUserRef = doc(db!, "users", followingId);

  if (followerId === followingId) throw new Error("You cannot follow yourself.");

  return runTransaction(db!, async (transaction) => {
    const existing = await transaction.get(followRef);
    const following = !existing.exists();
    if (following) {
      const payload: DevFeedFollow = { followerId, followingId, createdAt: new Date().toISOString() };
      transaction.set(followRef, payload);
    } else {
      transaction.delete(followRef);
    }
    const change = following ? 1 : -1;
    transaction.set(followerUserRef, { devFeedFollowingCount: increment(change) }, { merge: true });
    transaction.update(followingUserRef, { devFeedFollowersCount: increment(change) });
    return { following };
  });
}

/**
 * Checks if followerId is currently following followingId.
 */
export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  assertFirebase();
  const followRef = doc(db!, "follows", `${followerId}_${followingId}`);
  const snap = await getDoc(followRef);
  return snap.exists();
}

/**
 * Resolves a username to a uid by querying users collection.
 * Returns null if not found.
 */
export async function getUserUidByUsername(
  username: string
): Promise<string | null> {
  assertFirebase();
  const q = query(
    collection(db!, "users"),
    where("username", "==", username.toLowerCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return (snap.docs[0].data() as { uid: string }).uid;
}

/**
 * Returns up to `limitCount` users that the current user doesn't already follow,
 * ordered by their devFeedFollowersCount descending.
 * Excludes the current user.
 */
export interface SuggestedDeveloper {
  uid: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  devFeedFollowersCount: number;
}

export async function getSuggestedDevelopers(
  currentUserId: string,
  limitCount = 5
): Promise<SuggestedDeveloper[]> {
  if (!isFirebaseEnabled || !db) return [];
  try {
    // Get all users this person already follows
    const followsSnap = await getDocs(
      query(collection(db, "follows"), where("followerId", "==", currentUserId))
    );
    const alreadyFollowing = new Set<string>([currentUserId]);
    followsSnap.forEach((s) => {
      const d = s.data() as { followingId: string };
      alreadyFollowing.add(d.followingId);
    });

    // Get top users by follower count
    const usersSnap = await getDocs(
      query(collection(db, "users"), orderBy("devFeedFollowersCount", "desc"), limit(50))
    );

    const results: SuggestedDeveloper[] = [];
    usersSnap.forEach((s) => {
      if (results.length >= limitCount) return;
      const d = s.data() as {
        uid: string;
        username: string;
        displayName?: string | null;
        avatarUrl?: string | null;
        bio?: string | null;
        devFeedFollowersCount?: number;
      };
      if (alreadyFollowing.has(d.uid)) return;
      results.push({
        uid: d.uid,
        username: d.username,
        displayName: d.displayName ?? null,
        avatarUrl: d.avatarUrl ?? null,
        bio: d.bio ?? null,
        devFeedFollowersCount: d.devFeedFollowersCount ?? 0,
      });
    });
    return results;
  } catch {
    return [];
  }
}

/**
 * Fetches all comments by a specific user (for the profile Comments tab).
 */
export async function getCommentsByAuthorId(
  authorId: string,
  pageSize = 20
): Promise<DevFeedComment[]> {
  assertFirebase();
  const q = query(
    collection(db!, "comments"),
    where("authorId", "==", authorId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  const comments: DevFeedComment[] = [];
  snap.forEach((s) => comments.push(docToComment(s)));
  return comments;
}

/**
 * Fetches all bookmarked (liked) post IDs for a user.
 */
export async function getLikedPostIds(userId: string): Promise<string[]> {
  if (!isFirebaseEnabled || !db) return [];
  try {
    const q = query(collection(db, "likes"), where("userId", "==", userId), limit(200));
    const snap = await getDocs(q);
    const ids: string[] = [];
    snap.forEach((s) => {
      const d = s.data() as DevFeedLike;
      ids.push(d.postId);
    });
    return ids;
  } catch {
    return [];
  }
}

/**
 * Fetches posts by an array of post IDs (for saved/bookmarked view).
 */
export async function getPostsByIds(postIds: string[]): Promise<DevFeedPost[]> {
  if (!isFirebaseEnabled || !db || postIds.length === 0) return [];
  try {
    const chunks = chunkArray(postIds, 30);
    const all: DevFeedPost[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db!, "posts"), where("__name__", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((s) => all.push(docToPost(s)));
      })
    );
    all.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return all;
  } catch {
    return [];
  }
}

/**
 * Fetches users that `uid` is following (for the network panel).
 */
export async function getFollowingUsers(uid: string): Promise<SuggestedDeveloper[]> {
  if (!isFirebaseEnabled || !db) return [];
  try {
    const followsSnap = await getDocs(
      query(collection(db, "follows"), where("followerId", "==", uid), limit(100))
    );
    const followingIds: string[] = [];
    followsSnap.forEach((s) => {
      const d = s.data() as { followingId: string };
      followingIds.push(d.followingId);
    });
    if (followingIds.length === 0) return [];

    const chunks = chunkArray(followingIds, 30);
    const users: SuggestedDeveloper[] = [];
    await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db!, "users"), where("uid", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((s) => {
          const d = s.data() as {
            uid: string;
            username: string;
            displayName?: string | null;
            avatarUrl?: string | null;
            bio?: string | null;
            devFeedFollowersCount?: number;
          };
          users.push({
            uid: d.uid,
            username: d.username,
            displayName: d.displayName ?? null,
            avatarUrl: d.avatarUrl ?? null,
            bio: d.bio ?? null,
            devFeedFollowersCount: d.devFeedFollowersCount ?? 0,
          });
        });
      })
    );
    return users;
  } catch {
    return [];
  }
}

