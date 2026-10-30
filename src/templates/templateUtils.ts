import { isValidProjectPath } from '../types/project'
import type { Project } from '../types/project'
import type {
  ProjectTemplate,
  TemplateCategory,
  TemplateDifficulty,
  UserTemplate,
} from '../types/template'
import { templateCategories } from './templateCatalog'

export type TemplateListItem = Omit<ProjectTemplate, 'difficulty' | 'createdAt'> & {
  difficulty?: ProjectTemplate['difficulty']
  createdAt?: number
  updatedAt?: number
  isCustom: boolean
}

export function toTemplateListItem(template: ProjectTemplate | UserTemplate): TemplateListItem {
  if ('sortOrder' in template) return { ...template, isCustom: false }
  return {
    id: template.id,
    name: template.name,
    title: template.name,
    description: template.description,
    category: template.category,
    ...(template.difficulty ? { difficulty: template.difficulty } : {}),
    tags: [...template.tags],
    icon: 'Code2',
    estimatedMinutes: 0,
    recommended: false,
    featured: false,
    sortOrder: 0,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    whatYouCanDo: template.description,
    learningPoints: [...template.tags],
    runInstructions: 'プロジェクトを作成して「実行」を押します。',
    expectedBehavior: 'テンプレートに保存されたコードが実行されます。',
    libraries: [{
      name: '利用ライブラリ',
      support: '要確認（自動判定なし）',
      note: 'マイテンプレートの保存時にimport依存関係は解析していません。',
    }],
    requiredLibraries: [{
      name: '利用ライブラリ',
      support: '要確認（自動判定なし）',
      note: 'マイテンプレートの保存時にimport依存関係は解析していません。',
    }],
    availability: 'manual-review',
    files: { ...template.files },
    directories: [...template.directories],
    activeFile: template.activeFile,
    isCustom: true,
  }
}

export function createProjectFromTemplate(
  template: Pick<UserTemplate, 'name' | 'description' | 'files' | 'directories' | 'activeFile'>,
  name = template.name,
  description = template.description,
): Project {
  const now = Date.now()
  const files = { ...template.files }
  const activeFile =
    files[template.activeFile] !== undefined && template.activeFile.endsWith('.py')
      ? template.activeFile
      : Object.keys(files).find((path) => path.endsWith('.py')) ?? Object.keys(files)[0] ?? ''
  return {
    id: crypto.randomUUID(),
    name,
    description,
    files,
    directories: [...template.directories],
    openFiles: activeFile ? [activeFile] : [],
    activeFile,
    createdAt: now,
    updatedAt: now,
  }
}

export function createUserTemplateFromProject(
  project: Project,
  metadata: {
    name: string
    description: string
    tags: string[]
    category: TemplateCategory
    difficulty?: TemplateDifficulty
  },
): UserTemplate {
  const files = { ...project.files }
  const pythonFiles = Object.keys(files).filter((path) => path.endsWith('.py'))
  if (!pythonFiles.length) {
    throw new Error('Pythonファイル（.py）がないプロジェクトはテンプレートとして保存できません。')
  }
  const invalidPath = [...Object.keys(files), ...project.directories].find(
    (path) => !isValidProjectPath(path),
  )
  if (invalidPath) throw new Error(`使用できないファイルまたはフォルダーパスです: ${invalidPath}`)
  const activeFile =
    files[project.activeFile] !== undefined && project.activeFile.endsWith('.py')
      ? project.activeFile
      : pythonFiles[0]
  const now = Date.now()
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: metadata.name.trim(),
    description: metadata.description.trim(),
    tags: [...new Set(metadata.tags.map((tag) => tag.trim()).filter(Boolean))],
    category: metadata.category,
    ...(metadata.difficulty ? { difficulty: metadata.difficulty } : {}),
    files,
    directories: [...project.directories],
    activeFile,
    createdAt: now,
    updatedAt: now,
  }
}

export function validateTemplateCatalog(
  templates: ProjectTemplate[],
  categories: Array<{ name: TemplateCategory }> = templateCategories,
): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const categoryNames = new Set(categories.map(({ name }) => name))
  const difficulties = new Set(['初級', '中級', '上級'])

  for (const template of templates) {
    const label = template.id || '(IDなし)'
    if (!template.id || ids.has(template.id)) errors.push(`${label}: IDが空または重複しています`)
    ids.add(template.id)
    if (!template.name.trim()) errors.push(`${label}: 名前が空です`)
    if (!template.description.trim()) errors.push(`${label}: 説明がありません`)
    if (!categoryNames.has(template.category)) errors.push(`${label}: 未定義のカテゴリーです`)
    if (!difficulties.has(template.difficulty)) errors.push(`${label}: 難易度が不正です`)
    if (!template.learningPoints.length) errors.push(`${label}: 学習内容がありません`)
    if (!template.requiredLibraries.length) errors.push(`${label}: 必要ライブラリ情報がありません`)
    if (!Object.keys(template.files).some((path) => path.endsWith('.py'))) {
      errors.push(`${label}: Pythonファイルがありません`)
    }
    if (!Object.hasOwn(template.files, template.activeFile) || !template.activeFile.endsWith('.py')) {
      errors.push(`${label}: 開始Pythonファイルが存在しません`)
    }

    const filePaths = Object.keys(template.files)
    const directories = new Set(template.directories)
    if (directories.size !== template.directories.length) errors.push(`${label}: フォルダーが重複しています`)
    for (const path of filePaths) {
      if (!isValidProjectPath(path)) errors.push(`${label}: 不正なファイルパス ${path}`)
      if (typeof template.files[path] !== 'string') errors.push(`${label}: ファイル内容が文字列ではありません ${path}`)
      const pathParts = path.split('/')
      for (let index = 1; index < pathParts.length; index += 1) {
        const parent = pathParts.slice(0, index).join('/')
        if (!directories.has(parent)) errors.push(`${label}: 親フォルダーがありません ${parent}`)
      }
    }
    for (const directory of template.directories) {
      if (!isValidProjectPath(directory)) errors.push(`${label}: 不正なフォルダーパス ${directory}`)
      if (filePaths.some((path) => directory === path || directory.startsWith(`${path}/`))) {
        errors.push(`${label}: ファイルとフォルダーが競合しています ${directory}`)
      }
      const directoryParts = directory.split('/')
      for (let index = 1; index < directoryParts.length; index += 1) {
        const parent = directoryParts.slice(0, index).join('/')
        if (!directories.has(parent)) errors.push(`${label}: 親フォルダーがありません ${parent}`)
      }
      if (filePaths.some((path) => path.startsWith(`${directory}/`)) === false &&
          !template.directories.some((path) => path.startsWith(`${directory}/`))) {
        errors.push(`${label}: 空でない子要素のないフォルダーです ${directory}`)
      }
    }
    for (const requiredPath of [template.activeFile, ...filePaths]) {
      const conflictingFile = filePaths.find(
        (path) => path !== requiredPath && requiredPath.startsWith(`${path}/`),
      )
      if (conflictingFile) errors.push(`${label}: ファイルパスが親ファイルと競合しています ${requiredPath}`)
    }
    if (template.libraries.some(({ name, support }) => !name.trim() || !support)) {
      errors.push(`${label}: ライブラリ情報が不完全です`)
    }
    if (
      template.requiredLibraries.map(({ name }) => name).sort().join('|') !==
      template.libraries.map(({ name }) => name).sort().join('|')
    ) {
      errors.push(`${label}: 必要ライブラリ情報が一致しません`)
    }
    if (
      template.availability === 'available' &&
      template.requiredLibraries.some(({ support }) => support !== '標準ライブラリ')
    ) {
      errors.push(`${label}: 外部ライブラリの利用可能性が不正です`)
    }
    if (
      template.availability === 'requires-pyodide-packages' &&
      !template.requiredLibraries.some(({ support }) => support === 'Pyodideで自動読み込み')
    ) {
      errors.push(`${label}: Pyodide依存関係が宣言されていません`)
    }
  }
  return errors
}
