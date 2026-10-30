import { Database, Moon, RotateCcw, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'

interface RangeSettingProps {
  id: string
  label: string
  description: string
  min: number
  max: number
  value: number
  unit?: string
  onChange: (value: number) => void
}

function RangeSetting({
  id,
  label,
  description,
  min,
  max,
  value,
  unit = 'px',
  onChange,
}: RangeSettingProps) {
  return (
    <div className="settings-range">
      <div className="settings-range-copy">
        <label htmlFor={id}>{label}</label>
        <span>{description}</span>
      </div>
      <div className="settings-range-control">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <output htmlFor={id}>{value}{unit}</output>
      </div>
    </div>
  )
}

interface ToggleSettingProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSetting({ id, label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <label className="settings-toggle" htmlFor={id}>
      <span className="settings-toggle-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="settings-toggle-track" aria-hidden="true" />
    </label>
  )
}

export function SettingsPage() {
  const settings = useSettingsStore()
  const changeLayout = (key: 'sidebarWidth' | 'previewWidth' | 'terminalHeight', value: number) => {
    settings.setLayout({ [key]: value })
  }

  const resetEditorSettings = () => {
    if (!window.confirm('エディターの表示・レイアウト設定を初期状態に戻しますか？')) return
    settings.resetSettings('editor')
  }

  const resetAllSettings = () => {
    if (!window.confirm('テーマを含むすべての設定を初期状態に戻しますか？プロジェクトなどの保存データは削除されません。')) return
    settings.resetSettings('all')
  }

  return (
    <section className="settings-page">
      <header className="settings-page-heading">
        <span className="section-kicker">PERSONALIZE YOUR WORKSPACE</span>
        <h1>設定</h1>
        <p>PyStudioの見た目やエディターの動作を、自分に合わせて変更できます。</p>
      </header>

      <div className="settings-sections">
        <section className="settings-card" aria-labelledby="settings-appearance-title">
          <div className="settings-card-heading">
            <div>
              <span className="section-kicker">APPEARANCE</span>
              <h2 id="settings-appearance-title">外観</h2>
            </div>
          </div>
          <div className="settings-field">
            <div className="settings-field-copy">
              <strong>テーマ</strong>
              <span>画面全体の色合いを切り替えます。</span>
            </div>
            <div className="settings-theme-options" role="group" aria-label="テーマ">
              <button
                type="button"
                className={settings.theme === 'light' ? 'is-selected' : ''}
                aria-pressed={settings.theme === 'light'}
                onClick={() => settings.setTheme('light')}
              >
                <Sun size={17} aria-hidden="true" /> ライト
              </button>
              <button
                type="button"
                className={settings.theme === 'dark' ? 'is-selected' : ''}
                aria-pressed={settings.theme === 'dark'}
                onClick={() => settings.setTheme('dark')}
              >
                <Moon size={17} aria-hidden="true" /> ダーク
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="settings-editor-title">
          <div className="settings-card-heading">
            <div>
              <span className="section-kicker">EDITOR</span>
              <h2 id="settings-editor-title">エディター</h2>
            </div>
          </div>
          <RangeSetting
            id="settings-font-size"
            label="エディターの文字サイズ"
            description="コードの読みやすさに合わせて調整します。"
            min={11}
            max={24}
            value={settings.fontSize}
            unit="px"
            onChange={(fontSize) => settings.setEditorSettings({ fontSize })}
          />
          <div className="settings-divider" />
          <ToggleSetting
            id="settings-minimap"
            label="ミニマップ"
            description="コード全体を縮小表示します。"
            checked={settings.showMinimap}
            onChange={(showMinimap) => settings.setEditorSettings({ showMinimap })}
          />
          <div className="settings-divider" />
          <ToggleSetting
            id="settings-word-wrap"
            label="コードの折り返し"
            description="画面の横幅に合わせて長いコードを折り返します。"
            checked={settings.wordWrap === 'on'}
            onChange={(enabled) => settings.setEditorSettings({ wordWrap: enabled ? 'on' : 'off' })}
          />
          <div className="settings-divider" />
          <div className="settings-field settings-panels-field">
            <div className="settings-field-copy">
              <strong>初期表示するパネル</strong>
              <span>エディターを開いたときに表示する領域を選びます。</span>
            </div>
            <div className="settings-panel-options">
              <ToggleSetting
                id="settings-sidebar"
                label="ファイル一覧"
                description="プロジェクト内のファイルやフォルダーを表示します。"
                checked={settings.showSidebar}
                onChange={(showSidebar) => settings.setPanelVisibility({ showSidebar })}
              />
              <ToggleSetting
                id="settings-terminal"
                label="実行ターミナル"
                description="Pythonの出力やエラーを表示します。"
                checked={settings.showTerminal}
                onChange={(showTerminal) => settings.setPanelVisibility({ showTerminal })}
              />
              <ToggleSetting
                id="settings-preview"
                label="実行情報・プレビュー"
                description="Pythonの実行状態やグラフを確認できます。"
                checked={settings.showPreview}
                onChange={(showPreview) => settings.setPanelVisibility({ showPreview })}
              />
            </div>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="settings-layout-title">
          <div className="settings-card-heading">
            <div>
              <span className="section-kicker">LAYOUT</span>
              <h2 id="settings-layout-title">エディターのレイアウト</h2>
            </div>
            <p>スライダーで幅や高さを調整できます。エディター内のドラッグ調整も保存されます。</p>
          </div>
          <RangeSetting
            id="settings-sidebar-width"
            label="ファイル一覧の幅"
            description="ファイル名を確認しやすい幅にします。"
            min={170}
            max={420}
            value={settings.sidebarWidth}
            onChange={(value) => changeLayout('sidebarWidth', value)}
          />
          <div className="settings-divider" />
          <RangeSetting
            id="settings-preview-width"
            label="プレビューの幅"
            description="実行情報パネルの表示幅を調整します。"
            min={220}
            max={480}
            value={settings.previewWidth}
            onChange={(value) => changeLayout('previewWidth', value)}
          />
          <div className="settings-divider" />
          <RangeSetting
            id="settings-terminal-height"
            label="ターミナルの高さ"
            description="実行結果を確認する領域の高さを調整します。"
            min={120}
            max={480}
            value={settings.terminalHeight}
            onChange={(value) => changeLayout('terminalHeight', value)}
          />
          <div className="settings-reset-actions">
            <button type="button" className="secondary-button" onClick={resetEditorSettings}>
              <RotateCcw size={15} aria-hidden="true" /> エディター設定を初期化
            </button>
          </div>
        </section>

        <section className="settings-card settings-storage-card" aria-labelledby="settings-storage-title">
          <div className="settings-card-heading">
            <div>
              <span className="section-kicker">YOUR DATA</span>
              <h2 id="settings-storage-title">データの保存について</h2>
            </div>
            <Database size={20} aria-hidden="true" />
          </div>
          <p>プロジェクト・マイテンプレート・お気に入りはIndexedDBに、テーマやエディターの設定はlocalStorageに保存されます。</p>
          <p className="settings-storage-notice">現在のデータは利用中のブラウザーに保存されます。ブラウザーのデータを消去すると、保存データが失われる場合があります。</p>
          <p>バックアップにはプロジェクト、マイテンプレート、お気に入りが含まれます。テーマやエディター設定はバックアップに含まれません。</p>
          <Link className="settings-projects-link" to="/projects">プロジェクトとバックアップを管理する</Link>
        </section>
      </div>

      <div className="settings-reset-all">
        <p>初期化してもプロジェクト、マイテンプレート、お気に入りは削除されません。</p>
        <button type="button" className="secondary-button" onClick={resetAllSettings}>
          <RotateCcw size={15} aria-hidden="true" /> すべての設定を初期化
        </button>
      </div>
    </section>
  )
}
