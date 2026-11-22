import { lazy, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './auth/AuthProvider'
import { MainLayout } from './components/layout/MainLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages'
import { DataProvider } from './store/DataProvider'

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'))
const LeadDetailsPage = lazy(() => import('./pages/LeadDetailsPage'))
const LeadFormPage = lazy(() => import('./pages/LeadFormPage'))
const LeadHistoryPage = lazy(() => import('./pages/LeadHistoryPage'))
const LeadScoringPage = lazy(() => import('./pages/LeadScoringPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WebsiteAnalysisPage = lazy(() => import('./pages/WebsiteAnalysisPage'))
const ImportLeadsPage = lazy(() => import('./pages/ImportLeadsPage'))

/** Re-mount lead pages when the id changes so their local state (notes, form) resets. */
function Keyed({ page: Page }: { page: ComponentType }) {
  const { id = 'new' } = useParams()
  return <Page key={id} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route index element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <RequireAuth>
                  <MainLayout />
                </RequireAuth>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/new" element={<LeadFormPage />} />
              <Route path="leads/import" element={<ImportLeadsPage />} />
              <Route path="leads/:id" element={<Keyed page={LeadDetailsPage} />} />
              <Route path="leads/:id/edit" element={<Keyed page={LeadFormPage} />} />
              <Route path="lead-scoring" element={<LeadScoringPage />} />
              <Route path="website-analysis" element={<WebsiteAnalysisPage />} />
              <Route path="follow-ups" element={<FollowUpsPage />} />
              <Route path="lead-history" element={<LeadHistoryPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
