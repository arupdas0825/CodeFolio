"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CalendarDays, Layers3, Link2, MapPin, Pencil, Pin, Plus } from "lucide-react";
import { GithubIcon } from "@/components/ui/GithubIcon";
import { getPostsByIds, getPostsByUsername } from "@/services/devfeedService";
import { primaryLanguageBreakdown } from "@/services/github/github-portfolio.service";
import type { DevFeedPost, PostType } from "@/types/devfeed";
import type { PublicProfileDetails } from "@/types/user";
import { ActivityCard, Avatar, Empty, FollowControl, Loading, More, ProjectCard, Tags, safeUrl } from "./SocialUI";
import { findDeveloper, type SocialState } from "./useSocial";
import type { Developer } from "./preview";
import { usePortfolio } from "./portfolio/usePortfolio";
import { IdentityCard } from "./portfolio/IdentityCard";
import {
  ActivityTimeline, ContributionActivity, DeveloperAnalyticsSummary, GitHubOverview, LanguageAnalytics, Milestones, PortfolioSection,
  RepositoryInsights, RepositoryItem, RepositoryShowcase, ShowcasePicker, githubDate, useContributionYear,
} from "./portfolio/GitHubSections";
import styles from "./social.module.css";
import portfolioStyles from "./portfolio/portfolio.module.css";

const tabLabels = { overview: "Overview", projects: "Projects", posts: "Posts", repositories: "Repositories" };
type Tab = keyof typeof tabLabels;
const emptyEditor = { headline: "", about: "", skills: "", careerInterests: "", portfolioUrl: "", socialLinks: "" };

function portfolioLink(value?: string | null) {
  return safeUrl(value) || (value && /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value) ? safeUrl(`https://${value}`) : null);
}

export function Profile({ slug, initialTab, social, openComposer, requireAuth }: {
  slug?: string; initialTab?: string; social: SocialState;
  openComposer: (type?: PostType) => void; requireAuth: () => void;
}) {
  const username = slug || social.user?.username;
  const own = Boolean(username && username === social.user?.username);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab === "pinned" ? "repositories" : initialTab && Object.hasOwn(tabLabels, initialTab) ? initialTab as Tab : "overview");
  const [member, setMember] = useState<{ username: string; person: Developer | null }>();
  const [remoteActivity, setRemoteActivity] = useState<{ key: string; posts: DevFeedPost[]; cursor: string | null; error?: boolean }>();
  const [remoteFeatured, setRemoteFeatured] = useState<{ key: string; posts: DevFeedPost[] }>();
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState(false);
  const [editor, setEditor] = useState(emptyEditor);
  const [editorError, setEditorError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const listed = social.people.find((person) => person.username === username);
  const previewPerson = social.preview && Boolean(listed);
  const selectedTab = previewPerson && activeTab === "repositories" ? "overview" : activeTab;
  const invalidUsername = !!username && !/^[a-z0-9-]{1,39}$/i.test(username);
  const token = own && !social.preview ? social.user?.token : undefined;
  const canLoadPortfolio = !previewPerson && !invalidUsername &&
    (own || social.preview || !!listed || (member?.username === username && member?.person?.privacy !== "private"));
  const portfolio = usePortfolio(username, canLoadPortfolio, own, token);
  const contribution = useContributionYear(username, token);
  const githubProfile = portfolio?.profile;
  const repositories = portfolio?.repositories;
  const activityKey = JSON.stringify([username, loadVersion]);
  const activity = remoteActivity?.key === activityKey ? remoteActivity : null;
  const nextCursor = activity?.cursor;
  const postsError = activity?.error;
  const postsLoading = !social.preview && !!username && !activity;

  const linkedPerson = own ? social.currentProfile : (member?.username === username ? member?.person : null) || listed;
  const githubPerson: Developer | null = githubProfile ? {
    uid: "", username: githubProfile.login, name: githubProfile.name || githubProfile.login, avatar: githubProfile.avatar_url,
    bio: githubProfile.bio, company: githubProfile.company, location: githubProfile.location, website: githubProfile.blog, github: githubProfile.html_url,
  } : null;
  const person = linkedPerson || (own || social.preview || member?.username === username ? githubPerson : null);
  const pinnedProjects = person?.featuredProjectIds;
  const pinsKey = JSON.stringify(pinnedProjects || []);

  useEffect(() => {
    if (!username || own || social.preview || invalidUsername) return;
    let active = true;
    findDeveloper(username).then((person) => { if (active) setMember({ username, person }); })
      .catch(() => { if (active) setMember({ username, person: null }); });
    return () => { active = false; };
  }, [username, own, social.preview, invalidUsername]);

  useEffect(() => {
    if (!username || social.preview || invalidUsername) return;
    let active = true;
    getPostsByUsername(username).then(({ posts, nextCursor }) => {
      if (active) setRemoteActivity({ key: activityKey, posts, cursor: nextCursor });
    }).catch(() => {
      if (active) setRemoteActivity({ key: activityKey, posts: [], cursor: null, error: true });
    });
    return () => { active = false; };
  }, [username, social.preview, activityKey, invalidUsername]);

  useEffect(() => {
    if (!username || social.preview || pinsKey === "[]") return;
    let active = true;
    const ids = JSON.parse(pinsKey) as string[];
    getPostsByIds(ids).then((posts) => {
      if (active) setRemoteFeatured({ key: pinsKey, posts: posts.filter((post) => post.authorUsername === username && post.type === "launch") });
    }).catch(() => { if (active) setRemoteFeatured({ key: pinsKey, posts: [] }); });
    return () => { active = false; };
  }, [username, pinsKey, social.preview]);

  const publicAbout = person?.bio ?? githubProfile?.bio ?? "";
  const recent = social.posts.filter((post) => post.authorUsername === username);
  const recentIds = new Set(recent.map((post) => post.id));
  const posts = [...recent, ...(activity?.posts || []).filter((post) => !recentIds.has(post.id))];
  const projects = posts.filter((post) => post.type === "launch");
  const featured = pinnedProjects === undefined ? projects.slice(0, 2) : pinnedProjects.flatMap((id) => {
    const post = projects.find((post) => post.id === id) || (remoteFeatured?.key === pinsKey ? remoteFeatured.posts.find((post) => post.id === id) : null);
    return post ? [post] : [];
  });
  const projectOptions = [...projects, ...featured.filter((post) => !projects.some((item) => item.id === post.id))];
  const projectCards = selectedTab === "projects" ? projectOptions : featured;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!own || saving) return;
    const skills = [...new Set(editor.skills.split(",").map((skill) => skill.trim().slice(0, 32)).filter(Boolean))].slice(0, 10);
    const website = editor.portfolioUrl.trim();
    const links = editor.socialLinks.split("\n").map((link) => link.trim()).filter(Boolean);
    const portfolioUrl = portfolioLink(website);
    const socialLinks = links.map(portfolioLink);
    if ((website && !portfolioUrl) || socialLinks.some((link) => !link) || links.length > 4) {
      setEditorError("Enter a valid website and up to four valid social links.");
      return;
    }
    setSaving(true);
    setEditorError("");
    try {
      const details: PublicProfileDetails = {
        headline: editor.headline.trim(), about: editor.about.trim(), skills,
        careerInterests: editor.careerInterests.trim(), portfolioUrl: portfolioUrl || "",
        socialLinks: [...new Set(socialLinks.filter((link): link is string => !!link))],
      };
      await social.saveProfile(details);
      setEditing(false);
    } catch {
      setEditorError("Couldn’t save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function loadMore() {
    if (!username || !nextCursor || more) return;
    setMore(true);
    try {
      const { posts, nextCursor: cursor } = await getPostsByUsername(username, nextCursor);
      setRemoteActivity((current) => current?.key === activityKey ? {
        ...current, cursor, posts: [...current.posts, ...posts.filter((post) => !current.posts.some((entry) => entry.id === post.id))],
      } : current);
    } catch {
      social.setNotice("Couldn’t load more activity.");
    } finally {
      setMore(false);
    }
  }

  if (!username) return <Empty title="Create your developer profile" description="Connect your GitHub account to publish projects and share updates." action={<button className={styles.primary} onClick={requireAuth}>Sign in with GitHub</button>} />;
  if (person?.privacy === "private" && !own) return <Empty title="This CodeFolio profile is private" action={<Link className={styles.secondary} href="/network">Browse developers</Link>} />;
  if (!person) return invalidUsername || githubProfile === null ? <Empty title="Developer profile unavailable" description={`We couldn’t load a profile for @${username}.`} action={<Link className={styles.secondary} href="/network">Browse developers</Link>} /> : <Loading />;

  const website = portfolioLink(person.portfolioUrl || person.website || githubProfile?.blog);
  const socialLinks = (person.socialLinks || []).map(portfolioLink).filter((link): link is string => !!link);
  const skills = person.skills?.length ? person.skills : [...new Set(projectOptions.flatMap((project) => project.project?.stack || []))].slice(0, 10);
  const cardSkills = skills.length ? skills : primaryLanguageBreakdown(repositories || []).languages
    .sort((a, b) => b.amount - a.amount).map(({ name }) => name);
  const gitHubPage = previewPerson ? null : safeUrl(githubProfile?.html_url || person.github) || `https://github.com/${encodeURIComponent(username)}`;
  const headline = person.headline;
  const location = person.location || githubProfile?.location;
  const company = person.company || githubProfile?.company;

  function editProfile() {
    setEditor({
      headline: person?.headline || "", about: publicAbout, skills: (person?.skills || []).join(", "),
      careerInterests: person?.careerInterests || "", portfolioUrl: person?.portfolioUrl || "", socialLinks: (person?.socialLinks || []).join("\n"),
    });
    setEditorError("");
    setEditing(true);
  }

  async function copyProfile() {
    try {
      await navigator.clipboard.writeText(new URL(`/u/${encodeURIComponent(username || "")}`, window.location.origin).href);
      social.setNotice("Profile link copied");
    } catch {
      social.setNotice("Couldn’t copy the profile link.");
    }
  }

  return <div className={styles.profile}>
    <section className={styles.profileHero} aria-label="Developer profile">
      <div className={styles.profileCover} aria-hidden="true" />
      <div className={styles.profileIdentity}>
        <div className={styles.profileTopLine}>
          <Avatar name={person.name} src={person.avatar || githubProfile?.avatar_url} size={103} />
          <div className={styles.profileCtas}>
            <button type="button" className={styles.secondary} onClick={copyProfile} aria-label="Copy profile link"><Link2 size={17} /><span>Share</span></button>
            {own ? <button type="button" className={styles.primary} onClick={editProfile}><Pencil size={16} /> Edit profile</button>
              : <FollowControl person={person} social={social} requireAuth={requireAuth} />}
          </div>
        </div>
        <div className={styles.profileName}><h1>{person.name}</h1><p>@{person.username}</p></div>
        {headline && <p className={styles.profileHeadline}>{headline}</p>}
        <div className={styles.profileMetadata}>
          {location && <span><MapPin size={16} />{location}</span>}
          {company && <span><Building2 size={16} />{company}</span>}
          {githubProfile?.created_at && <span><CalendarDays size={16} />Joined GitHub {githubDate(githubProfile.created_at, true)}</span>}
          {website && <a href={website} target="_blank" rel="noreferrer"><Link2 size={16} />{new URL(website).hostname}</a>}
          {gitHubPage && <a href={gitHubPage} target="_blank" rel="noreferrer"><GithubIcon className={styles.icon18} /> GitHub</a>}
        </div>
        {githubProfile && <dl className={portfolioStyles.heroStats}>
          <div><dd>{githubProfile.followers.toLocaleString()}</dd><dt>GitHub followers</dt></div>
          <div><dd>{githubProfile.following.toLocaleString()}</dd><dt>GitHub following</dt></div>
          <div><dd>{githubProfile.public_repos.toLocaleString()}</dd><dt>Public repositories</dt></div>
        </dl>}
        {editing && <form className={styles.editPanel} onSubmit={save}>
          <label>Headline<input value={editor.headline} onChange={(event) => setEditor({ ...editor, headline: event.target.value })} maxLength={100} autoFocus /></label>
          <label>About<textarea aria-label="About" value={editor.about} onChange={(event) => setEditor({ ...editor, about: event.target.value })} rows={3} maxLength={500} /></label>
          <label>Technologies <small>Separate with commas</small><input value={editor.skills} onChange={(event) => setEditor({ ...editor, skills: event.target.value })} maxLength={260} /></label>
          <label>Career interests<input value={editor.careerInterests} onChange={(event) => setEditor({ ...editor, careerInterests: event.target.value })} maxLength={160} /></label>
          <label>Portfolio website<input value={editor.portfolioUrl} onChange={(event) => setEditor({ ...editor, portfolioUrl: event.target.value })} maxLength={460} /></label>
          <label>Social links <small>One link per line</small><textarea aria-label="Social links" value={editor.socialLinks} onChange={(event) => setEditor({ ...editor, socialLinks: event.target.value })} rows={3} maxLength={1200} /></label>
          {editorError && <p className={portfolioStyles.editorError} role="alert">{editorError}</p>}
          <button type="button" className={styles.secondary} onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          <button className={styles.primary} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>}
      </div>
      <div className={styles.tabs} aria-label="Profile sections">
        {(Object.entries(tabLabels) as [Tab, string][]).filter(([key]) => !previewPerson || key !== "repositories").map(([value, label]) => (
          <button key={value} type="button" aria-pressed={selectedTab === value} onClick={() => setActiveTab(value)}>{label}</button>
        ))}
      </div>
    </section>

    <div className={styles.profileLayout}>
      <div className={styles.profileMain}>
        {selectedTab === "overview" && <>
          <IdentityCard person={person} headline={headline} profile={githubProfile} skills={cardSkills} verified={githubProfile?.githubVerified === true} notice={social.setNotice} />
          {(publicAbout || own || socialLinks.length > 0 || person.careerInterests) && <PortfolioSection id="profile-about" title="About" action={
            own && <button type="button" className={styles.headerIcon} onClick={editProfile} aria-label="Edit about"><Pencil size={16} /></button>
          }>
            <p className={portfolioStyles.about}>{publicAbout || "Add a short introduction so other developers can learn what you work on."}</p>
            {person.careerInterests && <p className={portfolioStyles.about}><strong>Career interests</strong>{person.careerInterests}</p>}
            {socialLinks.length > 0 && <div className={portfolioStyles.publicLinks}>{socialLinks.map((link) =>
              <a href={link} key={link} target="_blank" rel="noreferrer"><ArrowUpRight size={15} />{new URL(link).hostname}</a>
            )}</div>}
          </PortfolioSection>}
          {!previewPerson && <>
            <GitHubOverview profile={githubProfile} repositories={repositories} />
            <ContributionActivity token={token} own={own} joined={githubProfile?.created_at} reconnect={requireAuth} data={contribution} />
          </>}
        </>}
        {(selectedTab === "overview" || selectedTab === "projects") && <PortfolioSection id="featured-work" title={selectedTab === "overview" ? "Featured work" : "Projects"} action={own && <div className={portfolioStyles.actions}>
          {projectOptions.length > 0 && <button type="button" className={styles.secondary} onClick={() => setEditingFeatured(!editingFeatured)}><Pin size={15} /> Manage featured</button>}
          <button type="button" className={styles.secondary} onClick={() => openComposer("launch")}><Plus size={16} /> Add project</button>
        </div>}>
          {editingFeatured && <ShowcasePicker
            title="Choose up to four published projects." options={projectOptions.map((post) => ({ id: post.id, label: post.project?.title || "Project launch" }))}
            selected={featured.map((post) => post.id)} limit={4}
            onSave={async (values) => { await social.saveShowcase({ featuredProjectIds: values }); setEditingFeatured(false); }}
            onCancel={() => setEditingFeatured(false)}
          />}
          {projectCards.length ? <div className={styles.profileProjects}>{projectCards.map((post) => <ProjectCard key={post.id} post={post} />)}</div>
            : !postsLoading && !postsError && <p className={portfolioStyles.muted}>{projectOptions.length ? "No featured projects selected." : "No projects published yet."}</p>}
          {selectedTab === "overview" && projectOptions.length > featured.length && <button type="button" className={styles.secondary} onClick={() => setActiveTab("projects")}>View all projects</button>}
        </PortfolioSection>}
        {!previewPerson && (selectedTab === "overview" || selectedTab === "repositories") && <>
          <RepositoryShowcase repositories={repositories} pins={person.pinnedRepos} githubPins={portfolio?.pins} own={own} save={(pinnedRepos) => social.saveShowcase({ pinnedRepos })} />
          {selectedTab === "repositories" && <PortfolioSection title="Public repositories">
            {repositories === undefined ? <Loading /> : <div className={portfolioStyles.repositoryGrid}>{repositories?.map((repository) => <RepositoryItem key={repository.full_name} repository={repository} />)}</div>}
          </PortfolioSection>}
          <LanguageAnalytics username={username} token={token} repositories={repositories} />
          {selectedTab === "overview" && <>
            <Milestones repositories={repositories} projects={projectOptions} calendar={contribution.calendar} year={contribution.year} />
            <ActivityTimeline events={portfolio?.events} />
          </>}
          <RepositoryInsights repositories={repositories} token={token} />
        </>}
        {(selectedTab === "overview" || selectedTab === "posts") && <section className={styles.profileSection}>
          <div className={styles.sectionHeading}><h2>{selectedTab === "overview" ? "CodeFolio activity" : "Posts"}</h2>
            {selectedTab === "overview" && (posts.length > 2 || nextCursor) && <button className={styles.secondary} onClick={() => setActiveTab("posts")}>All posts</button>}
          </div>
          {(selectedTab === "overview" ? posts.slice(0, 2) : posts).map((post) => <ActivityCard key={post.id} post={post} social={social} requireAuth={requireAuth} />)}
          {!posts.length && !postsLoading && !postsError && <Empty title="No activity yet" action={own ? <button className={styles.secondary} onClick={() => openComposer()}>Create a post</button> : undefined} />}
        </section>}
        {selectedTab !== "repositories" && <>
          {postsLoading && <Loading />}
          {postsError && <Empty title="Couldn’t load profile activity" action={<button className={styles.secondary} onClick={() => setLoadVersion((n) => n + 1)}>Retry</button>} />}
          {selectedTab !== "overview" && nextCursor && <More pending={more} onClick={loadMore} />}
        </>}
      </div>
      <aside className={styles.profileAside}>
        {!previewPerson && selectedTab === "overview" && <DeveloperAnalyticsSummary profile={githubProfile} repositories={repositories} calendar={contribution.calendar} year={contribution.year} />}
        {selectedTab === "overview" && <nav className={styles.sidePanel} aria-label="On this profile">
          <div className={styles.sideHeading}><h2>On this profile</h2></div>
          <a className={styles.panelLink} href="#developer-card">Developer card <ArrowUpRight size={15} /></a>
          {!previewPerson && <a className={styles.panelLink} href="#github-overview">GitHub overview <ArrowUpRight size={15} /></a>}
          {!previewPerson && <a className={styles.panelLink} href="#contributions">Contributions <ArrowUpRight size={15} /></a>}
          <a className={styles.panelLink} href="#featured-work">Featured work <ArrowUpRight size={15} /></a>
          {!previewPerson && <a className={styles.panelLink} href="#languages">Languages <ArrowUpRight size={15} /></a>}
          {!previewPerson && <a className={styles.panelLink} href="#repository-insights">Repository insights <ArrowUpRight size={15} /></a>}
        </nav>}
        {(skills.length > 0 || own) && <section className={styles.sidePanel}>
          <div className={styles.sideHeading}><h2>Tech stack</h2><Layers3 size={17} /></div>
          <div className={styles.profileSkills}>
            {skills.length ? <Tags tags={skills} /> : <button type="button" className={styles.secondary} onClick={editProfile}><Plus size={15} /> Add technologies</button>}
          </div>
        </section>}
      </aside>
    </div>
  </div>;
}
