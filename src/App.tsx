import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSettingsStore } from './store/settingsStore'
import { Toaster } from './components/ui/toaster'

import Dashboard from './pages/Dashboard'
import ProjectPage from './pages/ProjectPage'

import SettingsPage from './pages/SettingsPage'

function App() {
  const loadSettings = useSettingsStore((state) => state.loadSettings)
  const theme = useSettingsStore(state => state.theme)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System preference logic could go here
      document.documentElement.classList.add('dark')
    }
  }, [theme])

  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/project/:id" element={<ProjectPage />} />
        </Routes>
        <Toaster />
      </div>
    </HashRouter>
  )
}

export default App
