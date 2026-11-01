import {
  Check,
  Columns3,
  Database,
  FolderTree,
  LayoutDashboard,
  Moon,
  RotateCcw,
  Sun,
  Terminal,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_SETTINGS, sanitizeSettings, useSettingsStore } from '../store/settingsStore'
import type { SettingsValues, Theme } from '../store/settingsStore'

type LayoutKey = 'sidebarWidth' | 'previewWidth' | 'terminalHeight'
type ResetScope = 'editor' | 'all'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const layoutPresets = [
  {
    id: 'standard',
    name: '標準',
    description: '一般的なプログラミング作業に適したバランスのよい配置です。',
    values: { sidebarWidth: 228, previewWidth: 290, terminalHeight: 208 },
  },
  {
    id: 'coding',
    name: 'コード集中',
    description: 'コードを書く領域をできるだけ広く使いたい場合に適しています。',
    values: { sidebarWidth: 180, previewWidth: 220, terminalHeight: 140 },
  },
  {
    id: 'analysis',
    name: '分析・実行重視',
    description: '実行結果やグラフ、データを確認しながら作業したい場合に適しています。',
    values: { sidebarWidth: 260, previewWidth: 420, terminalHeight: 300 },
  },
] as const

const settingKeys = Object.keys(DEFAULT_SETTINGS) as (keyof SettingsValues)[]

function sameSettings(left: SettingsValues, right: SettingsValues): boolean {
  return settingKeys.every((key) => left[key] === right[key])
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
}: {
  id: string
  label: string
  description: string
  min: number
  max: number
  value: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="settings-range">
      <div className="settings-range-copy">
        <label htmlFor={id}>{label}</label>
        <span>{description}</span>
      </div>
      <div className="settings-range-control">
        <div className="settings-range-labels"><span>{min}{unit}</span><span>{max}{unit}</span></div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-valuetext={`${value}${unit}`}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <output htmlFor={id}>{value}{unit}</output>
      </div>
    </div>
  )
}

function ToggleSetting({
  id,
  label,
  description,
  checked,
  icon,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  icon?: ReactNode
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="settings-toggle-row">
      {icon && <span className="settings-toggle-icon" aria-hidden="true">{icon}</span>}
      <label className="settings-toggle-copy" htmlFor={id}>
        <strong>{label}</strong>
        <span>{description}</span>
      </label>
      <span className={`settings-toggle-state${checked ? ' is-on' : ''}`} aria-hidden="true">
        {checked ? 'ON' : 'OFF'}
      </span>
      <label className="settings-switch" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          aria-label={`${label}を表示`}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="settings-toggle-track" aria-hidden="true" />
      </label>
    </div>
  )
}

function CardHeading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="settings-card-heading">
      <span className="settings-card-icon" aria-hidden="true">{icon}</span>
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <span className={`settings-theme-preview is-${theme}`} aria-hidden="true">
      <span className="settings-preview-topbar"><i /><i /><i /></span>
      <span className="settings-preview-window">
        <span className="settings-preview-sidebar"><i /><i /><i /></span>
        <span className="settings-preview-editor">
          <i /><i /><i /><b />
        </span>
      </span>
    </span>
  )
}

function LayoutPreview({
  sidebarWidth,
  previewWidth,
  terminalHeight,
  showSidebar,
  showPreview,
  showTerminal,
}: {
  sidebarWidth: number
  previewWidth: number
  terminalHeight: number
  showSidebar: boolean
  showPreview: boolean
  showTerminal: boolean
}) {
  const sidebarPercent = Math.max(14, Math.min(31, 14 + (sidebarWidth - 170) / 250 * 17))
  const previewPercent = Math.max(19, Math.min(40, 19 + (previewWidth - 220) / 260 * 21))
  const terminalPercent = Math.max(25, Math.min(58, 25 + (terminalHeight - 120) / 360 * 33))

  return (
    <div className="settings-layout-preview" role="img" aria-label="現在のエディター配置プレビュー">
      {showSidebar && (
        <div className="settings-layout-sidebar" style={{ width: `${sidebarPercent}%` }}>
          <span><FolderTree size={12} /> ファイル一覧</span><i /><i /><i />
        </div>
      )}
      <div className="settings-layout-center">
        <div className="settings-layout-code">
          <span><Columns3 size={12} /> コード</span><i /><i /><i /><b />
        </div>
        {showTerminal && (
          <div className="settings-layout-terminal" style={{ height: `${terminalPercent}%` }}>
            <span><Terminal size={12} /> ターミナル</span>
          </div>
        )}
      </div>
      {showPreview && (
        <div className="settings-layout-preview-panel" style={{ width: `${previewPercent}%` }}>
          <span><LayoutDashboard size={12} /> プレビュー</span><i /><i />
        </div>
      )}
    </div>
  )
}

function readPersistedSettings(): SettingsValues {
  const raw = window.localStorage.getItem('pystudio-settings')
  if (!raw) throw new Error('設定がブラウザーに保存されていません。')
  const persisted: unknown = JSON.parse(raw)
  if (typeof persisted !== 'object' || persisted === null || !('state' in persisted)) {
    throw new Error('保存された設定を確認できません。')
  }
  return sanitizeSettings(persisted.state)
}

export function SettingsPage() {
  const settings = useSettingsStore()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [resetScope, setResetScope] = useState<ResetScope | null>(null)
  const [resetMessage, setResetMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let timer = 0
    const unsubscribe = useSettingsStore.subscribe((state, previousState) => {
      if (sameSettings(state, previousState)) return
      setSaveState('saving')
      setSaveError('')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        try {
          if (!sameSettings(readPersistedSettings(), useSettingsStore.getState())) {
            throw new Error('保存内容が現在の設定と一致しません。')
          }
          setSaveState('saved')
        } catch (error) {
          setSaveState('error')
          setSaveError(error instanceof Error ? error.message : 'ブラウザーに設定を保存できませんでした。')
        }
      }, 0)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (resetScope) dialogRef.current?.showModal()
  }, [resetScope])

  const updateSettings = (update: () => void): boolean => {
    setResetMessage('')
    try {
      update()
      return true
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : '設定を保存できませんでした。')
      return false
    }
  }

  const changeLayout = (key: LayoutKey, value: number) => {
    updateSettings(() => settings.setLayout({ [key]: value }))
  }

  const selectedPreset = layoutPresets.find(({ values }) =>
    settings.sidebarWidth === values.sidebarWidth
    && settings.previewWidth === values.previewWidth
    && settings.terminalHeight === values.terminalHeight,
  )

  const closeResetDialog = () => {
    dialogRef.current?.close()
    setResetScope(null)
  }

  const applyReset = () => {
    if (!resetScope) return
    if (!updateSettings(() => settings.resetSettings(resetScope))) return
    setResetMessage('設定を初期状態に戻しました。')
    closeResetDialog()
  }

  return (
    <section className="settings-page">
      <header className="settings-page-heading">
        <span className="section-kicker">PERSONALIZE YOUR WORKSPACE</span>
        <h1>設定</h1>
        <p>画面やエディターの使い方を調整し、作業しやすい環境をつくりましょう。</p>
        <div className={`settings-save-status is-${saveState}`} role="status" aria-live="polite">
          {saveState === 'saving' && '変更を保存しています…'}
          {saveState === 'saved' && <><Check size={15} aria-hidden="true" /> 保存しました</>}
          {saveState === 'error' && <><X size={15} aria-hidden="true" /> 保存できませんでした: {saveError}</>}
        </div>
        {resetMessage && <p className="settings-reset-success" role="status">{resetMessage}</p>}
      </header>

      <div className="settings-sections">
        <section className="settings-card" aria-labelledby="settings-appearance-title">
          <CardHeading
            eyebrow="APPEARANCE"
            title="外観"
            description="画面全体の色合いを選びます。変更はすぐに反映されます。"
            icon={<Sun size={20} />}
          />
          <h3 className="settings-field-title">テーマ</h3>
          <div className="settings-theme-options" role="group" aria-label="テーマ">
            <button
              type="button"
              className={`settings-theme-card${settings.theme === 'light' ? ' is-selected' : ''}`}
              aria-pressed={settings.theme === 'light'}
              onClick={() => updateSettings(() => settings.setTheme('light'))}
            >
              <ThemePreview theme="light" />
              <span className="settings-theme-card-copy">
                <strong><Sun size={16} aria-hidden="true" /> ライト</strong>
                <span>明るく、すっきりとした画面で作業できます。</span>
              </span>
              <span className="settings-theme-selected">
                {settings.theme === 'light' ? <><Check size={14} /> 使用中</> : '選択する'}
              </span>
            </button>
            <button
              type="button"
              className={`settings-theme-card${settings.theme === 'dark' ? ' is-selected' : ''}`}
              aria-pressed={settings.theme === 'dark'}
              onClick={() => updateSettings(() => settings.setTheme('dark'))}
            >
              <ThemePreview theme="dark" />
              <span className="settings-theme-card-copy">
                <strong><Moon size={16} aria-hidden="true" /> ダーク</strong>
                <span>暗い背景で落ち着いて作業できます。</span>
              </span>
              <span className="settings-theme-selected">
                {settings.theme === 'dark' ? <><Check size={14} /> 使用中</> : '選択する'}
              </span>
            </button>
          </div>
          <p className="settings-note">テーマは画面全体に反映され、次回アクセス時にも選択した状態が保持されます。</p>
        </section>

        <section className="settings-card" aria-labelledby="settings-editor-title">
          <CardHeading
            eyebrow="EDITOR"
            title="エディター"
            description="文字の大きさやコードの見え方を調整できます。見本は設定に合わせて変わります。"
            icon={<Columns3 size={20} />}
          />
          <RangeSetting
            id="settings-font-size"
            label="エディターの文字サイズ"
            description="コードの読みやすさに合わせて調整します。"
            min={11}
            max={24}
            value={settings.fontSize}
            onChange={(fontSize) => updateSettings(() => settings.setEditorSettings({ fontSize }))}
          />
          <div className="settings-code-preview" aria-label={`文字サイズのプレビュー、${settings.fontSize}px`}>
            <div className="settings-code-preview-toolbar"><span>main.py</span><span>{settings.fontSize}px</span></div>
            <pre style={{ fontSize: `${settings.fontSize}px` }}><code><span className="settings-code-muted">name</span> = <span className="settings-code-string">"PyStudio"</span>{'\n'}print(<span className="settings-code-string">"Hello"</span>, name)</code></pre>
          </div>

          <div className="settings-divider" />
          <ToggleSetting
            id="settings-minimap"
            label="ミニマップ"
            description="コード全体を右端に縮小表示し、長いプログラムの構成を見渡せます。"
            checked={settings.showMinimap}
            onChange={(showMinimap) => updateSettings(() => settings.setEditorSettings({ showMinimap }))}
          />
          <div className={`settings-minimap-preview${settings.showMinimap ? ' is-enabled' : ''}`} aria-label={`ミニマップ ${settings.showMinimap ? 'ON' : 'OFF'}のプレビュー`}>
            <div className="settings-minimap-code"><i /><i /><i /><i /><i /><i /></div>
            {settings.showMinimap && <div className="settings-minimap-map"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>}
            <span>{settings.showMinimap ? '右端にコード全体を表示' : 'コード領域を広く表示'}</span>
          </div>

          <div className="settings-divider" />
          <ToggleSetting
            id="settings-word-wrap"
            label="コードの折り返し"
            description="長いコードをエディターの横幅に合わせて折り返します。"
            checked={settings.wordWrap === 'on'}
            onChange={(enabled) => updateSettings(() => settings.setEditorSettings({ wordWrap: enabled ? 'on' : 'off' }))}
          />
          <div className={`settings-wrap-preview${settings.wordWrap === 'on' ? ' is-wrapped' : ''}`} aria-label={`コードの折り返し ${settings.wordWrap === 'on' ? 'ON' : 'OFF'}のプレビュー`}>
            <code>print("PyStudioでPythonを楽しく学ぼう")</code>
            <span>{settings.wordWrap === 'on' ? '長い行を折り返します' : '長い行は横に続きます'}</span>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="settings-layout-title">
          <CardHeading
            eyebrow="PANELS & LAYOUT"
            title="パネル・レイアウト"
            description="エディターを開いたときのパネル表示と、各領域の大きさを設定します。"
            icon={<LayoutDashboard size={20} />}
          />
          <h3 className="settings-field-title">パネルの初期表示</h3>
          <p className="settings-subheading">ここでの設定はエディターを開いたときの表示です。実行時は必要に応じてターミナルが開きます。</p>
          <div className="settings-panel-options">
            <ToggleSetting
              id="settings-sidebar"
              label="ファイル一覧"
              description="プロジェクト内のファイルやフォルダーを表示します。"
              checked={settings.showSidebar}
              icon={<FolderTree size={19} />}
              onChange={(showSidebar) => updateSettings(() => settings.setPanelVisibility({ showSidebar }))}
            />
            <ToggleSetting
              id="settings-terminal"
              label="実行ターミナル"
              description="Pythonの実行結果やエラーメッセージを表示します。"
              checked={settings.showTerminal}
              icon={<Terminal size={19} />}
              onChange={(showTerminal) => updateSettings(() => settings.setPanelVisibility({ showTerminal }))}
            />
            <ToggleSetting
              id="settings-preview"
              label="実行情報・プレビュー"
              description="Pythonの実行状態、グラフ、その他の情報を確認できます。"
              checked={settings.showPreview}
              icon={<LayoutDashboard size={19} />}
              onChange={(showPreview) => updateSettings(() => settings.setPanelVisibility({ showPreview }))}
            />
          </div>
          <LayoutPreview
            sidebarWidth={settings.sidebarWidth}
            previewWidth={settings.previewWidth}
            terminalHeight={settings.terminalHeight}
            showSidebar={settings.showSidebar}
            showPreview={settings.showPreview}
            showTerminal={settings.showTerminal}
          />

          <div className="settings-layout-heading">
            <div>
              <h3 className="settings-field-title">レイアウト</h3>
              <p className="settings-subheading">スライダーで細かく調整できます。エディター内のドラッグ調整もここに反映されます。</p>
            </div>
            <span className="settings-preset-current">{selectedPreset?.name ?? 'カスタム'}</span>
          </div>
          <div className="settings-preset-grid" role="group" aria-label="レイアウトプリセット">
            {layoutPresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`settings-preset${selectedPreset?.id === preset.id ? ' is-selected' : ''}`}
                aria-pressed={selectedPreset?.id === preset.id}
                onClick={() => updateSettings(() => settings.setLayout(preset.values))}
              >
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
                <small>{preset.values.sidebarWidth}px · {preset.values.previewWidth}px · {preset.values.terminalHeight}px</small>
              </button>
            ))}
          </div>
          <div className="settings-divider" />
          <RangeSetting
            id="settings-sidebar-width"
            label="ファイル一覧の幅"
            description="ファイル名やフォルダー名を確認しやすい幅にします。"
            min={170}
            max={420}
            value={settings.sidebarWidth}
            onChange={(value) => changeLayout('sidebarWidth', value)}
          />
          <div className="settings-divider" />
          <RangeSetting
            id="settings-preview-width"
            label="プレビューの幅"
            description="実行情報やグラフを確認する領域の幅を調整します。"
            min={220}
            max={480}
            value={settings.previewWidth}
            onChange={(value) => changeLayout('previewWidth', value)}
          />
          <div className="settings-divider" />
          <RangeSetting
            id="settings-terminal-height"
            label="ターミナルの高さ"
            description="実行結果やエラーを確認する領域の高さを調整します。"
            min={120}
            max={480}
            value={settings.terminalHeight}
            onChange={(value) => changeLayout('terminalHeight', value)}
          />
        </section>

        <section className="settings-card settings-reset-card" aria-labelledby="settings-reset-title">
          <CardHeading
            eyebrow="RESET"
            title="設定の初期化"
            description="設定だけを初期状態に戻します。保存したプロジェクトや学習データは削除されません。"
            icon={<RotateCcw size={20} />}
          />
          <div className="settings-reset-option">
            <div>
              <strong>エディター設定を初期化</strong>
              <p>文字サイズ、ミニマップ、折り返し、パネル表示、各領域の幅・高さを戻します。テーマは変更しません。</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setResetScope('editor')}>
              エディター設定を初期化
            </button>
          </div>
          <div className="settings-divider" />
          <div className="settings-reset-option">
            <div>
              <strong>すべての設定を初期化</strong>
              <p>テーマ・エディター・レイアウトの設定をすべて戻します。</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => setResetScope('all')}>
              すべての設定を初期化
            </button>
          </div>
          <p className="settings-reset-warning">この操作を行っても、プロジェクト、テンプレート、学習データなどの保存内容は削除されません。</p>
          <div className="settings-storage-details">
            <div className="settings-storage-title"><Database size={16} aria-hidden="true" /><strong>データの保存について</strong></div>
            <p>プロジェクト・マイテンプレート・お気に入りはIndexedDBに、テーマやエディター設定はlocalStorageに保存されます。</p>
            <p>データは利用中のブラウザーに保存されます。ブラウザーのデータを消去すると、保存データが失われる場合があります。</p>
            <p>バックアップにはプロジェクト、マイテンプレート、お気に入りが含まれます。テーマやエディター設定はバックアップに含まれません。</p>
            <Link className="settings-projects-link" to="/projects">プロジェクトとバックアップを管理する</Link>
          </div>
        </section>
      </div>

      <dialog
        ref={dialogRef}
        className="settings-reset-dialog"
        aria-labelledby="settings-reset-dialog-title"
        onCancel={(event) => {
          event.preventDefault()
          closeResetDialog()
        }}
        onClose={() => {
          setResetScope(null)
        }}
      >
        {resetScope && (
          <>
            <h2 id="settings-reset-dialog-title">
              {resetScope === 'editor' ? 'エディター設定を初期化しますか？' : 'すべての設定を初期化しますか？'}
            </h2>
            <p>以下の設定を初期状態に戻します。</p>
            <ul>
              {(resetScope === 'editor'
                ? ['エディターの文字サイズ', 'ミニマップ', 'コードの折り返し', 'ファイル一覧・プレビュー・ターミナルの表示状態', 'ファイル一覧の幅・プレビューの幅・ターミナルの高さ']
                : ['ライト・ダークテーマ', 'エディターの文字サイズ', 'ミニマップ', 'コードの折り返し', '各パネルの表示状態と幅・高さ']
              ).map((item) => <li key={item}>{item}</li>)}
            </ul>
            {resetScope === 'all' && (
              <p className="settings-dialog-warning">この操作を行っても、プロジェクトやテンプレート、学習データなどの保存内容は削除されません。</p>
            )}
            <div className="settings-dialog-actions">
              <button type="button" className="secondary-button" autoFocus onClick={closeResetDialog}>キャンセル</button>
              <button type="button" className="settings-reset-confirm" onClick={applyReset}>
                {resetScope === 'editor' ? '初期化する' : 'すべて初期化する'}
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  )
}
