import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Project } from '../types/project'
import type { UserTemplate } from '../types/template'

interface PyStudioDatabase extends DBSchema {
  projects: {
    key: string
    value: Project
  }
  templateFavorites: {
    key: string
    value: string[]
  }
  customTemplates: {
    key: string
    value: UserTemplate
  }
}

let databasePromise: Promise<IDBPDatabase<PyStudioDatabase>> | undefined

function getDatabase(): Promise<IDBPDatabase<PyStudioDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<PyStudioDatabase>('pystudio', 3, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('projects', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          database.createObjectStore('templateFavorites')
        }
        if (oldVersion < 3) {
          database.createObjectStore('customTemplates', { keyPath: 'id' })
        }
      },
    }).catch((error: unknown) => {
      databasePromise = undefined
      throw new Error('プロジェクト保存領域を開けませんでした。', { cause: error })
    })
  }
  return databasePromise
}

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
