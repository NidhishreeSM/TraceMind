import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { StatusChip } from '../common/StatusChip';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Incident Overview';
    if (path === '/incidents') return 'Incident Registry';
    if (path === '/incidents/new') return 'Declare New Incident';
    if (path.startsWith('/incidents/')) return 'Incident Investigation';
    if (path === '/memory') return 'Hindsight Memory Explorer';
    if (path === '/analytics') return 'Operational Telemetry & Impact';
    if (path === '/') return 'TraceMind Platform';
    return 'Console';
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 backdrop-blur-md sticky top-0 z-40">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
          <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            PROD-OPS
          </span>
        </div>
      </div>

      {/* Right: Live Status Chip & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Live Status Chip from GET /api/health */}
        <StatusChip />

        {/* Quick New Incident action */}
        {location.pathname !== '/incidents/new' && (
          <Link
            to="/incidents/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-950/40 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Incident
          </Link>
        )}
      </div>
    </header>
  );
};
