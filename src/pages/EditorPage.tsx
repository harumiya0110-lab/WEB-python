import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  FileCode2,
  FilePlus2,
  FolderPlus,
  FolderTree,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Square,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { editor as Monaco } from 'monaco-editor'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { usePythonRuntime } from '../hooks/usePythonRuntime'
import { loadProject, saveProject } from '../services/localProjectService'
import { createDefaultProject, useProjectStore } from '../store/projectStore'
import { useSettingsStore } from '../store/settingsStore'
import { isValidProjectPath } from '../types/project'

type TerminalTab = 'output' | 'errors'
type FileDialogState =
  | { kind: 'file'; initialValue: string }
  | { kind: 'folder'; initialValue: string }
  | { kind: 'rename'; path: string; initialValue: string }

const projectSaveTimers = new Map<string, number>()

const fileLanguage = (path: string): string => {
  const extension = path.split('.').pop()?.toLowerCase()
  const languages: Record<string, string> = {
    py: 'python',
    pyw: 'python',
    txt: 'plaintext',
    md: 'markdown',
    json: 'json',
    csv: 'plaintext',
    html: 'html',
    css: 'css',
    js: 'javascript',
    ts: 'typescript',
  }
  return languages[extension ?? ''] ?? 'plaintext'
}

const beginnerSamples = [
  { title: 'Hello World', category: '基本', code: 'print("Hello, world!")\n' },
  { title: '変数', category: '基本', code: 'name = "PyStudio"\ncount = 3\nprint(f"{name}: {count}")\n' },
  { title: '条件分岐', category: '制御構文', code: 'score = 82\nif score >= 80:\n    print("合格です")\nelse:\n    print("もう少しです")\n' },
  { title: 'for文', category: '制御構文', code: 'for number in range(1, 6):\n    print(number)\n' },
  { title: 'while文', category: '制御構文', code: 'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("スタート!")\n' },
  { title: '関数', category: '基本', code: 'def greet(name):\n    return f"こんにちは、{name}さん"\n\nprint(greet("Python"))\n' },
  { title: 'リスト', category: 'データ', code: 'fruits = ["りんご", "みかん", "ぶどう"]\nfruits.append("もも")\nfor fruit in fruits:\n    print(fruit)\n' },
  { title: '辞書', category: 'データ', code: 'profile = {"name": "Aoi", "level": "beginner"}\nfor key, value in profile.items():\n    print(f"{key}: {value}")\n' },
  { title: 'クラス', category: '基本', code: 'class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        print(f"{self.name}: ワン!")\n\nDog("ポチ").speak()\n' },
  { title: 'ファイル操作', category: '応用', code: 'with open("sample.txt", "w", encoding="utf-8") as file:\n    file.write("PyStudioから保存しました")\n\nwith open("sample.txt", encoding="utf-8") as file:\n    print(file.read())\n' },
  { title: 'グラフ作成', category: '応用', code: 'import matplotlib.pyplot as plt\n\nx = [1, 2, 3, 4, 5]\ny = [2, 4, 6, 8, 10]\nplt.plot(x, y)\nplt.title("Sample chart")\nplt.show()\n' },
  { title: 'pandas基本操作', category: '応用', code: 'import pandas as pd\n\ndata = {"name": ["Aoi", "Ren"], "score": [85, 92]}\ndf = pd.DataFrame(data)\nprint(df)\n' },
]

function hasFilePathConflict(
  path: string,
  files: Record<string, string>,
  directories: string[],
): boolean {
  return (
    Object.keys(files).some(
      (existing) =>
        existing === path ||
        existing.startsWith(`${path}/`) ||
        path.startsWith(`${existing}/`),
    ) || directories.includes(path)
  )
}

function errorDetails(
  text: string,
  fallbackFile: string,
): { file: string; line: number | null; explanation: string } {
  const frames = [...text.matchAll(/File "([^"]+)", line (\d+)/g)]
  const match = frames.at(-1)
  let explanation = '実行中にエラーが発生しました。表示された行とメッセージを確認してください。'
  if (text.includes('NameError')) {
    explanation = '定義されていない名前を使っている可能性があります。変数名や定義位置を確認してください。'
  } else if (text.includes('SyntaxError') || text.includes('IndentationError')) {
    explanation = 'Pythonの文法やインデントに誤りがある可能性があります。'
  } else if (text.includes('ModuleNotFoundError') || text.includes('ImportError')) {
    explanation = '利用するライブラリやモジュールがPython環境で利用できない可能性があります。'
  } else if (text.includes('TypeError')) {
    explanation = '値の型や関数に渡した引数が想定と異なる可能性があります。'
  } else if (text.includes('ZeroDivisionError')) {
    explanation = '0で割り算をしようとしています。計算前に値を確認してください。'
  }
  const frameFile = match?.[1]
  return {
    file: frameFile && frameFile !== '<exec>' ? frameFile : fallbackFile,
    line: match ? Number(match[2]) : null,
    explanation,
  }
}

function ResizeHandle({
  axis,
  onResize,
  label,
}: {
  axis: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  label: string
}) {
  return (
    <div
      className={`resize-handle resize-${axis}`}
      role="separator"
      aria-label={label}
      aria-orientation={axis === 'horizontal' ? 'vertical' : 'horizontal'}
      onPointerDown={(event) => {
        event.preventDefault()
        const start = axis === 'horizontal' ? event.clientX : event.clientY
        const onMove = (moveEvent: PointerEvent) => {
          const current = axis === 'horizontal' ? moveEvent.clientX : moveEvent.clientY
          onResize(current - start)
        }
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp, { once: true })
      }}
    />
  )
}

export function EditorPage() {
  const { projectId: routeProjectId } = useParams()
  const selectedProjectId = routeProjectId ?? 'guest-workspace'
  const project = useProjectStore((state) => state.project)
  const initialized = useProjectStore((state) => state.initialized)
  const saveStatus = useProjectStore((state) => state.saveStatus)
  const storageError = useProjectStore((state) => state.storageError)
  const initialize = useProjectStore((state) => state.initialize)
  const updateFile = useProjectStore((state) => state.updateFile)
  const addFile = useProjectStore((state) => state.addFile)
  const duplicateFile = useProjectStore((state) => state.duplicateFile)
  const addDirectory = useProjectStore((state) => state.addDirectory)
  const deleteDirectory = useProjectStore((state) => state.deleteDirectory)
  const renameFile = useProjectStore((state) => state.renameFile)
  const deleteFile = useProjectStore((state) => state.deleteFile)
  const openFile = useProjectStore((state) => state.openFile)
  const closeFile = useProjectStore((state) => state.closeFile)
  const markRun = useProjectStore((state) => state.markRun)
  const setSaveStatus = useProjectStore((state) => state.setSaveStatus)
  const setStorageError = useProjectStore((state) => state.setStorageError)
  const {
    status,
    statusMessage,
    output,
    pendingInput,
    durationMs,
    activeFile: runtimeActiveFile,
    run,
    stop,
    submitInput,
    clearOutput,
  } = usePythonRuntime()
  const {
    sidebarWidth,
    previewWidth,
    terminalHeight,
    fontSize,
    showMinimap,
    wordWrap,
    showSidebar: sidebarVisible,
    showPreview: previewVisible,
    showTerminal: terminalVisible,
    setLayout,
    setEditorSettings,
    setPanelVisibility,
    toggleTheme,
  } = useSettingsStore()
  const [terminalTab, setTerminalTab] = useState<TerminalTab>('output')
  const [inputValue, setInputValue] = useState('')
  const [notification, setNotification] = useState('')
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>({})
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [fileDialog, setFileDialog] = useState<FileDialogState | null>(null)
  const [fileDialogValue, setFileDialogValue] = useState('')
  const [sampleLibraryOpen, setSampleLibraryOpen] = useState(false)
  const [dangerConfirmation, setDangerConfirmation] = useState<{
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const editorRef = useRef<Monaco.IStandaloneCodeEditor | null>(null)
  const isMountedRef = useRef(false)
  const notificationTimer = useRef<number | undefined>(undefined)
  const [search, setSearch] = useState('')

  const notify = useCallback((message: string) => {
    setNotification(message)
    window.clearTimeout(notificationTimer.current)
    notificationTimer.current = window.setTimeout(() => setNotification(''), 2600)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const initializeProject = useCallback(async () => {
    try {
      const existing = await loadProject(selectedProjectId)
      if (existing) {
        setSavedFiles(existing.files)
        setStorageError(null)
        initialize(existing)
        return
      }
      if (selectedProjectId !== 'guest-workspace') {
        throw new Error('プロジェクトが見つかりません。一覧から開き直してください。')
      }
      const initialProject = createDefaultProject()
      await saveProject(initialProject)
      setSavedFiles(initialProject.files)
      setStorageError(null)
      initialize(initialProject)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ローカル保存を初期化できませんでした。'
      setStorageError(message)
      setSaveStatus('error')
    }
  }, [initialize, selectedProjectId, setSaveStatus, setStorageError])

  useEffect(() => {
    if (initialized && project.id === selectedProjectId) return
    const timer = window.setTimeout(() => void initializeProject(), 0)
    return () => window.clearTimeout(timer)
  }, [initializeProject, initialized, project.id, selectedProjectId])

  useEffect(() => {
    if (!initialized || project.id !== selectedProjectId) return
    const pendingTimer = projectSaveTimers.get(project.id)
    if (pendingTimer !== undefined) window.clearTimeout(pendingTimer)
    const timer = window.setTimeout(() => {
      projectSaveTimers.delete(project.id)
      if (useProjectStore.getState().project.id === project.id) {
        setSaveStatus('saving')
      }
      void saveProject(project)
        .then(() => {
          if (useProjectStore.getState().project.id !== project.id) return
          if (isMountedRef.current) setSavedFiles(project.files)
          setStorageError(null)
          setSaveStatus('saved')
        })
        .catch((error: unknown) => {
          if (useProjectStore.getState().project.id !== project.id) return
          setStorageError(
            error instanceof Error ? error.message : '保存に失敗しました。',
          )
          setSaveStatus('error')
        })
    }, 650)
    projectSaveTimers.set(project.id, timer)
  }, [initialized, project, project.id, selectedProjectId, setSaveStatus, setStorageError])

  useEffect(
    () => () => {
      window.clearTimeout(notificationTimer.current)
    },
    [],
  )

  const saveNow = useCallback(async () => {
    const pendingTimer = projectSaveTimers.get(project.id)
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer)
      projectSaveTimers.delete(project.id)
    }
    setSaveStatus('saving')
    try {
      await saveProject(project)
      setSavedFiles(project.files)
      setStorageError(null)
      setSaveStatus('saved')
      notify('プロジェクトを保存しました')
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : 'プロジェクトを保存できませんでした。',
      )
      setSaveStatus('error')
    }
  }, [notify, project, setSaveStatus, setStorageError])

  const runCurrentFile = useCallback(() => {
    const activeContents = project.files[project.activeFile]
    if (activeContents === undefined) {
      notify('実行するファイルを選択してください')
      return
    }
    if (!project.activeFile.endsWith('.py')) {
      notify('Pythonファイル（.py）を選択してください')
      return
    }
    setPanelVisibility({ showTerminal: true })
    setTerminalTab('output')
    const started = run(project.files, project.activeFile)
    if (started) markRun()
    if (!started) notify('Python環境の準備完了後に実行できます')
  }, [markRun, notify, project.activeFile, project.files, run, setPanelVisibility])

  const loadBeginnerSample = (title: string, code: string) => {
    const targetPath = project.activeFile.endsWith('.py')
      ? project.activeFile
      : 'main.py'
    const applySample = () => {
      if (project.files[targetPath] === undefined) addFile(targetPath)
      openFile(targetPath)
      updateFile(targetPath, code)
      setSampleLibraryOpen(false)
      notify(`${title}のサンプルを読み込みました`)
    }

    setSampleLibraryOpen(false)
    if (project.files[targetPath]?.trim()) {
      setDangerConfirmation({
        title: 'サンプルコードを読み込みますか？',
        message: `${targetPath} の内容を「${title}」のサンプルで置き換えます。`,
        confirmLabel: '置き換える',
        onConfirm: applySample,
      })
      return
    }
    applySample()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.ctrlKey || event.metaKey
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveNow()
      } else if (command && event.key === 'Enter') {
        event.preventDefault()
        runCurrentFile()
      } else if (command && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandQuery('')
        setCommandPaletteOpen(true)
      } else if (event.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [runCurrentFile, saveNow])

  const allDirectories = useMemo(() => {
    const directories = new Set(project.directories)
    for (const path of Object.keys(project.files)) {
      const parts = path.split('/')
      for (let index = 1; index < parts.length; index += 1) {
        directories.add(parts.slice(0, index).join('/'))
      }
    }
    return [...directories].sort()
  }, [project.directories, project.files])

  const openFileDialog = (dialog: FileDialogState) => {
    setFileDialogValue(dialog.initialValue)
    setFileDialog(dialog)
  }

  const createFile = () =>
    openFileDialog({ kind: 'file', initialValue: '' })

  const createFolder = () =>
    openFileDialog({ kind: 'folder', initialValue: '' })

  const revealPath = (path: string) => {
    const parents = path.split('/').slice(0, -1)
    if (parents.length === 0) return
    setExpandedFolders((current) => {
      const next = new Set(current)
      for (let index = 1; index <= parents.length; index += 1) {
        next.add(parents.slice(0, index).join('/'))
      }
      return next
    })
  }

  const submitFileDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!fileDialog) return
    const path = fileDialogValue.trim()
    if (!isValidProjectPath(path)) {
      notify('ファイル名またはパスが正しくありません')
      return
    }

    if (fileDialog.kind === 'file') {
      if (hasFilePathConflict(path, project.files, allDirectories)) {
        notify('同じ名前のファイルまたはフォルダーがすでにあります')
        return
      }
      addFile(path)
      revealPath(path)
      notify('ファイルを作成しました')
    } else if (fileDialog.kind === 'folder') {
      if (
        allDirectories.includes(path) ||
        Object.keys(project.files).some(
          (file) => file === path || path.startsWith(`${file}/`),
        )
      ) {
        notify('同じ名前のファイルまたはフォルダーがすでにあります')
        return
      }
      addDirectory(path)
      setExpandedFolders((current) => {
        const next = new Set(current)
        const parts = path.split('/')
        for (let index = 1; index <= parts.length; index += 1) {
          next.add(parts.slice(0, index).join('/'))
        }
        return next
      })
      notify('フォルダーを作成しました')
    } else {
      if (
        path !== fileDialog.path &&
        hasFilePathConflict(path, project.files, allDirectories)
      ) {
        notify('変更後のファイル名が正しくないか、すでに使用されています')
        return
      }
      if (path === fileDialog.path) {
        setFileDialog(null)
        return
      }
      renameFile(fileDialog.path, path)
      revealPath(path)
      notify('ファイル名を変更しました')
    }
    setFileDialog(null)
  }

  const handleRename = (path: string) =>
    openFileDialog({ kind: 'rename', path, initialValue: path })

  const handleDelete = useCallback(
    (path: string) => {
      setDangerConfirmation({
        title: '削除の確認',
        message: `「${path}」を削除しますか？この操作は取り消せません。`,
        confirmLabel: '削除する',
        onConfirm: () => {
          deleteFile(path)
          notify('ファイルを削除しました')
        },
      })
    },
    [deleteFile, notify],
  )

  const handleDeleteDirectory = useCallback(
    (path: string) => {
      setDangerConfirmation({
        title: '削除の確認',
        message: `「${path}」と中のファイルをすべて削除しますか？この操作は取り消せません。`,
        confirmLabel: '削除する',
        onConfirm: () => {
          deleteDirectory(path)
          notify('フォルダーを削除しました')
        },
      })
    },
    [deleteDirectory, notify],
  )

  const handleCopyCode = useCallback(async () => {
    const contents = project.files[project.activeFile]
    if (contents === undefined) return
    try {
      await navigator.clipboard.writeText(contents)
      notify('コードをコピーしました')
    } catch (error) {
      notify(error instanceof Error ? 'クリップボードへのアクセスが拒否されました' : 'コピーできませんでした')
    }
  }, [notify, project.activeFile, project.files])

  const saveLabel = {
    loading: '読込中',
    saving: '保存中…',
    saved: '保存済み',
    error: '保存エラー',
  }[saveStatus]

  const visibleRootFiles = Object.keys(project.files)
    .filter((path) => !path.includes('/'))
    .filter((path) => !search.trim() || path.toLowerCase().includes(search.trim().toLowerCase()))

  const renderDirectory = (folder: string, depth: number): ReactNode => {
    const expanded = expandedFolders.has(folder)
    const directChildDirectories = allDirectories.filter((directory) => {
      const parent = directory.includes('/') ? directory.slice(0, directory.lastIndexOf('/')) : ''
      return parent === folder
    })
    const directFiles = Object.keys(project.files).filter((path) => {
      const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
      return parent === folder
    })
    const visible = (path: string) =>
      !search.trim() || path.toLowerCase().includes(search.trim().toLowerCase())
    return (
      <div key={folder}>
        <div className="file-tree-row folder-tree-row" style={{ paddingLeft: 10 + depth * 14 }}>
          <button
            className="tree-main-button"
            type="button"
            onClick={() =>
              setExpandedFolders((current) => {
                const next = new Set(current)
                if (next.has(folder)) next.delete(folder)
                else next.add(folder)
                return next
              })
            }
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <FolderTree size={15} />
            <span>{folder.split('/').pop()}</span>
          </button>
          <span className="file-tree-actions">
            <button type="button" aria-label={`${folder} を削除`} onClick={() => handleDeleteDirectory(folder)}>
              <Trash2 size={13} />
            </button>
          </span>
        </div>
        {expanded &&
          directChildDirectories.map((directory) =>
            renderDirectory(directory, depth + 1),
          )}
        {expanded &&
          directFiles.filter(visible).map((path) => renderFile(path, depth + 1))}
      </div>
    )
  }

  const renderFile = (path: string, depth = 0) => (
    <div
      className={`file-tree-row${project.activeFile === path ? ' is-selected' : ''}`}
      key={path}
      style={{ paddingLeft: 10 + depth * 14 }}
    >
      <button
        className="tree-main-button"
        type="button"
        onClick={() => openFile(path)}
        title={path}
      >
        <FileCode2 size={15} />
        <span>{path.split('/').pop()}</span>
      </button>
      <span className="file-tree-actions">
        <button type="button" aria-label={`${path} を複製`} onClick={() => {
          duplicateFile(path)
          notify('ファイルを複製しました')
        }}>
          <Copy size={13} />
        </button>
        <button type="button" aria-label={`${path} の名前を変更`} onClick={() => handleRename(path)}>
          <Settings2 size={13} />
        </button>
        <button type="button" aria-label={`${path} を削除`} onClick={() => handleDelete(path)}>
          <Trash2 size={13} />
        </button>
      </span>
    </div>
  )

  const commands = [
    { id: 'run', label: 'Pythonを実行', shortcut: 'Ctrl + Enter' },
    { id: 'save', label: 'プロジェクトを保存', shortcut: 'Ctrl + S' },
    {
      id: 'sidebar',
      label: sidebarVisible ? 'ファイル一覧を閉じる' : 'ファイル一覧を表示',
    },
    {
      id: 'terminal',
      label: terminalVisible ? 'ターミナルを閉じる' : 'ターミナルを表示',
    },
    {
      id: 'preview',
      label: previewVisible ? '実行情報を閉じる' : '実行情報を表示',
    },
    {
      id: 'theme',
      label: 'テーマを切り替える',
    },
  ].filter((command) =>
    command.label.toLocaleLowerCase('ja').includes(commandQuery.trim().toLocaleLowerCase('ja')),
  )

  return (
    <section
      className="editor-workspace"
      style={{
        '--sidebar-width': `${sidebarWidth}px`,
        '--preview-width': `${previewWidth}px`,
        '--terminal-height': `${terminalHeight}px`,
      } as CSSProperties}
      aria-label="PyStudio Pythonエディター"
    >
      <div className="workspace-toolbar">
        <div className="workspace-project">
          <span className="workspace-python-mark">Py</span>
          <div className="workspace-project-copy">
            <strong>{project.name}</strong>
            <span className="save-state">
              {saveStatus === 'saved' ? <Check size={12} /> : <Circle size={8} />}
              {saveLabel}
            </span>
          </div>
          <button className="icon-button project-save-button" type="button" onClick={() => void saveNow()} title="保存 (Ctrl+S)">
            <Save size={16} />
          </button>
        </div>
        <div className="workspace-toolbar-actions">
          <button
            className={`runtime-indicator runtime-${status}`}
            type="button"
            title={statusMessage || 'Python実行環境'}
            onClick={() => status === 'error' && window.location.reload()}
          >
            <span className="runtime-dot" />
            {statusMessage || (status === 'running' ? '実行中' : status === 'waiting-input' ? '入力待ち' : 'Python')}
          </button>
          {status === 'running' || status === 'waiting-input' ? (
            <button className="stop-button" type="button" onClick={stop} title="実行を停止">
              <Square size={14} fill="currentColor" />
              停止
            </button>
          ) : (
            <button
              className="run-button"
              type="button"
              onClick={runCurrentFile}
              disabled={status !== 'ready'}
              title="実行 (Ctrl+Enter)"
            >
              <Play size={15} fill="currentColor" />
              実行
            </button>
          )}
        </div>
      </div>

      {storageError && (
        <div className="storage-warning" role="alert">
          <AlertCircle size={15} />
          <span>{storageError} 編集内容はこの画面に保持されています。</span>
          <button type="button" onClick={() => void saveNow()}>再試行</button>
        </div>
      )}

      <div className={`workspace-body${sidebarVisible ? '' : ' sidebar-hidden'}${previewVisible ? '' : ' preview-hidden'}`}>
        {sidebarVisible && (
          <aside className="file-explorer">
            <div className="panel-heading">
              <span>エクスプローラー</span>
              <div>
                <button type="button" title="新しいファイル" onClick={createFile}><FilePlus2 size={15} /></button>
                <button type="button" title="新しいフォルダー" onClick={createFolder}><FolderPlus size={15} /></button>
              </div>
            </div>
            <div className="project-tree-title">
              <ChevronDown size={14} />
              <span>{project.name.toUpperCase()}</span>
            </div>
            <label className="file-search">
              <Search size={14} />
              <input
                aria-label="ファイルを検索"
                placeholder="ファイルを検索…"
                value={search.trim()}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="検索をクリア"><X size={13} /></button>}
            </label>
            <div className="file-tree">
              {allDirectories
                .filter((directory) => !directory.includes('/'))
                .map((directory) => renderDirectory(directory, 0))}
              {visibleRootFiles.map((path) => renderFile(path))}
              {Object.keys(project.files).length === 0 && (
                <p className="empty-files">ファイルがありません。<br />＋から作成できます。</p>
              )}
            </div>
            <div className="explorer-footer">
              <button type="button" onClick={() => setPanelVisibility({ showSidebar: false })}>
                <ChevronDown size={14} /> ファイル一覧を閉じる
              </button>
            </div>
          </aside>
        )}

        {sidebarVisible && (
          <ResizeHandle
            axis="horizontal"
            label="ファイル一覧の幅を変更"
            onResize={(delta) =>
              setLayout({
                sidebarWidth: Math.max(170, Math.min(420, sidebarWidth + delta)),
              })
            }
          />
        )}
        <div className={`editor-center${terminalVisible ? '' : ' terminal-hidden'}`}>
          <div className="editor-tabbar">
            {!sidebarVisible && (
              <button className="icon-button open-sidebar-button" type="button" onClick={() => setPanelVisibility({ showSidebar: true })} title="ファイル一覧を表示">
                <FolderTree size={16} />
              </button>
            )}
            <div className="editor-tabs">
              {project.openFiles.map((path) => (
                <div
                  role="tab"
                  aria-selected={project.activeFile === path}
                  tabIndex={0}
                  className={`editor-tab${project.activeFile === path ? ' is-active' : ''}`}
                  key={path}
                  onClick={() => openFile(path)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') openFile(path)
                  }}
                  title={path}
                >
                  <FileCode2 size={14} />
                  <span>{path.split('/').pop()}</span>
                  {initialized && savedFiles[path] !== project.files[path] && (
                    <span className="tab-unsaved" aria-label="未保存" />
                  )}
                  <button
                    className="tab-close"
                    type="button"
                    aria-label={`${path} をタブから閉じる`}
                    onClick={(event) => {
                      event.stopPropagation()
                      closeFile(path)
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="editor-tab-actions">
              <button type="button" title="サンプルコード" onClick={() => setSampleLibraryOpen(true)}><BookOpen size={14} /></button>
              <button type="button" title="コードをコピー" onClick={() => void handleCopyCode()}><Copy size={14} /></button>
              <button type="button" title="ターミナルを表示" onClick={() => setPanelVisibility({ showTerminal: !terminalVisible })}><TerminalIcon size={15} /></button>
              <button type="button" title="プレビューを表示" onClick={() => setPanelVisibility({ showPreview: !previewVisible })}><Plus size={15} /></button>
            </div>
          </div>
          <div className="editor-controls">
            <span className="editor-file-path">{project.activeFile || 'ファイルを選択してください'}</span>
            <div className="editor-control-buttons">
              <button type="button" onClick={() => setEditorSettings({ fontSize: Math.max(11, fontSize - 1) })} title="文字を小さく">A−</button>
              <button type="button" onClick={() => setEditorSettings({ fontSize: Math.min(24, fontSize + 1) })} title="文字を大きく">A＋</button>
              <button
                type="button"
                className={showMinimap ? 'control-active' : ''}
                onClick={() => setEditorSettings({ showMinimap: !showMinimap })}
                title="ミニマップ切り替え"
              >ミニマップ</button>
              <button
                type="button"
                className={wordWrap === 'on' ? 'control-active' : ''}
                onClick={() => setEditorSettings({ wordWrap: wordWrap === 'on' ? 'off' : 'on' })}
                title="折り返し切り替え"
              >折り返し</button>
            </div>
          </div>
          <div className="monaco-container">
            {project.activeFile && project.files[project.activeFile] !== undefined ? (
              <Editor
                height="100%"
                path={project.activeFile}
                language={fileLanguage(project.activeFile)}
                theme={document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'vs'}
                value={project.files[project.activeFile]}
                onChange={(value) => updateFile(project.activeFile, value ?? '')}
                onMount={(editor) => {
                  editorRef.current = editor
                  editor.onDidChangeCursorPosition(({ position }) => {
                    setCursorPosition({
                      line: position.lineNumber,
                      column: position.column,
                    })
                  })
                }}
                options={{
                  automaticLayout: true,
                  fontSize,
                  fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                  lineNumbers: 'on',
                  minimap: { enabled: showMinimap },
                  wordWrap,
                  tabSize: 4,
                  insertSpaces: true,
                  autoIndent: 'full',
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  bracketPairColorization: { enabled: true },
                  folding: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 18 },
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  ariaLabel: `${project.activeFile} コードエディター`,
                }}
              />
            ) : (
              <div className="no-open-file">
                <FileCode2 size={27} />
                <strong>編集するファイルを選択してください</strong>
                <button type="button" onClick={createFile}><Plus size={15} /> 新しいファイル</button>
              </div>
            )}
          </div>
          {terminalVisible && (
            <>
              <ResizeHandle
                axis="vertical"
                label="ターミナルの高さを変更"
                onResize={(delta) =>
                  setLayout({
                    terminalHeight: Math.max(120, Math.min(480, terminalHeight - delta)),
                  })
                }
              />
              <section className="terminal-panel" aria-label="実行結果">
                <div className="terminal-heading">
                  <div className="terminal-tabs">
                    <button className={terminalTab === 'output' ? 'is-active' : ''} type="button" onClick={() => setTerminalTab('output')}>
                      <TerminalIcon size={14} /> 出力
                    </button>
                    <button className={terminalTab === 'errors' ? 'is-active' : ''} type="button" onClick={() => setTerminalTab('errors')}>
                      <AlertCircle size={14} /> エラー
                      {output.some((line) => line.channel === 'stderr') && <span className="error-count">!</span>}
                    </button>
                  </div>
                  <div className="terminal-tools">
                    {durationMs !== null && <span>{(durationMs / 1000).toFixed(2)}秒</span>}
                    <button type="button" onClick={clearOutput} title="出力をクリア"><RotateCcw size={14} /></button>
                    <button type="button" onClick={() => setPanelVisibility({ showTerminal: false })} title="ターミナルを閉じる"><X size={14} /></button>
                  </div>
                </div>
                <div className="terminal-content" role="log" aria-live="polite">
                  {output
                    .filter((line) => terminalTab === 'output' || line.channel === 'stderr')
                    .map((line) => {
                      const details =
                        line.channel === 'stderr'
                          ? errorDetails(line.text, runtimeActiveFile)
                          : null
                      return (
                        <div className={`terminal-line terminal-${line.channel}`} key={line.id}>
                          <pre>{line.text}</pre>
                          {details && (
                            <div className="error-explanation">
                              <span>{details.explanation}</span>
                              {details.line && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (project.files[details.file] !== undefined) {
                                      openFile(details.file)
                                    }
                                    editorRef.current?.revealLineInCenter(details.line!)
                                    editorRef.current?.setPosition({ lineNumber: details.line!, column: 1 })
                                    editorRef.current?.focus()
                                  }}
                                >{details.file}:{details.line} 行へ移動</button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  {output.length === 0 && (
                    <div className="terminal-empty">
                      <span>ここに実行結果が表示されます</span>
                      <span>Ctrl + Enter で実行</span>
                    </div>
                  )}
                  {pendingInput && (
                    <form
                      className="terminal-input"
                      onSubmit={(event) => {
                        event.preventDefault()
                        submitInput(inputValue)
                        setInputValue('')
                      }}
                    >
                      <label htmlFor="python-input">{pendingInput.prompt || '入力してください'}</label>
                      <input
                        autoFocus
                        id="python-input"
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        placeholder="入力してEnterを押す"
                      />
                      <button type="submit">送信</button>
                    </form>
                  )}
                </div>
              </section>
            </>
          )}
          {!terminalVisible && (
            <button className="terminal-reopen" type="button" onClick={() => setPanelVisibility({ showTerminal: true })}>
              <TerminalIcon size={14} /> ターミナルを表示
            </button>
          )}
        </div>

        {previewVisible && (
          <>
            <ResizeHandle
              axis="horizontal"
              label="プレビュー幅を変更"
              onResize={(delta) =>
                setLayout({
                  previewWidth: Math.max(220, Math.min(480, previewWidth - delta)),
                })
              }
            />
            <aside className="preview-panel">
              <div className="panel-heading">
                <span>実行情報</span>
                <button type="button" onClick={() => setPanelVisibility({ showPreview: false })} aria-label="パネルを閉じる"><X size={15} /></button>
              </div>
              <div className="preview-content">
                <div className={`preview-status preview-${status}`}>
                  <span className="runtime-dot" />
                  {statusMessage || 'Python実行環境'}
                </div>
                <h3>このワークスペースについて</h3>
                <p>コードはブラウザー内のPyodideで実行されます。プロジェクトはこのブラウザーのIndexedDBに自動保存されます。</p>
                    <div className="preview-meta">
                  <span>ファイル</span><strong>{Object.keys(project.files).length}</strong>
                  <span>最終更新</span><strong>{new Date(project.updatedAt).toLocaleTimeString('ja-JP')}</strong>
                  <span>実行時間</span><strong>{durationMs === null ? '—' : `${(durationMs / 1000).toFixed(2)}秒`}</strong>
                </div>
                <div className="preview-notice">
                  <AlertCircle size={15} />
                  <span>この実行環境はブラウザー内のWorkerで動作します。利用可能なメモリは端末とブラウザーに依存します。</span>
                </div>
              </div>
            </aside>
          </>
        )}
        {!previewVisible && (
          <button className="preview-reopen" type="button" onClick={() => setPanelVisibility({ showPreview: true })} title="実行情報を表示">
            <Settings2 size={15} />
          </button>
        )}
      </div>
      {notification && <div className="editor-toast" role="status">{notification}</div>}
      {commandPaletteOpen && (
        <div
          className="command-palette-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCommandPaletteOpen(false)
          }}
        >
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
          >
            <label id="command-palette-title" htmlFor="command-query">
              コマンドを検索
            </label>
            <input
              autoFocus
              id="command-query"
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="操作を入力してください…"
            />
            <div className="command-list">
              {commands.length > 0 ? (
                commands.map((command) => (
                  <button
                    type="button"
                    key={command.label}
                    onClick={() => {
                      switch (command.id) {
                        case 'run':
                          runCurrentFile()
                          break
                        case 'save':
                          void saveNow()
                          break
                        case 'sidebar':
                          setPanelVisibility({ showSidebar: !sidebarVisible })
                          break
                        case 'terminal':
                          setPanelVisibility({ showTerminal: !terminalVisible })
                          break
                        case 'preview':
                          setPanelVisibility({ showPreview: !previewVisible })
                          break
                        case 'theme':
                          toggleTheme()
                          break
                      }
                      setCommandPaletteOpen(false)
                    }}
                  >
                    <span>{command.label}</span>
                    {command.shortcut && <kbd>{command.shortcut}</kbd>}
                  </button>
                ))
              ) : (
                <p>一致するコマンドはありません</p>
              )}
            </div>
          </section>
        </div>
      )}
      {sampleLibraryOpen && (
        <div
          className="command-palette-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSampleLibraryOpen(false)
          }}
        >
          <section
            className="sample-library"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sample-library-title"
          >
            <header>
              <div>
                <span className="section-kicker">LEARN PYTHON</span>
                <h2 id="sample-library-title">サンプルコード</h2>
                <p>選んだサンプルをPythonファイルへ読み込みます。</p>
              </div>
              <button type="button" aria-label="閉じる" onClick={() => setSampleLibraryOpen(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="sample-list">
              {beginnerSamples.map((sample) => (
                <button
                  type="button"
                  key={sample.title}
                  onClick={() => loadBeginnerSample(sample.title, sample.code)}
                >
                  <span>{sample.title}</span>
                  <small>{sample.category}</small>
                </button>
              ))}
            </div>
            <p className="sample-library-note">
              グラフ／pandasの例は、Pyodideで該当ライブラリを利用できる環境が必要です。
            </p>
          </section>
        </div>
      )}
      {fileDialog && (
        <div
          className="command-palette-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFileDialog(null)
          }}
        >
          <form
            className="file-action-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-dialog-title"
            onSubmit={submitFileDialog}
          >
            <h2 id="file-dialog-title">
              {fileDialog.kind === 'file'
                ? '新しいファイル'
                : fileDialog.kind === 'folder'
                  ? '新しいフォルダー'
                  : 'ファイル名を変更'}
            </h2>
            <p>プロジェクト内の相対パスを入力できます（例: data/sample.csv）。</p>
            <input
              autoFocus
              value={fileDialogValue}
              onChange={(event) => setFileDialogValue(event.target.value)}
              placeholder={
                fileDialog.kind === 'folder' ? 'data/images' : 'main.py'
              }
              aria-label="ファイル名またはフォルダー名"
              maxLength={240}
            />
            <div className="file-dialog-actions">
              <button type="button" onClick={() => setFileDialog(null)}>
                キャンセル
              </button>
              <button className="dialog-primary" type="submit">
                {fileDialog.kind === 'rename'
                  ? '名前を変更'
                  : fileDialog.kind === 'folder'
                    ? 'フォルダーを作成'
                    : 'ファイルを作成'}
              </button>
            </div>
          </form>
        </div>
      )}
      {dangerConfirmation && (
        <div
          className="command-palette-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDangerConfirmation(null)
          }}
        >
          <section
            className="file-action-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <h2 id="delete-dialog-title">{dangerConfirmation.title}</h2>
            <p>{dangerConfirmation.message}</p>
            <div className="file-dialog-actions">
              <button type="button" onClick={() => setDangerConfirmation(null)}>
                キャンセル
              </button>
              <button
                className="dialog-danger"
                type="button"
                onClick={() => {
                  dangerConfirmation.onConfirm()
                  setDangerConfirmation(null)
                }}
              >
                {dangerConfirmation.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="editor-statusbar">
        <span><Check size={12} /> {saveLabel}</span>
        <span>{project.activeFile ? fileLanguage(project.activeFile) : 'Python'}</span>
        <span>行 {cursorPosition.line}, 列 {cursorPosition.column}</span>
        <span>UTF-8</span>
        <span>{project.activeFile.endsWith('.py') ? 'Python' : 'テキスト'}</span>
      </div>
    </section>
  )
}
