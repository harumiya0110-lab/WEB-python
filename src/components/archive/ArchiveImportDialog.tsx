import { Archive, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  backupSnapshotFromArchive,
  parsePyStudioArchive,
  type BackupSnapshot,
} from '../../services/archiveService'
import type { ParsedPyStudioArchive, PyStudioArchiveKind } from '../../types/archive'

const textEncoder = new TextEncoder()

interface ArchiveImportDialogProps {
  kind: PyStudioArchiveKind
  busy: boolean
  existingNames?: string[]
  onImport: (archive: ParsedPyStudioArchive, name: string, snapshot?: BackupSnapshot) => Promise<void>
  onClose: () => void
}

const kindNames: Record<PyStudioArchiveKind, string> = {
  project: 'プロジェクト',
  template: 'テンプレート',
  backup: 'バックアップ',
}

export function ArchiveImportDialog({ kind, busy, existingNames = [], onImport, onClose }: ArchiveImportDialogProps) {
  const [archive, setArchive] = useState<ParsedPyStudioArchive | null>(null)
  const [backupSnapshot, setBackupSnapshot] = useState<BackupSnapshot>()
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !reading) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose, reading])

  const readFile = async (file?: File) => {
    if (!file) return
    setReading(true)
    setStatus('ZIPを読み込み、ファイル構成を確認しています…')
    setError('')
    setArchive(null)
    setBackupSnapshot(undefined)
    try {
      const parsed = await parsePyStudioArchive(file)
      if (parsed.manifest.kind !== kind) {
        throw new Error(`この画面では${kindNames[kind]}のZIPだけを読み込めます。`)
      }
      const snapshot = kind === 'backup' ? backupSnapshotFromArchive(parsed) : undefined
      const normalizedName = parsed.manifest.name.normalize('NFKC').toLocaleLowerCase('ja')
      const duplicateName = kind !== 'backup' && existingNames.some(
        (existingName) => existingName.normalize('NFKC').toLocaleLowerCase('ja') === normalizedName,
      )
      setName(duplicateName ? `${parsed.manifest.name} (コピー)` : parsed.manifest.name)
      setBackupSnapshot(snapshot)
      setArchive(parsed)
      setStatus(duplicateName
        ? '同じ名前のデータがあるため、コピー名を設定しました。必要に応じて変更してください。'
        : '内容を確認しました。保存前に名前を確認してください。')
    } catch (readError) {
      setStatus('')
      setError(readError instanceof Error ? readError.message : 'ZIPを読み込めませんでした。')
    } finally {
      setReading(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!archive) return
    setError('')
    setStatus('保存しています…')
    try {
      await onImport(archive, name.trim(), backupSnapshot)
      setStatus('インポートが完了しました。')
    } catch (importError) {
      setStatus('')
      setError(importError instanceof Error ? importError.message : 'データを保存できませんでした。')
    }
  }

  return (
    <div className="template-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy && !reading) onClose()
    }}>
      <form className="project-dialog archive-import-dialog" role="dialog" aria-modal="true" aria-labelledby="archive-import-title" onSubmit={(event) => void submit(event)}>
        <button type="button" className="project-dialog-close" aria-label="閉じる" onClick={onClose} disabled={busy || reading}>
          <X size={17} aria-hidden="true" />
        </button>
        <span className="section-kicker">PYStudio ARCHIVE</span>
        <h2 id="archive-import-title">{kindNames[kind]}をZIPからインポート</h2>
        <p>ZIP内のコードは保存するだけで、自動実行されません。パスやファイル容量を検査してから保存します。</p>
        <label className="archive-file-picker">
          <Upload size={17} aria-hidden="true" />
          <span>{reading ? 'ZIPを検査しています…' : 'ZIPファイルを選択'}</span>
          <input type="file" accept=".zip,application/zip" onChange={(event) => void readFile(event.currentTarget.files?.[0])} disabled={reading || busy} />
        </label>
        {archive && (
          <>
            <div className="archive-import-summary">
              <Archive size={16} aria-hidden="true" />
              <div>
                <strong>{archive.manifest.name}</strong>
                <span>{archive.manifest.description || '説明はありません。'}</span>
                <span>{kind === 'backup'
                  ? `プロジェクト ${backupSnapshot?.projects.length ?? 0} 件・マイテンプレート ${backupSnapshot?.templates.length ?? 0} 件`
                  : `${Object.keys(archive.files).length} ファイル・${(Object.values(archive.files).reduce((total, content) => total + textEncoder.encode(content).byteLength, 0) / 1024).toFixed(1)} KB`}</span>
              </div>
            </div>
            <details className="archive-import-details">
              <summary>{kind === 'backup' ? '復元される項目を確認' : 'ファイル構成と内容を確認'}</summary>
              {kind === 'backup' ? (
                <ul>
                  {backupSnapshot?.projects.map((project) => <li key={`project:${project.id}`}>プロジェクト: {project.name}（{Object.keys(project.files).length}ファイル）</li>)}
                  {backupSnapshot?.templates.map((template) => <li key={`template:${template.id}`}>マイテンプレート: {template.name}（{Object.keys(template.files).length}ファイル）</li>)}
                  <li>お気に入り: {backupSnapshot?.favoriteIds.length ?? 0} 件</li>
                </ul>
              ) : (
                <ul>
                  {Object.entries(archive.files).map(([path, content]) => (
                    <li className="archive-file-row" key={path}><code>{path}</code><span>{(textEncoder.encode(content).byteLength / 1024).toFixed(1)} KB</span></li>
                  ))}
                </ul>
              )}
            </details>
            {kind !== 'backup' && (
              <label>保存名<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
            )}
          </>
        )}
        {status && <p className="archive-import-status" role="status">{status}</p>}
        {error && <p className="projects-message is-error" role="alert">{error}</p>}
        <div className="project-dialog-actions">
          <button type="button" onClick={onClose} disabled={busy || reading}>キャンセル</button>
          <button className="primary-button" type="submit" disabled={!archive || busy || reading || (kind !== 'backup' && !name.trim())}>
            {busy ? '保存しています…' : kind === 'backup' ? '既存データに追加して復元' : '新しいデータとして保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
