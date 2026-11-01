import { getDatabase } from './database'
import type { LearningAttemptRecord, LearningDraftRecord } from './database'
import type { LearningProgressState } from '../types/learning'

const defaultProgress: LearningProgressState = {
  lastLessonId: null,
  completedLessonIds: [],
  startedLessonIds: [],
  attemptedLessonIds: [],
  lastUpdatedAt: Date.now(),
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
    throw new Error('学習進捗の読み込みに失敗しました。', { cause: error })
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

export async function saveLearningDraft(
  lessonId: string,
  exerciseId: string,
  code: string,
): Promise<void> {
  try {
    const database = await getDatabase()
    const draft: LearningDraftRecord = {
      id: `${lessonId}:${exerciseId}`,
      lessonId,
      exerciseId,
      code: code.slice(0, 100_000),
      updatedAt: Date.now(),
    }
    await database.put('learningDrafts', draft)
  } catch (error) {
    throw new Error('学習コードを保存できませんでした。', { cause: error })
  }
}

export async function loadLearningDraft(
  lessonId: string,
  exerciseId: string,
): Promise<string | undefined> {
  try {
    const database = await getDatabase()
    return (await database.get('learningDrafts', `${lessonId}:${exerciseId}`))?.code
  } catch (error) {
    throw new Error('学習コードを復元できませんでした。', { cause: error })
  }
}

export async function recordLearningAttempt(
  attempt: Omit<LearningAttemptRecord, 'id' | 'attemptedAt'>,
): Promise<void> {
  try {
    const database = await getDatabase()
    const now = Date.now()
    const transaction = database.transaction(['learningAttempts', 'learningReview'], 'readwrite')
    const historyStore = transaction.objectStore('learningAttempts')
    const reviewStore = transaction.objectStore('learningReview')
    const history = await historyStore.getAll()
    const review = await reviewStore.get(attempt.exerciseId)
    if (history.length >= 1000) {
      const oldest = history.sort((left, right) => left.attemptedAt - right.attemptedAt).slice(0, history.length - 999)
      await Promise.all(oldest.map(({ id }) => historyStore.delete(id)))
    }
    await historyStore.add({ ...attempt, id: crypto.randomUUID(), attemptedAt: now })
    const isCorrect = attempt.result === 'correct'
    const attempts = (review?.attempts ?? 0) + 1
    const incorrectAttempts = (review?.incorrectAttempts ?? 0) + (isCorrect ? 0 : 1)
    const intervalDays = isCorrect
      ? incorrectAttempts === 0 ? 7 : attempts >= 4 ? 7 : 3
      : 1
    await reviewStore.put({
      exerciseId: attempt.exerciseId,
      lessonId: attempt.lessonId,
      attempts,
      incorrectAttempts,
      dueAt: Date.now() + intervalDays * 24 * 60 * 60 * 1000,
      lastAttemptAt: now,
      correctAt: isCorrect ? now : (review?.correctAt ?? null),
      hintLevel: Math.max(review?.hintLevel ?? 0, attempt.hintLevel),
      solutionViewed: Boolean(review?.solutionViewed || attempt.solutionViewed),
    })
    await transaction.done
  } catch (error) {
    throw new Error('学習履歴を保存できませんでした。', { cause: error })
  }
}

export async function listLearningAttempts(): Promise<LearningAttemptRecord[]> {
  try {
    return await (await getDatabase()).getAll('learningAttempts')
  } catch (error) {
    throw new Error('学習履歴を読み込めませんでした。', { cause: error })
  }
}

export async function listLearningReviews(): Promise<Array<{
  exerciseId: string
  lessonId: string
  attempts: number
  incorrectAttempts: number
  dueAt: number
  lastAttemptAt: number
  correctAt: number | null
  hintLevel: number
  solutionViewed: boolean
}>> {
  try {
    return await (await getDatabase()).getAll('learningReview')
  } catch (error) {
    throw new Error('復習情報を読み込めませんでした。', { cause: error })
  }
}
