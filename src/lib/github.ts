import { GitHubProfile, GitHubRepository, LanguageStat, ContributionStats, UserDashboardData, DeveloperScore, AIInsights } from "../types";
import { GitHubUserService } from "../services/github/github-user.service";
import { GitHubRepositoryService } from "../services/github/github-repository.service";
import { GitHubAnalyticsService } from "../services/github/github-analytics.service";
import { GitHubContributionService } from "../services/github/github-contribution.service";
import { calculateDeveloperScore } from "../services/score";

// Language color mapping inspired by GitHub
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Shell: "#89e051",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB",
};

export async function fetchGitHubDashboardData(
  username: string,
  token?: string
): Promise<UserDashboardData> {
  if (!username) {
    throw new Error("GitHub username is required.");
  }

  // 1. Fetch Profile
  const profile = await GitHubUserService.fetchUserProfile(username, token);

  // 2. Fetch Repositories
  const repositories = await GitHubRepositoryService.fetchUserProfileRepos(username, token);

  // 3. Fetch real user contributions via GitHubContributionService
  const contributions = await GitHubContributionService.fetchUserContributions(username, token);

  // 4. Calculate everything using GitHubAnalyticsService
  const { dashboardData } = GitHubAnalyticsService.calculateDashboardAnalytics(
    profile.id.toString(),
    profile,
    repositories,
    contributions
  );

  return dashboardData;
}

