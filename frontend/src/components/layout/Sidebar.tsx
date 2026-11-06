import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertOctagon,
  PlusCircle,
  Brain,
  BarChart3,
  Cpu,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { USE_MOCKS } from '../../api';

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Incidents', to: '/incidents', icon: AlertOctagon },
    { label: 'New Incident', to: '/incidents/new', icon: PlusCircle },
    { label: 'Memory Explorer', to: '/memory', icon: Brain },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <NavLink to="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Operations Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-xs shadow-teal-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Documentation
        </div>
        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition"
        >
          <Cpu className="w-4 h-4 shrink-0 text-slate-400" />
          <span>About TraceMind</span>
        </NavLink>
      </nav>

      {/* Mock Indicator (if active) */}
      {USE_MOCKS && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-teal-950/60 border border-teal-700/60 text-[11px] text-teal-300">
          <div className="font-semibold flex items-center gap-1.5 text-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            Dev Mock Active
          </div>
          <p className="text-[10px] text-teal-400/80 mt-1">
            VITE_USE_MOCKS=true. Data matches contract. Turn off for live demo.
          </p>
        </div>
      )}

      {/* Footer Tagline */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <blockquote className="text-[11px] text-slate-400 italic leading-snug border-l-2 border-teal-500/60 pl-2">
          &ldquo;Every incident teaches. Every resolution makes us smarter.&rdquo;
        </blockquote>
        <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>Hindsight v1.0</span>
          <span className="text-teal-400/80">Institutional Memory</span>
        </div>
      </div>
    </aside>
  );
};
