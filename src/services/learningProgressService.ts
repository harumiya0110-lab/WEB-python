import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { LearningProgressState } from '../types/learning'

type LearningProgressRecord = LearningProgressState & { key: string }

interface LearningDatabase extends DBSchema {
  learningProgress: {
    key: string
    value: LearningProgressRecord
  }
}

const defaultProgress: LearningProgressState = {
  lastLessonId: null,
  completedLessonIds: [],
  startedLessonIds: [],
  attemptedLessonIds: [],
  lastUpdatedAt: Date.now(),
}

let databasePromise: Promise<IDBPDatabase<LearningDatabase>> | undefined

function getDatabase(): Promise<IDBPDatabase<LearningDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<LearningDatabase>('pystudio', 4, {
      upgrade(database, oldVersion) {
        if (oldVersion < 4) {
          if (!database.objectStoreNames.contains('learningProgress')) {
            database.createObjectStore('learningProgress', { keyPath: 'key' })
          }
        }
      },
    }).catch((error: unknown) => {
      databasePromise = undefined
      throw new Error('学習進捗を読み込めませんでした。', { cause: error })
    })
  }
  return databasePromise
}

export async function loadLearningProgress(): Promise<LearningProgressState> {
  try {
    const database = await getDatabase()
    const state = await database.get('learningProgress', 'guest')
    if (!state) {
      return defaultProgress
    }
    const { key: _key, ...progress } = state
    return progress
  } catch (error) {
    console.warn('学習進捗の読み込みに失敗しました', error)
    return defaultProgress
  }
}

export async function saveLearningProgress(progress: LearningProgressState): Promise<void> {
  try {
    const database = await getDatabase()
    await database.put('learningProgress', {
      key: 'guest',
      ...progress,
      lastUpdatedAt: progress.lastUpdatedAt ?? Date.now(),
    })
  } catch (error) {
    throw new Error('学習進捗を保存できませんでした。', { cause: error })
  }
}
