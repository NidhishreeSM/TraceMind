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
    <aside className="w-64 bg-[#0B1530] border-r border-white/10 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10">
        <Link to="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Sidebar navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#8FA0BF] font-mono">
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
                  ? 'bg-[#101C3D] text-white border border-white/20 shadow-xs'
                  : 'text-[#8FA0BF] hover:text-white hover:bg-[#101C3D]/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-[#C9D6EA]" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#8FA0BF] font-mono">
          Overview
        </div>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#8FA0BF] hover:text-white hover:bg-[#101C3D]/50 border border-transparent transition"
        >
          <Cpu className="w-4 h-4 shrink-0 text-[#C9D6EA]" />
          <span>About TraceMind</span>
        </Link>
      </nav>

      {/* Mock Indicator (if active) */}
      {USE_MOCKS && (
        <div className="mx-3 mb-3 p-2.5 rounded-xl bg-[#101C3D] border border-white/10 text-[11px] text-[#C9D6EA]">
          <div className="font-medium flex items-center gap-1.5 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Dev Mock Active
          </div>
          <p className="text-[10px] text-[#8FA0BF] mt-0.5 font-mono">
            VITE_USE_MOCKS=true
          </p>
        </div>
      )}
    </aside>
  );
};
