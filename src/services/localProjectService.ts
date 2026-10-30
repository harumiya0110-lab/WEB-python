import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Project } from '../types/project'

interface PyStudioDatabase extends DBSchema {
  projects: {
    key: string
    value: Project
  }
}

let databasePromise: Promise<IDBPDatabase<PyStudioDatabase>> | undefined

function getDatabase(): Promise<IDBPDatabase<PyStudioDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<PyStudioDatabase>('pystudio', 1, {
      upgrade(database) {
        database.createObjectStore('projects', { keyPath: 'id' })
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
