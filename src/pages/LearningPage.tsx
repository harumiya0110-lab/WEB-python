import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  BookOpen,
  Copy,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Code2,
  Library,
  Lightbulb,
  RotateCcw,
  Search,
  Square,
  Star,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { allLessons, firstLessonId, learningCourses, lessonMap } from '../data/learningCatalog'
import { buildPythonGlossary, getPythonGlossaryCategories, pythonGlossary, searchPythonGlossary } from '../data/pythonGlossary'
import { usePythonRuntime } from '../hooks/usePythonRuntime'
import {
  createPythonFunctionTestHarness,
  gradePythonInputTests,
  getExpectedOutputForInputs,
  gradePythonFunctionTests,
  gradePythonOutput,
} from '../python/learningGrading'
import {
  listLearningAttempts,
  listLearningReviews,
  loadLearningDraft,
  loadLearningProgress,
  recordLearningAttempt,
  saveLearningDraft,
  saveLearningProgress,
} from '../services/learningProgressService'
import { getDatabase } from '../services/database'
import { saveProject } from '../services/localProjectService'
import { useSettingsStore } from '../store/settingsStore'
import type { LearningCourse, LearningInputTestCase, LearningLesson, LearningProgressState, PythonFunctionTestCase } from '../types/learning'

type LearningSection = 'study' | 'review' | 'glossary'
type ScoreState = 'correct' | 'incorrect' | 'error' | null
const practiceExerciseId = (lessonId: string) => `${lessonId}:practice`

const initialProgress: LearningProgressState = {
  lastLessonId: null,
  completedLessonIds: [],
  startedLessonIds: [],
  attemptedLessonIds: [],
  practicePassedLessonIds: [],
  quizPassedLessonIds: [],
  notes: {},
  favoriteLessonIds: [],
  hintUsage: {},
  solutionViewedExerciseIds: [],
  lastUpdatedAt: Date.now(),
}

function getCourseProgress(course: LearningCourse, completed: string[]) {
  const completeCount = course.lessons.filter((lesson) => completed.includes(lesson.id)).length
  return {
    lessonCount: course.lessons.length,
    completeCount,
    percent: Math.round((completeCount / Math.max(1, course.lessons.length)) * 100),
  }
}

function outputFor(lines: Array<{ channel: string; text: string }>): string {
  return lines.filter((line) => line.channel === 'stdout').map((line) => line.text).join('')
}

function describeError(text: string): string {
  const explanations: Array<[string, string]> = [
    ['SyntaxError', '文法の書き方を確認しましょう。かっこや引用符、コロンの閉じ忘れがよくある原因です。'],
    ['IndentationError', '行の字下げ（インデント）が揃っていないようです。ifやforの中を同じ幅だけ下げてください。'],
    ['NameError', '使った変数や関数がまだ定義されていないようです。名前のつづりと定義順を確認しましょう。'],
    ['TypeError', '値の種類と演算・関数の組み合わせを確認しましょう。'],
    ['ValueError', '関数に渡した値の形式を確認しましょう。'],
    ['IndexError', 'リストの範囲外を指定していないか確認しましょう。'],
    ['KeyError', '辞書に存在するキー名かどうか確認しましょう。'],
    ['ZeroDivisionError', '0で割ろうとしています。割る数を確認しましょう。'],
    ['ModuleNotFoundError', 'この環境で利用できないライブラリを読み込もうとしている可能性があります。'],
    ['ImportError', 'モジュールや機能の読み込み方を確認しましょう。利用できる機能かどうかも確認してください。'],
    ['FileNotFoundError', '指定したファイル名や保存場所を確認しましょう。'],
    ['AttributeError', '値が持っていない機能を呼び出していないか確認しましょう。'],
    ['RecursionError', '関数の呼び出しが止まらず繰り返されています。終了条件を確認しましょう。'],
  ]
  return explanations.find(([name]) => text.includes(name))?.[1] ?? 'エラーの内容を読み、表示された行と直前の処理を確認しましょう。'
}

export function LearningPage() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(initialProgress)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState(firstLessonId)
  const [selectedCourseId, setSelectedCourseId] = useState(learningCourses[0]?.id ?? '')
  const [section, setSection] = useState<LearningSection>('study')
  const [reviewQuery, setReviewQuery] = useState('')
  const [glossaryQuery, setGlossaryQuery] = useState('')
  const [glossaryCategory, setGlossaryCategory] = useState('すべて')
  const [expandedGlossaryTerm, setExpandedGlossaryTerm] = useState('')
  const [copiedGlossaryTerm, setCopiedGlossaryTerm] = useState('')
  const [copyError, setCopyError] = useState('')
  const [reviewFocusTarget, setReviewFocusTarget] = useState<'practice' | 'quiz' | null>(null)
  const [code, setCode] = useState('')
  const [draftLoadedId, setDraftLoadedId] = useState('')
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState('')
  const [quizFeedback, setQuizFeedback] = useState('')
  const [quizExplanationVisible, setQuizExplanationVisible] = useState(false)
  const [exerciseFeedback, setExerciseFeedback] = useState('')
  const [exerciseScore, setExerciseScore] = useState<ScoreState>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [sampleOutput, setSampleOutput] = useState('')
  const [exerciseOutput, setExerciseOutput] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [storageError, setStorageError] = useState('')
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof listLearningAttempts>>>([])
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof listLearningReviews>>>([])
  const [notes, setNotes] = useState('')
  const [reviewNow, setReviewNow] = useState(() => Date.now())
  const { fontSize, theme } = useSettingsStore()
  const {
    output,
    run,
    stop,
    submitInput,
    clearOutput,
    status,
    statusMessage,
    pendingInput,
    durationMs,
  } = usePythonRuntime()
  const runKindRef = useRef<'sample' | 'exercise' | null>(null)
  const runStartedRef = useRef(false)
  const quizSubmittedRef = useRef(false)
  const runInfoRef = useRef<{
    lessonId: string
    exerciseId: string
    expectedOutput: string
    code: string
    hintLevel: number
    solutionViewed: boolean
    testCases: readonly PythonFunctionTestCase[]
    inputTestCases: readonly LearningInputTestCase[]
    inputValues: string[]
    inputGradingRule: LearningLesson['practice']['inputGradingRule']
  }>({
    lessonId: '',
    exerciseId: '',
    expectedOutput: '',
    code: '',
    hintLevel: 0,
    solutionViewed: false,
    testCases: [],
    inputTestCases: [],
    inputValues: [],
    inputGradingRule: undefined,
  })

  const selectedLesson = useMemo<LearningLesson>(
    () => lessonMap.get(selectedLessonId) ?? allLessons[0]!,
    [selectedLessonId],
  )
  const currentCourse = useMemo(
    () => learningCourses.find((course) => course.id === selectedCourseId) ??
      learningCourses.find((course) => course.lessons.some((lesson) => lesson.id === selectedLessonId))!,
    [selectedCourseId, selectedLessonId],
  )
  const allAttempts = attempts.length
  const correctAttempts = attempts.filter((attempt) => attempt.result === 'correct').length
  const gradedAttempts = attempts.filter((attempt) =>
    attempt.result === 'correct' || attempt.result === 'incorrect' || attempt.result === 'partial',
  ).length
  const accuracy = gradedAttempts ? Math.round((correctAttempts / gradedAttempts) * 100) : 0
  const incorrectAttempts = attempts.filter((attempt) => attempt.result === 'incorrect' || attempt.result === 'partial').length
  const executionErrors = attempts.filter((attempt) => attempt.result === 'error' || attempt.result === 'timeout').length
  const dueReviews = reviews.filter((review) => review.incorrectAttempts > 0 && review.dueAt <= reviewNow)
  const reviewTargets = useMemo(
    () => reviews.filter((review) => review.incorrectAttempts > 0).sort((left, right) => left.dueAt - right.dueAt),
    [reviews],
  )
  const todayReviews = useMemo(() => reviewTargets.filter((review) => review.dueAt <= reviewNow), [reviewNow, reviewTargets])
  const upcomingReviews = useMemo(() => reviewTargets.filter((review) => review.dueAt > reviewNow), [reviewNow, reviewTargets])

  const refreshHistory = useCallback(async () => {
    const [nextAttempts, nextReviews] = await Promise.all([listLearningAttempts(), listLearningReviews()])
    setAttempts(nextAttempts)
    setReviews(nextReviews)
  }, [])

  useEffect(() => {
    const updateReviewClock = () => setReviewNow(Date.now())
    const timer = window.setInterval(updateReviewClock, 60_000)
    window.addEventListener('focus', updateReviewClock)
    document.addEventListener('visibilitychange', updateReviewClock)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', updateReviewClock)
      document.removeEventListener('visibilitychange', updateReviewClock)
    }
  }, [])

  useEffect(() => {
    let active = true
    const handleDatabaseBlocked = () => setStorageError('保存データの更新が別のタブで保留されています。ほかのPyStudioタブを閉じてください。')
    window.addEventListener('pystudio-db-blocked', handleDatabaseBlocked)
    void Promise.all([
      loadLearningProgress(),
      listLearningAttempts(),
      listLearningReviews(),
      getDatabase().then((database) => database.get('learningBookmarks', 'guest')),
    ])
      .then(([saved, savedAttempts, savedReviews, bookmarks]) => {
        if (!active) return
        const next = { ...initialProgress, ...saved, favoriteLessonIds: bookmarks ?? saved.favoriteLessonIds ?? [] }
        setProgress(next)
        setAttempts(savedAttempts)
        setReviews(savedReviews)
        const lastId = next.lastLessonId && lessonMap.has(next.lastLessonId) ? next.lastLessonId : firstLessonId
        setSelectedLessonId(lastId)
        const course = learningCourses.find((item) => item.lessons.some((lesson) => lesson.id === lastId))
        if (course) setSelectedCourseId(course.id)
        setNotes(next.notes?.[lastId] ?? '')
        setProgressLoaded(true)
      })
      .catch((error: unknown) => {
        if (active) {
          setStorageError(error instanceof Error ? error.message : '学習データを読み込めませんでした。')
          setProgressLoaded(true)
        }
      })
    return () => {
      active = false
      window.removeEventListener('pystudio-db-blocked', handleDatabaseBlocked)
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadLearningDraft(selectedLesson.id, selectedLesson.id)
      .then((savedCode) => {
        if (!active) return
        setCode(savedCode ?? selectedLesson.practice.starter)
        setDraftLoadedId(selectedLesson.id)
      })
      .catch((error: unknown) => {
        if (!active) return
        setCode(selectedLesson.practice.starter)
        setDraftLoadedId(selectedLesson.id)
        setStorageError(error instanceof Error ? error.message : '学習コードを復元できませんでした。')
      })
  }, [selectedLesson])

  useEffect(() => {
    if (draftLoadedId !== selectedLesson.id) return
    const timer = window.setTimeout(() => {
      void saveLearningDraft(selectedLesson.id, selectedLesson.id, code)
        .catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '学習コードを保存できませんでした。'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [code, draftLoadedId, selectedLesson])

  useEffect(() => {
    if (!progressLoaded) return
    const timer = window.setTimeout(() => {
      void saveLearningProgress({
        ...progress,
        lastLessonId: selectedLesson.id,
        notes: { ...progress.notes, [selectedLesson.id]: notes },
        lastUpdatedAt: Date.now(),
      }).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '学習進捗を保存できませんでした。'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [notes, progress, progressLoaded, selectedLesson])

  const processRunResult = useCallback((mode: 'sample' | 'exercise', lines: typeof output) => {
    const runInfo = { ...runInfoRef.current }
    const stdout = outputFor(lines)
    const stderr = lines.filter((line) => line.channel === 'stderr').map((line) => line.text).join('')
    const runtimeError = lines.filter((line) => line.channel === 'error').map((line) => line.text).join('')
    if (mode === 'sample') {
      setSampleOutput(stdout || (stderr || runtimeError ? `エラーが発生しました。\n${runtimeError || stderr}` : '出力はありません。'))
      return
    }
    const isTimeout = stderr.includes('実行時間の上限')
    if (runtimeError || stderr.includes('Traceback') || isTimeout) {
      setExerciseOutput(stdout)
      const errorText = runtimeError || stderr
      const message = isTimeout
        ? '実行時間の上限に達しました。処理を短くしてもう一度試してください。'
        : `${describeError(errorText)}\n${errorText.slice(-500)}`
      setExerciseScore('error')
      setExerciseFeedback(message)
      void recordLearningAttempt({
        lessonId: runInfo.lessonId,
        exerciseId: runInfo.exerciseId,
        submittedAnswer: runInfo.code,
        result: isTimeout ? 'timeout' : 'error',
        hintLevel: runInfo.hintLevel,
        solutionViewed: runInfo.solutionViewed,
      }).then(refreshHistory).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
      return
    }
    const functionGrade = runInfo.testCases.length > 0
      ? gradePythonFunctionTests(stdout, runInfo.testCases)
      : null
    if (runInfo.testCases.length > 0 && !functionGrade) {
      setExerciseOutput(stdout)
      setExerciseScore('error')
      setExerciseFeedback('テスト結果を読み取れませんでした。コードを確認して、もう一度実行してください。')
      return
    }
    setExerciseOutput(functionGrade?.userOutput ?? stdout)
    const inputExpectedOutput = runInfo.inputGradingRule && runInfo.inputValues.length > 0
      ? getExpectedOutputForInputs(runInfo.inputGradingRule, runInfo.inputValues)
      : null
    const expectedOutput = runInfo.inputGradingRule ? inputExpectedOutput ?? '' : runInfo.expectedOutput
    const outputGrade = gradePythonOutput(expectedOutput, stdout)
    const correct = functionGrade
      ? functionGrade.correct
      : (!runInfo.inputGradingRule || inputExpectedOutput !== null) && outputGrade.correct
    setExerciseScore(correct ? 'correct' : 'incorrect')
    setExerciseFeedback(correct
      ? functionGrade
        ? `正解です。${functionGrade.passedCount}/${functionGrade.totalCount}件のテストケースに合格しました。`
        : '正解です。実行結果が期待する出力と一致しました。'
      : functionGrade
        ? functionGrade.failedCase?.error
          ? `テストケース${functionGrade.firstFailedCase}でエラーが発生しました（${functionGrade.passedCount}/${functionGrade.totalCount}件合格）。入力: ${JSON.stringify(functionGrade.failedCase.arguments)}。${functionGrade.failedCase.error}`
          : `テストケース${functionGrade.firstFailedCase}で結果が異なりました（${functionGrade.passedCount}/${functionGrade.totalCount}件合格）。入力: ${JSON.stringify(functionGrade.failedCase?.arguments)}。期待値: ${JSON.stringify(functionGrade.failedCase?.expected)}。実際の値: ${JSON.stringify(functionGrade.failedCase?.actual)}。入力の処理を確認しましょう。`
        : runInfo.inputGradingRule && inputExpectedOutput === null
          ? 'input()の値を受け取れませんでした。入力欄から値を送信して、もう一度実行してください。'
          : `出力が期待した結果と異なります。期待する結果: ${outputGrade.expected || '（何も表示しない）'}。実際の出力: ${outputGrade.actual || '（何も表示しない）'}。出力の順番や値を確認しましょう。`)
    void recordLearningAttempt({
      lessonId: runInfo.lessonId,
      exerciseId: runInfo.exerciseId,
      submittedAnswer: runInfo.code,
      result: correct ? 'correct' : 'incorrect',
      hintLevel: runInfo.hintLevel,
      solutionViewed: runInfo.solutionViewed,
    }).then(async () => {
      setProgress((current) => {
        const passed = correct
          ? [...new Set([...(current.practicePassedLessonIds ?? []), runInfo.lessonId])]
          : current.practicePassedLessonIds ?? []
        const completed = passed.includes(runInfo.lessonId) &&
          (current.quizPassedLessonIds ?? []).includes(runInfo.lessonId)
          ? [...new Set([...current.completedLessonIds, runInfo.lessonId])]
          : current.completedLessonIds
        return {
          ...current,
          practicePassedLessonIds: passed,
          completedLessonIds: completed,
          attemptedLessonIds: [...new Set([...current.attemptedLessonIds, runInfo.lessonId])],
          startedLessonIds: [...new Set([...current.startedLessonIds, runInfo.lessonId])],
          lastLessonId: runInfo.lessonId,
          lastUpdatedAt: Date.now(),
        }
      })
      await refreshHistory()
    }).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
  }, [refreshHistory])

  const processInputTestResult = useCallback((lines: typeof output) => {
    const runInfo = { ...runInfoRef.current }
    if (runInfo.inputTestCases.length === 0) return false

    const actualOutputs = lines
      .filter((line) => line.channel === 'input-test-result')
      .map((line) => line.text)
    const stderr = lines.filter((line) => line.channel === 'stderr').map((line) => line.text).join('')
    const runtimeError = lines.filter((line) => line.channel === 'error').map((line) => line.text).join('')
    const isTimeout = stderr.includes('実行時間の上限')
    if (runtimeError || stderr.includes('Traceback') || isTimeout) {
      runKindRef.current = null
      setExerciseOutput(outputFor(lines))
      setExerciseScore('error')
      setExerciseFeedback(isTimeout
        ? '入力例の実行時間が上限に達しました。処理を短くしてもう一度試してください。'
        : `${describeError(runtimeError || stderr)}\n${(runtimeError || stderr).slice(-500)}`)
      void recordLearningAttempt({
        lessonId: runInfo.lessonId,
        exerciseId: runInfo.exerciseId,
        submittedAnswer: runInfo.code,
        result: isTimeout ? 'timeout' : 'error',
        hintLevel: runInfo.hintLevel,
        solutionViewed: runInfo.solutionViewed,
      }).then(refreshHistory).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
      return true
    }

    if (actualOutputs.length !== runInfo.inputTestCases.length) {
      runKindRef.current = null
      setExerciseScore('error')
      setExerciseFeedback(`入力例の実行結果が不足しています（${actualOutputs.length}/${runInfo.inputTestCases.length}件）。もう一度実行してください。`)
      void recordLearningAttempt({
        lessonId: runInfo.lessonId,
        exerciseId: runInfo.exerciseId,
        submittedAnswer: runInfo.code,
        result: 'error',
        hintLevel: runInfo.hintLevel,
        solutionViewed: runInfo.solutionViewed,
      }).then(refreshHistory).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
      return true
    }

    runKindRef.current = null
    const grade = gradePythonInputTests(runInfo.inputTestCases, actualOutputs)
    if (!grade) {
      setExerciseScore('error')
      setExerciseFeedback('入力例のテスト結果を読み取れませんでした。もう一度実行してください。')
      return true
    }
    setExerciseOutput(actualOutputs.map((result, index) => `入力例 ${index + 1}: ${JSON.stringify(runInfo.inputTestCases[index]!.inputs)}\n${result || '（出力なし）'}`).join('\n\n'))
    setExerciseScore(grade.correct ? 'correct' : 'incorrect')
    setExerciseFeedback(grade.correct
      ? `正解です。設定された入力例${grade.totalCount}件すべてに合格しました。`
      : `入力例${grade.firstFailedCase}で結果が異なりました（${grade.passedCount}/${grade.totalCount}件合格）。入力: ${JSON.stringify(grade.failedCase?.inputs)}。期待値: ${grade.failedCase?.expected || '（何も表示しない）'}。実際の値: ${grade.failedCase?.actual || '（何も表示しない）'}。`)
    void recordLearningAttempt({
      lessonId: runInfo.lessonId,
      exerciseId: runInfo.exerciseId,
      submittedAnswer: runInfo.code,
      result: grade.correct ? 'correct' : 'incorrect',
      hintLevel: runInfo.hintLevel,
      solutionViewed: runInfo.solutionViewed,
    }).then(async () => {
      setProgress((current) => {
        const passed = grade.correct
          ? [...new Set([...(current.practicePassedLessonIds ?? []), runInfo.lessonId])]
          : current.practicePassedLessonIds ?? []
        const completed = passed.includes(runInfo.lessonId) &&
          (current.quizPassedLessonIds ?? []).includes(runInfo.lessonId)
          ? [...new Set([...current.completedLessonIds, runInfo.lessonId])]
          : current.completedLessonIds
        return {
          ...current,
          practicePassedLessonIds: passed,
          completedLessonIds: completed,
          attemptedLessonIds: [...new Set([...current.attemptedLessonIds, runInfo.lessonId])],
          startedLessonIds: [...new Set([...current.startedLessonIds, runInfo.lessonId])],
          lastLessonId: runInfo.lessonId,
          lastUpdatedAt: Date.now(),
        }
      })
      await refreshHistory()
    }).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
    return true
  }, [refreshHistory])

  useEffect(() => {
    if (status === 'running' || status === 'waiting-input') {
      runStartedRef.current = true
      return
    }
    if (status !== 'ready' || !runStartedRef.current || !runKindRef.current) return
    runStartedRef.current = false
    const mode = runKindRef.current
    if (mode === 'exercise' && processInputTestResult(output)) return
    runKindRef.current = null
    processRunResult(mode, output)
  }, [output, processInputTestResult, processRunResult, status])

  const selectLesson = (lesson: LearningLesson, courseId: string) => {
    if (runKindRef.current) {
      runKindRef.current = null
      runStartedRef.current = false
      stop()
    }
    setSelectedCourseId(courseId)
    setSelectedLessonId(lesson.id)
    setDraftLoadedId('')
    setSelectedQuizAnswer('')
    setQuizFeedback('')
    setQuizExplanationVisible(false)
    quizSubmittedRef.current = false
    setExerciseFeedback('')
    setExerciseScore(null)
    setHintLevel(0)
    setSolutionVisible(false)
    setSampleOutput('')
    setExerciseOutput('')
    setProgress((current) => ({
      ...current,
      lastLessonId: lesson.id,
      startedLessonIds: [...new Set([...current.startedLessonIds, lesson.id])],
      lastUpdatedAt: Date.now(),
    }))
    setNotes(progress.notes?.[lesson.id] ?? '')
    setSection('study')
  }

  const beginRun = (mode: 'sample' | 'exercise') => {
    const source = mode === 'sample' ? selectedLesson.sampleCode : code
    const testCases = mode === 'exercise' ? selectedLesson.practice.testCases : undefined
    const functionName = mode === 'exercise' ? selectedLesson.practice.functionName : undefined
    const runnableSource = testCases && functionName
      ? `${source}\n\n${createPythonFunctionTestHarness(functionName, testCases)}`
      : source
    clearOutput()
    setSampleOutput('')
    setExerciseOutput('')
    setExerciseFeedback('')
    setExerciseScore(null)
    runStartedRef.current = false
    runKindRef.current = mode
    runInfoRef.current = {
      lessonId: selectedLesson.id,
      exerciseId: practiceExerciseId(selectedLesson.id),
      expectedOutput: selectedLesson.practice.expectedOutput,
      code: source,
      hintLevel,
      solutionViewed: solutionVisible,
      testCases: testCases ?? [],
      inputTestCases: [],
      inputValues: [],
      inputGradingRule: selectedLesson.practice.inputGradingRule,
    }
    const started = run({ 'lesson.py': runnableSource }, 'lesson.py')
    if (!started) {
      runKindRef.current = null
      setExerciseFeedback(status === 'ready' ? '実行環境が準備できていません。少し待ってから再試行してください。' : '実行中の処理が終わってから再度実行してください。')
    }
  }

  const stopRun = () => {
    runKindRef.current = null
    runStartedRef.current = false
    stop()
  }

  const beginInputTest = () => {
    const testCases = selectedLesson.practice.inputGradingRule?.testCases ?? []
    if (testCases.length === 0) return
    clearOutput()
    setExerciseOutput('')
    setExerciseFeedback('')
    setExerciseScore(null)
    runStartedRef.current = false
    runKindRef.current = 'exercise'
    runInfoRef.current = {
      lessonId: selectedLesson.id,
      exerciseId: practiceExerciseId(selectedLesson.id),
      expectedOutput: '',
      code,
      hintLevel,
      solutionViewed: solutionVisible,
      testCases: [],
      inputTestCases: testCases,
      inputValues: [],
      inputGradingRule: selectedLesson.practice.inputGradingRule,
    }
    const started = run(
      { 'lesson.py': code },
      'lesson.py',
      testCases.map(({ inputs }) => ({ inputs })),
    )
    if (!started) {
      runKindRef.current = null
      setExerciseFeedback(status === 'ready' ? '実行環境が準備できていません。少し待ってから再試行してください。' : 'Python環境の準備が完了してから、入力例テストを実行してください。')
    }
  }

  const checkQuiz = () => {
    if (!selectedQuizAnswer || quizSubmittedRef.current) return
    quizSubmittedRef.current = true
    const correct = selectedQuizAnswer === selectedLesson.quiz.answer
    setQuizFeedback(correct
      ? `正解です。${selectedLesson.quiz.explanation}`
      : '今回は不正解です。ヒントを確認して、もう一度考えてみましょう。')
    setQuizExplanationVisible(false)
    void recordLearningAttempt({
      lessonId: selectedLesson.id,
      exerciseId: selectedLesson.quiz.id,
      submittedAnswer: selectedQuizAnswer,
      result: correct ? 'correct' : 'incorrect',
      hintLevel: 0,
      solutionViewed: false,
    }).then(async () => {
      if (correct) {
        setProgress((current) => {
          const passed = [...new Set([...(current.quizPassedLessonIds ?? []), selectedLesson.id])]
          const completed = (current.practicePassedLessonIds ?? []).includes(selectedLesson.id)
            ? [...new Set([...current.completedLessonIds, selectedLesson.id])]
            : current.completedLessonIds
          return {
            ...current,
            quizPassedLessonIds: passed,
            completedLessonIds: completed,
            lastLessonId: selectedLesson.id,
            lastUpdatedAt: Date.now(),
          }
        })
      }
      await refreshHistory()
    }).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : 'クイズ履歴を保存できませんでした。'))
  }

  const retryQuiz = () => {
    quizSubmittedRef.current = false
    setSelectedQuizAnswer('')
    setQuizFeedback('')
    setQuizExplanationVisible(false)
  }

  const toggleFavoriteLesson = async (lessonId: string) => {
    const current = progress.favoriteLessonIds ?? []
    const favorites = current.includes(lessonId)
      ? current.filter((id) => id !== lessonId)
      : [...current, lessonId]
    setProgress((value) => ({ ...value, favoriteLessonIds: favorites }))
    try {
      await (await getDatabase()).put('learningBookmarks', favorites, 'guest')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'お気に入りを保存できませんでした。')
    }
  }

  const toggleFavorite = () => toggleFavoriteLesson(selectedLesson.id)

  const copyGlossaryCode = async (term: string, exampleCode: string) => {
    try {
      await navigator.clipboard.writeText(exampleCode)
      setCopiedGlossaryTerm(term)
      setCopyError('')
      window.setTimeout(() => setCopiedGlossaryTerm((current) => current === term ? '' : current), 2000)
    } catch (error) {
      setCopyError(error instanceof Error ? `コードをコピーできませんでした: ${error.message}` : 'コードをコピーできませんでした。ブラウザーの権限を確認してください。')
    }
  }

  const openRelatedTerm = (term: string) => {
    setGlossaryCategory('すべて')
    setGlossaryQuery(term)
    setExpandedGlossaryTerm(term)
    window.setTimeout(() => document.getElementById(`glossary-${term}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const glossaryEntries = useMemo(() => buildPythonGlossary(learningCourses, pythonGlossary), [])
  const glossaryCategories = useMemo(() => getPythonGlossaryCategories(glossaryEntries), [glossaryEntries])
  const filteredGlossaryEntries = useMemo(() => searchPythonGlossary(
    glossaryEntries,
    glossaryQuery,
    glossaryCategory,
  ), [glossaryCategory, glossaryEntries, glossaryQuery])

  const filteredReviews = useMemo(() => {
    return [...reviews]
      .filter((review) => review.incorrectAttempts > 0)
      .sort((left, right) => left.dueAt - right.dueAt)
      .filter((review) => {
        const lesson = lessonMap.get(review.lessonId)
        const prompt = lesson && (review.exerciseId === lesson.quiz.id ? lesson.quiz.question : lesson.practice.title)
        return lesson && `${prompt} ${lesson.title} ${lesson.summary} ${learningCourses.find((course) => course.id === lesson.courseId)?.title ?? ''}`
          .toLocaleLowerCase().includes(reviewQuery.trim().toLocaleLowerCase())
      })
  }, [reviewQuery, reviews])

  useEffect(() => {
    if (section !== 'study' || !reviewFocusTarget) return
    const selector = reviewFocusTarget === 'quiz' ? '.learning-quiz' : '.learning-exercise'
    const timer = window.setTimeout(() => {
      const target = document.querySelector(selector)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => setReviewFocusTarget(null), 3000)
    }, 60)
    return () => window.clearTimeout(timer)
  }, [reviewFocusTarget, section, selectedLessonId])

  const courseProgress = useMemo(
    () => learningCourses.map((course) => ({ course, ...getCourseProgress(course, progress.completedLessonIds) })),
    [progress.completedLessonIds],
  )
  const favoriteLessons = useMemo(
    () => (progress.favoriteLessonIds ?? []).flatMap((lessonId) => {
      const lesson = lessonMap.get(lessonId)
      return lesson ? [lesson] : []
    }),
    [progress.favoriteLessonIds],
  )
  const currentIndex = currentCourse.lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
  const allLessonsCompleted = allLessons.every((lesson) => progress.completedLessonIds.includes(lesson.id))
  const recommendedLesson = allLessonsCompleted
    ? lessonMap.get('practical-programming-calculator') ?? allLessons[0]!
    : allLessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id))!
  const previousLesson = currentCourse.lessons[currentIndex - 1]
  const nextLesson = currentCourse.lessons[currentIndex + 1]
  const completionLabel = progress.completedLessonIds.includes(selectedLesson.id)
    ? 'このレッスンは完了済みです'
    : '練習問題とクイズの両方に正解すると完了します'

  const submitRuntimeInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (runKindRef.current === 'exercise') runInfoRef.current.inputValues.push(inputValue)
    submitInput(inputValue)
    setInputValue('')
  }

  const showHint = () => {
    setHintLevel((current) => {
      const next = Math.min(current + 1, selectedLesson.practice.hints.length)
      setProgress((value) => ({
        ...value,
        hintUsage: {
          ...value.hintUsage,
          [selectedLesson.id]: (value.hintUsage?.[selectedLesson.id] ?? 0) + (next > current ? 1 : 0),
        },
      }))
      return next
    })
  }

  const toggleSolution = () => {
    const show = !solutionVisible
    setSolutionVisible(show)
    if (show) {
      setProgress((current) => ({
        ...current,
        solutionViewedExerciseIds: [...new Set([...(current.solutionViewedExerciseIds ?? []), selectedLesson.id])],
      }))
    }
  }

  const openCodeInNewProject = async () => {
    const now = Date.now()
    const id = crypto.randomUUID()
    try {
      await saveProject({
        id,
        name: `${selectedLesson.title}の練習`,
        description: 'Python学習からコピーした新しいプロジェクト',
        files: { 'main.py': code },
        directories: [],
        openFiles: ['main.py'],
        activeFile: 'main.py',
        createdAt: now,
        updatedAt: now,
      })
      navigate(`/editor/${id}`)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : '新しいプロジェクトを作成できませんでした。')
    }
  }

  const openReview = (review: (typeof reviews)[number]) => {
    const lesson = lessonMap.get(review.lessonId)
    if (!lesson) return
    const isQuiz = review.exerciseId === lesson.quiz.id
    setReviewFocusTarget(isQuiz ? 'quiz' : 'practice')
    selectLesson(lesson, lesson.courseId)
  }

  const openLesson = (lessonId: string | null | undefined) => {
    const lesson = lessonId ? lessonMap.get(lessonId) : undefined
    const target = lesson ?? lessonMap.get(firstLessonId)
    if (target) selectLesson(target, target.courseId)
  }

  return (
    <div className="learning-page">
      {storageError && <div className="learning-storage-error" role="alert"><AlertCircle size={16} />{storageError}<button type="button" onClick={() => setStorageError('')}>閉じる</button></div>}
      <nav className="learning-tabs" aria-label="学習メニュー">
        <button type="button" className={section === 'study' ? 'is-active' : ''} aria-current={section === 'study' ? 'page' : undefined} onClick={() => setSection('study')}>
          <BookOpen size={20} aria-hidden="true" /><span><strong>レッスン</strong><small>Pythonの基礎から応用まで、コースごとに学習できます。</small></span>
        </button>
        <button type="button" className={section === 'review' ? 'is-active' : ''} aria-current={section === 'review' ? 'page' : undefined} onClick={() => setSection('review')}>
          <RotateCcw size={20} aria-hidden="true" /><span><strong>復習する</strong><small>{dueReviews.length > 0 ? `今日の復習 ${dueReviews.length}問` : '間違えた問題や復習予定を確認できます。'}</small></span>
          <span className={`learning-nav-count${dueReviews.length > 0 ? ' has-due' : ''}`} aria-label={`今日の復習 ${dueReviews.length}問`}>{dueReviews.length}</span>
        </button>
        <button type="button" className={section === 'glossary' ? 'is-active' : ''} aria-current={section === 'glossary' ? 'page' : undefined} onClick={() => setSection('glossary')}>
          <Library size={20} aria-hidden="true" /><span><strong>用語辞典</strong><small>{glossaryEntries.length}語を収録</small></span>
        </button>
      </nav>

      <div className={`learning-layout${section === 'study' ? '' : ' is-secondary'}`}>
        {section === 'study' && <aside className="learning-sidebar">
          <div className="learning-panel-header">
            <div>
              <span className="section-kicker">LEARNING PATH</span>
              <h2>Python学習</h2>
            </div>
          </div>
          <div className="course-list" role="list" aria-label="学習コース">
            {courseProgress.map(({ course, percent, lessonCount, completeCount }) => (
              <button
                key={course.id}
                type="button"
                className={`course-card${course.id === currentCourse.id ? ' is-selected' : ''}`}
                aria-current={course.id === currentCourse.id ? 'true' : undefined}
                onClick={() => {
                  const lesson = course.lessons[0]
                  if (lesson) selectLesson(lesson, course.id)
                }}
              >
                <div className="course-headline"><span>{course.difficulty} · {lessonCount}項目</span><strong>{completeCount}/{lessonCount}</strong></div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="mini-progress" aria-label={`進捗 ${percent}%`}><span style={{ width: `${percent}%` }} /></div>
              </button>
            ))}
          </div>
          <div className="sidebar-lessons">
            <strong>このコースのレッスン</strong>
            {currentCourse.lessons.map((lesson) => (
              <button type="button" key={lesson.id} className={lesson.id === selectedLesson.id ? 'is-active' : ''} aria-current={lesson.id === selectedLesson.id ? 'true' : undefined} onClick={() => selectLesson(lesson, currentCourse.id)}>
                <span>{lesson.title}</span>
                {progress.completedLessonIds.includes(lesson.id) && <CheckCircle2 size={14} aria-label="完了" />}
              </button>
            ))}
          </div>
        </aside>}

      <main className="learning-main">
        {section === 'study' && (
          <>
            <section className="learning-summary">
              <div className="summary-top">
                <div>
                  <span className="section-kicker">PYTHON LEARNING</span>
                  <h1>学習ダッシュボード</h1>
                  <p>{progress.lastLessonId ? `前回の学習: ${lessonMap.get(progress.lastLessonId)?.title ?? selectedLesson.title}` : '最初のレッスンから自分のペースで学べます。'}</p>
                </div>
                <button type="button" className="primary-button subtle" onClick={() => openLesson(progress.lastLessonId)}>
                  前回の続きから学ぶ
                </button>
              </div>
              {progress.startedLessonIds.length === 0 && (
                <div className="learning-start-guide">
                  <div><SparkleIcon /><strong>Pythonを初めて学ぶ方へ</strong></div>
                  <p>説明を読み、サンプルを実行したあと、自分のコードを書いて練習します。実行結果が想定どおりなら答え合わせに進みましょう。</p>
                  <button type="button" className="primary-button" onClick={() => selectLesson(learningCourses[0]!.lessons[0]!, learningCourses[0]!.id)}>Pythonの基礎から始める</button>
                </div>
              )}
              <div className="stats-grid learning-priority-stats">
                <StatCard label="学習全体の進捗" value={`${progress.completedLessonIds.length}/${allLessons.length}`} />
                <button type="button" className="stat-card stat-card-button" onClick={() => setSection('review')}>
                  <span>今日の復習</span><strong>{dueReviews.length}問</strong><small>復習センターを開く</small>
                </button>
                <button type="button" className="stat-card stat-card-button" onClick={() => {
                  const favorites = document.getElementById('learning-favorites')
                  if (favorites instanceof HTMLDetailsElement) favorites.open = true
                  favorites?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}>
                  <span>お気に入り</span><strong>{favoriteLessons.length}件</strong><small>登録したレッスンを確認</small>
                </button>
                <StatCard label="前回の学習" value={lessonMap.get(progress.lastLessonId ?? '')?.title ?? '未開始'} />
              </div>
              <details className="learning-more-stats">
                <summary>学習の詳しい統計を見る</summary>
                <div className="stats-grid">
                  <StatCard label="開始したレッスン" value={`${progress.startedLessonIds.length}`} />
                  <StatCard label="挑戦回数" value={`${allAttempts}`} />
                  <StatCard label="正解した回答" value={`${correctAttempts}`} />
                  <StatCard label="不正解" value={`${incorrectAttempts}`} />
                  <StatCard label="実行エラー" value={`${executionErrors}`} />
                  <StatCard label="正答率" value={`${accuracy}%`} />
                  <StatCard label="復習対象の問題" value={`${reviewTargets.length}`} />
                  <StatCard label="これからの復習" value={`${upcomingReviews.length}`} />
                </div>
              </details>
              <details className="learning-favorites" id="learning-favorites">
                <summary>お気に入りのレッスン（{favoriteLessons.length}件）</summary>
                {favoriteLessons.length === 0
                  ? <p className="learning-empty">レッスンの星ボタンからお気に入りに登録できます。</p>
                  : <div className="favorite-list">{favoriteLessons.map((lesson) => (
                    <article key={lesson.id}>
                      <button type="button" className="favorite-open" onClick={() => openLesson(lesson.id)}>
                        <strong>{lesson.title}</strong><span>{lesson.summary}</span>
                      </button>
                      <button type="button" className="ghost-button" onClick={() => void toggleFavoriteLesson(lesson.id)} aria-label={`${lesson.title}をお気に入りから解除`}>解除</button>
                    </article>
                  ))}</div>}
              </details>
              <article className="recommended-lesson">
                <div><span className="section-kicker">{allLessonsCompleted ? '次のステップ' : 'おすすめの次のレッスン'}</span><strong>{allLessonsCompleted ? '基礎レッスンを完了しました' : recommendedLesson.title}</strong><p>{allLessonsCompleted ? '実践プログラミングや応用課題で、学んだ文法を組み合わせてみましょう。' : recommendedLesson.summary}</p></div>
                <button type="button" className="secondary-button" onClick={() => selectLesson(recommendedLesson, recommendedLesson.courseId)}>{allLessonsCompleted ? '実践課題を開く' : '学習を始める'}<ChevronRight size={15} /></button>
              </article>
            </section>

            <section className="lesson-shell">
              <header className="lesson-header">
                <div>
                  <span className="section-kicker">{currentCourse.title} · {currentCourse.difficulty}</span>
                  <h2>{selectedLesson.title}</h2>
                  <p>{completionLabel}</p>
                </div>
                <div className="lesson-header-actions">
                  <button type="button" className={`icon-button${progress.favoriteLessonIds?.includes(selectedLesson.id) ? ' is-favorite' : ''}`} onClick={() => void toggleFavorite()} aria-label={progress.favoriteLessonIds?.includes(selectedLesson.id) ? 'お気に入りを解除' : 'レッスンをお気に入りに追加'} title="お気に入り"><Star size={17} fill={progress.favoriteLessonIds?.includes(selectedLesson.id) ? 'currentColor' : 'none'} /></button>
                  <span className="lesson-position">{Math.max(0, currentIndex) + 1}/{currentCourse.lessons.length}</span>
                </div>
              </header>
              <div className="lesson-content">
                <div className="lesson-copy">
                  <article className="info-block">
                    <h3>今回学ぶこと</h3>
                    <p><strong>事前に必要な知識:</strong> {selectedLesson.prerequisites?.length
                      ? selectedLesson.prerequisites.map((id) => lessonMap.get(id)?.title ?? id).join('、')
                      : '特にありません。初めての方もここから始められます。'}</p>
                    <p>{selectedLesson.summary}</p>
                    <p>{selectedLesson.explanation}</p>
                    <ul>{selectedLesson.objective.map((objective) => <li key={objective}>{objective}</li>)}</ul>
                  </article>
                  <article className="info-block">
                    <h3>文法の基本形</h3>
                    <pre>{selectedLesson.syntax}</pre>
                  </article>
                  <article className="info-block">
                    <h3>重要なポイント</h3>
                    <ul>{selectedLesson.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                  </article>
                  <article className="info-block">
                    <h3>用語の説明</h3>
                    <div className="term-list">
                      {selectedLesson.terms.map((term) => <div key={term.term} className="term-item"><strong>{term.term}</strong><span>{term.reading}</span><p>{term.meaning}</p>{term.usage && <small>{term.usage}</small>}</div>)}
                    </div>
                  </article>
                  <article className="info-block">
                    <h3>サンプルコード</h3>
                    <pre>{selectedLesson.sampleCode}</pre>
                    <p>実行結果の例: <code>{selectedLesson.expectedOutput}</code></p>
                    <ol className="sample-line-explanations">
                      {(selectedLesson.sampleLineExplanations ?? selectedLesson.sampleCode.split('\n').map(() => 'この行を実行します。')).map((explanation, lineIndex) => (
                        <li key={`${lineIndex}-${explanation}`}><code>{lineIndex + 1}行目</code> {explanation}</li>
                      ))}
                    </ol>
                    <div className="sample-actions">
                      <button type="button" className="secondary-button" onClick={() => beginRun('sample')} disabled={status !== 'ready'}><CirclePlay size={16} />サンプルを実行</button>
                      {status === 'running' && <button type="button" className="ghost-button" onClick={stopRun}><Square size={15} />停止</button>}
                    </div>
                    <div className="runtime-box"><div className="runtime-label">サンプルの実行結果</div><pre>{sampleOutput || 'まだ実行していません。'}</pre></div>
                  </article>
                  <article className="info-block">
                    <h3>よくある間違い</h3>
                    <ul>{selectedLesson.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
                  </article>
                  <article className="info-block next-step-block">
                    <h3>次に学ぶこと</h3>
                    <p>{selectedLesson.nextStep}</p>
                  </article>
                  <article className="info-block">
                    <h3>自分用メモ</h3>
                    <textarea className="learning-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} aria-label="レッスンのメモ" placeholder="気づいたことや、あとで確認したいことを書き留めます" />
                  </article>
                </div>

                <aside className="lesson-practice">
                  <article className={`info-block learning-exercise${reviewFocusTarget === 'practice' ? ' is-review-highlight' : ''}`} tabIndex={-1}>
                    <div className="exercise-title"><Code2 size={17} /><h3>学習用コード練習</h3></div>
                    <p>{selectedLesson.practice.prompt}</p>
                    {selectedLesson.practice.inputGradingRule && <p className="input-grading-note">自分で入力して実行する方法と、複数の設定済み入力例で答え合わせする方法を選べます。</p>}
                    <Editor
                      height="260px"
                      language="python"
                      value={code}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                      onChange={(value) => setCode(value ?? '')}
                      options={{
                        ariaLabel: '練習問題のPythonコードエディター',
                        automaticLayout: true,
                        fontSize,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        tabSize: 4,
                      }}
                    />
                    <span className="draft-status">学習用コードはレッスンごとに自動保存されます。通常プロジェクトには影響しません。</span>
                    <div className="practice-actions">
                      {selectedLesson.practice.inputGradingRule?.testCases?.length
                        ? <>
                          <button type="button" className="secondary-button" onClick={() => beginRun('exercise')} disabled={status !== 'ready'}><CirclePlay size={16} />自分で入力して実行</button>
                          <button type="button" className="primary-button" onClick={beginInputTest} disabled={status !== 'ready'}><CirclePlay size={16} />入力例で答え合わせ</button>
                        </>
                        : <button type="button" className="primary-button" onClick={() => beginRun('exercise')} disabled={status !== 'ready'}><CirclePlay size={16} />実行して答え合わせ</button>}
                      {status === 'running' && <button type="button" className="ghost-button" onClick={stopRun}><Square size={15} />停止</button>}
                      <button type="button" className="ghost-button" onClick={() => {
                        if (window.confirm('このレッスンの練習コードを初期状態に戻しますか？')) setCode(selectedLesson.practice.starter)
                      }}>初期状態に戻す</button>
                      <button type="button" className="ghost-button" onClick={() => clearOutput()}>出力を消去</button>
                      <button type="button" className="ghost-button" onClick={() => void openCodeInNewProject()}>エディターで新規プロジェクトとして開く</button>
                    </div>
                    <div className="runtime-status" aria-live="polite">Python環境: {statusMessage || status}</div>
                    {pendingInput && (
                      <form className="learning-input-form" onSubmit={submitRuntimeInput}>
                        <label htmlFor="learning-runtime-input">{pendingInput.prompt || 'Pythonのinput()に入力してください'}</label>
                        <div><input id="learning-runtime-input" value={inputValue} onChange={(event) => setInputValue(event.target.value)} autoFocus /><button type="submit" className="secondary-button">入力を送信</button></div>
                      </form>
                    )}
                    <div className="runtime-box"><div className="runtime-label">練習の実行結果 {durationMs !== null && `· ${(durationMs / 1000).toFixed(2)}秒`}</div><pre>{exerciseOutput || 'コードを実行するとここに結果が表示されます。'}</pre></div>
                    {exerciseFeedback && <div className={`result-box ${exerciseScore ?? 'neutral'}`} role="status">{exerciseScore === 'correct' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{exerciseFeedback}</span></div>}
                    <div className="practice-actions">
                      <button type="button" className="ghost-button" onClick={showHint} disabled={hintLevel >= selectedLesson.practice.hints.length}>ヒント {hintLevel}/{selectedLesson.practice.hints.length}</button>
                      <button type="button" className="ghost-button" onClick={toggleSolution}>{solutionVisible ? '解答例を閉じる' : '解答例を見る'}</button>
                    </div>
                    {hintLevel > 0 && <div className="hint-box"><Lightbulb size={16} /><p>{selectedLesson.practice.hints[hintLevel - 1]}</p></div>}
                    {solutionVisible && <div className="solution-box"><strong>解答例</strong><pre>{selectedLesson.practice.solution}</pre><p>解答例を参考にしたあと、コードを自分なりに変えて再実行してみましょう。</p></div>}
                  </article>

                  <article className={`info-block learning-quiz${reviewFocusTarget === 'quiz' ? ' is-review-highlight' : ''}`} tabIndex={-1}>
                    <div className="exercise-title"><CircleHelp size={17} /><h3>理解度クイズ</h3></div>
                    <p>{selectedLesson.quiz.question}</p>
                    <fieldset>
                      <legend className="visually-hidden">回答を選択</legend>
                      {selectedLesson.quiz.choices.map((choice) => (
                        <label key={choice} className="quiz-choice">
                          <input type="radio" name={`quiz-${selectedLesson.quiz.id}`} value={choice} checked={selectedQuizAnswer === choice} onChange={() => { quizSubmittedRef.current = false; setSelectedQuizAnswer(choice); setQuizFeedback(''); setQuizExplanationVisible(false) }} />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </fieldset>
                    <button type="button" className="secondary-button" onClick={checkQuiz} disabled={!selectedQuizAnswer || Boolean(quizFeedback)}>クイズを採点</button>
                    {quizFeedback && <button type="button" className="ghost-button" onClick={retryQuiz}>もう一度挑戦</button>}
                    {quizFeedback && <button type="button" className="ghost-button" onClick={() => setQuizExplanationVisible((visible) => !visible)}>{quizExplanationVisible ? '解説を閉じる' : '解説を表示'}</button>}
                    {quizFeedback && <div className={`result-box ${selectedQuizAnswer === selectedLesson.quiz.answer ? 'correct' : 'incorrect'}`} role="status"><span>{quizFeedback}{quizExplanationVisible && ` 正解: ${selectedLesson.quiz.answer}。${selectedLesson.quiz.choiceExplanations?.[selectedQuizAnswer] ?? selectedLesson.quiz.explanation}`}</span></div>}
                  </article>
                </aside>
              </div>
              <footer className="lesson-navigation">
                <button type="button" className="ghost-button" disabled={!previousLesson} onClick={() => previousLesson && selectLesson(previousLesson, currentCourse.id)}><ChevronLeft size={16} />前のレッスン</button>
                <button type="button" className="ghost-button" disabled={!nextLesson} onClick={() => nextLesson && selectLesson(nextLesson, currentCourse.id)}>次のレッスン<ChevronRight size={16} /></button>
              </footer>
            </section>
          </>
        )}

        {section === 'review' && (
          <section className="learning-summary learning-secondary-page">
            <header className="secondary-page-header">
              <span className="section-kicker">REVIEW CENTER</span>
              <h1>復習センター</h1>
              <p>間違えた問題をもう一度解き、時間を空けながら繰り返し復習することで、知識の定着を目指します。</p>
            </header>
            <div className="review-summary-grid">
              <StatCard label="今日復習できる問題" value={`${todayReviews.length}問`} />
              <StatCard label="今後の復習予定" value={`${upcomingReviews.length}問`} />
              <StatCard label="復習対象の問題" value={`${reviewTargets.length}問`} />
              <StatCard label="これまでの復習回数" value={`${reviewTargets.reduce((total, review) => total + review.attempts, 0)}回`} />
            </div>
            <label className="learning-search">
              <Search size={18} aria-hidden="true" />
              <input value={reviewQuery} onChange={(event) => setReviewQuery(event.target.value)} placeholder="問題名・レッスン名から検索" aria-label="復習問題を検索" />
              {reviewQuery && <button type="button" className="search-clear" onClick={() => setReviewQuery('')} aria-label="復習検索をクリア"><X size={17} /></button>}
            </label>

            {reviewTargets.length === 0 ? (
              <div className="learning-empty-state">
                <RotateCcw size={30} aria-hidden="true" />
                <h2>復習する問題はまだありません。</h2>
                <p>練習問題や理解度クイズに挑戦して間違えた問題は、ここに自動で追加されます。</p>
                <button type="button" className="primary-button" onClick={() => setSection('study')}>レッスンに戻る</button>
              </div>
            ) : (
              <>
                {filteredReviews.length === 0 && <p className="learning-empty">検索条件に一致する復習問題がありません。検索語を変更してください。</p>}
                <section className="review-section">
                  <div className="review-section-heading"><div><h2>今日の復習</h2><p>今すぐ取り組める問題です。</p></div><strong>{filteredReviews.filter((review) => review.dueAt <= reviewNow).length}問</strong></div>
                  {filteredReviews.filter((review) => review.dueAt <= reviewNow).length === 0
                    ? <p className="learning-empty">{upcomingReviews.length > 0 ? '今日の復習はありません。次回の復習予定があります。' : '今日復習できる問題はありません。'}</p>
                    : <div className="review-list">{filteredReviews.filter((review) => review.dueAt <= reviewNow).map((review) => {
                      const lesson = lessonMap.get(review.lessonId)
                      if (!lesson) return null
                      const isQuiz = review.exerciseId === lesson.quiz.id
                      const course = learningCourses.find(({ id }) => id === lesson.courseId)
                      const overdueDays = Math.floor((reviewNow - review.dueAt) / (24 * 60 * 60 * 1000))
                      const formatDate = (time: number) => new Date(time).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
                      return <article className="review-card" key={review.exerciseId}>
                        <div className="review-card-content">
                          <div className="review-card-heading"><span className="review-type">{isQuiz ? '理解度クイズ' : '練習問題'}</span><span className="review-status is-due">{overdueDays > 0 ? `${overdueDays}日超過` : '今日の復習'}</span></div>
                          <span className="section-kicker">{course?.title ?? 'Python学習'} · {lesson.title}</span>
                          <strong>{isQuiz ? lesson.quiz.question : lesson.practice.prompt}</strong>
                          <dl className="review-metadata">
                            <div><dt>不正解回数</dt><dd>{review.incorrectAttempts}回</dd></div>
                            <div><dt>最終挑戦</dt><dd>{formatDate(review.lastAttemptAt)}</dd></div>
                            <div><dt>次回の復習</dt><dd>{formatDate(review.dueAt)}</dd></div>
                            <div><dt>最後に正解</dt><dd>{review.correctAt ? formatDate(review.correctAt) : 'まだ正解していません'}</dd></div>
                            <div><dt>ヒント</dt><dd>{review.hintLevel > 0 ? `最大${review.hintLevel}段階を使用` : '未使用'}</dd></div>
                          </dl>
                        </div>
                        <button type="button" className="primary-button review-open-button" onClick={() => openReview(review)}>この問題を復習する</button>
                      </article>
                    })}</div>}
                </section>
                <section className="review-section upcoming-review-section">
                  <div className="review-section-heading"><div><h2>これからの復習</h2><p>次回の復習予定です。予定日になったら、もう一度挑戦しましょう。</p></div><strong>{filteredReviews.filter((review) => review.dueAt > reviewNow).length}問</strong></div>
                  {filteredReviews.filter((review) => review.dueAt > reviewNow).length === 0
                    ? <p className="learning-empty">これからの復習予定はありません。</p>
                    : <div className="review-list">{filteredReviews.filter((review) => review.dueAt > reviewNow).map((review) => {
                      const lesson = lessonMap.get(review.lessonId)
                      if (!lesson) return null
                      const isQuiz = review.exerciseId === lesson.quiz.id
                      const course = learningCourses.find(({ id }) => id === lesson.courseId)
                      const formatDate = (time: number) => new Date(time).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })
                      return <article className="review-card upcoming-review-card" key={review.exerciseId}>
                        <div className="review-card-content">
                          <div className="review-card-heading"><span className="review-type">{isQuiz ? '理解度クイズ' : '練習問題'}</span><span className="review-status">次回予定</span></div>
                          <span className="section-kicker">{course?.title ?? 'Python学習'} · {lesson.title}</span>
                          <strong>{isQuiz ? lesson.quiz.question : lesson.practice.prompt}</strong>
                          <dl className="review-metadata">
                            <div><dt>不正解回数</dt><dd>{review.incorrectAttempts}回</dd></div>
                            <div><dt>最終挑戦</dt><dd>{formatDate(review.lastAttemptAt)}</dd></div>
                            <div><dt>次回の復習</dt><dd>{formatDate(review.dueAt)}</dd></div>
                            <div><dt>最後に正解</dt><dd>{review.correctAt ? formatDate(review.correctAt) : 'まだ正解していません'}</dd></div>
                            <div><dt>ヒント</dt><dd>{review.hintLevel > 0 ? `最大${review.hintLevel}段階を使用` : '未使用'}</dd></div>
                          </dl>
                        </div>
                        <button type="button" className="secondary-button review-open-button" onClick={() => openReview(review)}>問題を確認する</button>
                      </article>
                    })}</div>}
                </section>
              </>
            )}
            <details className="review-how-it-works">
              <summary>復習の仕組み</summary>
              <ul>
                <li>間違えた問題は、自動的に復習対象になります。</li>
                <li>正解すると、次回の復習までの間隔が少しずつ長くなります。</li>
                <li>もう一度間違えた場合は、復習間隔が短くなります。</li>
                <li>実行エラーやタイムアウトは、不正解とは別に記録されます。</li>
                <li>復習履歴は保存され、ここでいつでも確認できます。</li>
              </ul>
            </details>
          </section>
        )}

        {section === 'glossary' && (
          <section className="learning-summary learning-secondary-page">
            <header className="secondary-page-header">
              <span className="section-kicker">PYTHON GLOSSARY</span>
              <h1>Python用語辞典</h1>
              <p>Pythonの用語や文法、コードの使い方を調べられます。分からない言葉があったら、ここで検索してみましょう。</p>
            </header>
            <label className="learning-search glossary-search">
              <Search size={20} aria-hidden="true" />
              <input value={glossaryQuery} onChange={(event) => setGlossaryQuery(event.target.value)} placeholder="用語名・読み方・意味から検索できます" aria-label="用語名・読み方・意味から検索" />
              {glossaryQuery && <button type="button" className="search-clear" onClick={() => setGlossaryQuery('')} aria-label="用語検索をクリア"><X size={18} /></button>}
            </label>
            <div className="glossary-counts" aria-live="polite">
              <span>登録用語 <strong>{glossaryEntries.length}語</strong></span>
              <span>検索結果 <strong>{filteredGlossaryEntries.length}語</strong></span>
              <span>カテゴリ <strong>{glossaryCategory}</strong></span>
            </div>
            <div className="glossary-categories" aria-label="用語カテゴリ">
              {['すべて', ...glossaryCategories].map((category) => {
                const count = category === 'すべて'
                  ? glossaryEntries.length
                  : glossaryEntries.filter((entry) => entry.category === category).length
                return <button type="button" key={category} className={glossaryCategory === category ? 'is-active' : ''} aria-pressed={glossaryCategory === category} onClick={() => setGlossaryCategory(category)}>{category}<span>{count}</span></button>
              })}
            </div>
            {copyError && <p className="glossary-copy-error" role="alert">{copyError}</p>}
            {filteredGlossaryEntries.length === 0
              ? <div className="learning-empty-state"><Library size={30} aria-hidden="true" /><h2>一致する用語がありません。</h2><p>検索文字やカテゴリを変更して、もう一度お試しください。</p></div>
              : <div className="glossary-grid">
                {filteredGlossaryEntries.map((entry) => {
                  const linkedTerms = (entry.relatedTerms ?? []).filter((term) => glossaryEntries.some((candidate) => candidate.term === term))
                  return <article className="glossary-card" id={`glossary-${entry.term}`} key={entry.term}>
                    <header className="glossary-card-heading">
                      <div><strong>{entry.term}</strong><span>{entry.reading}</span></div>
                      <span className="glossary-category-badge">{entry.category}</span>
                    </header>
                    <p className="glossary-meaning">{entry.meaning}</p>
                    <details className="glossary-details" open={expandedGlossaryTerm === entry.term} onToggle={(event) => {
                      const isOpen = event.currentTarget.open
                      setExpandedGlossaryTerm((current) => isOpen ? entry.term : current === entry.term ? '' : current)
                    }}>
                      <summary>詳しい使い方・コード例</summary>
                      {entry.usage && <p><strong>使いどころ:</strong> {entry.usage}</p>}
                      {entry.exampleCode && <div className="glossary-code-example">
                        <pre><code>{entry.exampleCode}</code></pre>
                        <button type="button" className="secondary-button" onClick={() => void copyGlossaryCode(entry.term, entry.exampleCode!)}><Copy size={15} />{copiedGlossaryTerm === entry.term ? 'コピーしました' : 'コードをコピー'}</button>
                      </div>}
                      {entry.exampleOutput !== undefined && <p className="glossary-output"><strong>実行結果:</strong><code>{entry.exampleOutput || '出力なし'}</code></p>}
                      {linkedTerms.length > 0 && <div className="glossary-related-terms"><strong>関連用語</strong><div>{linkedTerms.map((term) => <button type="button" key={term} onClick={() => openRelatedTerm(term)}>{term}</button>)}</div></div>}
                      <button type="button" className="ghost-button" onClick={() => openLesson(entry.lessonId)}>この用語を学ぶ<ChevronRight size={15} /></button>
                    </details>
                  </article>
                })}
              </div>}
          </section>
        )}
      </main>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>
}

function SparkleIcon() {
  return <BookOpen size={19} aria-hidden="true" />
}
