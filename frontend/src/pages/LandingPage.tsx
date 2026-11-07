import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050B1A] text-white flex flex-col font-sans selection:bg-[#3B82F6]/30 selection:text-white">
      {/* Minimal Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050B1A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-base font-medium tracking-wider text-white uppercase">
              TraceMind
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-8">
            <a
              href="#problem"
              className="text-xs uppercase tracking-widest text-[#8FA0BF] hover:text-white transition-colors"
            >
              Problem
            </a>
            <a
              href="#how-it-works"
              className="text-xs uppercase tracking-widest text-[#8FA0BF] hover:text-white transition-colors"
            >
              How it works
            </a>
          </nav>

          <Link
            to="/dashboard"
            className="rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] px-5 py-2 text-xs font-semibold transition cursor-pointer"
          >
            Open Console
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-6">
          {/* Soft blue radial glow + silver light streak */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(circle at 50% 25%, rgba(29, 78, 216, 0.28) 0%, rgba(11, 21, 48, 0.15) 45%, rgba(5, 11, 26, 0) 75%)',
            }}
          />
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-4/5 max-w-5xl h-px bg-gradient-to-r from-transparent via-[#C9D6EA]/40 to-transparent" />

          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-[#0B1530]/60 text-[#C9D6EA] text-[11px] tracking-widest uppercase font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
              Persistent Memory for Incident Response
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-[0.18em] uppercase text-white leading-tight sm:leading-snug">
              Every Incident Teaches.{' '}
              <span className="text-[#C9D6EA] font-normal block mt-2 sm:inline sm:mt-0">
                Every Resolution Matters.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#8FA0BF] max-w-2xl mx-auto leading-relaxed font-normal">
              TraceMind recalls verified incident resolutions from Hindsight persistent memory to eliminate recurring downtime and accelerate triage.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] px-7 py-3 text-xs font-semibold transition shadow-sm cursor-pointer"
              >
                Open Console <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/incidents/INC-DEMO-026"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/30 hover:bg-white/5 text-white px-7 py-3 text-xs font-semibold transition cursor-pointer"
              >
                Try the demo incident
              </Link>
            </div>
          </div>
        </section>

        {/* Content Body */}
        <div className="max-w-6xl mx-auto w-full px-6 space-y-16 pb-24">
          {/* Problem & Solution Container */}
          <section
            id="problem"
            className="rounded-3xl bg-[#0B1530] border border-white/8 p-8 md:p-12 space-y-8"
          >
            <div className="max-w-2xl space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[#C9D6EA] font-medium">
                Problem & Solution
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-white tracking-wide">
                Why do outages repeat?
              </h2>
              <p className="text-xs sm:text-sm text-[#8FA0BF] leading-relaxed pt-1">
                Engineers move on, post-mortems sit unread, and on-call responders debug from scratch. Without institutional memory, LLMs offer generic guesses. Grounded in Hindsight, TraceMind recalls verified fixes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-6 space-y-2">
                <span className="text-xs uppercase tracking-widest text-[#8FA0BF] font-medium">
                  Without Memory
                </span>
                <p className="text-xs text-[#8FA0BF] leading-relaxed">
                  Generic troubleshooting that wastes critical minutes diagnosing known connection leaks, lock contention, and queue bottlenecks.
                </p>
              </div>

              <div className="rounded-2xl bg-[#101C3D] border border-[#3B82F6]/60 p-6 space-y-2 shadow-sm">
                <span className="text-xs uppercase tracking-widest text-[#C9D6EA] font-medium">
                  With Hindsight Memory
                </span>
                <p className="text-xs text-white leading-relaxed">
                  Direct recall of verified resolutions from past outages, pinpointing confirmed root causes, exact runbook steps, and lessons learned.
                </p>
              </div>

              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-6 space-y-2">
                <span className="text-xs uppercase tracking-widest text-white font-medium">
                  Human-in-the-Loop
                </span>
                <p className="text-xs text-[#8FA0BF] leading-relaxed">
                  Every hypothesis remains unconfirmed until validated by the on-call engineer. No blind, automated production interventions.
                </p>
              </div>
            </div>
          </section>

          {/* Workflow Pillars */}
          <section id="how-it-works" className="space-y-8">
            <div className="text-center max-w-lg mx-auto space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[#C9D6EA] font-medium">
                Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-white tracking-wide">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-[#8FA0BF]">
                Persistent institutional experience captured, recalled, and reflected continuously.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl bg-[#0B1530] border border-white/8 p-7 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA]">
                  <Brain className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8FA0BF] font-medium">
                    01 • Retain
                  </span>
                  <h3 className="text-base font-normal text-white">
                    Capture Ground Truth
                  </h3>
                </div>
                <p className="text-xs text-[#8FA0BF] leading-relaxed">
                  When an outage is resolved, verified root causes, effective mitigation steps, and dead ends are indexed into the Hindsight memory bank.
                </p>
              </div>

              <div className="rounded-3xl bg-[#0B1530] border border-white/8 p-7 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA]">
                  <Sparkles className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8FA0BF] font-medium">
                    02 • Recall
                  </span>
                  <h3 className="text-base font-normal text-white">
                    Semantic Association
                  </h3>
                </div>
                <p className="text-xs text-[#8FA0BF] leading-relaxed">
                  During incoming incidents, telemetry and symptoms query the Hindsight bank to surface relevant historical post-mortems and resolutions.
                </p>
              </div>

              <div className="rounded-3xl bg-[#0B1530] border border-white/8 p-7 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-[#101C3D] border border-white/10 flex items-center justify-center text-[#C9D6EA]">
                  <RotateCcw className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#8FA0BF] font-medium">
                    03 • Reflect
                  </span>
                  <h3 className="text-base font-normal text-white">
                    Actionable Guidance
                  </h3>
                </div>
                <p className="text-xs text-[#8FA0BF] leading-relaxed">
                  TraceMind synthesizes past verified resolutions with active telemetry to generate high-confidence diagnosis and recovery steps.
                </p>
              </div>
            </div>
          </section>

          {/* Recommended Walkthrough Flow */}
          <section className="rounded-3xl bg-[#0B1530] border border-white/8 p-8 md:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-[#C9D6EA] font-medium">
                  Walkthrough
                </span>
                <h3 className="text-lg font-normal text-white">
                  Recommended Verification Flow
                </h3>
              </div>
              <Link
                to="/dashboard"
                className="self-start sm:self-auto rounded-full bg-white hover:bg-[#C9D6EA] text-[#050B1A] px-5 py-2 text-xs font-semibold transition"
              >
                Launch Console
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>1. Dashboard</span>
                </div>
                <p className="text-[#8FA0BF] text-[11px] leading-relaxed">
                  Review active incidents, memory coverage, and severity metrics.
                </p>
              </div>

              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>2. Compare Mode</span>
                </div>
                <p className="text-[#8FA0BF] text-[11px] leading-relaxed">
                  Open <strong>INC-DEMO-026</strong> to evaluate analysis with and without memory.
                </p>
              </div>

              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>3. Resolve & Retain</span>
                </div>
                <p className="text-[#8FA0BF] text-[11px] leading-relaxed">
                  Resolve an incident and confirm immediate retention into Hindsight.
                </p>
              </div>

              <div className="rounded-2xl bg-[#101C3D] border border-white/8 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>4. Memory Explorer</span>
                </div>
                <p className="text-[#8FA0BF] text-[11px] leading-relaxed">
                  Search the knowledge base to inspect indexed post-mortems and nodes.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8 bg-[#050B1A] py-8 text-center text-xs text-[#8FA0BF]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-white font-medium">TraceMind</span>
            <span className="text-white/30">•</span>
            <span>Hindsight Incident Memory</span>
          </div>
          <div className="text-[11px] text-[#8FA0BF]">
            Engineered for high-availability production systems.
          </div>
        </div>
      </footer>
    </div>
  );
};
