import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showTagline = false,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* TraceMind Neural Ops Node SVG Logo */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(20,184,166,0.35)]"
        >
          {/* Hexagonal Shield */}
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            className="fill-slate-900 stroke-teal-500/80"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Inner Neural Pulse Matrix */}
          <circle cx="20" cy="20" r="4.5" className="fill-teal-400" />
          <line x1="20" y1="9" x2="20" y2="15.5" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="20" y1="24.5" x2="20" y2="31" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="10" y1="14.5" x2="16.5" y2="18" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="23.5" y1="22" x2="30" y2="25.5" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="30" y1="14.5" x2="23.5" y2="18" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="16.5" y1="22" x2="10" y2="25.5" className="stroke-teal-400/90" strokeWidth="1.75" strokeLinecap="round" />
          {/* Synapse Nodes */}
          <circle cx="20" cy="9" r="1.5" className="fill-teal-300" />
          <circle cx="20" cy="31" r="1.5" className="fill-teal-300" />
          <circle cx="10" cy="14.5" r="1.5" className="fill-teal-300" />
          <circle cx="30" cy="25.5" r="1.5" className="fill-teal-300" />
          <circle cx="30" cy="14.5" r="1.5" className="fill-teal-300" />
          <circle cx="10" cy="25.5" r="1.5" className="fill-teal-300" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`text-slate-100 font-bold ${textSizes[size]}`}>
            Trace<span className="text-teal-400">Mind</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400/80 bg-teal-950/80 border border-teal-800/60 px-1.5 py-0.5 rounded">
            OPS AI
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-slate-400 font-medium">
            Every incident teaches. Every resolution makes us smarter.
          </span>
        )}
      </div>
    </div>
  );
};

