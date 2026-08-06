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
  LayoutDashboard,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';
import ContributionHeatmap from '@/components/dashboard/ContributionHeatmap';

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
  }>;
  userEvents: any[];
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
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl overflow-hidden">
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

const StatBox: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
  <div className="flex flex-col bg-slate-950/50 rounded-2xl p-4 border border-white/5">
    <span className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-1">{label}</span>
    <span className="text-xl font-extrabold text-white">
      {value !== undefined && value !== null ? value : 'Not Available'}
    </span>
  </div>
);

export const GitHubAnalyticsDashboard: React.FC<GitHubAnalyticsDashboardProps> = ({
  username,
  profileData,
  contributions,
  repos,
  userEvents,
}) => {
  // Data processing memoizations
  const monthlyTrend = useMemo(() => {
    if (!contributions?.dailyContributions) return [];
    const monthly: Record<string, number> = {};
    Object.entries(contributions.dailyContributions).forEach(([dateStr, count]) => {
      const monthStr = dateStr.substring(0, 7); // YYYY-MM
      monthly[monthStr] = (monthly[monthStr] || 0) + count;
    });
    return Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 months
      .map(([month, count]) => {
        const date = new Date(month + '-01');
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          contributions: count,
          rawMonth: month,
        };
      });
  }, [contributions]);

  const dailyDistribution = useMemo(() => {
    if (!contributions?.dailyContributions) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    Object.entries(contributions.dailyContributions).forEach(([dateStr, count]) => {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        counts[date.getUTCDay()] += count;
      }
    });
    // Reorder to Mon-Sun
    const reordered = [1, 2, 3, 4, 5, 6, 0].map(i => ({
      day: days[i],
      contributions: counts[i],
    }));
    return reordered;
  }, [contributions]);

  const repoStats = useMemo(() => {
    const total = repos.length;
    const forked = repos.filter(r => r.fork).length;
    const original = total - forked;
    const sortedByStars = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const sortedByForks = [...repos].sort((a, b) => b.forks_count - a.forks_count);
    return {
      total,
      forked,
      original,
      mostStarred: sortedByStars[0]?.name || 'N/A',
      mostForked: sortedByForks[0]?.name || 'N/A',
      top10ByStars: sortedByStars.slice(0, 10).map(r => ({ name: r.name, stars: r.stargazers_count })),
      sizeDistribution: [...repos]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(r => ({ name: r.name, sizeKB: r.size })),
    };
  }, [repos]);

  const peakCodingDay = useMemo(() => {
    if (dailyDistribution.length === 0) return 'Not Available';
    const sorted = [...dailyDistribution].sort((a, b) => b.contributions - a.contributions);
    return sorted[0].contributions > 0 ? sorted[0].day : 'Not Available';
  }, [dailyDistribution]);

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

  const accountAgeDays = useMemo(() => {
    if (!profileData.createdAt) return undefined;
    const created = new Date(profileData.createdAt);
    if (isNaN(created.getTime())) return undefined;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [profileData.createdAt]);

  const aiInsights = useMemo(() => {
    const sortedMonths = [...monthlyTrend].sort((a, b) => b.contributions - a.contributions);
    const mostProductiveMonth = sortedMonths[0]?.contributions > 0 ? sortedMonths[0].month : 'N/A';
    
    const strongestLang = profileData.topLanguages[0]?.name || 'N/A';
    
    const mostActiveRepoStr = [...repos].sort((a, b) => {
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    })[0]?.name || 'N/A';

    let consistency = 'Not Available';
    if (contributions?.currentStreak !== undefined && accountAgeDays) {
      if (contributions.longestStreak > 30) consistency = 'Exceptional';
      else if (contributions.longestStreak > 14) consistency = 'High';
      else if (contributions.longestStreak > 7) consistency = 'Moderate';
      else consistency = 'Casual';
    }

    return {
      mostProductiveMonth,
      strongestLang,
      mostActiveRepoStr,
      consistency,
    };
  }, [monthlyTrend, profileData.topLanguages, repos, contributions, accountAgeDays]);

  const timelineEvents = useMemo(() => {
    return userEvents.slice(0, 15).map((ev: any, idx) => {
      let icon: LucideIcon = Activity;
      let desc = ev.type;
      
      switch (ev.type) {
        case 'PushEvent': icon = GitCommit; desc = 'Pushed commits'; break;
        case 'PullRequestEvent': icon = GitPullRequest; desc = ev.payload?.action ? `PR ${ev.payload.action}` : 'Pull Request'; break;
        case 'IssuesEvent': icon = AlertCircle; desc = ev.payload?.action ? `Issue ${ev.payload.action}` : 'Issue Event'; break;
        case 'CreateEvent': icon = FolderGit2; desc = 'Created repository/branch'; break;
        case 'WatchEvent': icon = Star; desc = 'Starred repository'; break;
        case 'ForkEvent': icon = GitFork; desc = 'Forked repository'; break;
      }
      return {
        id: ev.id || idx,
        type: ev.type,
        repoName: ev.repo?.name || 'Unknown',
        createdAt: ev.created_at ? new Date(ev.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date',
        desc,
        Icon: icon
      };
    });
  }, [userEvents]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* A. Contribution Analytics */}
      <SectionCard title="Contribution Analytics" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatBox label="Total Contributions" value={contributions?.totalCommits ? contributions.totalCommits + (contributions.totalPRs || 0) + (contributions.totalIssues || 0) : 'Not Available'} />
          <StatBox label="Current Streak" value={contributions?.currentStreak !== undefined ? `${contributions.currentStreak} days` : 'Not Available'} />
          <StatBox label="Longest Streak" value={contributions?.longestStreak !== undefined ? `${contributions.longestStreak} days` : 'Not Available'} />
          <StatBox label="Total PRs" value={contributions?.totalPRs} />
          <StatBox label="Total Issues" value={contributions?.totalIssues} />
        </div>

        {contributions?.dailyContributions && (
          <div className="mb-8 overflow-x-auto">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">365-Day Contribution Heatmap</h3>
            <div className="min-w-[700px]">
              <ContributionHeatmap dailyContributions={contributions.dailyContributions} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Monthly Contribution Trend</h3>
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
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Daily Distribution (Mon-Sun)</h3>
            <div className="h-48">
              {dailyDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyDistribution} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                    <XAxis dataKey="day" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="contributions" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* B. Repository Analytics */}
      <SectionCard title="Repository Analytics" icon={BookOpen}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatBox label="Total Repos" value={repoStats.total} />
          <StatBox label="Original (Non-fork)" value={repoStats.original} />
          <StatBox label="Forked Repos" value={repoStats.forked} />
          <StatBox label="Most Starred" value={repoStats.mostStarred} />
          <StatBox label="Most Forked" value={repoStats.mostForked} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Top 10 Repos by Stars</h3>
            <div className="h-64">
              {repoStats.top10ByStars.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repoStats.top10ByStars} layout="vertical" margin={{ top: 5, right: 10, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                    <XAxis type="number" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} width={80} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="stars" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Repository Size Distribution (KB)</h3>
            <div className="h-64">
              {repoStats.sizeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repoStats.sizeDistribution} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                    <XAxis dataKey="name" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 10) + '..'} />
                    <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="sizeKB" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* C. Commit Analytics */}
      <SectionCard title="Commit Analytics" icon={GitCommit}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatBox label="Total Commits" value={contributions?.totalCommits} />
          <StatBox label="Peak Coding Day" value={peakCodingDay} />
          <StatBox label="Monthly Commits Avg" value={monthlyTrend.length ? Math.round(monthlyTrend.reduce((a, b) => a + b.contributions, 0) / monthlyTrend.length) : 'Not Available'} />
        </div>
        
        <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5">
          <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Monthly Commits Trend</h3>
          <div className="h-48">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                  <XAxis dataKey="month" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="contributions" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.secondary }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* D & E. Combined PR, Issue, Stars & Forks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="PR & Issue Analytics" icon={GitPullRequest}>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Total Pull Requests" value={contributions?.totalPRs} />
            <StatBox label="Total Issues" value={contributions?.totalIssues} />
          </div>
        </SectionCard>

        <SectionCard title="Stars & Forks Analytics" icon={Star}>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Total Stars Earned" value={contributions?.totalStarsEarned ?? profileData.totalStars} />
            <StatBox label="Total Forks Earned" value={contributions?.totalForksEarned ?? profileData.totalForks} />
          </div>
        </SectionCard>
      </div>

      {/* F. Language Analytics */}
      <SectionCard title="Language Analytics" icon={Code2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4 w-full text-left">Language Distribution (Size/Usage)</h3>
            <div className="h-64 w-full">
              {profileData.topLanguages.length > 0 ? (
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
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
            {/* Custom Legend */}
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
            <h3 className="text-[10px] text-slate-400 uppercase font-bold font-mono mb-4">Repos per Language</h3>
            <div className="h-64">
              {languageStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageStats} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                    <XAxis type="number" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="lang" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} width={70} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#ffffff10' }} />
                    <Bar dataKey="repos" fill={CHART_COLORS.rose} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">Not Available</div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* G & I. Social Metrics & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Social Metrics" icon={Users}>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Followers" value={profileData.followers} />
            <StatBox label="Following" value={profileData.following} />
            <StatBox label="Account Age" value={accountAgeDays !== undefined ? `${Math.floor(accountAgeDays / 365)}y ${Math.floor((accountAgeDays % 365) / 30)}m` : 'Not Available'} />
          </div>
        </SectionCard>

        <SectionCard title="AI Insights" icon={BrainCircuit}>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Most Productive Month" value={aiInsights.mostProductiveMonth} />
            <StatBox label="Strongest Language" value={aiInsights.strongestLang} />
            <StatBox label="Most Active Repo" value={aiInsights.mostActiveRepoStr} />
            <StatBox label="Consistency Rating" value={aiInsights.consistency} />
          </div>
        </SectionCard>
      </div>

      {/* H. Activity Timeline */}
      <SectionCard title="Activity Timeline" icon={Clock} defaultOpen={false}>
        {timelineEvents.length > 0 ? (
          <div className="relative border-l border-slate-700/50 ml-4 py-2 space-y-6">
            {timelineEvents.map((event) => {
              const EventIcon = event.Icon;
              return (
                <div key={event.id} className="relative pl-6 group">
                  <div className="absolute -left-[13px] top-1 bg-slate-900 border border-slate-700 p-1 rounded-full group-hover:border-indigo-500 transition-colors">
                    <EventIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{event.desc}</span>
                      <span className="text-xs text-slate-500 font-mono">{event.createdAt}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{event.repoName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 font-mono text-sm">
            No recent activity available
          </div>
        )}
      </SectionCard>
    </div>
  );
};
