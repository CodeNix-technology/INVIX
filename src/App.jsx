import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './store/auth'
import { useData } from './store/data'
import { useUI } from './store/ui'
import Shell from './components/layout/Shell'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import AnalyticsPage from './pages/AnalyticsPage'
import InvoicesPage from './pages/InvoicesPage'
import BuilderPage from './pages/BuilderPage'
import TemplatesGalleryPage from './pages/TemplatesGalleryPage'
import TemplatePreviewPage from './pages/TemplatePreviewPage'
import ClientsPage from './pages/ClientsPage'
import ItemsPage from './pages/ItemsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import SharedInvoicePage from './pages/SharedInvoicePage'
import { Toasts, EmptyState, Button } from './components/ui'
import { IconCompass } from './components/icons'
import { applyTheme } from './store/ui'
import { startAutoSync } from './services/autoSync'
import { Link } from 'react-router-dom'

function Boot({ children }) {
  const dataLoaded = useData((s) => s.loaded)
  const authInit = useAuth((s) => s.initialized)

  useEffect(() => {
    applyTheme(useUI.getState().theme)
    useAuth.getState().init()
    useData.getState().loadLocal()
    startAutoSync()
  }, [])

  if (!dataLoaded || !authInit) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 bg-surface dark:bg-slate-950">
        <div className="hud-label animate-pulse text-brand-500">INVIX / BOOTING</div>
        <div className="h-1 w-40 overflow-hidden bg-surface-container dark:bg-slate-800">
          <div className="h-full w-1/2 animate-pulse bg-brand-500" />
        </div>
      </div>
    )
  }
  return children
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        icon={IconCompass}
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={<Link to="/dashboard"><Button>Back to dashboard</Button></Link>}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Boot>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/share/:shareId" element={<SharedInvoicePage />} />
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/builder/:id" element={<BuilderPage />} />
            <Route path="/templates" element={<TemplatesGalleryPage />} />
            <Route path="/templates/:templateId" element={<TemplatePreviewPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toasts />
      </Boot>
    </BrowserRouter>
  )
}
