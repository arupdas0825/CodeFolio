"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { collection, doc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { db, subscribeToAuthChanges } from "@/lib/firebase";
import {
  createPost, getBookmarks, getFollowingUsers, getLikedPostIds, setBookmark, toggleFollow, toggleLike,
} from "@/services/devfeedService";
import type { CreatePostInput, DevFeedComment, DevFeedPost } from "@/types/devfeed";
import type { CodefolioUser, PublicProfileDetails, UserProfileDoc } from "@/types/user";
import { previewPeople, previewPosts, previewUser, type Developer } from "./preview";

const storageKey = "codefolio-social-preview-v1";
let previewFallback: string | null = null;

function readPreview() {
  try {
    return previewFallback ?? localStorage.getItem(storageKey);
  } catch {
    return previewFallback;
  }
}

function subscribePreview(callback: () => void) {
  window.addEventListener(storageKey, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(storageKey, callback);
    window.removeEventListener("storage", callback);
  };
}

function readServerPreview() {
  return null;
}

function parsePreview(raw: string | null): PreviewState {
  if (!raw) return initialPreview;
  try {
    return { ...initialPreview, ...JSON.parse(raw) };
  } catch {
    return initialPreview;
  }
}

interface PreviewState {
  posts: DevFeedPost[];
  liked: string[];
  saved: string[];
  following: string[];
  comments: Record<string, DevFeedComment[]>;
  about?: string;
  headline?: string;
  skills?: string[];
}

const initialPreview: PreviewState = {
  posts: [], liked: [], saved: [], following: [], comments: {},
};

export function developerFromDoc(data: UserProfileDoc, id: string): Developer {
  return {
    uid: id,
    username: data.username,
    name: data.displayName || data.username,
    avatar: data.avatarUrl,
    bio: data.about ?? data.bio,
    headline: data.headline,
    skills: Array.isArray(data.skills) ? data.skills.filter((skill) => typeof skill === "string") : [],
    privacy: data.privacy,
    company: data.company,
    location: data.location,
    website: data.blog,
    github: `https://github.com/${data.username}`,
  };
}

export async function findDeveloper(username: string) {
  if (!db) return null;
  const snapshot = await getDocs(query(collection(db, "users"), where("username", "==", username), limit(1)));
  const record = snapshot.docs[0];
  return record ? developerFromDoc(record.data() as UserProfileDoc, record.id) : null;
}

export function useSocial() {
  const preview = !db;
  const [authUser, setAuthUser] = useState<CodefolioUser | null>(null);
  const previewSnapshot = useSyncExternalStore(subscribePreview, readPreview, readServerPreview);
  const local = useMemo(() => preview ? parsePreview(previewSnapshot) : initialPreview, [preview, previewSnapshot]);
  const [recent, setRecent] = useState<DevFeedPost[]>([]);
  const [liveSaved, setLiveSaved] = useState<DevFeedPost[]>([]);
  const [liveLiked, setLiveLiked] = useState<string[]>([]);
  const [liveFollowing, setLiveFollowing] = useState<string[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [directoryLoaded, setDirectoryLoaded] = useState(preview);
  const [ownProfile, setOwnProfile] = useState<Developer | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (preview) return;
    return subscribeToAuthChanges((user) => {
      setAuthUser(user);
      setLiveSaved([]);
      setLiveLiked([]);
      setLiveFollowing([]);
    });
  }, [preview]);

  useEffect(() => {
    if (!db) return;
    let active = true;
    getDocs(query(collection(db, "users"), limit(100))).then((snapshot) => {
      if (active) {
        setDevelopers(snapshot.docs.flatMap((record) => {
          const data = record.data() as UserProfileDoc;
          return typeof data.username === "string" && (!data.privacy || data.privacy === "public")
            ? [developerFromDoc(data, record.id)] : [];
        }));
      }
    }).catch(() => { if (active) setDirectoryError(true); })
      .finally(() => { if (active) setDirectoryLoaded(true); });
    return () => { active = false; };
  }, [directoryVersion]);

  const uid = authUser?.uid;
  const username = authUser?.username;
  useEffect(() => {
    if (!username) return;
    let active = true;
    findDeveloper(username).then((entry) => { if (active && entry) setOwnProfile(entry); }).catch(() => {});
    return () => { active = false; };
  }, [username]);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    getBookmarks(uid).then((posts) => { if (active) setLiveSaved(posts); }).catch(() => {});
    getLikedPostIds(uid).then((ids) => { if (active) setLiveLiked(ids); }).catch(() => {});
    getFollowingUsers(uid).then((people) => {
      if (active) setLiveFollowing(people.map((person) => person.uid));
    }).catch(() => {});
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3700);
    return () => clearTimeout(timeout);
  }, [notice]);

  function updatePreview(update: (state: PreviewState) => PreviewState) {
    const serialized = JSON.stringify(update(parsePreview(readPreview())));
    try {
      localStorage.setItem(storageKey, serialized);
      previewFallback = null;
    } catch {
      previewFallback = serialized;
    }
    window.dispatchEvent(new Event(storageKey));
  }

  const user = preview ? previewUser : authUser;
  const posts = preview ? [...local.posts, ...previewPosts] : recent;
  const people = preview ? previewPeople : developers;
  const listedProfile = people.find((person) => person.uid === user?.uid);
  const activeProfile = ownProfile?.username === user?.username ? ownProfile : null;
  const currentProfile = !user ? null : preview && listedProfile ? {
    ...listedProfile,
    bio: local.about ?? listedProfile.bio,
    headline: local.headline ?? listedProfile.headline,
    skills: local.skills ?? listedProfile.skills,
  } : activeProfile || listedProfile || {
    uid: user.uid, username: user.username, name: user.displayName || user.username, avatar: user.photoURL,
    github: `https://github.com/${user.username}`,
  };
  const following = preview ? local.following : liveFollowing;
  const liked = preview ? local.liked : liveLiked;
  const savedPosts = preview ? local.saved.flatMap((id) => posts.filter((post) => post.id === id)) : liveSaved;

  async function publish(input: CreatePostInput) {
    if (!user) throw new Error("Sign in to publish a post.");
    if (preview) {
      const post: DevFeedPost = {
        id: crypto.randomUUID(),
        authorId: user.uid,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
        authorAvatarUrl: user.photoURL,
        type: input.type,
        content: input.content,
        project: input.project,
        imageUrl: input.imageUrl || null,
        codeSnippet: input.codeSnippet || null,
        codeLanguage: input.codeLanguage || null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
      };
      updatePreview((state) => ({ ...state, posts: [post, ...state.posts] }));
    } else {
      const post = await createPost(user, input);
      setRecent((current) => [post, ...current]);
    }
    setNotice(input.type === "launch" ? "Project published" : "Post published");
  }

  async function like(postId: string) {
    if (!user) return null;
    if (preview) {
      updatePreview((state) => ({ ...state, liked: flipped(state.liked, postId) }));
      return null;
    }
    const { liked } = await toggleLike(postId, user.uid);
    setLiveLiked((current) => withMembership(current, postId, liked));
    return liked;
  }

  async function bookmark(post: DevFeedPost) {
    if (!user) return;
    const saved = !savedPosts.some((item) => item.id === post.id);
    if (preview) {
      updatePreview((state) => ({ ...state, saved: withMembership(state.saved, post.id, saved) }));
    } else {
      await setBookmark(user.uid, post.id, saved);
      setLiveSaved((current) => saved ? [post, ...current.filter((item) => item.id !== post.id)] : current.filter((item) => item.id !== post.id));
    }
    setNotice(saved ? "Post saved" : "Post removed from saved");
  }

  async function follow(person: Developer) {
    if (!user || person.uid === user.uid) return;
    if (preview) {
      updatePreview((state) => ({ ...state, following: flipped(state.following, person.uid) }));
    } else {
      const { following } = await toggleFollow(user.uid, person.uid);
      setLiveFollowing((current) => withMembership(current, person.uid, following));
    }
  }

  function commentLocally(postId: string, content: string) {
    const comment: DevFeedComment = {
      id: crypto.randomUUID(), postId, authorId: previewUser.uid,
      authorUsername: previewUser.username, authorDisplayName: previewUser.displayName,
      authorAvatarUrl: previewUser.photoURL, content, createdAt: new Date().toISOString(),
    };
    updatePreview((state) => ({
      ...state, comments: { ...state.comments, [postId]: [...(state.comments[postId] || []), comment] },
    }));
  }

  async function saveProfile(details: PublicProfileDetails) {
    if (!user || !currentProfile) return;
    if (preview) {
      updatePreview((state) => ({ ...state, ...details }));
    } else if (db) {
      await setDoc(doc(db, "users", user.uid), details, { merge: true });
      setOwnProfile({ ...currentProfile, bio: details.about, headline: details.headline, skills: details.skills });
    }
    setNotice("Profile updated");
  }

  function retryDirectory() {
    setDirectoryLoaded(false);
    setDirectoryError(false);
    setDirectoryVersion((version) => version + 1);
  }

  return {
    preview, user, currentProfile, posts, savedPosts, liked, following, people, notice, setNotice, follow, like, bookmark,
    publish, commentLocally, comments: local.comments, saveProfile, directoryLoaded, directoryError, retryDirectory,
  };
}

function withMembership(ids: string[], id: string, include: boolean) {
  if (!include) return ids.filter((value) => value !== id);
  return ids.includes(id) ? ids : [id, ...ids];
}

function flipped(ids: string[], id: string) {
  return withMembership(ids, id, !ids.includes(id));
}

export type SocialState = ReturnType<typeof useSocial>;
