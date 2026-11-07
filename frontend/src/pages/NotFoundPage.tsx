import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-[#131C31] border border-white/[0.07] flex items-center justify-center text-[#F1F5F9]">
        <AlertOctagon className="w-7 h-7 text-[#EF4444]" />
      </div>
      <h2 className="text-2xl font-light tracking-wide text-[#F1F5F9]">404 - Route Not Found</h2>
      <p className="text-xs sm:text-sm text-[#94A3B8] max-w-sm leading-relaxed">
        The requested operations endpoint or page could not be located in this console environment.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#C9D6EA] text-[#080E1D] text-xs font-semibold transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
      </Link>
    </div>
  );
};
