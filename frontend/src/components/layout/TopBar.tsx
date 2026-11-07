import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { StatusChip } from '../common/StatusChip';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/$/, '') || '/';

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/incidents') return 'Incidents';
    if (path === '/incidents/new') return 'Declare Incident';
    if (path.startsWith('/incidents/')) return 'Incident Details';
    if (path === '/memory') return 'Memory Explorer';
    if (path === '/analytics') return 'Analytics';
    if (path === '/') return 'TraceMind';
    return 'Console';
  };

  return (
    <header className="h-14 bg-[#0A1122] border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-[#94A3B8] hover:text-[#F1F5F9] p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base font-medium text-[#F1F5F9] tracking-tight">
          {getPageTitle(currentPath)}
        </h1>
      </div>

      {/* Right: Live Status Chip & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Live Status Chip from GET /api/health */}
        <StatusChip />

        {/* Quick New Incident action: White pill button */}
        {currentPath !== '/incidents/new' && (
          <Link
            to="/incidents/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Incident
          </Link>
        )}
      </div>
    </header>
  );
};
