"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Search, Send } from "lucide-react";
import { Avatar, Empty } from "@/components/social/SocialUI";
import { useWorkspace } from "@/components/social/Workspace";
import { previewPeople } from "@/components/social/preview";
import styles from "@/components/social/social.module.css";

const conversations = [
  { id: "maya", initial: [
    { id: "m1", mine: false, text: "Hey Alex! Thanks for taking a look at Patchwork. What’s the one thing you always want to see in a queue dashboard?" },
    { id: "m2", mine: true, text: "A timeline of retries. It makes figuring out what happened much easier." },
    { id: "m3", mine: false, text: "That’s on the roadmap. I’ll share an update when it’s ready to try." },
  ] },
  { id: "jordan", initial: [
    { id: "j1", mine: false, text: "I’m working on an example Go service for the structured logging post. Happy to send it over when it’s ready." },
  ] },
];

export default function MessagesPage() {
  const { social } = useWorkspace();
  const [active, setActive] = useState("maya");
  const [filter, setFilter] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, { id: string; mine: boolean; text: string }[]>>({});
  const contact = previewPeople.find((person) => person.uid === active);
  const threads = conversations.flatMap((thread) => {
    const person = previewPeople.find((developer) => developer.uid === thread.id);
    return person && person.name.toLowerCase().includes(filter.trim().toLowerCase()) ? [{ ...thread, person }] : [];
  });
  const thread = conversations.find((item) => item.id === active);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = drafts[active]?.trim();
    if (!text) return;
    const reply = { id: crypto.randomUUID(), mine: true, text };
    setReplies((value) => ({ ...value, [active]: [...(value[active] || []), reply] }));
    setDrafts((value) => ({ ...value, [active]: "" }));
  }

  return <main className={styles.content}>
    <header className={styles.pageHeading}>
      <div><h1>Messages</h1><p>Keep project conversations in one place.</p></div>
      {social.preview && <span className={styles.previewBadge}>Preview mode</span>}
    </header>
    {social.preview && thread && contact ? <div className={styles.inbox}>
      <aside className={styles.inboxThreads} aria-label="Conversations">
        <label className={styles.sectionSearch}><Search size={16} /><input aria-label="Search conversations" placeholder="Search messages" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
        {threads.map(({ person, id, initial }) => <button type="button" key={id} aria-pressed={active === id} onClick={() => setActive(id)}>
          <Avatar name={person.name} src={person.avatar} size={36} />
          <span><strong>{person.name}</strong><small>{(replies[id]?.at(-1) || initial.at(-1))?.text}</small></span>
        </button>)}
        {!threads.length && <p>No conversations match.</p>}
      </aside>
      <section className={styles.conversation} aria-label={`Conversation with ${contact.name}`}>
        <header className={styles.conversationHeader}>
          <Avatar name={contact.name} src={contact.avatar} size={39} />
          <div><h2>{contact.name}</h2><p>{contact.headline}</p></div>
          <Link href={`/u/${contact.username}`} className={styles.headerIcon} aria-label="View profile"><ArrowUpRight size={19} /></Link>
        </header>
        <div className={styles.chatLog} role="log" aria-label="Messages">
          {[...thread.initial, ...(replies[active] || [])].map((entry) => <p key={entry.id} data-mine={entry.mine}>{entry.text}</p>)}
        </div>
        <form className={styles.chatComposer} onSubmit={submit}>
          <input aria-label="Message" maxLength={1000} placeholder="Write a preview message…" value={drafts[active] || ""} onChange={(event) => setDrafts({ ...drafts, [active]: event.target.value })} />
          <button className={styles.primary} disabled={!drafts[active]?.trim()}><Send size={16} /> Send</button>
        </form>
      </section>
    </div> : <Empty icon={<MessageCircle size={22} />} title="Direct messages are available in preview" action={<Link href="/network" className={styles.secondary}>Browse developers <ArrowRight size={16} /></Link>} />}
  </main>;
}
