'use client';

import React, { useState } from 'react';
import styles from '@/components/social/social.module.css';
import { 
  Briefcase, 
  Sparkles, 
  FileCheck, 
  Target, 
  TrendingUp, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Search,
  Building2,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react';

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  matchScore: number;
  tags: string[];
  missingSkills: string[];
  postedTime: string;
}

const RECOMMENDED_JOBS: JobPosting[] = [
  {
    id: 'job_1',
    title: 'Senior Systems Architect (TypeScript & Rust)',
    company: 'Vercel Labs',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    salary: '$180,000 - $220,000',
    matchScore: 96,
    tags: ['TypeScript', 'Next.js', 'Rust', 'RAG'],
    missingSkills: ['WASM SIMD'],
    postedTime: '2 hours ago',
  },
  {
    id: 'job_2',
    title: 'Lead Frontend UI Systems Engineer',
    company: 'Linear App',
    location: 'San Francisco, CA / Remote',
    type: 'Full-time',
    salary: '$165,000 - $205,000',
    matchScore: 92,
    tags: ['React', 'Framer Motion', 'WebGL', 'Tailwind'],
    missingSkills: ['Three.js Shaders'],
    postedTime: '5 hours ago',
  },
  {
    id: 'job_3',
    title: 'AI Platform & Infrastructure Lead',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$200,000 - $260,000',
    matchScore: 88,
    tags: ['Python', 'Rust', 'Distributed Systems', 'PyTorch'],
    missingSkills: ['CUDA Kernels'],
    postedTime: '1 day ago',
  },
];

export default function JobAnalyzerPage() {
  const [activeModule, setActiveModule] = useState<'match' | 'roadmap' | 'jobs'>('match');
  const [resumeText, setResumeText] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  return (
    <main className={styles.content}>
      <header className={styles.pageHeading}>
        <div><h1>Jobs and career</h1><p>Explore example job matches and learning roadmaps.</p></div>
        <span className={styles.previewBadge}>Sample content</span>
      </header>

        {/* Module Navigation Tabs */}
        <div className={styles.toolTabs} aria-label="Sections">
          {[
            { id: 'match', label: 'ATS & GitHub Match', icon: Target },
            { id: 'roadmap', label: 'Skill Gap & Roadmap', icon: BookOpen },
            { id: 'jobs', label: 'Recommended Jobs', icon: Briefcase },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveModule(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Module 1: ATS & GitHub Match */}
        {activeModule === 'match' && (
          <div className="space-y-6">
            {analyzed && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="cf-tool-panel p-6  space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Overall ATS Score</span>
                <p className="text-3xl font-extrabold text-emerald-400 font-mono">94 / 100</p>
                <p className="text-xs text-slate-300">Top 3% among Senior Frontend Architects.</p>
              </div>

              <div className="cf-tool-panel p-6  space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">GitHub Code Match</span>
                <p className="text-3xl font-extrabold text-cyan-400 font-mono">98.2%</p>
                <p className="text-xs text-slate-300">Verified commits validate 12 key job skills.</p>
              </div>

              <div className="cf-tool-panel p-6  space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Market Salary Potential</span>
                <p className="text-3xl font-extrabold text-purple-400 font-mono">$195k / yr</p>
                <p className="text-xs text-slate-300">Estimated for US & Remote Senior roles.</p>
              </div>
            </div>}

            {/* Resume Input & Analyzer */}
            <div className="cf-tool-panel p-6 sm:p-8  space-y-4">
              <h3 className="font-bold text-white text-base">Sample job match report</h3>
              <textarea
                rows={4}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Optional notes for previewing the report…"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => setAnalyzed(true)}
                className="flex items-center gap-2 rounded-2xl cf-tool-primary px-6 py-2.5 text-xs font-bold hover:opacity-95 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>View sample match</span>
              </button>
            </div>
          </div>
        )}

        {/* Module 2: Skill Gap & Learning Roadmap */}
        {activeModule === 'roadmap' && (
          <div className="cf-tool-panel p-6 sm:p-8  space-y-6">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-lg">Personalized Skill Gap & 30-Day Learning Roadmap</h3>
              <p className="text-xs text-slate-300">Based on high-paying job trends for your archetype.</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-amber-200">Missing Key Skills Identified</h4>
                  <p className="text-amber-300/80">WASM SIMD primitives, CUDA GPU acceleration, and WebAssembly memory buffers.</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3 pt-2">
                {[
                  { week: 'Week 1', title: 'WebAssembly Basics & Memory Layout', desc: 'Build basic C/Rust to WASM modules using emscripten.' },
                  { week: 'Week 2', title: 'SIMD Acceleration Primitives', desc: 'Implement 128-bit vector arithmetic operations.' },
                  { week: 'Week 3', title: 'Integrating WASM in Next.js', desc: 'Stream WebAssembly execution threads into React Server Components.' },
                  { week: 'Week 4', title: 'Open Source Capstone', desc: 'Publish verified SIMD vector package to NPM & GitHub.' },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-slate-950/60">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800/40 shrink-0">
                      {step.week}
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-xs">{step.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Module 3: Recommended Jobs */}
        {activeModule === 'jobs' && (
          <div className="space-y-4">
            {RECOMMENDED_JOBS.map((job) => (
              <div
                key={job.id}
                className="cf-tool-panel p-6  hover:border-slate-700 transition-all space-y-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base">{job.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary}
                      </span>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 text-xs font-mono font-bold shrink-0">
                    {job.matchScore}% Match
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {job.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs text-text-secondary">Example listing</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
  );
}
