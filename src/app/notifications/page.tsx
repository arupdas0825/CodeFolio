"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, MessageCircle, Rocket, UserPlus } from "lucide-react";
import { Empty } from "@/components/social/SocialUI";
import { useWorkspace } from "@/components/social/Workspace";
import styles from "@/components/social/social.module.css";

const examples = [
  { id: "launch", label: "Maya Chen shipped Patchwork", description: "A dashboard for monitoring background jobs.", href: "/projects/patchwork", icon: Rocket, time: "2h" },
  { id: "comment", label: "Priya Nair commented on Patchwork", description: "“The retry history looks great.”", href: "/projects/patchwork", icon: MessageCircle, time: "3h" },
  { id: "follow", label: "Discover Jordan Lee", description: "Backend engineering, APIs, and Go.", href: "/u/jordan-lee", icon: UserPlus, time: "1d" },
];

export default function NotificationsPage() {
  const { social } = useWorkspace();
  const [read, setRead] = useState<string[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = examples.length - read.length;
  const visible = examples.filter((item) => !unreadOnly || !read.includes(item.id));

  return <main className={styles.content + " " + styles.settingsPage}>
    <header className={styles.pageHeading}>
      <div><h1>Notifications</h1><p>See updates from across CodeFolio.</p></div>
      {social.preview && <span className={styles.previewBadge}>Preview mode</span>}
    </header>
    {social.preview ? <section className={styles.sidePanel}>
      <div className={styles.inboxToolbar}>
        <div className={styles.tabs} aria-label="Notification filter">
          <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
          <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread ({unread})</button>
        </div>
        <button type="button" className={styles.secondary} disabled={!unread} onClick={() => setRead(examples.map((item) => item.id))}><Check size={16} /> Mark all as read</button>
      </div>
      {visible.length ? visible.map(({ id, label, description, time, href, icon: Icon }) =>
        <Link key={id} href={href} className={styles.noticeRow} onClick={() => setRead((current) => current.includes(id) ? current : [...current, id])}>
          <span className={styles.noticeIcon}><Icon size={19} /></span>
          <span><strong>{label}</strong><small>{description}</small></span>
          <span className={styles.noticeTime}>{time}{!read.includes(id) && <i aria-label="Unread" />}</span>
        </Link>
      ) : <div className={styles.inboxEmpty}>You’re all caught up.</div>}
    </section> : <Empty icon={<Bell size={22} />} title="Notifications are available in preview" description="Explore posts and project launches in the feed." action={
      <Link href="/feed" className={styles.secondary}>Go to feed <ArrowRight size={16} /></Link>
    } />}
  </main>;
}
