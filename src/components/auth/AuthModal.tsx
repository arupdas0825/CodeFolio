"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, Loader2, X } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { signInWithGitHub, type CodefolioUser } from "@/lib/firebase";
import styles from "@/components/social/social.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: CodefolioUser) => void;
  actionTitle?: string;
  title?: string;
  message?: string;
}

export function AuthModal({ isOpen, ...props }: AuthModalProps) {
  return isOpen ? <SignInDialog {...props} /> : null;
}

function SignInDialog({ onClose, onSuccess, actionTitle, title, message }: Omit<AuthModalProps, "isOpen">) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function signIn() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const user = await signInWithGitHub();
      onSuccess?.(user);
      onClose();
    } catch (reason: unknown) {
      const code = typeof reason === "object" && reason && "code" in reason ? reason.code : "";
      if (code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") return;
      if (code === "auth/popup-blocked") setError("Allow pop-ups for this site and try again.");
      else if (code === "auth/unauthorized-domain" || code === "auth/operation-not-allowed") setError("GitHub sign-in is unavailable for this workspace.");
      else setError("Couldn’t connect to GitHub. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return <dialog ref={dialog} className={styles.dialog + " " + styles.authDialog} aria-labelledby="auth-dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!loading) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <div className={styles.authDialogBody}>
      <div className={styles.authDialogHeader}>
        <span className={styles.brandIcon}><GitBranch size={22} /></span>
        <button className={styles.iconButton} type="button" onClick={onClose} disabled={loading} aria-label="Close sign-in"><X size={18} /></button>
      </div>
      <h2 id="auth-dialog-title">{title || actionTitle || "Join CodeFolio"}</h2>
      <p>{message || "Connect your GitHub account to publish projects and build your developer profile."}</p>
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <button type="button" className={styles.primary} onClick={signIn} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <GithubIcon className={styles.icon18} />}
        {loading ? "Connecting…" : "Continue with GitHub"}
      </button>
    </div>
  </dialog>;
}

export default AuthModal;
