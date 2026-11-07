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
    <div className="max-w-5xl mx-auto space-y-12 py-8 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center space-y-5 pt-4 sm:pt-8">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-100 max-w-3xl mx-auto leading-tight">
          Every incident teaches.{' '}
          <span className="text-teal-400">
            Every resolution makes us smarter.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          TraceMind recalls verified incident resolutions from Hindsight persistent memory to eliminate recurring downtime and accelerate triage.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition cursor-pointer"
          >
            Open Console <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
          <Link
            to="/incidents/INC-DEMO-001"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Launch Hero Demo (INC-DEMO-001)
          </Link>
        </div>
      </div>

      {/* The Core Workflow */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="max-w-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono">
            Problem & Solution
          </h2>
          <h3 className="text-lg font-bold text-slate-100 mt-0.5">
            Why do outages repeat?
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Engineers move on, post-mortems sit unread, and on-call responders debug from scratch. Without institutional memory, LLMs provide generic guesses. Grounded in Hindsight, recommendations recall confirmed fixes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="text-rose-400 font-mono font-semibold">Without Memory</div>
            <p className="text-slate-400">
              Generic troubleshooting that wastes critical minutes diagnosing known connection leaks and queue bottlenecks.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-teal-500/30 space-y-1.5">
            <div className="text-teal-300 font-mono font-semibold">With Hindsight Memory</div>
            <p className="text-slate-300">
              Direct recall of verified resolutions from past outages, pinpointing root cause and verified steps.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="text-slate-200 font-mono font-semibold">Human-in-the-Loop</div>
            <p className="text-slate-400">
              Every hypothesis is unconfirmed until validated by the on-call engineer. No blind automated production actions.
            </p>
          </div>
        </div>
      </div>

      {/* Three Pillars: Retain, Recall, Reflect */}
      <div className="space-y-4">
        <div className="text-center max-w-md mx-auto space-y-1">
          <h2 className="text-lg font-bold text-slate-100">
            Memory Workflow
          </h2>
          <p className="text-xs text-slate-400">
            How institutional experience is captured and applied.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-semibold">Step 1</span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">Retain</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When an engineer resolves an outage, confirmed root cause, verified fixes, and failed attempts are indexed into the Hindsight memory bank.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-semibold">Step 2</span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">Recall</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              During incoming incidents, Groq queries Hindsight memory using symptoms and error signatures to find relevant past post-mortems.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-semibold">Step 3</span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">Reflect</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI synthesizes past verified steps with current telemetry to generate actionable investigation steps and recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Flow Guide */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Recommended Walkthrough Flow
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Key steps to verify end-to-end functionality.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-mono text-teal-400 font-semibold">1. Dashboard</div>
            <p className="text-slate-400">
              Inspect active incidents, post-mortems retained, and memory impact.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-mono text-teal-400 font-semibold">2. Compare Mode</div>
            <p className="text-slate-400">
              Open <strong>INC-DEMO-001</strong>. Run compare mode to see zero-shot vs memory-grounded analysis.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-mono text-teal-400 font-semibold">3. Resolve & Retain</div>
            <p className="text-slate-400">
              Resolve an incident and verify it is retained in the Hindsight bank.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-mono text-teal-400 font-semibold">4. Memory Explorer</div>
            <p className="text-slate-400">
              Query the bank to see past resolutions matching your search.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition"
          >
            Launch Console <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
