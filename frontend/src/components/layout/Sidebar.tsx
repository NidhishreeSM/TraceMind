import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, '') || '/';

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Incidents', to: '/incidents', icon: AlertOctagon },
    { label: 'New Incident', to: '/incidents/new', icon: PlusCircle },
    { label: 'Memory Explorer', to: '/memory', icon: Brain },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  ];

  const isItemActive = (to: string) => {
    if (to === '/incidents') {
      return (
        pathname === '/incidents' ||
        (pathname.startsWith('/incidents/') && pathname !== '/incidents/new')
      );
    }
    if (to === '/incidents/new') {
      return pathname === '/incidents/new';
    }
    return pathname === to;
  };

  return (
    <aside className="w-64 bg-[#0A1122] border-r border-white/[0.07] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/[0.07]">
        <Link to="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Sidebar navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#94A3B8] font-mono">
          Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#131C31] text-[#F1F5F9] border border-white/[0.14]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131C31]/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F1F5F9]' : 'text-[#94A3B8]'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#94A3B8] font-mono">
          Overview
        </div>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131C31]/50 border border-transparent transition"
        >
          <Cpu className="w-4 h-4 shrink-0 text-[#94A3B8]" />
          <span>About TraceMind</span>
        </Link>
      </nav>

      {/* Mock Indicator (if active) */}
      {USE_MOCKS && (
        <div className="mx-3 mb-3 p-2.5 rounded-xl bg-[#131C31] border border-white/[0.07] text-[11px] text-[#94A3B8]">
          <div className="font-medium flex items-center gap-1.5 text-[#F1F5F9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            Dev Mock Active
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
            VITE_USE_MOCKS=true
          </p>
        </div>
      )}
    </aside>
  );
};
