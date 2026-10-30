import type { Project } from './project'
import type { TemplateCategory, TemplateDifficulty, UserTemplate } from './template'

export type PyStudioArchiveKind = 'project' | 'template' | 'backup'

export interface ArchiveFileEntry {
  path: string
  size: number
}

export interface BackupProjectMetadata extends Omit<Project, 'files' | 'directories'> {
  directories: string[]
  files: string[]
}

export interface BackupTemplateMetadata extends Omit<UserTemplate, 'files' | 'directories'> {
  directories: string[]
  files: string[]
}

export interface BackupArchiveData {
  projects: BackupProjectMetadata[]
  templates: BackupTemplateMetadata[]
  favoriteIds: string[]
}

export interface PyStudioArchiveManifest {
  format: 'pystudio'
  formatVersion: 1
  kind: PyStudioArchiveKind
  name: string
  description: string
  category?: TemplateCategory
  difficulty?: TemplateDifficulty
  activeFile: string
  directories: string[]
  files: ArchiveFileEntry[]
  createdAt: number
  updatedAt: number
  backup?: BackupArchiveData
}

export interface ParsedPyStudioArchive {
  manifest: PyStudioArchiveManifest
  files: Record<string, string>
}
