import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { LearningProgressState } from '../types/learning'
import type { Project } from '../types/project'
import type { UserTemplate } from '../types/template'

export const DATABASE_NAME = 'pystudio'
export const DATABASE_VERSION = 5

export type LearningProgressRecord = LearningProgressState & { key: string }

export interface LearningAttemptRecord {
  id: string
  lessonId: string
  exerciseId: string
  submittedAnswer: string
  result: 'correct' | 'partial' | 'incorrect' | 'error' | 'timeout'
  hintLevel: number
  solutionViewed: boolean
  attemptedAt: number
}

export interface LearningDraftRecord {
  id: string
  lessonId: string
  exerciseId: string
  code: string
  updatedAt: number
}

export interface PyStudioDatabase extends DBSchema {
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
  learningProgress: {
    key: string
    value: LearningProgressRecord
  }
  learningAttempts: {
    key: string
    value: LearningAttemptRecord
  }
  learningDrafts: {
    key: string
    value: LearningDraftRecord
  }
  learningBookmarks: {
    key: string
    value: string[]
  }
  learningReview: {
    key: string
    value: {
      exerciseId: string
      lessonId: string
      attempts: number
      incorrectAttempts: number
      dueAt: number
      lastAttemptAt: number
      correctAt: number | null
      hintLevel: number
      solutionViewed: boolean
      correctStreak?: number
    }
  }
}

let databasePromise: Promise<IDBPDatabase<PyStudioDatabase>> | undefined

export function getDatabase(): Promise<IDBPDatabase<PyStudioDatabase>> {
  if (!databasePromise) {
    databasePromise = openDB<PyStudioDatabase>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1 && !database.objectStoreNames.contains('projects')) {
          database.createObjectStore('projects', { keyPath: 'id' })
        }
        if (oldVersion < 2 && !database.objectStoreNames.contains('templateFavorites')) {
          database.createObjectStore('templateFavorites')
        }
        if (oldVersion < 3 && !database.objectStoreNames.contains('customTemplates')) {
          database.createObjectStore('customTemplates', { keyPath: 'id' })
        }
        if (oldVersion < 4 && !database.objectStoreNames.contains('learningProgress')) {
          database.createObjectStore('learningProgress', { keyPath: 'key' })
        }
        if (oldVersion < 5) {
          if (!database.objectStoreNames.contains('learningAttempts')) {
            database.createObjectStore('learningAttempts', { keyPath: 'id' })
          }
          if (!database.objectStoreNames.contains('learningDrafts')) {
            database.createObjectStore('learningDrafts', { keyPath: 'id' })
          }
          if (!database.objectStoreNames.contains('learningBookmarks')) {
            database.createObjectStore('learningBookmarks')
          }
          if (!database.objectStoreNames.contains('learningReview')) {
            database.createObjectStore('learningReview', { keyPath: 'exerciseId' })
          }
        }
      },
      blocked() {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('pystudio-db-blocked'))
        }
      },
      blocking() {
        databasePromise?.then((database) => database.close())
        databasePromise = undefined
      },
      terminated() {
        databasePromise = undefined
      },
    }).catch((error: unknown) => {
      databasePromise = undefined
      throw new Error('PyStudioの保存領域を開けませんでした。ほかのタブを閉じて再試行してください。', { cause: error })
    })
  }
  return databasePromise
}
