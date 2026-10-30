export type TemplateCategory =
  | 'Python基礎'
  | 'データ構造'
  | '計算・数学'
  | 'ゲーム'
  | 'データ処理'
  | 'グラフ・可視化'
  | '複数ファイル'
  | '実用プログラム'

export type TemplateDifficulty = '初級' | '中級' | '上級'

export type TemplateLibrarySupport =
  | '標準ライブラリ'
  | 'Pyodideで自動読み込み'
  | '要確認（自動判定なし）'
export type TemplateAvailability =
  | 'available'
  | 'requires-pyodide-packages'
  | 'manual-review'

export interface ProjectTemplate {
  id: string
  name: string
  title: string
  description: string
  category: TemplateCategory
  difficulty: TemplateDifficulty
  tags: string[]
  icon: string
  estimatedMinutes: number
  recommended: boolean
  featured: boolean
  createdAt?: number
  sortOrder: number
  whatYouCanDo: string
  learningPoints: string[]
  runInstructions: string
  expectedBehavior: string
  libraries: TemplateLibrary[]
  requiredLibraries: TemplateLibrary[]
  availability: TemplateAvailability
  files: Record<string, string>
  directories: string[]
  activeFile: string
}

export interface UserTemplate {
  id: string
  name: string
  description: string
  tags: string[]
  category: TemplateCategory
  difficulty?: TemplateDifficulty
  files: Record<string, string>
  directories: string[]
  activeFile: string
  createdAt: number
  updatedAt: number
}

export interface TemplateLibrary {
  name: string
  support: TemplateLibrarySupport
  note?: string
}
