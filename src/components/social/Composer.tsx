"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Braces, ImageIcon, Rocket, X } from "lucide-react";
import type { CreatePostInput, PostType } from "@/types/devfeed";
import { Avatar, safeUrl } from "./SocialUI";
import type { SocialState } from "./useSocial";
import styles from "./social.module.css";

const options: { type: PostType; label: string }[] = [
  { type: "general", label: "Update" },
  { type: "launch", label: "Project launch" },
  { type: "learning", label: "Learning" },
  { type: "milestone", label: "Milestone" },
];

export function Composer({ start, social, close }: {
  start: { type: PostType; field?: "code" | "image" }; social: SocialState; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState(start.type);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [stack, setStack] = useState("");
  const [repo, setRepo] = useState("");
  const [demo, setDemo] = useState("");
  const [image, setImage] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [showCode, setShowCode] = useState(start.field === "code");
  const [showImage, setShowImage] = useState(start.field === "image");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const launch = type === "launch";

  useEffect(() => {
    const current = dialog.current;
    current?.showModal();
    return () => current?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !content.trim() || (launch && !title.trim())) return;

    const visibleImage = showImage || launch ? image.trim() : "";
    const repoUrl = safeUrl(repo.trim());
    const demoUrl = safeUrl(demo.trim());
    const imageUrl = safeUrl(visibleImage);
    if ((visibleImage && !imageUrl) || (launch && ((repo.trim() && !repoUrl) || (demo.trim() && !demoUrl)))) {
      setError("Use a valid http or https URL for each link.");
      return;
    }

    const input: CreatePostInput = {
      type,
      content: content.trim(),
      ...(launch ? { project: {
        title: title.trim(),
        stack: [...new Set(stack.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 8),
        repoUrl,
        demoUrl,
      } } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(showCode && code.trim() ? { codeSnippet: code.trim(), codeLanguage: language.trim() || "text" } : {}),
    };

    setError("");
    setSaving(true);
    try {
      await social.publish(input);
      close();
    } catch {
      setError("Couldn’t publish. Your draft is still here. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="composer-title" onCancel={(event) => {
    event.preventDefault();
    if (!saving) close();
  }} onClick={(event) => { if (event.target === event.currentTarget && !saving) close(); }}>
    <form className={styles.composerForm} onSubmit={submit}>
      <header className={styles.dialogHeader}>
        <h2 id="composer-title">{launch ? "Showcase a project" : "Create a post"}</h2>
        <button className={styles.iconButton} type="button" onClick={close} aria-label="Close composer" disabled={saving}><X size={19} /></button>
      </header>

      <div className={styles.composerContent}>
        <div className={styles.composeAuthor}>
          <Avatar name={social.user?.displayName || social.user?.username || "Developer"} src={social.user?.photoURL} size={38} />
          <div><strong>{social.user?.displayName || social.user?.username}</strong><small>{social.preview ? "Visible in this browser’s preview" : "Visible to everyone"}</small></div>
        </div>

        <label>Post type
          <select value={type} onChange={(event) => setType(event.target.value as PostType)}>
            {options.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}
          </select>
        </label>
        {launch && <label>Project name<input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Patchwork" /></label>}
        <label>{launch ? "Project description" : "Post text"}
          <textarea required rows={4} value={content} onChange={(event) => setContent(event.target.value)} maxLength={launch ? 1800 : 500} placeholder={launch ? "What did you build, and who is it for?" : "Share an update with the community…"} />
        </label>
        {launch && <>
          <label>Technologies <small>Separate with commas</small><input value={stack} maxLength={150} onChange={(event) => setStack(event.target.value)} placeholder="TypeScript, React, Redis" /></label>
          <div className={styles.formPair}>
            <label>Source URL <small>Optional</small><input type="url" value={repo} maxLength={2048} onChange={(event) => setRepo(event.target.value)} placeholder="https://github.com/…" /></label>
            <label>Demo URL <small>Optional</small><input type="url" value={demo} maxLength={2048} onChange={(event) => setDemo(event.target.value)} placeholder="https://…" /></label>
          </div>
        </>}
        {(launch || showImage) && <label>{launch ? "Cover image URL" : "Image URL"} <small>Optional</small><input type="url" value={image} maxLength={2048} onChange={(event) => setImage(event.target.value)} placeholder="https://…" /></label>}
        {showCode && <>
          <label>Language<input value={language} maxLength={32} onChange={(event) => setLanguage(event.target.value)} placeholder="e.g. TypeScript" /></label>
          <label>Code snippet<textarea rows={4} value={code} maxLength={4000} onChange={(event) => setCode(event.target.value)} className={styles.mono} /></label>
        </>}
        <div className={styles.composerExtras}>
          <button aria-pressed={showCode} type="button" className={styles.secondary} onClick={() => setShowCode(!showCode)}><Braces size={16} /> Code snippet</button>
          {!launch && <button aria-pressed={showImage} type="button" className={styles.secondary} onClick={() => setShowImage(!showImage)}><ImageIcon size={16} /> Image</button>}
        </div>
        {error && <p className={styles.formError} role="alert">{error}</p>}
      </div>

      <footer className={styles.dialogFooter}>
        <button className={styles.secondary} type="button" onClick={close} disabled={saving}>Cancel</button>
        <button className={styles.primary} disabled={saving || !content.trim() || (launch && !title.trim())}>
          {launch && <Rocket size={16} />}{saving ? "Publishing…" : launch ? "Publish project" : "Publish post"}
        </button>
      </footer>
    </form>
  </dialog>;
}
