import React from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-black text-slate-100">404 - Route Not Found</h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
        The requested operations endpoint or page could not be located in this console environment.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
      </Link>
    </div>
  );
};

