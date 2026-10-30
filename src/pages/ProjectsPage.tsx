import {
  Bookmark,
  Clock3,
  Code2,
  Copy,
  Download,
  Import,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArchiveImportDialog } from '../components/archive/ArchiveImportDialog'
import {
  archiveFilenameFor,
  downloadArchive,
  exportBackupArchive,
  exportProjectArchive,
  importedProjectFields,
  type BackupSnapshot,
} from '../services/archiveService'
import {
  deleteProject,
  listProjects,
  loadBackupSnapshot,
  saveCustomTemplate,
  saveProject,
  restoreBackupSnapshot,
} from '../services/localProjectService'
import type { Project } from '../types/project'
import type { TemplateCategory, TemplateDifficulty } from '../types/template'
import { templateCategories } from '../templates/templateCatalog'
import { createUserTemplateFromProject } from '../templates/templateUtils'
import type { ParsedPyStudioArchive, PyStudioArchiveKind } from '../types/archive'

function createProject(name: string): Project {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    description: '',
    files: { 'main.py': 'print("Hello, PyStudio!")\n' },
    directories: [],
    openFiles: ['main.py'],
    activeFile: 'main.py',
    createdAt: now,
    updatedAt: now,
  }
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [templateProject, setTemplateProject] = useState<Project | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateTags, setTemplateTags] = useState('')
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('Python基礎')
  const [templateDifficulty, setTemplateDifficulty] = useState<TemplateDifficulty | ''>('')
  const [archiveKind, setArchiveKind] = useState<PyStudioArchiveKind | null>(null)
  const [archiveBusy, setArchiveBusy] = useState(false)

  const refreshProjects = useCallback(async () => {
    setLoading(true)
    try {
      const savedProjects = await listProjects()
      setProjects(savedProjects.sort((a, b) => b.updatedAt - a.updatedAt))
      setError('')
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'プロジェクトを読み込めませんでした。',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshProjects(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshProjects])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ja')
    if (!query) return projects
    return projects.filter((project) =>
      `${project.name} ${project.description ?? ''}`
        .toLocaleLowerCase('ja')
        .includes(query),
    )
  }, [projects, search])

  const handleCreate = async () => {
    setBusy(true)
    setError('')
    const project = createProject('新しいプロジェクト')
    try {
      await saveProject(project)
      navigate(`/editor/${project.id}`)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'プロジェクトを作成できませんでした。',
      )
    } finally {
      setBusy(false)
    }
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setProjectName(project.name)
    setProjectDescription(project.description ?? '')
    setDialogError('')
  }

  const handleEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProject) return
    const name = projectName.trim()
    if (!name) {
      setDialogError('プロジェクト名を入力してください。')
      return
    }
    setBusy(true)
    try {
      await saveProject({
        ...editingProject,
        name,
        description: projectDescription.trim(),
        updatedAt: Date.now(),
      })
      setEditingProject(null)
      setNotice('プロジェクトを更新しました。')
      await refreshProjects()
    } catch (saveError) {
      setDialogError(
        saveError instanceof Error
          ? saveError.message
          : '変更を保存できませんでした。',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async (project: Project) => {
    setBusy(true)
    setError('')
    const now = Date.now()
    const copy: Project = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (コピー)`,
      files: { ...project.files },
      directories: [...project.directories],
      openFiles: [...project.openFiles],
      createdAt: now,
      updatedAt: now,
    }
    try {
      await saveProject(copy)
      setNotice('プロジェクトを複製しました。')
      await refreshProjects()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'プロジェクトを複製できませんでした。',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    setBusy(true)
    setError('')
    try {
      await deleteProject(deletingProject.id)
      setDeletingProject(null)
      setNotice('プロジェクトを削除しました。')
      await refreshProjects()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'プロジェクトを削除できませんでした。',
      )
    } finally {
      setBusy(false)
    }
  }

  const openSaveTemplate = (project: Project) => {
    setTemplateProject(project)
    setTemplateName(project.name)
    setTemplateDescription(project.description ?? '')
    setTemplateTags('')
    setTemplateCategory('Python基礎')
    setTemplateDifficulty('')
    setDialogError('')
  }

  const handleSaveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!templateProject) return
    const name = templateName.trim()
    if (!name) {
      setDialogError('テンプレート名を入力してください。')
      return
    }
    setBusy(true)
    setDialogError('')
    try {
      const template = createUserTemplateFromProject(templateProject, {
        name,
        description: templateDescription,
        tags: templateTags.split(','),
        category: templateCategory,
        ...(templateDifficulty ? { difficulty: templateDifficulty } : {}),
      })
      await saveCustomTemplate(template)
      setTemplateProject(null)
      setNotice('マイテンプレートとして保存しました。')
    } catch (saveError) {
      setDialogError(
        saveError instanceof Error ? saveError.message : 'テンプレートを保存できませんでした。',
      )
    } finally {
      setBusy(false)
    }
  }

  const downloadProject = (project: Project) => {
    try {
      downloadArchive(exportProjectArchive(project), archiveFilenameFor(project.name))
      setNotice(`${project.name}をZIPでダウンロードしました。`)
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'ZIPを作成できませんでした。')
    }
  }

  const downloadBackup = async () => {
    setBusy(true)
    setError('')
    try {
      const snapshot = await loadBackupSnapshot()
      downloadArchive(exportBackupArchive(snapshot), `PyStudio_Backup_${new Date().toISOString().slice(0, 10)}.zip`)
      setNotice('全プロジェクト、マイテンプレート、お気に入りのバックアップを作成しました。')
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'バックアップを作成できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  const importArchive = async (archive: ParsedPyStudioArchive, name: string, snapshot?: BackupSnapshot) => {
    setArchiveBusy(true)
    try {
      if (archive.manifest.kind === 'project') {
        const fields = importedProjectFields(archive)
        const now = Date.now()
        const project: Project = {
          ...fields,
          name: name.trim() || fields.name,
          id: crypto.randomUUID(),
          files: { ...fields.files },
          directories: [...fields.directories],
          openFiles: [fields.activeFile],
          createdAt: now,
          updatedAt: now,
        }
        await saveProject(project)
        await refreshProjects()
        setNotice('ZIPから新しいプロジェクトをインポートしました。')
      } else if (archive.manifest.kind === 'backup' && snapshot) {
        const result = await restoreBackupSnapshot(snapshot)
        await refreshProjects()
        setNotice(`復元しました（プロジェクト ${result.projects} 件、マイテンプレート ${result.templates} 件）。既存データは保持されています。`)
      } else {
        throw new Error('このZIPはプロジェクトまたはバックアップとして読み込めません。')
      }
      setArchiveKind(null)
    } catch (archiveError) {
      throw new Error(archiveError instanceof Error ? archiveError.message : 'ZIPの保存に失敗しました。', { cause: archiveError })
    } finally {
      setArchiveBusy(false)
    }
  }

  return (
    <section className="projects-page">
      <header className="projects-heading">
        <div>
          <span className="section-kicker">YOUR WORKSPACES</span>
          <h1>プロジェクト</h1>
          <p>プロジェクトを作成し、ファイルやコードをまとめて管理できます。</p>
        </div>
        <div className="projects-heading-actions">
          <button type="button" className="project-secondary-action" onClick={() => setArchiveKind('project')} disabled={busy}>
            <Import size={15} aria-hidden="true" /> ZIPからインポート
          </button>
          <button type="button" className="project-secondary-action" onClick={() => setArchiveKind('backup')} disabled={busy}>
            <Download size={15} aria-hidden="true" /> バックアップを復元
          </button>
          <button type="button" className="project-secondary-action" onClick={() => void downloadBackup()} disabled={busy}>
            <Download size={15} aria-hidden="true" /> バックアップ作成
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy}
          >
            <Plus size={17} aria-hidden="true" />
            新しいプロジェクト
          </button>
        </div>
      </header>

      <label className="project-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="プロジェクトを検索"
          aria-label="プロジェクトを検索"
        />
      </label>

      {error && <p className="projects-message is-error" role="alert">{error}</p>}
      {notice && <p className="projects-message" role="status">{notice}</p>}
      {loading ? (
        <p className="projects-empty">プロジェクトを読み込んでいます…</p>
      ) : filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-icon">
                <Code2 size={20} aria-hidden="true" />
              </div>
              <h2>{project.name}</h2>
              <p className="project-description">
                {project.description || 'プロジェクトの説明はありません。'}
              </p>
              <div className="project-card-meta">
                <span>{Object.keys(project.files).length} ファイル</span>
                <span>
                  <Clock3 size={13} aria-hidden="true" />
                  {formatDate(project.updatedAt)}
                </span>
                <span>
                  最終実行: {project.lastRunAt ? formatDate(project.lastRunAt) : '未実行'}
                </span>
              </div>
              <div className="project-card-actions">
                <Link className="primary-button" to={`/editor/${project.id}`}>
                  開く
                </Link>
                <button
                  type="button"
                  aria-label={`${project.name} の説明と名前を編集`}
                  onClick={() => openEditDialog(project)}
                  disabled={busy}
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`${project.name} を複製`}
                  onClick={() => void handleDuplicate(project)}
                  disabled={busy}
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
                <button
                  className="is-danger"
                  type="button"
                  aria-label={`${project.name} を削除`}
                  onClick={() => setDeletingProject(project)}
                  disabled={busy}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              <button type="button" className="project-template-save project-archive-download" onClick={() => downloadProject(project)} disabled={busy}>
                <Download size={14} aria-hidden="true" /> ZIPでダウンロード
              </button>
              <button
                type="button"
                className="project-template-save"
                onClick={() => openSaveTemplate(project)}
                disabled={busy}
              >
                <Bookmark size={14} aria-hidden="true" /> テンプレートとして保存
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="projects-empty">
          <FolderPlus size={27} aria-hidden="true" />
          <p>{search ? '一致するプロジェクトがありません。' : 'プロジェクトはまだありません。'}</p>
          {!search && (
            <button type="button" className="text-link" onClick={() => void handleCreate()}>
              最初のプロジェクトを作成
            </button>
          )}
        </div>
      )}

      {editingProject && (
        <div className="project-dialog-backdrop">
          <form
            className="project-dialog"
            onSubmit={(event) => void handleEdit(event)}
            aria-labelledby="edit-project-title"
          >
            <button
              className="project-dialog-close"
              type="button"
              aria-label="閉じる"
              onClick={() => setEditingProject(null)}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2 id="edit-project-title">プロジェクトを編集</h2>
            <label>
              プロジェクト名
              <input
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              説明
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                rows={3}
                maxLength={240}
              />
            </label>
            {dialogError && <p className="projects-message is-error" role="alert">{dialogError}</p>}
            <div className="project-dialog-actions">
              <button type="button" onClick={() => setEditingProject(null)} disabled={busy}>
                キャンセル
              </button>
              <button className="primary-button" type="submit" disabled={busy}>
                保存
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingProject && (
        <div className="project-dialog-backdrop">
          <section className="project-dialog" role="alertdialog" aria-labelledby="delete-project-title">
            <button
              className="project-dialog-close"
              type="button"
              aria-label="閉じる"
              onClick={() => setDeletingProject(null)}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2 id="delete-project-title">プロジェクトを削除しますか？</h2>
            <p>
              「{deletingProject.name}」と保存されたファイルを削除します。この操作は取り消せません。
            </p>
            {error && <p className="projects-message is-error" role="alert">{error}</p>}
            <div className="project-dialog-actions">
              <button type="button" onClick={() => setDeletingProject(null)} disabled={busy}>
                キャンセル
              </button>
              <button className="danger-button" type="button" onClick={() => void handleDelete()} disabled={busy}>
                削除する
              </button>
            </div>
          </section>
        </div>
      )}
      {templateProject && (
        <div className="project-dialog-backdrop">
          <form
            className="project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-template-title"
            onSubmit={(event) => void handleSaveTemplate(event)}
          >
            <button
              className="project-dialog-close"
              type="button"
              aria-label="閉じる"
              onClick={() => setTemplateProject(null)}
              disabled={busy}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2 id="save-template-title">テンプレートとして保存</h2>
            <p>プロジェクトのファイルとコードをコピーして、再利用できるマイテンプレートを作成します。元のプロジェクトは変更されません。</p>
            <label>
              テンプレート名
              <input autoFocus value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} required />
            </label>
            <label>
              説明
              <textarea value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} maxLength={500} rows={3} />
            </label>
            <label>
              タグ（カンマ区切り）
              <input value={templateTags} onChange={(event) => setTemplateTags(event.target.value)} placeholder="学習, 基礎" maxLength={200} />
            </label>
            <label>
              カテゴリー
              <select value={templateCategory} onChange={(event) => setTemplateCategory(event.target.value as TemplateCategory)}>
                {templateCategories.map(({ name }) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label>
              難易度（任意）
              <select value={templateDifficulty} onChange={(event) => setTemplateDifficulty(event.target.value as TemplateDifficulty | '')}>
                <option value="">未設定</option>
                <option value="初級">初級</option>
                <option value="中級">中級</option>
                <option value="上級">上級</option>
              </select>
            </label>
            {dialogError && <p className="projects-message is-error" role="alert">{dialogError}</p>}
            <div className="project-dialog-actions">
              <button type="button" onClick={() => setTemplateProject(null)} disabled={busy}>キャンセル</button>
              <button type="submit" className="primary-button" disabled={busy}>{busy ? '保存しています…' : 'テンプレートを保存'}</button>
            </div>
          </form>
        </div>
      )}
      {archiveKind && (
        <ArchiveImportDialog
          kind={archiveKind}
          busy={archiveBusy}
          existingNames={projects.map((project) => project.name)}
          onImport={(archive, name, snapshot) => importArchive(archive, name, snapshot)}
          onClose={() => {
            if (!archiveBusy) setArchiveKind(null)
          }}
        />
      )}
    </section>
  )
}
