import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout';
import {
  DashboardPage,
  LeadsPage,
  LeadDetailsPage,
  LeadScoringPage,
  WebsiteAnalysisPage,
  FollowUpsPage,
  LeadHistoryPage,
  AnalyticsPage,
  ServicesPage,
  SettingsPage,
} from './pages';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailsPage />} />
          <Route path="/lead-scoring" element={<LeadScoringPage />} />
          <Route path="/website-analysis" element={<WebsiteAnalysisPage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/lead-history" element={<LeadHistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
