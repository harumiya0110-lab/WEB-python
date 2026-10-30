import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  Files,
  Gamepad2,
  Heart,
  Import,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ArchiveImportDialog } from '../components/archive/ArchiveImportDialog'
import { TemplateEditorDialog } from '../components/templates/TemplateEditorDialog'
import {
  deleteCustomTemplate,
  listCustomTemplates,
  loadTemplateFavorites,
  saveCustomTemplate,
  saveProject,
  saveTemplateFavorites,
  updateCustomTemplate,
} from '../services/localProjectService'
import {
  archiveFilenameFor,
  downloadArchive,
  exportTemplateArchive,
  importedTemplateFields,
} from '../services/archiveService'
import { projectTemplates, templateCategories } from '../templates/templateCatalog'
import type { TemplateCategory, TemplateDifficulty, UserTemplate } from '../types/template'
import {
  createProjectFromTemplate,
  toTemplateListItem,
  type TemplateListItem,
} from '../templates/templateUtils'

type SortMode = 'recommended' | 'beginner' | 'name' | 'created' | 'updated'
type TemplateCategoryFilter = 'すべて' | TemplateCategory
type DifficultyFilter = 'すべて' | TemplateDifficulty
type SourceFilter = 'all' | 'builtin' | 'custom' | 'favorites'

const categoryIcons: Record<TemplateCategory, LucideIcon> = {
  Python基礎: Code2,
  'データ構造': Database,
  '計算・数学': Calculator,
  ゲーム: Gamepad2,
  データ処理: BookOpen,
  'グラフ・可視化': ChartNoAxesCombined,
  '複数ファイル': Files,
  実用プログラム: Wrench,
}

const difficultyOrder: Record<TemplateDifficulty, number> = {
  初級: 0,
  中級: 1,
  上級: 2,
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategoryFilter>('すべて')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('すべて')
  const [sortMode, setSortMode] = useState<SortMode>('recommended')
  const [favorites, setFavorites] = useState<string[]>([])
  const [customTemplates, setCustomTemplates] = useState<UserTemplate[]>([])
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [favoritesLoading, setFavoritesLoading] = useState(true)
  const [favoritesBusy, setFavoritesBusy] = useState(false)
  const [favoritesError, setFavoritesError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null)
  const [creationTemplate, setCreationTemplate] = useState<TemplateListItem | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<UserTemplate | null>(null)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [selectedFile, setSelectedFile] = useState('main.py')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationError, setCreationError] = useState('')
  const [notice, setNotice] = useState('')
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const showRecommendations =
    !query.trim() &&
    category === 'すべて' &&
    difficulty === 'すべて' &&
    sourceFilter === 'all' &&
    sortMode === 'recommended'

  const refreshTemplateData = useCallback(async () => {
    setFavoritesLoading(true)
    try {
      const [storedFavorites, storedTemplates] = await Promise.all([
        loadTemplateFavorites(),
        listCustomTemplates(),
      ])
      const validIds = new Set([
        ...projectTemplates.map(({ id }) => id),
        ...storedTemplates.map(({ id }) => id),
      ])
      const validFavorites = storedFavorites.filter((id) => validIds.has(id))
      setCustomTemplates(storedTemplates)
      setFavorites(validFavorites)
      setFavoritesError('')
      if (validFavorites.length !== storedFavorites.length) {
        try {
          await saveTemplateFavorites(validFavorites)
        } catch (error) {
          setFavoritesError(
            error instanceof Error ? error.message : '無効なお気に入りを整理できませんでした。',
          )
        }
      }
    } catch (error) {
      setFavoritesError(
        error instanceof Error ? error.message : 'テンプレート情報を読み込めませんでした。',
      )
    } finally {
      setFavoritesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshTemplateData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshTemplateData])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const toggleFavorite = async (id: string) => {
    if (favoritesBusy || favoritesLoading) return
    setFavoritesBusy(true)
    const updated = favorites.includes(id)
      ? favorites.filter((favorite) => favorite !== id)
      : [...favorites, id]
    try {
      await saveTemplateFavorites(updated)
      setFavorites(updated)
      setFavoritesError('')
      setNotice(updated.includes(id) ? 'お気に入りに追加しました。' : 'お気に入りを解除しました。')
    } catch (error) {
      setFavoritesError(
        error instanceof Error ? error.message : 'お気に入りを保存できませんでした。',
      )
    } finally {
      setFavoritesBusy(false)
    }
  }

  const allTemplates = useMemo(
    () => [
      ...projectTemplates.map(toTemplateListItem),
      ...customTemplates.map(toTemplateListItem),
    ],
    [customTemplates],
  )

  const validFavoriteIds = useMemo(() => {
    const knownIds = new Set(allTemplates.map(({ id }) => id))
    return favorites.filter((id) => knownIds.has(id))
  }, [allTemplates, favorites])

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja')
    const filtered = allTemplates.filter((item) => {
      const searchableText = [
        item.name,
        item.description,
        item.category,
        item.difficulty ?? '',
        item.difficulty === '初級' ? '初心者 beginner' : '',
        ...item.learningPoints,
        ...item.tags,
        ...item.requiredLibraries.map((library) => library.name),
      ]
        .join(' ')
        .toLocaleLowerCase('ja')
      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (category === 'すべて' || item.category === category) &&
        (difficulty === 'すべて' || item.difficulty === difficulty) &&
        (sourceFilter === 'all' || sourceFilter === 'favorites' || (sourceFilter === 'custom') === item.isCustom) &&
        (sourceFilter !== 'favorites' || validFavoriteIds.includes(item.id))
      )
    })

    const visible = showRecommendations
      ? filtered.filter((item) => !item.featured)
      : filtered
    return visible.sort((left, right) => {
      if (sortMode === 'name') return left.name.localeCompare(right.name, 'ja')
      if (sortMode === 'created' || sortMode === 'updated') {
        if (left.isCustom !== right.isCustom) return left.isCustom ? -1 : 1
        if (left.isCustom) {
          const leftTime = sortMode === 'created' ? left.createdAt ?? 0 : left.updatedAt ?? 0
          const rightTime = sortMode === 'created' ? right.createdAt ?? 0 : right.updatedAt ?? 0
          return rightTime - leftTime || left.name.localeCompare(right.name, 'ja')
        }
        return right.sortOrder - left.sortOrder
      }
      if (sortMode === 'beginner') {
        return (left.difficulty ? difficultyOrder[left.difficulty] : 3) -
          (right.difficulty ? difficultyOrder[right.difficulty] : 3) ||
          left.name.localeCompare(right.name, 'ja')
      }
      return Number(right.recommended) - Number(left.recommended) ||
        (left.difficulty ? difficultyOrder[left.difficulty] : 3) -
          (right.difficulty ? difficultyOrder[right.difficulty] : 3) ||
        left.name.localeCompare(right.name, 'ja')
    })
  }, [allTemplates, category, difficulty, query, showRecommendations, sortMode, sourceFilter, validFavoriteIds])

  const recommendedTemplates = useMemo(
    () => projectTemplates.filter((item) => item.featured).slice(0, 5),
    [],
  )

  const openPreview = (item: TemplateListItem, trigger?: HTMLElement) => {
    restoreFocusRef.current = trigger ?? (document.activeElement as HTMLElement | null)
    setSelectedTemplate(item)
    setSelectedFile(Object.keys(item.files)[0] ?? '')
    setNotice(`${item.name}を選択しました。`)
  }

  const openCreation = (item: TemplateListItem) => {
    setCreationTemplate(item)
    setProjectName(item.name)
    setProjectDescription(item.description)
    setCreationError('')
  }

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!creationTemplate) return
    const name = projectName.trim()
    if (!name) {
      setCreationError('プロジェクト名を入力してください。')
      return
    }
    setCreating(true)
    setCreationError('')
    try {
      const project = createProjectFromTemplate(creationTemplate, name, projectDescription.trim())
      await saveProject(project)
      setNotice('プロジェクトを作成しました。エディターを開きます。')
      navigate(`/editor/${project.id}`)
    } catch (error) {
      setCreationError(
        error instanceof Error
          ? error.message
          : 'プロジェクトを作成できませんでした。もう一度お試しください。',
      )
      setCreating(false)
    }
  }

  const copyTemplateCode = async (item: TemplateListItem, path: string) => {
    try {
      await navigator.clipboard.writeText(item.files[path] ?? '')
      setNotice(`${path} のコードをコピーしました。`)
    } catch {
      setNotice('クリップボードを利用できません。ブラウザーの権限を確認してください。')
    }
  }

  const resetFilters = () => {
    setQuery('')
    setCategory('すべて')
    setDifficulty('すべて')
    setSourceFilter('all')
    setSortMode('recommended')
  }

  const openTemplateEditor = (template: UserTemplate) => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    setEditingTemplate(template)
  }

  const handleUpdateTemplate = async (updated: UserTemplate) => {
    setTemplateBusy(true)
    try {
      await updateCustomTemplate(updated)
      setCustomTemplates((templates) => templates.map((item) => item.id === updated.id ? updated : item))
      setNotice('マイテンプレートを更新しました。')
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新できませんでした。', { cause: error })
    } finally {
      setTemplateBusy(false)
    }
  }

  const downloadTemplate = (item: TemplateListItem) => {
    try {
      const archive = exportTemplateArchive({
        id: item.id,
        name: item.name,
        description: item.description,
        tags: [...item.tags],
        category: item.category,
        difficulty: item.difficulty,
        files: { ...item.files },
        directories: [...item.directories],
        activeFile: item.activeFile,
        createdAt: item.createdAt ?? 0,
        updatedAt: item.updatedAt ?? 0,
      })
      downloadArchive(archive, archiveFilenameFor(item.name))
      setNotice(`${item.name}をZIPでダウンロードしました。`)
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : 'ZIPを作成できませんでした。')
    }
  }

  const importTemplate = async (archive: Parameters<typeof importedTemplateFields>[0], name: string) => {
    setArchiveBusy(true)
    try {
      const fields = importedTemplateFields(archive)
      const now = Date.now()
      const template: UserTemplate = {
        ...fields,
        name: name.trim() || fields.name,
        tags: [...fields.tags],
        files: { ...fields.files },
        directories: [...fields.directories],
        id: `custom-${crypto.randomUUID()}`,
        createdAt: now,
        updatedAt: now,
      }
      await saveCustomTemplate(template)
      setCustomTemplates((templates) => [...templates, template])
      setNotice('テンプレートを新しいマイテンプレートとして保存しました。')
      setArchiveDialogOpen(false)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'テンプレートを保存できませんでした。', { cause: error })
    } finally {
      setArchiveBusy(false)
    }
  }

  const duplicateTemplate = async (template: UserTemplate) => {
    setTemplateBusy(true)
    try {
      const now = Date.now()
      const duplicate: UserTemplate = {
        ...template,
        id: `custom-${crypto.randomUUID()}`,
        name: `${template.name} (コピー)`,
        tags: [...template.tags],
        files: { ...template.files },
        directories: [...template.directories],
        createdAt: now,
        updatedAt: now,
      }
      await saveCustomTemplate(duplicate)
      setCustomTemplates((templates) => [...templates, duplicate])
      setNotice('マイテンプレートを複製しました。')
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : '複製できませんでした。')
    } finally {
      setTemplateBusy(false)
    }
  }

  const confirmDeleteTemplate = async () => {
    if (!deletingTemplate) return
    setTemplateBusy(true)
    try {
      await deleteCustomTemplate(deletingTemplate.id)
      setCustomTemplates((templates) => templates.filter((item) => item.id !== deletingTemplate.id))
      setFavorites((current) => current.filter((id) => id !== deletingTemplate.id))
      try {
        await saveTemplateFavorites(favorites.filter((id) => id !== deletingTemplate.id))
      } catch {
        setFavoritesError('テンプレートは削除されましたが、お気に入りの更新に失敗しました。')
      }
      setDeletingTemplate(null)
      setNotice('マイテンプレートを削除しました。作成済みプロジェクトはそのまま残ります。')
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : '削除できませんでした。')
    } finally {
      setTemplateBusy(false)
    }
  }

  useEffect(() => {
    if (!selectedTemplate && !creationTemplate && !editingTemplate && !deletingTemplate && !archiveDialogOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'
    const activeDialog = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')].at(-1)
    const focusFirst = () => {
      const dialog = activeDialog()
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()
    }
    const timer = window.setTimeout(focusFirst, 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (templateBusy || creating || editingTemplate) return
        if (archiveDialogOpen) {
          setArchiveDialogOpen(false)
          return
        }
        setSelectedTemplate(null)
        setCreationTemplate(null)
        setDeletingTemplate(null)
      } else if (event.key === 'Tab') {
        const dialog = activeDialog()
        const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>(focusableSelector)] : []
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreFocusRef.current?.focus()
    }
  }, [archiveDialogOpen, creationTemplate, creating, deletingTemplate, editingTemplate, selectedTemplate, templateBusy])

  return (
    <section className="templates-page">
      <header className="templates-heading">
        <div>
          <span className="section-kicker">PYTHON PROJECT STARTERS</span>
          <h1>Pythonテンプレート</h1>
          <p>目的に合ったテンプレートを選んで、Pythonプログラミングを始めましょう。</p>
        </div>
        <div className="templates-heading-actions">
          <button type="button" className="templates-editor-link" onClick={(event) => {
            restoreFocusRef.current = event.currentTarget
            setArchiveDialogOpen(true)
          }}>
            <Import size={15} aria-hidden="true" /> ZIPからインポート
          </button>
          <Link className="templates-editor-link" to="/editor/">
            エディターを開く <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {showRecommendations && (
      <section className="templates-recommended" aria-labelledby="recommended-title">
        <div className="templates-section-heading">
          <div>
            <span className="section-kicker">PICK A PLACE TO START</span>
            <h2 id="recommended-title"><Sparkles size={18} aria-hidden="true" /> おすすめテンプレート</h2>
          </div>
          <span>はじめての方にもおすすめ</span>
        </div>
        <div className="recommended-template-list">
          {recommendedTemplates.map((item) => {
            const Icon = categoryIcons[item.category]
            return (
              <button
                type="button"
                className="recommended-template"
                key={item.id}
                onClick={(event) => openPreview(toTemplateListItem(item), event.currentTarget)}
              >
                <span className="template-icon"><Icon size={17} aria-hidden="true" /></span>
                <span>{item.name}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>
      )}

      <nav className="template-source-tabs" aria-label="テンプレートの種類">
        {([
          ['all', 'すべて', allTemplates.length],
          ['builtin', '標準テンプレート', projectTemplates.length],
          ['custom', 'マイテンプレート', customTemplates.length],
          ['favorites', 'お気に入り', validFavoriteIds.length],
        ] as const).map(([value, label, count]) => (
          <button
            type="button"
            key={value}
            className={sourceFilter === value ? 'is-active' : ''}
            aria-pressed={sourceFilter === value}
            onClick={() => setSourceFilter(value)}
          >
            {label}<span>{count}</span>
          </button>
        ))}
      </nav>

      <div className="template-browser-toolbar">
        <label className="template-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前、説明、カテゴリー、ライブラリで検索"
            aria-label="テンプレートを検索"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="検索をクリア">
              <X size={14} />
            </button>
          )}
        </label>
        <label className="template-select">
          <span>難易度</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
            aria-label="難易度で絞り込む"
          >
            <option value="すべて">すべて</option>
            <option value="初級">初級</option>
            <option value="中級">中級</option>
            <option value="上級">上級</option>
          </select>
        </label>
        <label className="template-select">
          <span>並び替え</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label="テンプレートを並び替え"
          >
            <option value="recommended">おすすめ順</option>
            <option value="beginner">初心者向け</option>
            <option value="name">名前順</option>
            <option value="created">新着順（標準は固定順）</option>
            <option value="updated">更新順（標準は固定順）</option>
          </select>
        </label>
        <button
          type="button"
          className={`template-favorites-filter${sourceFilter === 'favorites' ? ' is-active' : ''}`}
          onClick={() => setSourceFilter((current) => current === 'favorites' ? 'all' : 'favorites')}
          aria-pressed={sourceFilter === 'favorites'}
          disabled={favoritesLoading}
        >
          <Heart size={15} fill={sourceFilter === 'favorites' ? 'currentColor' : 'none'} aria-hidden="true" />
          お気に入り <span>{validFavoriteIds.length}</span>
        </button>
      </div>

      <nav className="template-category-list" aria-label="テンプレートカテゴリー">
        <button
          type="button"
          className={category === 'すべて' ? 'is-active' : ''}
          aria-pressed={category === 'すべて'}
          onClick={() => setCategory('すべて')}
        >
          すべて <span>{allTemplates.filter((entry) =>
            sourceFilter === 'all' ||
            (sourceFilter === 'favorites' ? validFavoriteIds.includes(entry.id) : (sourceFilter === 'custom') === entry.isCustom),
          ).length}</span>
        </button>
        {templateCategories.map((item) => {
          const Icon = categoryIcons[item.name]
          const count = allTemplates.filter((entry) =>
            entry.category === item.name &&
            (sourceFilter === 'all' || sourceFilter === 'favorites' || (sourceFilter === 'custom') === entry.isCustom) &&
            (sourceFilter !== 'favorites' || validFavoriteIds.includes(entry.id)),
          ).length
          return (
            <button
              type="button"
              key={item.name}
              className={category === item.name ? 'is-active' : ''}
              aria-pressed={category === item.name}
              onClick={() => setCategory(item.name)}
              title={item.description}
            >
              <Icon size={14} aria-hidden="true" />
              {item.name}
              <span>{count}</span>
            </button>
          )
        })}
      </nav>

      {favoritesError && <p className="templates-error" role="alert">{favoritesError}</p>}
      {notice && <p className="templates-notice" role="status">{notice}</p>}

      <div className="templates-results-heading">
        <h2>
          {showRecommendations
            ? 'その他のテンプレート'
            : category === 'すべて'
              ? sourceFilter === 'custom'
                ? 'マイテンプレート'
                : sourceFilter === 'favorites'
                  ? 'お気に入り'
                  : 'テンプレート一覧'
              : category}
        </h2>
        <span>{filteredTemplates.length} 件</span>
      </div>
      {filteredTemplates.length > 0 ? (
        <div className="templates-grid">
          {filteredTemplates.map((item) => {
            const Icon = categoryIcons[item.category]
            const isFavorite = validFavoriteIds.includes(item.id)
            const customTemplate = item.isCustom
              ? customTemplates.find((template) => template.id === item.id)
              : undefined
            return (
              <article
                className="template-card"
                key={item.id}
              >
                <div className="template-card-top">
                  <span className="template-icon"><Icon size={19} aria-hidden="true" /></span>
                  <button
                    type="button"
                    className={`template-favorite-button${isFavorite ? ' is-favorite' : ''}`}
                    onClick={() => void toggleFavorite(item.id)}
                    aria-label={isFavorite ? `${item.name}をお気に入り解除` : `${item.name}をお気に入り追加`}
                    aria-pressed={isFavorite}
                    title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                    disabled={favoritesLoading || favoritesBusy}
                  >
                    <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                </div>
                <h3>{item.name}</h3>
                <p className="template-card-description">{item.description}</p>
                <p className="template-card-learning">
                  学べること: {item.learningPoints.slice(0, 2).join('・')}
                </p>
                <div className="template-badges">
                  <span className="template-category-badge">{item.category}</span>
                  <span className={`template-difficulty${item.difficulty ? ` difficulty-${item.difficulty}` : ''}`}>
                    {item.difficulty ?? '難易度未設定'}
                  </span>
                  {item.isCustom && <span className="template-category-badge">マイテンプレート</span>}
                </div>
                <div className="template-card-meta">
                  <span><Clock3 size={13} aria-hidden="true" /> {item.isCustom ? 'ユーザー作成' : `約${item.estimatedMinutes}分`}</span>
                  <span><Code2 size={13} aria-hidden="true" /> {item.libraries.map((library) => library.name).join('・')}</span>
                </div>
                <div className="template-card-actions">
                  <button type="button" className="template-preview-button" onClick={(event) => openPreview(item, event.currentTarget)}>
                    詳細を見る
                  </button>
                  <button type="button" className="primary-button" onClick={() => openCreation(item)}>
                    このテンプレートを使う
                  </button>
                </div>
                <button type="button" className="template-archive-download" onClick={() => downloadTemplate(item)}>
                  <Download size={14} aria-hidden="true" /> ZIPでダウンロード
                </button>
                {customTemplate && (
                  <div className="custom-template-actions">
                    <button type="button" onClick={() => openTemplateEditor(customTemplate)} disabled={templateBusy}>
                      <Pencil size={13} aria-hidden="true" /> 編集
                    </button>
                    <button type="button" onClick={() => void duplicateTemplate(customTemplate)} disabled={templateBusy}>
                      <Copy size={13} aria-hidden="true" /> 複製
                    </button>
                    <button type="button" className="is-danger" onClick={() => setDeletingTemplate(customTemplate)} disabled={templateBusy}>
                      <Trash2 size={13} aria-hidden="true" /> 削除
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="templates-empty">
          {sourceFilter === 'custom' && customTemplates.length === 0 && !query.trim() ? (
            <>
              <Files size={25} aria-hidden="true" />
              <h3>マイテンプレートはまだありません</h3>
              <p>プロジェクト一覧から、保存したいプロジェクトをテンプレートとして保存できます。</p>
              <Link className="primary-button" to="/projects">プロジェクトを開く <ArrowRight size={14} /></Link>
            </>
          ) : (
            <>
              <Search size={25} aria-hidden="true" />
              <h3>条件に一致するテンプレートがありません</h3>
              <p>キーワードや絞り込み条件を変えて、もう一度お試しください。</p>
              <button type="button" onClick={resetFilters}>絞り込みをクリア</button>
            </>
          )}
        </div>
      )}

      {selectedTemplate && (
        <div
          className="template-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTemplate(null)
          }}
        >
          <section
            className="template-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-detail-title"
          >
            <button
              className="template-modal-close"
              type="button"
              aria-label="閉じる"
              onClick={() => setSelectedTemplate(null)}
            >
              <X size={19} aria-hidden="true" />
            </button>
            <div className="template-detail-header">
              <span className="template-icon">
                {(() => {
                  const Icon = categoryIcons[selectedTemplate.category]
                  return <Icon size={21} aria-hidden="true" />
                })()}
              </span>
              <div>
                <span className="section-kicker">{selectedTemplate.category}</span>
                <h2 id="template-detail-title">{selectedTemplate.name}</h2>
                <p>{selectedTemplate.description}</p>
                {selectedTemplate.isCustom && <span className="template-custom-source">マイテンプレート</span>}
              </div>
            </div>
            <div className="template-detail-scroll">
              <div className="template-detail-facts">
                <span className={`template-difficulty${selectedTemplate.difficulty ? ` difficulty-${selectedTemplate.difficulty}` : ''}`}>
                  難易度: {selectedTemplate.difficulty ?? '未設定'}
                </span>
                {!selectedTemplate.isCustom && <span><Clock3 size={14} /> 約{selectedTemplate.estimatedMinutes}分</span>}
                <span>ライブラリ: {selectedTemplate.libraries.map((library) => library.name).join('、')}</span>
                <span>
                  {selectedTemplate.libraries.some((library) => library.support === 'Pyodideで自動読み込み')
                    ? 'Pyodideで自動読み込み（初回ダウンロード）'
                    : 'Python標準ライブラリのみ'}
                </span>
              </div>
              <div className="template-detail-columns">
                <section>
                  <h3>このプログラムでできること</h3>
                  <p>{selectedTemplate.whatYouCanDo}</p>
                  <h3>このコードで学べること</h3>
                  <ul>
                    {selectedTemplate.learningPoints.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  <h3>実行方法</h3>
                  <p>{selectedTemplate.runInstructions}</p>
                  <h3>完成時の動作</h3>
                  <p>{selectedTemplate.expectedBehavior}</p>
                  <h3>ライブラリについて</h3>
                  <ul className="template-library-list">
                    {selectedTemplate.libraries.map((library) => (
                      <li key={library.name}>
                        <strong>{library.name}: {library.support}</strong>
                        {library.note && <span>{library.note}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="template-files-section">
                  <h3>ファイル構成</h3>
                  <ul className="template-file-list">
                    {selectedTemplate.directories.map((path) => (
                      <li key={`directory:${path}`} className="template-directory-entry">
                        <span><Files size={13} aria-hidden="true" /> {path}/</span>
                      </li>
                    ))}
                    {Object.keys(selectedTemplate.files).map((path) => (
                      <li key={path} className={selectedFile === path ? 'is-selected' : ''}>
                        <button type="button" onClick={() => setSelectedFile(path)}>
                          <Code2 size={13} aria-hidden="true" /> {path}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="template-code-heading">
                    <span>{selectedFile}</span>
                    <button
                      type="button"
                      onClick={() => void copyTemplateCode(selectedTemplate, selectedFile)}
                    >
                      <Copy size={13} aria-hidden="true" /> コピー
                    </button>
                  </div>
                  <pre className="template-code"><code>{selectedTemplate.files[selectedFile]}</code></pre>
                </section>
              </div>
            </div>
            <footer className="template-detail-footer">
              <button type="button" className="template-preview-button" onClick={() => setSelectedTemplate(null)}>
                閉じる
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setSelectedTemplate(null)
                  openCreation(selectedTemplate)
                }}
              >
                このテンプレートを使う <ArrowRight size={15} aria-hidden="true" />
              </button>
            </footer>
          </section>
        </div>
      )}

      {creationTemplate && (
        <div className="template-modal-backdrop">
          <form
            className="template-create-modal"
            onSubmit={(event) => void handleCreateProject(event)}
            aria-labelledby="template-create-title"
            role="dialog"
            aria-modal="true"
          >
            <button
              className="template-modal-close"
              type="button"
              aria-label="閉じる"
              onClick={() => !creating && setCreationTemplate(null)}
              disabled={creating}
            >
              <X size={19} aria-hidden="true" />
            </button>
            <span className="section-kicker">NEW PYTHON PROJECT</span>
            <h2 id="template-create-title">プロジェクトを作成</h2>
            <p className="template-create-description">{creationTemplate.name}のファイルを新しいプロジェクトとして保存します。</p>
            <label>
              プロジェクト名
              <input
                autoFocus
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              プロジェクトの説明
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </label>
            <div className="template-create-files">
              <strong>作成されるファイル ({Object.keys(creationTemplate.files).length})</strong>
              {Object.entries(creationTemplate.files).map(([path, contents]) => (
                <div key={path}>
                  <Code2 size={14} aria-hidden="true" />
                  <span>{path}</span>
                  <small>{contents.split('\n').length - (contents.endsWith('\n') ? 1 : 0)} 行</small>
                </div>
              ))}
            </div>
            <p className="template-library-warning">
              {creationTemplate.libraries.some((library) => library.support === 'Pyodideで自動読み込み')
                ? `Pyodideで自動読み込み: ${creationTemplate.libraries.filter((library) => library.support === 'Pyodideで自動読み込み').map((library) => library.name).join('、')}（初回実行時にダウンロードが必要です）`
                : creationTemplate.libraries.some((library) => library.support === '要確認（自動判定なし）')
                  ? 'マイテンプレートのライブラリ依存は自動判定していません。コードのimport文を確認してください。'
                  : 'Python標準ライブラリのみで実行できます。'}
            </p>
            {creationError && <p className="templates-error" role="alert">{creationError}</p>}
            <div className="template-create-actions">
              <button type="button" onClick={() => setCreationTemplate(null)} disabled={creating}>キャンセル</button>
              <button className="primary-button" type="submit" disabled={creating}>
                {creating ? '作成しています…' : '作成してエディターへ'} <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTemplate && (
        <TemplateEditorDialog
          template={editingTemplate}
          busy={templateBusy}
          onSave={handleUpdateTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      {archiveDialogOpen && (
        <ArchiveImportDialog
          kind="template"
          busy={archiveBusy}
          existingNames={allTemplates.map((template) => template.name)}
          onImport={(archive, name) => importTemplate(archive, name)}
          onClose={() => setArchiveDialogOpen(false)}
        />
      )}

      {deletingTemplate && (
        <div className="template-modal-backdrop">
          <section className="template-create-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-custom-template-title">
            <button className="template-modal-close" type="button" aria-label="閉じる" onClick={() => setDeletingTemplate(null)} disabled={templateBusy}>
              <X size={19} aria-hidden="true" />
            </button>
            <span className="section-kicker">MY TEMPLATE</span>
            <h2 id="delete-custom-template-title">テンプレートを削除しますか？</h2>
            <p className="template-create-description">「{deletingTemplate.name}」を削除します。ここから作成したプロジェクトやファイルは削除されません。</p>
            {favoritesError && <p className="templates-error" role="alert">{favoritesError}</p>}
            <div className="template-create-actions">
              <button type="button" onClick={() => setDeletingTemplate(null)} disabled={templateBusy}>キャンセル</button>
              <button type="button" className="danger-button" onClick={() => void confirmDeleteTemplate()} disabled={templateBusy}>
                {templateBusy ? '削除しています…' : '削除する'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
