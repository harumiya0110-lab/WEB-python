import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  Clock3,
  Code2,
  Copy,
  Database,
  Files,
  Gamepad2,
  Heart,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadTemplateFavorites,
  saveProject,
  saveTemplateFavorites,
} from '../services/localProjectService'
import { projectTemplates, templateCategories } from '../templates/templateCatalog'
import type {
  ProjectTemplate,
  TemplateCategory,
  TemplateDifficulty,
} from '../types/template'

type SortMode = 'recommended' | 'beginner' | 'name' | 'newest'
type TemplateCategoryFilter = 'すべて' | TemplateCategory
type DifficultyFilter = 'すべて' | TemplateDifficulty

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

function createProjectFromTemplate(
  template: ProjectTemplate,
  name: string,
  description: string,
) {
  const now = Date.now()
  const paths = Object.keys(template.files)
  const activeFile =
    template.activeFile ||
    paths.find((path) => path.endsWith('.py')) ||
    paths[0] ||
    ''
  return {
    id: crypto.randomUUID(),
    name,
    description,
    files: { ...template.files },
    directories: [...template.directories],
    openFiles: activeFile ? [activeFile] : [],
    activeFile,
    createdAt: now,
    updatedAt: now,
  }
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategoryFilter>('すべて')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('すべて')
  const [sortMode, setSortMode] = useState<SortMode>('recommended')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(true)
  const [favoritesBusy, setFavoritesBusy] = useState(false)
  const [favoritesError, setFavoritesError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [creationTemplate, setCreationTemplate] = useState<ProjectTemplate | null>(null)
  const [selectedFile, setSelectedFile] = useState('main.py')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [creationError, setCreationError] = useState('')
  const [notice, setNotice] = useState('')
  const showRecommendations =
    !query.trim() &&
    category === 'すべて' &&
    difficulty === 'すべて' &&
    !favoritesOnly &&
    sortMode === 'recommended'

  const refreshFavorites = useCallback(async () => {
    setFavoritesLoading(true)
    try {
      setFavorites(await loadTemplateFavorites())
      setFavoritesError('')
    } catch (error) {
      setFavoritesError(
        error instanceof Error ? error.message : 'お気に入りを読み込めませんでした。',
      )
    } finally {
      setFavoritesLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshFavorites(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshFavorites])

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

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja')
    const filtered = projectTemplates.filter((item) => {
      const searchableText = [
        item.name,
        item.description,
        item.category,
        item.difficulty,
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
        (!favoritesOnly || favorites.includes(item.id))
      )
    })

    const visible = showRecommendations
      ? filtered.filter((item) => !item.featured)
      : filtered
    return visible.sort((left, right) => {
      if (sortMode === 'name') return left.name.localeCompare(right.name, 'ja')
      if (sortMode === 'newest') return right.createdAt - left.createdAt
      if (sortMode === 'beginner') {
        return difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty] ||
          left.name.localeCompare(right.name, 'ja')
      }
      return Number(right.recommended) - Number(left.recommended) ||
        difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty] ||
        left.name.localeCompare(right.name, 'ja')
    })
  }, [category, difficulty, favorites, favoritesOnly, query, showRecommendations, sortMode])

  const recommendedTemplates = useMemo(
    () => projectTemplates.filter((item) => item.featured).slice(0, 5),
    [],
  )

  const openPreview = (item: ProjectTemplate) => {
    setSelectedTemplate(item)
    setSelectedFile(Object.keys(item.files)[0] ?? '')
    setNotice(`${item.name}を選択しました。`)
  }

  const openCreation = (item: ProjectTemplate) => {
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
      const project = createProjectFromTemplate(
        creationTemplate,
        name,
        projectDescription.trim(),
      )
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

  const copyTemplateCode = async (item: ProjectTemplate, path: string) => {
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
    setFavoritesOnly(false)
    setSortMode('recommended')
  }

  return (
    <section className="templates-page">
      <header className="templates-heading">
        <div>
          <span className="section-kicker">PYTHON PROJECT STARTERS</span>
          <h1>Pythonテンプレート</h1>
          <p>目的に合ったテンプレートを選んで、Pythonプログラミングを始めましょう。</p>
        </div>
        <Link className="templates-editor-link" to="/editor/">
          エディターを開く <ArrowRight size={15} aria-hidden="true" />
        </Link>
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
                onClick={() => openPreview(item)}
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
            <option value="newest">新着順</option>
          </select>
        </label>
        <button
          type="button"
          className={`template-favorites-filter${favoritesOnly ? ' is-active' : ''}`}
          onClick={() => setFavoritesOnly((current) => !current)}
          aria-pressed={favoritesOnly}
          disabled={favoritesLoading}
        >
          <Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} aria-hidden="true" />
          お気に入り <span>{favorites.length}</span>
        </button>
      </div>

      <nav className="template-category-list" aria-label="テンプレートカテゴリー">
        <button
          type="button"
          className={category === 'すべて' ? 'is-active' : ''}
          aria-pressed={category === 'すべて'}
          onClick={() => setCategory('すべて')}
        >
          すべて <span>{projectTemplates.length}</span>
        </button>
        {templateCategories.map((item) => {
          const Icon = categoryIcons[item.name]
          const count = projectTemplates.filter((entry) => entry.category === item.name).length
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
              ? 'テンプレート一覧'
              : category}
        </h2>
        <span>{filteredTemplates.length} 件</span>
      </div>
      {filteredTemplates.length > 0 ? (
        <div className="templates-grid">
          {filteredTemplates.map((item) => {
            const Icon = categoryIcons[item.category]
            const isFavorite = favorites.includes(item.id)
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
                  <span className={`template-difficulty difficulty-${item.difficulty}`}>{item.difficulty}</span>
                </div>
                <div className="template-card-meta">
                  <span><Clock3 size={13} aria-hidden="true" /> 約{item.estimatedMinutes}分</span>
                  <span><Code2 size={13} aria-hidden="true" /> {item.libraries.map((library) => library.name).join('・')}</span>
                </div>
                <div className="template-card-actions">
                  <button type="button" className="template-preview-button" onClick={() => openPreview(item)}>
                    詳細を見る
                  </button>
                  <button type="button" className="primary-button" onClick={() => openCreation(item)}>
                    このテンプレートを使う
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="templates-empty">
          <Search size={25} aria-hidden="true" />
          <h3>条件に一致するテンプレートがありません</h3>
          <p>キーワードや絞り込み条件を変えて、もう一度お試しください。</p>
          <button type="button" onClick={resetFilters}>絞り込みをクリア</button>
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
              </div>
            </div>
            <div className="template-detail-scroll">
              <div className="template-detail-facts">
                <span className={`template-difficulty difficulty-${selectedTemplate.difficulty}`}>
                  難易度: {selectedTemplate.difficulty}
                </span>
                <span><Clock3 size={14} /> 約{selectedTemplate.estimatedMinutes}分</span>
                <span>ライブラリ: {selectedTemplate.libraries.map((library) => library.name).join('、')}</span>
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
            {creationTemplate.libraries.some((library) => library.support === 'Pyodideで自動読み込み') && (
              <p className="template-library-warning">
                {creationTemplate.libraries
                  .filter((library) => library.support === 'Pyodideで自動読み込み')
                  .map((library) => library.note)
                  .filter(Boolean)
                  .join(' ')}
              </p>
            )}
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
    </section>
  )
}
