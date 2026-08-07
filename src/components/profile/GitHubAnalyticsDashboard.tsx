'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  GitCommit,
  GitPullRequest,
  GitFork,
  Star,
  BookOpen,
  Code2,
  Users,
  Clock,
  BrainCircuit,
  Calendar,
  Layers,
  Terminal,
  Zap,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  Building2,
  TrendingUp,
  Eye,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';
import ContributionHeatmap from '@/components/dashboard/ContributionHeatmap';
import EmptyState from '@/components/ui/EmptyState';

interface GitHubAnalyticsDashboardProps {
  username: string;
  profileData: {
    publicRepos: number;
    followers: number;
    following?: number;
    totalStars: number;
    totalForks?: number;
    topLanguages: Array<{ name: string; percent: number; color: string }>;
    numericScore?: number;
    tier?: string;
    grade?: string;
    createdAt?: string;
  };
  contributions: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalStarsEarned: number;
    totalForksEarned: number;
    currentStreak: number;
    longestStreak: number;
    dailyContributions: Record<string, number>;
  } | null;
  repos: Array<{
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    forks_count: number;
    open_issues_count: number;
    private?: boolean;
  }>;
  userEvents?: any[];
  organizations?: Array<{ login: string; avatar_url: string; description?: string }>;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0D1117',
  borderColor: '#30363D',
  borderRadius: '12px',
  fontSize: '11px',
  fontFamily: 'monospace',
  color: '#fff',
};

const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
};

const SectionCard: React.FC<{
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">{title}</h2>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="p-6 border-t border-white/5">{children}</div>}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number | undefined; subtitle?: string }> = ({
  label,
  value,
  subtitle,
}) => (
  <div className="flex flex-col bg-slate-950/50 rounded-2xl p-4 border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
    <span className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-1">{label}</span>
    <span className="text-xl font-extrabold text-white">
      {value !== undefined && value !== null && value !== '' ? value : '0'}
    </span>
    {subtitle && <span className="text-[10px] text-slate-500 font-mono mt-1">{subtitle}</span>}
  </div>
);

export const GitHubAnalyticsDashboard: React.FC<GitHubAnalyticsDashboardProps> = ({
  username,
  profileData,
  contributions,
  repos,
  userEvents = [],
  organizations = [],
}) => {
  // 1. Commit & Contribution Analytics
  const dailyEntries = useMemo(() => {
    if (!contributions?.dailyContributions) return [];
    return Object.entries(contributions.dailyContributions).sort((a, b) => a[0].localeCompare(b[0]));
  }, [contributions]);

  const commitsThisWeek = useMemo(() => {
    if (dailyEntries.length === 0) return 0;
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    const dateStr = oneWeekAgo.toISOString().split('T')[0];
    return dailyEntries.filter(([d]) => d >= dateStr).reduce((sum, [_, count]) => sum + count, 0);
  }, [dailyEntries]);

  const commitsThisMonth = useMemo(() => {
    if (dailyEntries.length === 0) return 0;
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    return dailyEntries.filter(([d]) => d.startsWith(currentMonthStr)).reduce((sum, [_, count]) => sum + count, 0);
  }, [dailyEntries]);

  const commitsThisYear = useMemo(() => {
    if (dailyEntries.length === 0) return 0;
    const currentYearStr = new Date().getFullYear().toString();
    return dailyEntries.filter(([d]) => d.startsWith(currentYearStr)).reduce((sum, [_, count]) => sum + count, 0);
  }, [dailyEntries]);

  const activeDaysCount = useMemo(() => {
    return dailyEntries.filter(([_, count]) => count > 0).length;
  }, [dailyEntries]);

  const avgDailyCommits = useMemo(() => {
    if (dailyEntries.length === 0) return '0.0';
    const total = dailyEntries.reduce((sum, [_, count]) => sum + count, 0);
    return (total / dailyEntries.length).toFixed(1);
  }, [dailyEntries]);

  const weeklyTrend = useMemo(() => {
    if (dailyEntries.length === 0) return [];
    const weeksMap: Record<string, number> = {};
    dailyEntries.slice(-84).forEach(([dateStr, count]) => {
      const date = new Date(dateStr);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const weekLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      weeksMap[weekLabel] = (weeksMap[weekLabel] || 0) + count;
    });
    return Object.entries(weeksMap).map(([week, count]) => ({ week, contributions: count }));
  }, [dailyEntries]);

  const monthlyTrend = useMemo(() => {
    if (dailyEntries.length === 0) return [];
    const monthly: Record<string, number> = {};
    dailyEntries.forEach(([dateStr, count]) => {
      const monthStr = dateStr.substring(0, 7); // YYYY-MM
      monthly[monthStr] = (monthly[monthStr] || 0) + count;
    });
    return Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => {
        const date = new Date(month + '-01');
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          contributions: count,
        };
      });
  }, [dailyEntries]);

  const dailyDistribution = useMemo(() => {
    if (dailyEntries.length === 0) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    dailyEntries.forEach(([dateStr, count]) => {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        counts[date.getUTCDay()] += count;
      }
    });
    return [1, 2, 3, 4, 5, 6, 0].map(i => ({
      day: days[i],
      contributions: counts[i],
    }));
  }, [dailyEntries]);

  const peakCodingDay = useMemo(() => {
    if (dailyDistribution.length === 0) return 'None';
    const sorted = [...dailyDistribution].sort((a, b) => b.contributions - a.contributions);
    return sorted[0].contributions > 0 ? sorted[0].day : 'None';
  }, [dailyDistribution]);

  // 2. Repository Insights & Growth Timeline
  const repoStats = useMemo(() => {
    const total = repos.length;
    const publicCount = repos.filter(r => !r.private).length;
    const privateCount = repos.filter(r => r.private).length;
    const totalStars = repos.reduce((acc, r) => acc + r.stargazers_count, 0);
    const totalForks = repos.reduce((acc, r) => acc + r.forks_count, 0);
    const totalWatchers = repos.reduce((acc, r) => acc + r.watchers_count, 0);
    const totalOpenIssues = repos.reduce((acc, r) => acc + r.open_issues_count, 0);

    const sortedByStars = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const sortedByForks = [...repos].sort((a, b) => b.forks_count - a.forks_count);
    const sortedByActivity = [...repos].sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime());
    const sortedBySize = [...repos].sort((a, b) => b.size - a.size);

    const mostStarred = sortedByStars[0]?.name || 'None';
    const mostForked = sortedByForks[0]?.name || 'None';
    const mostActive = sortedByActivity[0]?.name || 'None';
    const recentlyUpdated = sortedByActivity[0]?.name || 'None';
    const largestRepo = sortedBySize[0] ? `${sortedBySize[0].name} (${(sortedBySize[0].size / 1024).toFixed(1)}MB)` : 'None';

    return {
      total,
      publicCount,
      privateCount,
      totalStars,
      totalForks,
      totalWatchers,
      totalOpenIssues,
      mostStarred,
      mostForked,
      mostActive,
      recentlyUpdated,
      largestRepo,
      top10ByStars: sortedByStars.slice(0, 10).map(r => ({ name: r.name, stars: r.stargazers_count })),
      sizeDistribution: sortedBySize.slice(0, 10).map(r => ({ name: r.name, sizeMB: Number((r.size / 1024).toFixed(2)) })),
    };
  }, [repos]);

  const repoGrowthTimeline = useMemo(() => {
    if (repos.length === 0) return [];
    const yearlyMap: Record<string, number> = {};
    repos.forEach(r => {
      if (r.created_at) {
        const year = r.created_at.substring(0, 4);
        yearlyMap[year] = (yearlyMap[year] || 0) + 1;
      }
    });
    return Object.entries(yearlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, repos: count }));
  }, [repos]);

  // 3. Language Analytics
  const languageStats = useMemo(() => {
    const langCounts: Record<string, number> = {};
    repos.forEach(r => {
      if (r.language) {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
    });
    return Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ lang, repos: count }));
  }, [repos]);

  const mostUsedLanguage = useMemo(() => {
    if (profileData.topLanguages.length > 0) return profileData.topLanguages[0].name;
    if (languageStats.length > 0) return languageStats[0].lang;
    return 'None';
  }, [profileData.topLanguages, languageStats]);

  const fastestGrowingLanguage = useMemo(() => {
    const recentRepos = repos.filter(r => {
      const updated = new Date(r.updated_at).getTime();
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
      return updated >= sixMonthsAgo && r.language;
    });
    if (recentRepos.length === 0) return mostUsedLanguage;
    const counts: Record<string, number> = {};
    recentRepos.forEach(r => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : mostUsedLanguage;
  }, [repos, mostUsedLanguage]);

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* A. Contribution Analytics */}
      <SectionCard title="Contribution Analytics" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="Total Contributions" value={contributions?.totalCommits ? contributions.totalCommits + (contributions.totalPRs || 0) + (contributions.totalIssues || 0) : 0} />
          <StatBox label="Current Streak" value={contributions?.currentStreak !== undefined ? `${contributions.currentStreak} days` : '0 days'} />
          <StatBox label="Longest Streak" value={contributions?.longestStreak !== undefined ? `${contributions.longestStreak} days` : '0 days'} />
          <StatBox label="Active Days" value={`${activeDaysCount} days`} />
        </div>

        {contributions?.dailyContributions && Object.keys(contributions.dailyContributions).length > 0 ? (
          <div className="mb-8 overflow-x-auto">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">365-Day Contribution Heatmap</h3>
            <div className="min-w-[700px]">
              <ContributionHeatmap dailyContributions={contributions.dailyContributions} />
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Public Contributions"
            description="No contribution data recorded over the past year for this account."
            icon={<Calendar className="w-8 h-8 text-indigo-400" />}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Monthly Contribution Graph</h3>
            <div className="h-48">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                    <XAxis dataKey="month" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="contributions" stroke={CHART_COLORS.primary} fillOpacity={1} fill="url(#colorContrib)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No Monthly Data" description="Not enough data to map monthly trends." />
              )}
            </div>
          </div>

          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Weekly Contribution Graph</h3>
            <div className="h-48">
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                    <XAxis dataKey="week" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="contributions" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No Weekly Data" description="Not enough data to map weekly trends." />
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* B. Repository Analytics */}
      <SectionCard title="Repository Analytics" icon={BookOpen}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="Total Repos" value={repoStats.total} />
          <StatBox label="Public Repos" value={profileData.publicRepos || repoStats.publicCount} />
          <StatBox label="Total Stars Earned" value={repoStats.totalStars || profileData.totalStars} />
          <StatBox label="Total Forks" value={repoStats.totalForks || profileData.totalForks || 0} />
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Top Repositories by Stars</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repoStats.top10ByStars} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                    <XAxis type="number" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="stars" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Repository Growth Timeline</h3>
              <div className="h-64">
                {repoGrowthTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={repoGrowthTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                      <XAxis dataKey="year" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="repos" stroke={CHART_COLORS.emerald} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.emerald }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No Growth Data" description="Unable to render growth timeline." />
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Repository Not Found"
            description="No public repositories were found for this GitHub account."
            icon={<BookOpen className="w-8 h-8 text-indigo-400" />}
          />
        )}
      </SectionCard>

      {/* C. Language Analytics */}
      <SectionCard title="Language Analytics" icon={Code2}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Most Used Language" value={mostUsedLanguage} />
          <StatBox label="Fastest Growing" value={fastestGrowingLanguage} />
          <StatBox label="Languages Tracked" value={profileData.topLanguages.length || languageStats.length} />
        </div>

        {profileData.topLanguages.length > 0 || languageStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4 w-full text-left">Interactive Language Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={profileData.topLanguages}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="percent"
                      nameKey="name"
                    >
                      {profileData.topLanguages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS.primary} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {profileData.topLanguages.slice(0, 6).map((lang, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
                    <span className="text-xs text-slate-300 font-mono">{lang.name} ({lang.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Repositories per Language</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageStats} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                    <XAxis type="number" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="lang" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="repos" fill={CHART_COLORS.rose} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Language Data"
            description="No primary code languages identified across public repositories."
            icon={<Code2 className="w-8 h-8 text-indigo-400" />}
          />
        )}
      </SectionCard>

      {/* D. Commit Analytics */}
      <SectionCard title="Commit Analytics" icon={GitCommit}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatBox label="Commits This Week" value={commitsThisWeek} />
          <StatBox label="Commits This Month" value={commitsThisMonth} />
          <StatBox label="Commits This Year" value={commitsThisYear} />
          <StatBox label="Average Daily Commits" value={avgDailyCommits} />
        </div>
      </SectionCard>

      {/* E. Pull Requests & Issues */}
      <SectionCard title="Pull Requests & Issues" icon={GitPullRequest}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatBox label="PRs Created" value={contributions?.totalPRs || 0} />
          <StatBox label="Issues Opened" value={contributions?.totalIssues || 0} />
          <StatBox label="Peak Coding Day" value={peakCodingDay} />
        </div>
        {(!contributions?.totalPRs || contributions.totalPRs === 0) && (
          <div className="mt-6">
            <EmptyState
              title="No Pull Requests Yet"
              description="No public pull requests recorded for this profile."
              icon={<GitPullRequest className="w-8 h-8 text-indigo-400" />}
            />
          </div>
        )}
      </SectionCard>

      {/* F. Open Source & Organizations */}
      <SectionCard title="Open Source & Organizations" icon={Building2}>
        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {organizations.map((org, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                <img src={org.avatar_url} alt={org.login} className="w-10 h-10 rounded-xl" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white font-mono">{org.login}</span>
                  {org.description && <span className="text-xs text-slate-400 line-clamp-1">{org.description}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Organizations Found"
            description="This developer is not a member of any public GitHub organizations."
            icon={<Building2 className="w-8 h-8 text-indigo-400" />}
          />
        )}
      </SectionCard>
    </div>
  );
};

