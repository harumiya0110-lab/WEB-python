import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  const { pathname } = useLocation()
  const isEditor = pathname.startsWith('/editor')

  return (
    <div className={`app-shell${isEditor ? ' is-editor' : ''}`}>
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
