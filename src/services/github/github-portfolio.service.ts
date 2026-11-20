import type { GitHubProfile, GitHubRepository } from "@/types/github";

const api = "https://api.github.com";

interface GitHubOptions {
  token?: string;
  signal?: AbortSignal;
}

class GitHubResponseError extends Error {
  constructor(readonly status: number) {
    super(`GitHub returned ${status}`);
  }
}

async function request(path: string, { token, signal }: GitHubOptions) {
  const send = (credential?: string) => fetch(`${api}${path}`, {
    signal,
    headers: {
      Accept: "application/vnd.github+json",
      ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
    },
  });
  let response = await send(token);
  if (token && response.status === 401) response = await send();
  if (!response.ok) throw new GitHubResponseError(response.status);
  return response;
}

async function graph<T>(query: string, variables: Record<string, string | null>, { token, signal }: GitHubOptions): Promise<T> {
  if (!token) throw new Error("GitHub authorization required");
  const response = await fetch(`${api}/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!response.ok) throw new GitHubResponseError(response.status);
  const result = await response.json() as { data?: T; errors?: unknown[] };
  if (!result.data || result.errors?.length) throw new Error("GitHub could not complete the request");
  return result.data;
}

export interface PortfolioProfile extends GitHubProfile {
  accessibleTotal?: number;
  githubVerified?: boolean;
}

export async function fetchPortfolioProfile(username: string, options: GitHubOptions, own: boolean): Promise<PortfolioProfile> {
  const publicResponse = request(`/users/${encodeURIComponent(username)}`, options);
  const authenticated = own && options.token ? request("/user", options).then((response) => response.json() as Promise<GitHubProfile & { total_private_repos?: number }>).catch(() => null) : null;
  const profile = await (await publicResponse).json() as GitHubProfile;
  const viewer = await authenticated;
  if (viewer?.login.toLowerCase() === profile.login.toLowerCase()) {
    return {
      ...profile,
      githubVerified: true,
      ...(typeof viewer.total_private_repos === "number" ? { accessibleTotal: profile.public_repos + viewer.total_private_repos } : {}),
    };
  }
  return profile;
}

export async function fetchPortfolioRepositories(username: string, options: GitHubOptions) {
  const repositories = new Map<string, GitHubRepository>();
  let page = 1;
  while (true) {
    const response = await request(`/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&sort=updated&page=${page}`, options);
    const items = await response.json() as GitHubRepository[];
    for (const item of items) if (!item.private) repositories.set(item.full_name, item);
    if (!response.headers.get("link")?.includes('rel="next"')) return [...repositories.values()];
    page++;
  }
}

export interface PortfolioCalendar {
  days: { date: string; contributionCount: number }[];
  total: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  activeDays: number;
  currentStreak: number | null;
  longestStreak: number;
}

type ContributionDay = PortfolioCalendar["days"][number];
const msPerDay = 86400000;

export function calculateCalendar(days: ContributionDay[], year: number, today = new Date()) {
  const todayDate = today.toISOString().slice(0, 10);
  const first = `${year}-01-01`;
  const last = year === today.getUTCFullYear() ? todayDate : `${year}-12-31`;
  const counts = new Map(days.map((day) => [day.date, day.contributionCount]));
  let activeDays = 0;
  let longestStreak = 0;
  let streak = 0;
  let lastActive = "";
  let lastStreak = 0;
  const calendar: ContributionDay[] = [];

  for (let day = Date.parse(first); day <= Date.parse(last); day += msPerDay) {
    const date = new Date(day).toISOString().slice(0, 10);
    const contributionCount = counts.get(date) || 0;
    calendar.push({ date, contributionCount });
    if (contributionCount > 0) {
      activeDays++;
      streak++;
      longestStreak = Math.max(longestStreak, streak);
      lastActive = date;
      lastStreak = streak;
    } else {
      streak = 0;
    }
  }

  return {
    days: calendar,
    total: calendar.reduce((sum, day) => sum + day.contributionCount, 0),
    activeDays,
    longestStreak,
    currentStreak: year === today.getUTCFullYear()
      ? lastActive && (Date.parse(todayDate) - Date.parse(lastActive)) <= msPerDay ? lastStreak : 0
      : null,
  };
}

export async function fetchPortfolioCalendar(username: string, year: number, options: GitHubOptions): Promise<PortfolioCalendar> {
  const endDate = year === new Date().getUTCFullYear() ? new Date().toISOString() : `${year}-12-31T23:59:59Z`;
  const result = await graph<{ user: { contributionsCollection: {
    totalCommitContributions: number;
    totalPullRequestContributions: number;
    totalIssueContributions: number;
    totalPullRequestReviewContributions: number;
    contributionCalendar: { weeks: { contributionDays: ContributionDay[] }[] };
  } } | null }>(`
    query PortfolioCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          totalPullRequestReviewContributions
          contributionCalendar { weeks { contributionDays { date contributionCount } } }
        }
      }
    }
  `, { login: username, from: `${year}-01-01T00:00:00Z`, to: endDate }, options);
  const collection = result.user?.contributionsCollection;
  if (!collection) throw new Error("GitHub contribution calendar unavailable");
  return {
    ...calculateCalendar(collection.contributionCalendar.weeks.flatMap((week) => week.contributionDays), year),
    commits: collection.totalCommitContributions,
    pullRequests: collection.totalPullRequestContributions,
    issues: collection.totalIssueContributions,
    reviews: collection.totalPullRequestReviewContributions,
  };
}

export interface PortfolioLanguage { name: string; amount: number; color?: string }
export interface PortfolioLanguages {
  unit: "bytes" | "repositories";
  languages: PortfolioLanguage[];
  repositories: { name: string; languages: PortfolioLanguage[] }[];
}

export function primaryLanguageBreakdown(repositories: GitHubRepository[]): PortfolioLanguages {
  const counts = new Map<string, number>();
  const rows = repositories.filter((repository) => !repository.fork && repository.language).map((repository) => {
    const name = repository.language!;
    counts.set(name, (counts.get(name) || 0) + 1);
    return { name: repository.name, languages: [{ name, amount: 1 }] };
  });
  return { unit: "repositories", languages: [...counts].map(([name, amount]) => ({ name, amount })), repositories: rows };
}

export async function fetchPortfolioLanguages(username: string, options: GitHubOptions): Promise<PortfolioLanguages> {
  type Entry = { size: number; node: { name: string; color: string | null } };
  type RepositoryConnection = { nodes: { name: string; languages: { totalSize: number; edges: Entry[] } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  const totals = new Map<string, PortfolioLanguage>();
  const repositories: PortfolioLanguages["repositories"] = [];
  let cursor: string | null = null;
  while (true) {
    const result: { user: { repositories: RepositoryConnection } | null } = await graph(`
      query PortfolioLanguages($login: String!, $after: String) {
        user(login: $login) {
          repositories(first: 40, after: $after, privacy: PUBLIC, ownerAffiliations: [OWNER], isFork: false) {
            nodes { name languages(first: 100, orderBy: { field: SIZE, direction: DESC }) { totalSize edges { size node { name color } } } }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `, { login: username, after: cursor }, options);
    const page = result.user?.repositories;
    if (!page) throw new Error("GitHub languages unavailable");
    for (const repository of page.nodes) {
      const languages = repository.languages.edges.filter((edge) => edge.size > 0).map(({ node, size }) => ({
        name: node.name, color: node.color || undefined, amount: size,
      }));
      const remainder = repository.languages.totalSize - languages.reduce((sum, language) => sum + language.amount, 0);
      if (remainder > 0) languages.push({ name: "Other", amount: remainder, color: undefined });
      if (languages.length) repositories.push({ name: repository.name, languages });
      for (const entry of languages) totals.set(entry.name, { ...entry, amount: (totals.get(entry.name)?.amount || 0) + entry.amount });
    }
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) return { unit: "bytes", languages: [...totals.values()], repositories };
    cursor = page.pageInfo.endCursor;
  }
}

export interface PortfolioEvent { id: string; label: string; date: string; repository: string; href: string }

export async function fetchPortfolioEvents(username: string, options: GitHubOptions): Promise<PortfolioEvent[]> {
  type Event = {
    id: string; type: string; created_at: string; repo: { name: string };
    payload: {
      action?: string; ref?: string; ref_type?: string; commits?: unknown[];
      forkee?: { html_url?: string }; release?: { html_url?: string; tag_name?: string };
      pull_request?: { html_url?: string; number?: number; merged?: boolean };
      issue?: { html_url?: string; number?: number };
    };
  };
  const response = await request(`/users/${encodeURIComponent(username)}/events/public?per_page=50`, options);
  const events = await response.json() as Event[];
  return events.flatMap((event) => {
    const repo = `https://github.com/${event.repo.name}`;
    const payload = event.payload;
    let href = repo;
    let label: string;
    switch (event.type) {
      case "PushEvent": {
        const branch = payload.ref?.replace(/^refs\/heads\//, "");
        label = payload.commits?.length ? `Pushed ${payload.commits.length} ${payload.commits.length === 1 ? "commit" : "commits"}` : "Pushed changes";
        if (branch) label += ` to ${branch}`;
        break;
      }
      case "PullRequestEvent":
        label = `${payload.pull_request?.merged ? "merged" : payload.action || "updated"} pull request${payload.pull_request?.number ? ` #${payload.pull_request.number}` : ""}`;
        href = payload.pull_request?.html_url || repo;
        break;
      case "IssuesEvent":
        label = `${payload.action || "updated"} issue${payload.issue?.number ? ` #${payload.issue.number}` : ""}`;
        href = payload.issue?.html_url || repo;
        break;
      case "CreateEvent":
        if (payload.ref_type !== "repository") return [];
        label = "Created repository";
        break;
      case "ReleaseEvent":
        label = `${payload.action === "published" ? "Published" : "Updated"} release${payload.release?.tag_name ? ` ${payload.release.tag_name}` : ""}`;
        href = payload.release?.html_url || repo;
        break;
      case "ForkEvent":
        label = "Forked repository";
        href = payload.forkee?.html_url || repo;
        break;
      default:
        return [];
    }
    return [{ id: event.id, label: label[0].toUpperCase() + label.slice(1), date: event.created_at, repository: event.repo.name, href }];
  });
}

export interface PortfolioRepositoryReport {
  issues: number | null;
  pullRequests: number | null;
  contributors: number | null;
  commits: { sha: string; message: string; date: string; href: string }[] | null;
}

export async function fetchPortfolioRepositoryReport(repository: string, options: GitHubOptions): Promise<PortfolioRepositoryReport> {
  const slug = repository.split("/").map(encodeURIComponent).join("/");
  async function searchCount(filter: string) {
    const query = encodeURIComponent(`repo:${repository} ${filter}`);
    const response = await request(`/search/issues?q=${query}&per_page=1`, options);
    const result = await response.json() as { total_count: number; incomplete_results?: boolean };
    return result.incomplete_results ? null : result.total_count;
  }
  async function contributors() {
    const response = await request(`/repos/${slug}/contributors?per_page=1`, options);
    if (response.status === 204) return 0;
    const link = response.headers.get("link");
    const last = link?.match(/<([^>]+)>;\s*rel="last"/)?.[1];
    if (last) return Number(new URL(last).searchParams.get("page")) || null;
    if (link?.includes('rel="next"')) return null;
    return (await response.json() as unknown[]).length;
  }
  async function commits() {
    try {
      const response = await request(`/repos/${slug}/commits?per_page=6`, options);
      const items = await response.json() as { sha: string; html_url: string; commit: { message: string; author: { date: string } } }[];
      return items.map((item) => ({ sha: item.sha, href: item.html_url, message: item.commit.message.split("\n")[0], date: item.commit.author.date }));
    } catch (error) {
      if (error instanceof GitHubResponseError && error.status === 409) return [];
      throw error;
    }
  }

  const [issues, pulls, people, history] = await Promise.all([
    searchCount("is:issue").catch(() => null),
    searchCount("is:pr").catch(() => null),
    contributors().catch(() => null),
    commits().catch(() => null),
  ]);
  return { issues, pullRequests: pulls, contributors: people, commits: history };
}

export async function fetchGitHubPins(username: string, options: GitHubOptions) {
  const result = await graph<{ user: { pinnedItems: { nodes: { nameWithOwner?: string; isPrivate?: boolean }[] } } | null }>(`
    query PortfolioPins($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes { ... on Repository { nameWithOwner isPrivate } }
        }
      }
    }
  `, { login: username }, options);
  return (result.user?.pinnedItems.nodes || []).flatMap((node) => node.nameWithOwner && !node.isPrivate ? [node.nameWithOwner] : []);
}
