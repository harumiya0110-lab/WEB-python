import 'fake-indexeddb/auto'
import { deleteDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadLearningProgress, saveLearningProgress } from '../src/services/learningProgressService'

describe('learning progress service', () => {
  beforeEach(async () => {
    await deleteDB('pystudio')
  })

  it('saves and reloads state without losing progress data', async () => {
    const initial = {
      lastLessonId: 'python-what-is-python',
      completedLessonIds: ['python-what-is-python'],
      startedLessonIds: ['python-what-is-python', 'python-print-basics'],
      attemptedLessonIds: ['python-what-is-python'],
      lastUpdatedAt: 1234,
    }

    await saveLearningProgress(initial)
    const loaded = await loadLearningProgress()

    expect(loaded).toMatchObject(initial)
    expect(loaded.lastLessonId).toBe('python-what-is-python')
    expect(loaded.completedLessonIds).toEqual(['python-what-is-python'])
  })
})
