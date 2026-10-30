import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { EditorPage } from './pages/EditorPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
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
          <Route
            path="templates"
            element={
              <PlaceholderPage
                title="テンプレート"
                description="サンプルからすぐにPythonを始められます。"
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="設定"
                description="PyStudioの環境設定を管理できます。"
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
