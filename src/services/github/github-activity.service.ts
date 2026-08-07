export interface LiveEvent {
  id: string;
  type: "push" | "pr_opened" | "pr_closed" | "pr_merged" | "issue_opened" | "issue_closed" | "release" | "star" | "fork" | "follow" | "create" | "delete";
  repoName: string;
  repoUrl?: string;
  actorName: string;
  actorAvatar: string;
  description: string;
  createdAt: string;
  githubUrl?: string;
  details?: {
    commitMsg?: string;
    branch?: string;
    filesCount?: number;
    prTitle?: string;
    prNumber?: number;
    issueTitle?: string;
    issueNumber?: number;
    releaseTag?: string;
    releaseTitle?: string;
    forkee?: string;
    followerName?: string;
  };
}

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  updatedAt: string;
  subject: {
    title: string;
    url: string;
    latest_comment_url: string;
    type: "PullRequest" | "Issue" | "Release" | "Commit" | "Repository";
  };
  repository: {
    name: string;
    full_name: string;
    html_url: string;
  };
}

export interface SyncLog {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  eventsCount: number;
  status: "success" | "warning" | "error";
  errorMsg?: string;
}

export class GitHubActivityService {
  private static defaultHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }
    return headers;
  }

  static async fetchUserEvents(username: string, token?: string): Promise<LiveEvent[]> {
    if (!username) return [];

    try {
      const res = await fetch(`https://api.github.com/users/${username}/events`, {
        headers: this.defaultHeaders(token),
      });

      if (!res.ok) {
        return [];
      }

      const rawEvents = await res.json();
      return this.parseGitHubEvents(rawEvents);
    } catch (error) {
      console.warn("Error fetching user events:", error);
      return [];
    }
  }

  static async fetchNotifications(token?: string): Promise<GitHubNotification[]> {
    if (!token) return [];

    try {
      const res = await fetch("https://api.github.com/notifications", {
        headers: this.defaultHeaders(token),
      });

      if (!res.ok) return [];

      const rawNotifications = await res.json();
      return rawNotifications.map((notif: any) => ({
        id: notif.id,
        unread: notif.unread,
        reason: notif.reason,
        updatedAt: notif.updated_at,
        subject: {
          title: notif.subject.title,
          url: notif.subject.url,
          latest_comment_url: notif.subject.latest_comment_url,
          type: notif.subject.type,
        },
        repository: {
          name: notif.repository.name,
          full_name: notif.repository.full_name,
          html_url: notif.repository.html_url,
        },
      }));
    } catch (error) {
      console.warn("Error fetching notifications:", error);
      return [];
    }
  }

  static async fetchRepositoryEvents(owner: string, repo: string, token?: string): Promise<LiveEvent[]> {
    if (!owner || !repo) return [];

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/events`, {
        headers: this.defaultHeaders(token),
      });

      if (!res.ok) return [];

      const rawEvents = await res.json();
      return this.parseGitHubEvents(rawEvents);
    } catch (e) {
      return [];
    }
  }


  private static parseGitHubEvents(rawEvents: any[]): LiveEvent[] {
    if (!Array.isArray(rawEvents)) return [];

    return rawEvents.map((evt: any) => {
      const actor = evt.actor || {};
      const repo = evt.repo || {};
      const payload = evt.payload || {};
      const typeMap: Record<string, LiveEvent["type"]> = {
        PushEvent: "push",
        PullRequestEvent: payload.action === "opened" ? "pr_opened" : payload.action === "closed" ? (payload.pull_request?.merged ? "pr_merged" : "pr_closed") : "push",
        IssuesEvent: payload.action === "opened" ? "issue_opened" : "issue_closed",
        ReleaseEvent: "release",
        WatchEvent: "star",
        ForkEvent: "fork",
        CreateEvent: "create",
        DeleteEvent: "delete",
      };

      const eventType = typeMap[evt.type] || "push";
      let description = "";

      switch (eventType) {
        case "push":
          description = `pushed to ${payload.ref?.replace("refs/heads/", "") || "main"}`;
          break;
        case "pr_opened":
          description = `opened pull request #${payload.number}: ${payload.pull_request?.title || ""}`;
          break;
        case "pr_closed":
          description = `closed pull request #${payload.number}`;
          break;
        case "pr_merged":
          description = `merged pull request #${payload.number}`;
          break;
        case "issue_opened":
          description = `opened issue #${payload.issue?.number}: ${payload.issue?.title || ""}`;
          break;
        case "issue_closed":
          description = `closed issue #${payload.issue?.number}`;
          break;
        case "release":
          description = `published release ${payload.release?.tag_name || ""}`;
          break;
        case "star":
          description = `starred the repository`;
          break;
        case "fork":
          description = `forked the repository`;
          break;
        case "create":
          description = `created ${payload.ref_type || "repository"}`;
          break;
        case "delete":
          description = `deleted ${payload.ref_type || "repository"}`;
          break;
      }

      return {
        id: evt.id,
        type: eventType,
        repoName: repo.name,
        repoUrl: `https://github.com/${repo.name}`,
        actorName: actor.display_login || actor.login || "user",
        actorAvatar: actor.avatar_url || "https://github.com/identicons/git.png",
        description,
        createdAt: evt.created_at || new Date().toISOString(),
        githubUrl: `https://github.com/${repo.name}`,
        details: {
          commitMsg: payload.commits?.[0]?.message,
          branch: payload.ref?.replace("refs/heads/", ""),
          filesCount: payload.commits?.length,
          prTitle: payload.pull_request?.title,
          prNumber: payload.number,
          issueTitle: payload.issue?.title,
          issueNumber: payload.issue?.number,
          releaseTag: payload.release?.tag_name,
          releaseTitle: payload.release?.name,
        },
      };
    });
  }
}

