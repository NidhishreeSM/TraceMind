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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <NavLink to="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Overview
        </div>
        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition"
        >
          <Cpu className="w-4 h-4 shrink-0 text-slate-400" />
          <span>About TraceMind</span>
        </NavLink>
      </nav>

      {/* Mock Indicator (if active) */}
      {USE_MOCKS && (
        <div className="mx-3 mb-3 p-2.5 rounded-lg bg-slate-950 border border-teal-800/60 text-[11px] text-teal-300">
          <div className="font-semibold flex items-center gap-1.5 text-teal-300">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Dev Mock Active
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            VITE_USE_MOCKS=true
          </p>
        </div>
      )}
    </aside>
  );
};
