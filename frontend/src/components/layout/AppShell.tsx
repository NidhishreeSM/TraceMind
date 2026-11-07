import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import themeBg from '../../assets/theme-bg.webp';

export const AppShell: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050B1A] text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#050B1A]/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />
        <main
          className="flex-1 overflow-y-auto bg-[#050B1A] p-4 sm:p-6 lg:p-8 bg-cover bg-fixed bg-no-repeat"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 15%, rgba(5, 11, 26, 0.72) 0%, rgba(5, 11, 26, 0.94) 80%, #050B1A 100%), url(${themeBg})`,
            backgroundPosition: 'top right',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
