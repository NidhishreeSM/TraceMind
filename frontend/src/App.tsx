import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsListPage } from './pages/IncidentsListPage';
import { CreateIncidentPage } from './pages/CreateIncidentPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { MemoryExplorerPage } from './pages/MemoryExplorerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Main App Layout */}
          <Route element={<AppShell />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/incidents" element={<IncidentsListPage />} />
            <Route path="/incidents/new" element={<CreateIncidentPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/memory" element={<MemoryExplorerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
