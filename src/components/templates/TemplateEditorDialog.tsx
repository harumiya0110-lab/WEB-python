import Editor from '@monaco-editor/react'
import { Copy, FileCode2, FilePlus2, Folder, FolderPlus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { UserTemplate, TemplateCategory, TemplateDifficulty } from '../../types/template'
import { isValidProjectPath } from '../../types/project'
import { templateCategories } from '../../templates/templateCatalog'

interface TemplateEditorDialogProps {
  template: UserTemplate
  busy: boolean
  onSave: (template: UserTemplate) => Promise<void>
  onClose: () => void
}

type FileAction = 'new-file' | 'new-folder' | 'rename' | null

function isValidTree(files: Record<string, string>, directories: string[], activeFile: string): string {
  const filePaths = Object.keys(files)
  if (filePaths.length === 0 || !filePaths.some((path) => path.toLowerCase().endsWith('.py'))) {
    return 'Pythonファイルを最低1つ作成してください。'
  }
  if (!Object.hasOwn(files, activeFile) || !activeFile.toLowerCase().endsWith('.py')) {
    return '開始ファイルは存在するPythonファイルを選択してください。'
  }
  const allPaths = new Set<string>()
  for (const path of [...filePaths, ...directories]) {
    if (!isValidProjectPath(path) || path.includes(':')) return `安全でないパスです: ${path}`
    const normalizedPath = path.normalize('NFC').toLocaleLowerCase('en-US')
    if (allPaths.has(normalizedPath)) return `ファイル名またはフォルダー名が重複しています: ${path}`
    allPaths.add(normalizedPath)
  }
  const normalizedFiles = new Set(filePaths.map((path) => path.normalize('NFC').toLocaleLowerCase('en-US')))
  for (const file of [...filePaths, ...directories]) {
    const segments = file.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      if (normalizedFiles.has(segments.slice(0, index).join('/').normalize('NFC').toLocaleLowerCase('en-US'))) {
        return 'ファイルとフォルダーのパスが競合しています。'
      }
    }
  }
  return ''
}

export function TemplateEditorDialog({ template, busy, onSave, onClose }: TemplateEditorDialogProps) {
  const [baseline, setBaseline] = useState(template)
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description)
  const [tags, setTags] = useState(template.tags.join(', '))
  const [category, setCategory] = useState<TemplateCategory>(template.category)
  const [difficulty, setDifficulty] = useState<TemplateDifficulty | ''>(template.difficulty ?? '')
  const [files, setFiles] = useState<Record<string, string>>({ ...template.files })
  const [directories, setDirectories] = useState([...template.directories])
  const [activeFile, setActiveFile] = useState(template.activeFile)
  const [selectedFile, setSelectedFile] = useState(template.activeFile)
  const [fileAction, setFileAction] = useState<FileAction>(null)
  const [actionPath, setActionPath] = useState('')
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved')
  const original = useMemo(() => JSON.stringify(baseline), [baseline])
  const current = JSON.stringify({ ...baseline, name, description, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), category, difficulty: difficulty || undefined, files, directories, activeFile })
  const dirty = current !== original
  const visibleSaveState = dirty
    ? saveState === 'saving' || saveState === 'error' ? saveState : 'unsaved'
    : saveState === 'unsaved' ? 'saved' : saveState

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const close = () => {
    if (dirty && !window.confirm('保存されていない変更があります。破棄して閉じますか？')) return
    onClose()
  }

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  })

  const openAction = (action: Exclude<FileAction, null>) => {
    setActionPath(action === 'rename' ? selectedFile : '')
    setFileAction(action)
    setError('')
  }

  const applyAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const path = actionPath.trim()
    if (!isValidProjectPath(path) || path.includes(':')) {
      setError('使用できないファイルパスです。')
      return
    }
    if (fileAction === 'new-file') {
      if (Object.hasOwn(files, path) || directories.includes(path)) {
        setError('同じパスのファイルまたはフォルダーがすでにあります。')
        return
      }
      setFiles((currentFiles) => ({ ...currentFiles, [path]: '' }))
      setSelectedFile(path)
    } else if (fileAction === 'new-folder') {
      if (Object.hasOwn(files, path) || directories.includes(path)) {
        setError('同じパスのファイルまたはフォルダーがすでにあります。')
        return
      }
      setDirectories((currentDirectories) => [...currentDirectories, path])
    } else if (fileAction === 'rename') {
      if (Object.hasOwn(files, path) || directories.includes(path)) {
        setError('同じパスのファイルまたはフォルダーがすでにあります。')
        return
      }
      setFiles((currentFiles) => {
        const next = { ...currentFiles }
        next[path] = next[selectedFile]
        delete next[selectedFile]
        return next
      })
      if (activeFile === selectedFile) setActiveFile(path)
      setSelectedFile(path)
    }
    setFileAction(null)
    setActionPath('')
    setSaveState('unsaved')
  }

  const duplicateFile = () => {
    const dot = selectedFile.lastIndexOf('.')
    const copyPath = dot > selectedFile.lastIndexOf('/')
      ? `${selectedFile.slice(0, dot)}_copy${selectedFile.slice(dot)}`
      : `${selectedFile}_copy`
    if (Object.hasOwn(files, copyPath) || directories.includes(copyPath)) {
      setError(`複製先はすでに存在します: ${copyPath}`)
      return
    }
    setFiles((currentFiles) => ({ ...currentFiles, [copyPath]: currentFiles[selectedFile] }))
    setSelectedFile(copyPath)
    setSaveState('unsaved')
  }

  const deleteSelectedFile = () => {
    if (!window.confirm(`「${selectedFile}」を削除しますか？`)) return
    const next = { ...files }
    delete next[selectedFile]
    setFiles(next)
    if (activeFile === selectedFile) setActiveFile(Object.keys(next).find((path) => path.toLowerCase().endsWith('.py')) ?? '')
    setSelectedFile(Object.keys(next)[0] ?? '')
    setSaveState('unsaved')
  }

  const deleteFolder = (path: string) => {
    if (!window.confirm(`「${path}」とその中のファイルを削除しますか？`)) return
    const nextFiles = Object.fromEntries(Object.entries(files).filter(([file]) => !file.startsWith(`${path}/`)))
    setFiles(nextFiles)
    setDirectories((currentDirectories) => currentDirectories.filter((directory) => directory !== path && !directory.startsWith(`${path}/`)))
    if (!Object.hasOwn(nextFiles, selectedFile)) setSelectedFile(Object.keys(nextFiles)[0] ?? '')
    if (!Object.hasOwn(nextFiles, activeFile)) setActiveFile(Object.keys(nextFiles).find((file) => file.toLowerCase().endsWith('.py')) ?? '')
    setSaveState('unsaved')
  }

  const save = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const validationError = isValidTree(files, directories, activeFile)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!name.trim()) {
      setError('テンプレート名を入力してください。')
      return
    }
    setError('')
    setSaveState('saving')
    try {
      const updated: UserTemplate = {
        ...template,
        name: name.trim(),
        description: description.trim(),
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        category,
        difficulty: difficulty || undefined,
        files: { ...files },
        directories: [...directories],
        activeFile,
        updatedAt: Date.now(),
      }
      await onSave(updated)
      setBaseline(updated)
      setSaveState('saved')
    } catch (saveError) {
      setSaveState('error')
      setError(saveError instanceof Error ? saveError.message : 'テンプレートを保存できませんでした。')
    }
  }

  return (
    <div className="template-modal-backdrop template-editor-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close()
    }}>
      <section className="template-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="template-editor-title">
        <header className="template-editor-header">
          <div>
            <span className="section-kicker">マイテンプレート</span>
            <h2 id="template-editor-title">テンプレートを編集</h2>
          </div>
          <button type="button" className="template-modal-close" onClick={close} aria-label="閉じる" disabled={busy}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="template-editor-meta">
          <label>テンプレート名<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
          <label>説明<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={500} /></label>
          <div className="template-editor-meta-row">
            <label>タグ（カンマ区切り）<input value={tags} onChange={(event) => setTags(event.target.value)} maxLength={240} /></label>
            <label>カテゴリー<select value={category} onChange={(event) => setCategory(event.target.value as TemplateCategory)}>{templateCategories.map(({ name: value }) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>難易度<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TemplateDifficulty | '')}><option value="">未設定</option><option value="初級">初級</option><option value="中級">中級</option><option value="上級">上級</option></select></label>
          </div>
        </div>
        <div className="template-editor-workspace">
          <aside className="template-editor-explorer" aria-label="ファイルエクスプローラー">
            <div className="template-editor-explorer-actions">
              <button type="button" onClick={() => openAction('new-file')} title="新しいファイル"><FilePlus2 size={15} /> ファイル</button>
              <button type="button" onClick={() => openAction('new-folder')} title="新しいフォルダー"><FolderPlus size={15} /> フォルダー</button>
            </div>
            {directories.map((directory) => (
              <div className="template-editor-tree-row" key={`dir:${directory}`}>
                <span><Folder size={14} aria-hidden="true" /> {directory}/</span>
                <button type="button" aria-label={`${directory}を削除`} onClick={() => deleteFolder(directory)}><Trash2 size={13} /></button>
              </div>
            ))}
            {Object.keys(files).sort((a, b) => a.localeCompare(b, 'ja')).map((path) => (
              <div className={`template-editor-tree-row${selectedFile === path ? ' is-selected' : ''}`} key={path}>
                <button type="button" className="template-editor-file-select" onClick={() => setSelectedFile(path)}><FileCode2 size={13} aria-hidden="true" /> {path}</button>
              </div>
            ))}
            <div className="template-editor-file-actions">
              <button type="button" onClick={() => openAction('rename')} disabled={!selectedFile}>名前変更</button>
              <button type="button" onClick={duplicateFile} disabled={!selectedFile}><Copy size={13} /> 複製</button>
              <button type="button" onClick={deleteSelectedFile} disabled={!selectedFile}><Trash2 size={13} /> 削除</button>
              {selectedFile.toLowerCase().endsWith('.py') && (
                <button type="button" onClick={() => { setActiveFile(selectedFile); setSaveState('unsaved') }}>
                  {activeFile === selectedFile ? '開始ファイル' : '開始ファイルに設定'}
                </button>
              )}
            </div>
          </aside>
          <section className="template-editor-code">
            <div className="template-editor-code-heading">
              <strong>{selectedFile || 'ファイルを選択してください'}</strong>
              {selectedFile === activeFile && <span>開始ファイル</span>}
            </div>
            {selectedFile ? (
              <Editor
                height="100%"
                path={selectedFile}
                language={selectedFile.toLowerCase().endsWith('.py') ? 'python' : selectedFile.toLowerCase().endsWith('.json') ? 'json' : 'plaintext'}
                value={files[selectedFile] ?? ''}
                onChange={(value) => {
                  setFiles((currentFiles) => ({ ...currentFiles, [selectedFile]: value ?? '' }))
                  setSaveState('unsaved')
                }}
                options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', automaticLayout: true, scrollBeyondLastLine: false }}
              />
            ) : <p className="template-editor-no-file">編集するファイルを選択してください。</p>}
          </section>
        </div>
        <footer className="template-editor-footer">
          <p className={`template-editor-save-state is-${visibleSaveState}`} role="status">
            {visibleSaveState === 'saving' ? '保存しています…' : visibleSaveState === 'saved' ? '保存済み' : visibleSaveState === 'error' ? '保存に失敗しました' : '未保存の変更'}
          </p>
          {error && <p className="projects-message is-error" role="alert">{error}</p>}
          <div className="template-editor-footer-actions">
            <button type="button" onClick={close} disabled={busy}>閉じる</button>
            <button type="button" className="primary-button" onClick={() => void save()} disabled={busy || saveState === 'saving'}><Save size={15} /> 保存</button>
          </div>
        </footer>
      </section>
      {fileAction && (
        <div className="template-modal-backdrop template-editor-action-backdrop">
          <form className="project-dialog" role="dialog" aria-modal="true" onSubmit={applyAction}>
            <h2>{fileAction === 'new-file' ? '新しいファイル' : fileAction === 'new-folder' ? '新しいフォルダー' : 'ファイル名を変更'}</h2>
            <label>パス<input autoFocus value={actionPath} onChange={(event) => setActionPath(event.target.value)} placeholder="例: src/utils.py" /></label>
            {error && <p className="projects-message is-error" role="alert">{error}</p>}
            <div className="project-dialog-actions">
              <button type="button" onClick={() => setFileAction(null)}>キャンセル</button>
              <button type="submit" className="primary-button">確定</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
