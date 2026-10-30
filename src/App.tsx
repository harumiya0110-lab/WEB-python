import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { EditorPage } from './pages/EditorPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { SettingsPage } from './pages/SettingsPage'
import { useSettingsStore } from './store/settingsStore'
import './App.css'

function AppRoutes() {
  const theme = useSettingsStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="editor/:projectId?" element={<EditorPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
