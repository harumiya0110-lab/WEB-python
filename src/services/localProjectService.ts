import { getDatabase } from './database'
import type { Project } from '../types/project'
import type { UserTemplate } from '../types/template'
import type { BackupSnapshot } from './archiveService'

export async function loadProject(id: string): Promise<Project | undefined> {
  const database = await getDatabase()
  return database.get('projects', id)
}

export async function listProjects(): Promise<Project[]> {
  const database = await getDatabase()
  return database.getAll('projects')
}

export async function saveProject(project: Project): Promise<void> {
  const database = await getDatabase()
  await database.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('projects', id)
}

export async function loadTemplateFavorites(): Promise<string[]> {
  const database = await getDatabase()
  return (await database.get('templateFavorites', 'guest')) ?? []
}

export async function saveTemplateFavorites(ids: string[]): Promise<void> {
  const database = await getDatabase()
  await database.put('templateFavorites', ids, 'guest')
}

export async function saveCustomTemplate(template: UserTemplate): Promise<void> {
  try {
    const database = await getDatabase()
    await database.add('customTemplates', template)
  } catch (error) {
    throw new Error('マイテンプレートを保存できませんでした。', { cause: error })
  }
}

export async function loadCustomTemplate(id: string): Promise<UserTemplate | undefined> {
  try {
    const database = await getDatabase()
    return await database.get('customTemplates', id)
  } catch (error) {
    throw new Error('マイテンプレートを読み込めませんでした。', { cause: error })
  }
}

export async function listCustomTemplates(): Promise<UserTemplate[]> {
  try {
    const database = await getDatabase()
    return await database.getAll('customTemplates')
  } catch (error) {
    throw new Error('マイテンプレート一覧を読み込めませんでした。', { cause: error })
  }
}

export async function updateCustomTemplate(template: UserTemplate): Promise<void> {
  try {
    const database = await getDatabase()
    await database.put('customTemplates', template)
  } catch (error) {
    throw new Error('マイテンプレートを更新できませんでした。', { cause: error })
  }
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  try {
    const database = await getDatabase()
    await database.delete('customTemplates', id)
  } catch (error) {
    throw new Error('マイテンプレートを削除できませんでした。', { cause: error })
  }
}

export async function loadBackupSnapshot(): Promise<BackupSnapshot> {
  const database = await getDatabase()
  try {
    const transaction = database.transaction(['projects', 'customTemplates', 'templateFavorites'], 'readonly')
    const [projects, templates, favoriteIds] = await Promise.all([
      transaction.objectStore('projects').getAll(),
      transaction.objectStore('customTemplates').getAll(),
      transaction.objectStore('templateFavorites').get('guest'),
    ])
    await transaction.done
    return {
      projects: projects.map((project) => ({ ...project, files: { ...project.files }, directories: [...project.directories], openFiles: [...project.openFiles] })),
      templates: templates.map((template) => ({ ...template, files: { ...template.files }, directories: [...template.directories], tags: [...template.tags] })),
      favoriteIds: [...(favoriteIds ?? [])],
    }
  } catch (error) {
    throw new Error('バックアップ対象の保存データを読み込めませんでした。', { cause: error })
  }
}

export async function restoreBackupSnapshot(snapshot: BackupSnapshot): Promise<{ projects: number; templates: number }> {
  try {
    const database = await getDatabase()
    const projectIds = new Map<string, string>()
    const templateIds = new Map<string, string>()
    const now = Date.now()
    const restoredProjects = snapshot.projects.map((project) => {
      const id = crypto.randomUUID()
      projectIds.set(project.id, id)
      return {
        ...project,
        id,
        files: { ...project.files },
        directories: [...project.directories],
        openFiles: [...project.openFiles],
        createdAt: project.createdAt ?? now,
        updatedAt: project.updatedAt || now,
      }
    })
    const restoredTemplates = snapshot.templates.map((template) => {
      const id = crypto.randomUUID()
      templateIds.set(template.id, id)
      return {
        ...template,
        id,
        files: { ...template.files },
        directories: [...template.directories],
        tags: [...template.tags],
        createdAt: template.createdAt || now,
        updatedAt: template.updatedAt || now,
      }
    })

    const transaction = database.transaction(['projects', 'customTemplates', 'templateFavorites'], 'readwrite')
    const projectWrites = restoredProjects.map((project) => transaction.objectStore('projects').add(project))
    const templateWrites = restoredTemplates.map((template) => transaction.objectStore('customTemplates').add(template))
    const favoriteRequest = transaction.objectStore('templateFavorites').get('guest')
    try {
      const [currentFavorites] = await Promise.all([
        favoriteRequest,
        Promise.all([...projectWrites, ...templateWrites]),
      ])
      const restoredFavorites = snapshot.favoriteIds.map((id) => templateIds.get(id) ?? id)
      await transaction.objectStore('templateFavorites').put(
        [...new Set([...(currentFavorites ?? []), ...restoredFavorites])],
        'guest',
      )
      await transaction.done
    } catch (error) {
      try {
        transaction.abort()
      } catch (abortError) {
        if (!(abortError instanceof DOMException && abortError.name === 'InvalidStateError')) {
          throw abortError
        }
      }
      await transaction.done.catch(() => undefined)
      throw error
    }
    return { projects: projectIds.size, templates: templateIds.size }
  } catch (error) {
    throw new Error('バックアップを復元できませんでした。既存の保存データは変更されていません。', { cause: error })
  }
}
