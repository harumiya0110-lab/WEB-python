import 'fake-indexeddb/auto'
import { deleteDB } from 'idb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('learning persistence service', () => {
  beforeEach(async () => {
    vi.resetModules()
    await deleteDB('pystudio')
  })

  it('saves and reloads learning progress and exercise drafts', async () => {
    const service = await import('../src/services/learningProgressService')
    const initial = {
      lastLessonId: 'python-what-is-python',
      completedLessonIds: ['python-what-is-python'],
      startedLessonIds: ['python-what-is-python', 'python-print-basics'],
      attemptedLessonIds: ['python-what-is-python'],
      lastUpdatedAt: 1234,
    }
    await service.saveLearningProgress(initial)
    await service.saveLearningDraft('python-print-basics', 'exercise', 'print("draft")')

    expect(await service.loadLearningProgress()).toMatchObject(initial)
    expect(await service.loadLearningDraft('python-print-basics', 'exercise')).toBe('print("draft")')
  })

  it('records attempts and sets a review date after an incorrect answer', async () => {
    const service = await import('../src/services/learningProgressService')
    await service.recordLearningAttempt({
      lessonId: 'python-what-is-python',
      exerciseId: 'python-what-is-python',
      submittedAnswer: 'print("wrong")',
      result: 'incorrect',
      hintLevel: 1,
      solutionViewed: false,
    })
    const [attempt] = await service.listLearningAttempts()
    const [review] = await service.listLearningReviews()
    expect(attempt?.result).toBe('incorrect')
    expect(attempt?.hintLevel).toBe(1)
    expect(review?.incorrectAttempts).toBe(1)
    expect(review?.dueAt).toBeGreaterThan(Date.now())
  })
})
