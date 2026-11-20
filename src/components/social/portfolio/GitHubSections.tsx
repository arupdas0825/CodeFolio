"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarDays, ChartNoAxesColumn, Code2, FolderGit2, GitFork, GitPullRequest, Pin, Star, Trophy } from "lucide-react";
import {
  fetchPortfolioCalendar, fetchPortfolioLanguages, fetchPortfolioRepositoryReport, primaryLanguageBreakdown,
  type PortfolioCalendar, type PortfolioEvent, type PortfolioLanguage, type PortfolioLanguages,
  type PortfolioProfile, type PortfolioRepositoryReport,
} from "@/services/github/github-portfolio.service";
import type { GitHubRepository } from "@/types/github";
import type { DevFeedPost } from "@/types/devfeed";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { Tags } from "../SocialUI";
import styles from "./portfolio.module.css";
import socialStyles from "../social.module.css";

const formatDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatMonth = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function githubDate(date: string, monthOnly = false) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : (monthOnly ? formatMonth : formatDay).format(parsed);
}

export function PortfolioSection({ id, title, icon, action, children }: {
  id?: string; title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return <section className={styles.section} id={id}>
    <div className={styles.sectionTitle}>
      <h2>{icon}{title}</h2>
      {action}
    </div>
    {children}
  </section>;
}

function Metrics({ metrics }: { metrics: [string, number | null | undefined][] }) {
  return <dl className={styles.metrics}>
    {metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value == null ? <span aria-label="Unavailable">—</span> : value.toLocaleString()}</dd></div>)}
  </dl>;
}

export function GitHubOverview({ profile, repositories }: {
  profile?: PortfolioProfile | null; repositories?: GitHubRepository[] | null;
}) {
  const totals = repositories?.reduce((result, repository) => ({
    stars: result.stars + repository.stargazers_count,
    forks: result.forks + repository.forks_count,
  }), { stars: 0, forks: 0 });

  return <PortfolioSection id="github-overview" title="GitHub overview" icon={<GithubIcon className={socialStyles.icon18} />}>
    {profile === undefined && repositories === undefined ? <p className={styles.muted} role="status">Loading GitHub data…</p> :
      profile == null && repositories == null ? <p className={styles.muted}>GitHub overview is unavailable right now.</p> : <>
        <Metrics metrics={[
          ...(profile?.accessibleTotal !== undefined ? [["Total repositories", profile.accessibleTotal] as [string, number]] : []),
          ["Public repositories", profile?.public_repos ?? repositories?.length],
          ["Stars received", totals?.stars], ["Forks received", totals?.forks],
          ["GitHub followers", profile?.followers], ["GitHub following", profile?.following],
        ]} />
        <p className={styles.caption}>Stars and forks are summed across repositories visible on the public GitHub profile.</p>
      </>}
  </PortfolioSection>;
}

export function DeveloperAnalyticsSummary({ profile, repositories, year, calendar }: {
  profile?: PortfolioProfile | null; repositories?: GitHubRepository[] | null; year: number; calendar?: PortfolioCalendar | null;
}) {
  if (!profile && !repositories && !calendar) return null;
  const languages = repositories ? new Set(repositories.flatMap((repo) => repo.language ? [repo.language] : [])).size : undefined;
  return <PortfolioSection title="Analytics summary">
    <Metrics metrics={[
      ["Public repos", profile?.public_repos ?? repositories?.length],
      ["Stars", repositories?.reduce((total, item) => total + item.stargazers_count, 0)],
      ["Forks", repositories?.reduce((total, item) => total + item.forks_count, 0)],
      ["Primary languages", languages],
      ...(calendar ? [
        ["Contributions", calendar.total],
        ["PRs", calendar.pullRequests],
        ["Issues", calendar.issues],
        ...(calendar.currentStreak === null ? [] : [["Current streak", calendar.currentStreak]]),
        ["Longest streak", calendar.longestStreak],
      ] as [string, number][] : []),
    ]} />
    <p className={styles.caption}>{calendar ? `Contributions and streaks for ${year}. Streaks are measured in days.` : "Public repository metrics from GitHub."}</p>
  </PortfolioSection>;
}

export function useContributionYear(username?: string, token?: string) {
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [result, setResult] = useState<{ username: string; year: number; calendar: PortfolioCalendar | null }>();
  const calendar = token && result?.year === year && result.username === username ? result.calendar : undefined;

  useEffect(() => {
    if (!username || !token) return;
    const controller = new AbortController();
    fetchPortfolioCalendar(username, year, { token, signal: controller.signal }).then((calendar) => {
      if (!controller.signal.aborted) setResult({ username, year, calendar });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ username, year, calendar: null });
    });
    return () => controller.abort();
  }, [username, token, year]);

  return { year, setYear, calendar };
}

export function ContributionActivity({ token, joined, own, reconnect, data }: {
  token?: string; joined?: string; own: boolean; reconnect: () => void; data: ReturnType<typeof useContributionYear>;
}) {
  const { year, setYear, calendar } = data;
  const currentYear = new Date().getUTCFullYear();
  const joinedYear = joined ? new Date(joined).getUTCFullYear() : currentYear;
  const years = Array.from({ length: Math.max(1, currentYear - Math.max(2008, joinedYear || currentYear) + 1) }, (_, index) => currentYear - index);

  return <PortfolioSection id="contributions" title="Contribution activity" icon={<CalendarDays size={18} />} action={
    token && <select className={styles.select} aria-label="Contribution year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
      {years.map((year) => <option value={year} key={year}>{year}</option>)}
    </select>
  }>
    {!token || calendar === null ? <div className={styles.notice}>
      <p>{own ? "Connect GitHub to load the contribution calendar and activity totals." : "Calendar and streak data are available to the account owner with a GitHub connection."}</p>
      {own && <button className={socialStyles.secondary} onClick={reconnect}><GithubIcon className={socialStyles.icon18} /> Connect GitHub</button>}
    </div> : !calendar ? <p className={styles.muted} role="status">Loading contributions for {year}…</p> : <>
      <Metrics metrics={[
        ["Contributions", calendar.total], ["Active days", calendar.activeDays],
        ...(calendar.currentStreak !== null ? [["Current streak", calendar.currentStreak] as [string, number]] : []),
        ["Longest streak", calendar.longestStreak],
      ]} />
      <Heatmap calendar={calendar} year={year} />
      <Metrics metrics={[
        ["Commit contributions", calendar.commits], ["Pull requests", calendar.pullRequests], ["Issues", calendar.issues], ["PR reviews", calendar.reviews],
      ]} />
      <p className={styles.caption}>GitHub activity for {year}. Streaks count consecutive UTC dates with activity within the selected year.</p>
    </>}
  </PortfolioSection>;
}

function Heatmap({ calendar, year }: { calendar: PortfolioCalendar; year: number }) {
  const offset = new Date(`${year}-01-01T00:00:00Z`).getUTCDay();
  const days = [...Array<null>(offset).fill(null), ...calendar.days];
  const weeks = Math.ceil(days.length / 7);
  const peak = Math.max(1, ...calendar.days.map((day) => day.contributionCount));
  const months = Array.from({ length: weeks }, (_, index) => {
    const week = days.slice(index * 7, index * 7 + 7);
    const first = week.find((day) => day?.date.endsWith("-01"));
    return first ? monthNames[Number(first.date.slice(5, 7)) - 1] : "";
  });

  return <figure className={styles.heatmap}>
    <div className={styles.heatmapScroll} tabIndex={0} aria-label="Scrollable contribution calendar">
      <div className={styles.heatmapInner} role="img" aria-label={`${calendar.total} contributions on ${calendar.activeDays} days in ${year}`}>
        <div className={styles.heatmapLabels} aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
        <div>
          <div className={styles.monthLabels} aria-hidden="true">{months.map((month, index) => <span key={index}>{month}</span>)}</div>
          <div className={styles.heatmapGrid} aria-hidden="true">
            {days.map((day, index) => day ? <span
              key={day.date}
              data-level={day.contributionCount ? Math.max(1, Math.ceil(4 * day.contributionCount / peak)) : 0}
              title={`${day.date} · ${day.contributionCount} ${day.contributionCount === 1 ? "contribution" : "contributions"}`}
            /> : <span key={index} />)}
          </div>
        </div>
      </div>
    </div>
    <figcaption>Less {Array.from({ length: 5 }, (_, index) => <i key={index} data-level={index} />)} More</figcaption>
  </figure>;
}

export function LanguageAnalytics({ username, token, repositories }: {
  username: string; token?: string; repositories?: GitHubRepository[] | null;
}) {
  const [result, setResult] = useState<{ username: string; data: PortfolioLanguages | null }>();
  const [selected, setSelected] = useState("");
  const report = result?.username === username && token ? result.data : undefined;
  const fallback = repositories ? primaryLanguageBreakdown(repositories) : null;
  const data = report ?? fallback;
  const repo = data?.repositories.find((repository) => repository.name === selected);
  const languages = repo?.languages || data?.languages || [];
  const ordered = [...languages].sort((a, b) => b.amount - a.amount);
  const total = ordered.reduce((sum, language) => sum + language.amount, 0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchPortfolioLanguages(username, { token, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ username, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ username, data: null });
    });
    return () => controller.abort();
  }, [username, token]);

  const colors = ["#795139", "#b17b52", "#7771a6", "#38818a", "#7b864e", "#a06167"];
  const visible = ordered.slice(0, 7);
  if (ordered.length > 7) visible.push({ name: "Remaining languages", amount: ordered.slice(7).reduce((sum, item) => sum + item.amount, 0) });

  function percentage(language: PortfolioLanguage) {
    return total ? 100 * language.amount / total : 0;
  }

  return <PortfolioSection id="languages" title="Programming languages" icon={<Code2 size={18} />} action={
    (data?.repositories.length || 0) > 0 && <select className={styles.select} aria-label="Language breakdown repository" value={repo ? selected : ""} onChange={(event) => setSelected(event.target.value)}>
      <option value="">All repositories</option>
      {data?.repositories.map((repository) => <option key={repository.name} value={repository.name}>{repository.name}</option>)}
    </select>
  }>
    {visible.length ? <>
      <div className={styles.languageBar} aria-hidden="true">
        {visible.map((entry, index) => <span key={entry.name} style={{ width: `${percentage(entry)}%`, background: entry.color || colors[index % colors.length] }} />)}
      </div>
      <dl className={styles.languageLegend}>
        {visible.map((entry, index) => <div key={entry.name}><dt><i style={{ background: entry.color || colors[index % colors.length] }} />{entry.name}</dt><dd>{percentage(entry).toFixed(1)}%</dd></div>)}
      </dl>
      <p className={styles.caption}>{data?.unit === "bytes"
        ? "GitHub Linguist code bytes divided by total classified bytes across the selected original public repositories."
        : "Repository share by GitHub primary language. Each original public repository with a detected language counts once."}</p>
    </> : <p className={styles.muted}>{repositories === undefined && report === undefined ? "Loading repository languages…" : "GitHub has no language data to display."}</p>}
  </PortfolioSection>;
}

function matchRepo(repo: GitHubRepository, name: string) {
  return [repo.name, repo.full_name].some((key) => key.toLowerCase() === name.toLowerCase());
}

export function RepositoryShowcase({ repositories, pins, githubPins, own, save }: {
  repositories?: GitHubRepository[] | null;
  pins?: string[];
  githubPins?: string[];
  own: boolean;
  save: (values: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const selected = (pins?.length ? pins : githubPins || []).flatMap((name) => {
    const repository = repositories?.find((item) => matchRepo(item, name));
    return repository ? [repository] : [];
  });
  const top = [...(repositories || [])].sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count || b.updated_at.localeCompare(a.updated_at)).slice(0, 4);

  return <PortfolioSection id="pinned-repositories" title={selected.length ? "Pinned repositories" : "Top public repositories"} icon={<FolderGit2 size={18} />} action={
    own && repositories && repositories.length > 0 && <button type="button" className={socialStyles.secondary} onClick={() => setEditing(!editing)}><Pin size={15} /> Manage pins</button>
  }>
    {editing && repositories && <ShowcasePicker
      title="Choose up to six public repositories."
      options={repositories.map((repo) => ({ id: repo.name, label: repo.name }))}
      selected={selected.map((repo) => repo.name)} limit={6}
      onSave={async (values) => { await save(values); setEditing(false); }}
      onCancel={() => setEditing(false)}
    />}
    {repositories === undefined ? <p className={styles.muted} role="status">Loading public repositories…</p>
      : !repositories?.length ? <p className={styles.muted}>{repositories === null ? "Public repositories are unavailable." : "No public repositories to showcase yet."}</p>
      : <div className={styles.repositoryGrid}>{(selected.length ? selected : top).map((repository) => <RepositoryItem key={repository.full_name} repository={repository} />)}</div>}
  </PortfolioSection>;
}

export function RepositoryItem({ repository }: { repository: GitHubRepository }) {
  return <article className={styles.repository}>
    <a href={repository.html_url} target="_blank" rel="noreferrer">{repository.name}<ArrowUpRight size={15} /></a>
    {repository.description && <p>{repository.description}</p>}
    <div className={styles.repoMeta}>
      {repository.language && <span><Code2 size={14} /> {repository.language}</span>}
      <span aria-label={`${repository.stargazers_count} stars`}><Star size={14} /> {repository.stargazers_count.toLocaleString()}</span>
      <span aria-label={`${repository.forks_count} forks`}><GitFork size={14} /> {repository.forks_count.toLocaleString()}</span>
    </div>
    <p className={styles.caption}>Updated {githubDate(repository.updated_at)}</p>
    <Tags tags={repository.topics?.slice(0, 6)} />
  </article>;
}

export function ShowcasePicker({ title, options, selected, limit, onSave, onCancel }: {
  title: string; options: { id: string; label: string }[]; selected: string[]; limit: number;
  onSave: (values: string[]) => Promise<void>; onCancel: () => void;
}) {
  const [picked, setPicked] = useState(selected.slice(0, limit));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return <form className={styles.picker} onSubmit={async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try { await onSave(picked); } catch { setError(true); } finally { setPending(false); }
  }}>
    <p>{title}</p>
    <div className={styles.pickerOptions} aria-label={title}>
      {options.map((option) => <label key={option.id}>
        <input type="checkbox" checked={picked.includes(option.id)} disabled={pending || (picked.length >= limit && !picked.includes(option.id))} onChange={(event) => {
          setPicked(event.target.checked ? [...picked, option.id] : picked.filter((item) => item !== option.id));
        }} /> {option.label}
      </label>)}
    </div>
    {error && <p role="alert">Couldn’t save the selection.</p>}
    <div className={styles.actions}>
      <button type="button" className={socialStyles.secondary} onClick={onCancel} disabled={pending}>Cancel</button>
      <button className={socialStyles.primary} disabled={pending}>{pending ? "Saving…" : "Save selection"}</button>
    </div>
  </form>;
}

export function Milestones({ repositories, projects, calendar, year }: {
  repositories?: GitHubRepository[] | null; projects: DevFeedPost[]; calendar?: PortfolioCalendar | null; year: number;
}) {
  const awarded = [];
  const first = [...(repositories || [])].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  if (first) awarded.push({ title: "First public repository", description: `${first.name} · ${githubDate(first.created_at)}`, icon: <FolderGit2 size={18} /> });
  const stars = repositories?.reduce((sum, repo) => sum + repo.stargazers_count, 0) || 0;
  if (stars >= 1) awarded.push({ title: "Earned GitHub stars", description: `${stars.toLocaleString()} on public repositories`, icon: <Star size={18} /> });
  const threshold = [1000, 500, 100, 10].find((count) => (calendar?.total || 0) >= count);
  if (threshold) awarded.push({ title: `${threshold.toLocaleString()} GitHub contributions in ${year}`, description: `${calendar!.total.toLocaleString()} contributions recorded by GitHub`, icon: <CalendarDays size={18} /> });
  if (projects.length) awarded.push({ title: "Published a project on CodeFolio", description: projects[0].project?.title || "Project launch", icon: <Trophy size={18} /> });
  return <PortfolioSection id="milestones" title="Verified milestones" icon={<Trophy size={18} />}>
    {awarded.length ? <ul className={styles.milestones}>{awarded.map((item) => <li key={item.title}>
      <span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.description}</p></div>
    </li>)}</ul> : <p className={styles.muted}>No verified milestones to show yet.</p>}
    <p className={styles.caption}>Milestones are based on GitHub public data and published CodeFolio projects.</p>
  </PortfolioSection>;
}

export function ActivityTimeline({ events }: { events?: PortfolioEvent[] | null }) {
  const [expanded, setExpanded] = useState(false);
  return <PortfolioSection id="github-activity" title="Recent GitHub activity" icon={<GitPullRequest size={18} />}>
    {events?.length ? <>
      <ol className={styles.timeline}>
        {(expanded ? events : events.slice(0, 6)).map((event) => <li key={event.id}>
          <div><a href={event.href} target="_blank" rel="noreferrer">{event.label}</a><p>{event.repository}</p></div>
          <time dateTime={event.date}>{githubDate(event.date)}</time>
        </li>)}
      </ol>
      {events.length > 6 && <button type="button" className={socialStyles.secondary} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"}</button>}
    </> : <p className={styles.muted}>{events === undefined ? "Loading recent activity…" : events === null ? "GitHub activity is unavailable right now." : "No recent public activity to display."}</p>}
  </PortfolioSection>;
}

export function RepositoryInsights({ repositories, token }: { repositories?: GitHubRepository[] | null; token?: string }) {
  const [choice, setChoice] = useState("");
  const [result, setResult] = useState<{ choice: string; report: PortfolioRepositoryReport }>();
  const repository = repositories?.find((item) => item.full_name === choice);
  const report = result?.choice === choice ? result.report : undefined;

  useEffect(() => {
    if (!choice) return;
    const controller = new AbortController();
    fetchPortfolioRepositoryReport(choice, { token, signal: controller.signal }).then((report) => {
      if (!controller.signal.aborted) setResult({ choice, report });
    });
    return () => controller.abort();
  }, [choice, token]);

  return <PortfolioSection id="repository-insights" title="Repository insights" icon={<ChartNoAxesColumn size={18} />} action={
    Boolean(repositories?.length) && <select className={styles.select} value={choice} aria-label="Repository for insights" onChange={(event) => setChoice(event.target.value)}>
      <option value="">Choose a repository</option>
      {repositories?.map((repository) => <option key={repository.full_name} value={repository.full_name}>{repository.name}</option>)}
    </select>
  }>
    {repository ? <>
      <RepositoryItem repository={repository} />
      {report ? <>
        <Metrics metrics={[["Issues", report.issues], ["Pull requests", report.pullRequests], ["Contributors", report.contributors]]} />
        <h3 className={styles.subtitle}>Latest commits</h3>
        {report.commits?.length ? <ol className={styles.timeline}>{report.commits.map((commit) => <li key={commit.sha}>
          <div><a href={commit.href} target="_blank" rel="noreferrer">{commit.message}</a><p>{commit.sha.slice(0, 7)}</p></div>
          <time dateTime={commit.date}>{githubDate(commit.date)}</time>
        </li>)}</ol> : <p className={styles.muted}>{report.commits === null ? "Commit history is unavailable." : "This repository has no commits yet."}</p>}
      </> : <p className={styles.muted} role="status">Loading insights for {repository.name}…</p>}
    </> : <p className={styles.muted}>{repositories?.length ? "Select a public repository to see its issues, pull requests, contributors, and commit history." : "Repository insights appear once public repositories are available."}</p>}
  </PortfolioSection>;
}
