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

export type TemplateLibrarySupport = '標準ライブラリ' | 'Pyodideで自動読み込み'
export type TemplateAvailability = 'available' | 'requires-pyodide-packages'

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
  createdAt: number
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

export interface TemplateLibrary {
    name: string
    support: TemplateLibrarySupport
    note?: string
}
