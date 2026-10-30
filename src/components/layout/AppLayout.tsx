import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>PyStudio</span>
        <span>Pythonを、もっと自由に。もっと身近に。</span>
      </footer>
    </div>
  )
}
