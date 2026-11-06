import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-16 py-8 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          Autonomous Incident Response Intelligence
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight">
          Every incident teaches.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400">
            Every resolution makes us smarter.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Incidents repeat because teams forget. TraceMind combines Groq AI reasoning with Hindsight persistent memory to institutionalize fixes and accelerate recovery.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-xl shadow-teal-950/50 transition cursor-pointer"
          >
            Open Operations Console <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
          <Link
            to="/incidents/INC-DEMO-001"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold transition"
          >
            Launch Hero Demo (INC-DEMO-001)
          </Link>
        </div>
      </div>

      {/* The Core Problem */}
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
            The Industry Reality
          </h2>
          <h3 className="text-2xl font-black text-slate-100 mt-1">
            Why Do Identical Outages Strike Every Quarter?
          </h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Engineers leave, post-mortems sit buried in docs, and on-call responders restart services blindly. When isolated LLMs are called during triage, they offer generic suggestions that ignore institutional history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-rose-400 font-mono font-bold text-sm">Zero-Shot Guesswork</div>
            <div className="text-xs text-slate-300 font-medium">Prolonged Downtime</div>
            <p className="text-xs text-slate-500">
              Without memory, responders waste hours diagnosing recurrent connection leaks, token invalidation, and queue storms.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2">
            <div className="text-teal-300 font-mono font-bold text-sm">With Hindsight Memory</div>
            <div className="text-xs text-teal-200 font-medium">Grounded Institutional Recall</div>
            <p className="text-xs text-teal-400/80">
              Immediate recall of verified resolutions bypasses dead-ends and targets confirmed root causes directly.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-purple-400 font-mono font-bold text-sm">Human-in-the-Loop</div>
            <div className="text-xs text-slate-300 font-medium">Never Blind Automation</div>
            <p className="text-xs text-slate-500">
              Every hypothesis requires human validation. Recommendations guide engineers rather than risking rogue production updates.
            </p>
          </div>
        </div>
      </div>

      {/* How Memory Works: The 3 Pillars */}
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-teal-950 border border-teal-700 text-teal-300">
            Hindsight Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            The Three Pillars of Incident Memory
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            How TraceMind turns transient fire-drills into lasting institutional capability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Retain */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden group hover:border-teal-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">Pillar 1</span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">Retain</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              When an engineer resolves an outage, confirmed root cause, verified resolutions, and failed attempts are indexed into Hindsight memory bank.
            </p>
          </div>

          {/* Pillar 2: Recall */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden group hover:border-teal-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold">Pillar 2</span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">Recall</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              During new incidents, Groq queries Hindsight memory using symptom signatures and error logs to extract matching institutional experiences.
            </p>
          </div>

          {/* Pillar 3: Reflect */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden group hover:border-teal-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">Pillar 3</span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">Reflect</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Groq reflects on differences between past and current symptoms, generating pinpoint investigation steps and human-approved hotfix recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Flow Guide For Evaluators / Judges */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/30 shadow-2xl space-y-6">
        <div>
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Judge & Demo Walkthrough
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-100 mt-2">
            Recommended 2-Minute Demo Flow
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-mono text-teal-400 font-bold text-xs">Step 1: Dashboard</div>
            <p className="text-slate-300">
              Review live telemetry chip, MTTR impact breakdown, and recent incident feed.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-mono text-teal-400 font-bold text-xs">Step 2: Hero Triage</div>
            <p className="text-slate-300">
              Open <strong>INC-DEMO-001</strong>. Toggle "Side-by-Side Compare Mode" to see zero-shot vs Hindsight memory recall.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-mono text-teal-400 font-bold text-xs">Step 3: Review & Resolve</div>
            <p className="text-slate-300">
              Click Accept on the recommendation, then click <strong>Resolve & Retain</strong> to index the fix into Hindsight.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-mono text-teal-400 font-bold text-xs">Step 4: Memory Explorer</div>
            <p className="text-slate-300">
              Search memory for "database connection pool leak" to see the newly retained knowledge live in the bank!
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg"
          >
            Launch Demo Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
