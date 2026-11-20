"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight, Bell, Bookmark, ChevronDown, House, LayoutGrid, LogOut,
  MessageCircle, Plus, Search, Settings, UserRound, Users, X,
} from "lucide-react";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { CodefolioLogo } from "@/components/ui/CodefolioLogo";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { logOutUser } from "@/lib/firebase";
import type { PostType } from "@/types/devfeed";
import { Avatar } from "./SocialUI";
import { Composer } from "./Composer";
import { useSocial, type SocialState } from "./useSocial";
import styles from "./social.module.css";

type ComposerField = "code" | "image";
type WorkspaceContextValue = {
  social: SocialState;
  openComposer: (type?: PostType, field?: ComposerField) => void;
  requireAuth: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace layout is missing");
  return context;
}

const navigation = [
  { href: "/feed", title: "Feed", icon: House },
  { href: "/network", title: "Network", icon: Users },
  { href: "/projects", title: "Projects", icon: LayoutGrid },
  { href: "/saved", title: "Saved", icon: Bookmark },
];

export function Workspace({ children }: { children: ReactNode }) {
  const social = useSocial();
  const { openAuthModal } = useAuthModal();
  const [draft, setDraft] = useState<{ type: PostType; field?: ComposerField } | null>(null);
  const pathname = usePathname();
  const requireAuth = () => openAuthModal({ title: "Join CodeFolio", message: "Connect your GitHub account to join the developer network." });
  const openComposer: WorkspaceContextValue["openComposer"] = (type = "general", field) => {
    if (!social.user) return requireAuth();
    setDraft({ type, field });
  };

  const tools = /^\/(ai|jobs|community|card|dashboard|insights|repository)(?:\/|$)/.test(pathname);

  return <WorkspaceContext.Provider value={{ social, openComposer, requireAuth }}>
    <div className={styles.app}>
      <a className={styles.skip} href="#workspace-content">Skip to content</a>
      <WorkspaceHeader pathname={pathname} />
      <div className={tools ? styles.legacyWorkspace : styles.workspaceBody} id="workspace-content" tabIndex={-1}>
        {children}
      </div>
      {draft && <Composer start={draft} close={() => setDraft(null)} social={social} />}
      {social.notice && <div className={styles.toast} role="status">
        {social.notice}<button type="button" aria-label="Dismiss notification" onClick={() => social.setNotice("")}><X size={17} /></button>
      </div>}
    </div>
  </WorkspaceContext.Provider>;
}

function WorkspaceHeader({ pathname }: { pathname: string }) {
  const { social, requireAuth, openComposer } = useWorkspace();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const profileUrl = social.user ? `/u/${encodeURIComponent(social.user.username)}` : "/profile";

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/") || (
      href === "/feed" && (pathname === "/" || pathname.startsWith("/posts/"))
    );
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (pathname !== "/dashboard" && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && menuOpen) {
        setMenuPath(null);
        buttonRef.current?.focus();
      }
    }

    function closeOnOutside(event: PointerEvent) {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) setMenuPath(null);
    }

    window.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", closeOnOutside);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [menuOpen, pathname]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchRef.current?.value.trim();
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return <>
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <Link className={styles.brand} href="/feed" aria-label="CodeFolio feed">
          <CodefolioLogo className={styles.brandIcon} size={37} />
          <span className={styles.brandName}>Code<span>Folio</span></span>
        </Link>
        <form className={styles.globalSearch} role="search" onSubmit={search}>
          <Search size={17} />
          <input ref={searchRef} type="search" aria-label="Search CodeFolio" placeholder="Search CodeFolio" maxLength={120} />
          <kbd>Ctrl K</kbd>
        </form>
        <nav className={styles.topNav} aria-label="Main navigation">
          {navigation.map(({ href, title, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
            <Icon size={18} /><span>{title}</span>
          </Link>)}
        </nav>
        <div className={styles.topActions}>
          <Link href="/notifications" className={styles.headerIcon} aria-label="Notifications" aria-current={active("/notifications") ? "page" : undefined}><Bell size={19} /></Link>
          <button className={styles.primary + " " + styles.headerPublish} type="button" onClick={() => openComposer()} aria-label="New post"><Plus size={17} /><span>New post</span></button>
          {social.user ? <div className={styles.accountMenu} ref={menuRef}>
            <button type="button" ref={buttonRef} className={styles.accountButton} aria-label="Account menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "workspace-account" : undefined} onClick={() => setMenuPath(menuOpen ? null : pathname)}>
              <Avatar name={social.user.displayName || social.user.username} src={social.user.photoURL} size={34} />
              <ChevronDown size={13} />
            </button>
            {menuOpen && <div className={styles.dropdown} id="workspace-account">
              <div className={styles.dropdownIdentity}><strong>{social.user.displayName || social.user.username}</strong><small>{social.preview ? "Preview account" : `@${social.user.username}`}</small></div>
              <Link href={profileUrl} onClick={() => setMenuPath(null)}><UserRound size={16} /> My profile</Link>
              <Link href="/messages" onClick={() => setMenuPath(null)}><MessageCircle size={16} /> Messages</Link>
              <Link href="/settings" onClick={() => setMenuPath(null)}><Settings size={16} /> Settings</Link>
              <Link href="/card" onClick={() => setMenuPath(null)}><GithubIcon className={styles.icon18} /> Developer cards</Link>
              {!social.preview && <button type="button" onClick={() => {
                logOutUser().then(() => setMenuPath(null)).catch(() => social.setNotice("Couldn’t sign out. Try again."));
              }}><LogOut size={16} /> Sign out</button>}
            </div>}
          </div> : <button className={styles.secondary + " " + styles.headerSignin} type="button" onClick={requireAuth}>
            <GithubIcon className={styles.icon18} /> Sign in
          </button>}
        </div>
      </div>
    </header>

    {pathname !== "/dashboard" && <nav className={styles.bottomNav} aria-label="Mobile navigation">
      {navigation.map(({ href, title, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>
        <Icon size={20} /><span>{title}</span>
      </Link>)}
      <Link href={profileUrl} aria-current={active(profileUrl) ? "page" : undefined}><UserRound size={20} /><span>Profile</span></Link>
    </nav>}
  </>;
}

export function WorkspaceLinks() {
  return <footer className={styles.workspaceLinks}>
    <Link href="/jobs">Jobs <ArrowUpRight size={12} /></Link>
    <Link href="/ai">AI tools <ArrowUpRight size={12} /></Link>
    <Link href="/community">Communities <ArrowUpRight size={12} /></Link>
    <Link href="/card">Developer cards <ArrowUpRight size={12} /></Link>
  </footer>;
}
