import {
  Code2,
  FolderKanban,
  House,
  Moon,
  PanelsTopLeft,
  Settings,
  Sun,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'

const navigation = [
  { to: '/', label: 'ホーム', icon: House, end: true },
  { to: '/editor/', label: 'エディター', icon: Code2 },
  { to: '/projects', label: 'プロジェクト', icon: FolderKanban },
  { to: '/templates', label: 'テンプレート', icon: PanelsTopLeft },
  { to: '/settings', label: '設定', icon: Settings },
]

export function AppHeader() {
  const theme = useSettingsStore((state) => state.theme)
  const toggleTheme = useSettingsStore((state) => state.toggleTheme)

  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink className="brand" to="/" aria-label="PyStudio ホーム">
          <span className="brand-mark" aria-hidden="true">
            <Code2 size={20} strokeWidth={2.4} />
          </span>
          <span className="brand-name">PyStudio</span>
        </NavLink>

        <nav className="primary-nav" aria-label="メインナビゲーション">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          className="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`テーマを${theme === 'light' ? 'ダーク' : 'ライト'}に切り替える`}
          title={`テーマ: ${theme === 'light' ? 'ライト' : 'ダーク'}`}
        >
          {theme === 'light' ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}
