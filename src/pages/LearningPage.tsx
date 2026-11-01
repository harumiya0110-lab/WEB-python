import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Clock3,
  Code2,
  Lightbulb,
  Search,
  Square,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { allLessons, firstLessonId, learningCourses, lessonMap } from '../data/learningCatalog'
import { usePythonRuntime } from '../hooks/usePythonRuntime'
import { gradePythonOutput } from '../python/learningGrading'
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
import type { LearningCourse, LearningLesson, LearningProgressState } from '../types/learning'

type LearningSection = 'study' | 'review' | 'glossary'
type ScoreState = 'correct' | 'incorrect' | 'error' | null
const REVIEW_TIMESTAMP = Date.now()

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

const glossaryExtras: Array<{ term: string; reading: string; meaning: string; lessonId: string }> = [
  { term: 'Python', reading: 'パイソン', meaning: '読みやすさを大切にしたプログラミング言語です。', lessonId: 'python-what-is-python' },
  { term: 'プログラム', reading: 'ぷろぐらむ', meaning: 'コンピューターへの指示を並べたものです。', lessonId: 'python-what-is-python' },
  { term: 'コード', reading: 'こーど', meaning: 'プログラムを書くための命令や文です。', lessonId: 'python-what-is-python' },
  { term: '実行', reading: 'じっこう', meaning: '書いたプログラムを動かすことです。', lessonId: 'python-what-is-python' },
  { term: '値', reading: 'あたい', meaning: '変数などに保存されるデータです。', lessonId: 'variables-intro' },
  { term: 'str', reading: 'すとりんぐ', meaning: '文字列を表すデータ型です。', lessonId: 'types-and-conversion' },
  { term: 'int', reading: 'いんと', meaning: '整数を表すデータ型です。', lessonId: 'types-and-conversion' },
  { term: 'float', reading: 'ふろーと', meaning: '小数を表すデータ型です。', lessonId: 'user-input-input-float' },
  { term: 'bool', reading: 'ぶーる', meaning: 'TrueかFalseのどちらかを表す型です。', lessonId: 'comparison-operators' },
  { term: 'None', reading: 'なん', meaning: '値がないことを表す特別な値です。', lessonId: 'types-and-conversion' },
  { term: 'elif', reading: 'えるいふ', meaning: '複数の条件を順に調べるときに使います。', lessonId: 'if-else-basics' },
  { term: 'else', reading: 'えるす', meaning: 'ifの条件が成り立たない場合の処理です。', lessonId: 'if-else-basics' },
  { term: 'continue', reading: 'こんてぃにゅー', meaning: '繰り返しの残りを飛ばして次の回へ進みます。', lessonId: 'loops-break-continue' },
  { term: 'pass', reading: 'ぱす', meaning: '何もしない処理を置くための文です。', lessonId: 'object-oriented-class-instance' },
  { term: 'from', reading: 'ふろむ', meaning: 'モジュールから特定の機能を読み込むときに使います。', lessonId: 'files-errors-modules-import-module' },
  { term: 'as', reading: 'あず', meaning: '読み込んだモジュールなどに別名を付けます。', lessonId: 'data-analysis-pandas-dataframe' },
  { term: 'finally', reading: 'ふぁいなりー', meaning: 'エラーの有無にかかわらず最後に実行する処理です。', lessonId: 'files-errors-modules-try-except' },
  { term: 'raise', reading: 'れいず', meaning: 'プログラムからエラーを発生させる文です。', lessonId: 'files-errors-modules-try-except' },
  { term: 'Series', reading: 'しりーず', meaning: 'pandasで使う、ラベル付きの1次元データです。', lessonId: 'data-analysis-pandas-dataframe' },
  { term: 'read_csv', reading: 'りーどしーえすぶい', meaning: 'pandasでCSVファイルをDataFrameとして読み込みます。', lessonId: 'data-analysis-csv-basics' },
  { term: 'pyplot', reading: 'ぱいぷろっと', meaning: 'Matplotlibでグラフを作るための機能です。', lessonId: 'data-analysis-matplotlib' },
]

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
  const [code, setCode] = useState('')
  const [draftLoadedId, setDraftLoadedId] = useState('')
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState('')
  const [quizFeedback, setQuizFeedback] = useState('')
  const [exerciseFeedback, setExerciseFeedback] = useState('')
  const [exerciseScore, setExerciseScore] = useState<ScoreState>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [sampleOutput, setSampleOutput] = useState('')
  const [exerciseOutput, setExerciseOutput] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [storageError, setStorageError] = useState('')
  const [query, setQuery] = useState('')
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof listLearningAttempts>>>([])
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof listLearningReviews>>>([])
  const [notes, setNotes] = useState('')
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
  const runInfoRef = useRef({ lessonId: '', expectedOutput: '', code: '', hintLevel: 0, solutionViewed: false })

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
  const gradedAttempts = attempts.filter((attempt) => attempt.result !== 'error').length
  const accuracy = gradedAttempts ? Math.round((correctAttempts / gradedAttempts) * 100) : 0
  const dueReviews = reviews.filter((review) => review.incorrectAttempts > 0 && review.dueAt <= REVIEW_TIMESTAMP)

  const refreshHistory = useCallback(async () => {
    const [nextAttempts, nextReviews] = await Promise.all([listLearningAttempts(), listLearningReviews()])
    setAttempts(nextAttempts)
    setReviews(nextReviews)
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
    if (mode === 'sample') {
      setSampleOutput(stdout || (stderr ? 'エラーが発生しました。' : '出力はありません。'))
      return
    }
    setExerciseOutput(stdout)
    if (stderr.includes('Traceback') || stderr.includes('実行時間の上限')) {
      const message = stderr.includes('実行時間の上限')
        ? '実行時間の上限に達しました。処理を短くしてもう一度試してください。'
        : `${describeError(stderr)}\n${stderr.slice(-500)}`
      setExerciseScore('error')
      setExerciseFeedback(message)
      void recordLearningAttempt({
        lessonId: runInfo.lessonId,
        exerciseId: runInfo.lessonId,
        submittedAnswer: runInfo.code,
        result: 'error',
        hintLevel: runInfo.hintLevel,
        solutionViewed: runInfo.solutionViewed,
      }).then(refreshHistory).catch((error: unknown) => setStorageError(error instanceof Error ? error.message : '回答履歴を保存できませんでした。'))
      return
    }
    const grade = gradePythonOutput(runInfo.expectedOutput, stdout)
    const correct = grade.correct
    setExerciseScore(correct ? 'correct' : 'incorrect')
    setExerciseFeedback(correct
      ? '正解です。実行結果が期待する出力と一致しました。'
      : `出力が期待した結果と異なります。期待する結果: ${grade.expected || '（何も表示しない）'}。実際の出力: ${grade.actual || '（何も表示しない）'}。出力の順番や値を確認しましょう。`)
    void recordLearningAttempt({
      lessonId: runInfo.lessonId,
      exerciseId: runInfo.lessonId,
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

  useEffect(() => {
    if (status === 'running' || status === 'waiting-input') {
      runStartedRef.current = true
      return
    }
    if (status !== 'ready' || !runStartedRef.current || !runKindRef.current) return
    runStartedRef.current = false
    const mode = runKindRef.current
    runKindRef.current = null
    processRunResult(mode, output)
  }, [output, processRunResult, status])

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
    clearOutput()
    setSampleOutput('')
    setExerciseOutput('')
    setExerciseFeedback('')
    setExerciseScore(null)
    runStartedRef.current = false
    runKindRef.current = mode
    runInfoRef.current = {
      lessonId: selectedLesson.id,
      expectedOutput: selectedLesson.practice.expectedOutput,
      code: source,
      hintLevel,
      solutionViewed: solutionVisible,
    }
    const started = run({ 'lesson.py': source }, 'lesson.py')
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

  const checkQuiz = () => {
    const correct = selectedQuizAnswer === selectedLesson.quiz.answer
    setQuizFeedback(correct
      ? `正解です。${selectedLesson.quiz.explanation}`
      : `不正解です。正解は「${selectedLesson.quiz.answer}」です。${selectedLesson.quiz.explanation}`)
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

  const toggleFavorite = async () => {
    const current = progress.favoriteLessonIds ?? []
    const favorites = current.includes(selectedLesson.id)
      ? current.filter((id) => id !== selectedLesson.id)
      : [...current, selectedLesson.id]
    setProgress((value) => ({ ...value, favoriteLessonIds: favorites }))
    try {
      await (await getDatabase()).put('learningBookmarks', favorites, 'guest')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'お気に入りを保存できませんでした。')
    }
  }

  const glossaryEntries = useMemo(() => {
    const entries = new Map<string, { term: string; reading: string; meaning: string; lessonId: string; courseId: string }>()
    for (const course of learningCourses) {
      for (const lesson of course.lessons) {
        for (const term of lesson.terms) {
          if (!entries.has(term.term)) entries.set(term.term, { ...term, lessonId: lesson.id, courseId: course.id })
        }
      }
      for (const term of glossaryExtras) {
        const lesson = lessonMap.get(term.lessonId)
        if (lesson && !entries.has(term.term)) {
          entries.set(term.term, {
            ...term,
            courseId: lesson.courseId,
          })
        }
      }
    }
    return [...entries.values()].filter((entry) =>
      `${entry.term} ${entry.reading} ${entry.meaning}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
  }, [query])

  const filteredReviews = useMemo(() => {
    return [...reviews]
      .filter((review) => review.incorrectAttempts > 0)
      .sort((left, right) => left.dueAt - right.dueAt)
      .filter((review) => {
        const lesson = lessonMap.get(review.lessonId)
        return lesson && `${lesson.title} ${lesson.summary}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
      })
  }, [query, reviews])

  const courseProgress = useMemo(
    () => learningCourses.map((course) => ({ course, ...getCourseProgress(course, progress.completedLessonIds) })),
    [progress.completedLessonIds],
  )
  const currentIndex = currentCourse.lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
  const recommendedLesson = allLessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? allLessons[0]!
  const previousLesson = currentCourse.lessons[currentIndex - 1]
  const nextLesson = currentCourse.lessons[currentIndex + 1]
  const completionLabel = progress.completedLessonIds.includes(selectedLesson.id)
    ? 'このレッスンは完了済みです'
    : '練習問題とクイズの両方に正解すると完了します'

  const submitRuntimeInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

  const openReview = (lessonId: string) => {
    const lesson = lessonMap.get(lessonId)
    if (lesson) selectLesson(lesson, lesson.courseId)
  }

  return (
    <div className="learning-page">
      <aside className="learning-sidebar">
        <div className="learning-panel-header">
          <div>
            <span className="section-kicker">LEARNING PATH</span>
            <h2>Python学習</h2>
          </div>
        </div>
        <nav className="learning-tabs" aria-label="学習メニュー">
          <button type="button" className={section === 'study' ? 'is-active' : ''} onClick={() => setSection('study')}><BookOpen size={16} />レッスン</button>
          <button type="button" className={section === 'review' ? 'is-active' : ''} onClick={() => setSection('review')}><Clock3 size={16} />復習 <span>{dueReviews.length}</span></button>
          <button type="button" className={section === 'glossary' ? 'is-active' : ''} onClick={() => setSection('glossary')}><Search size={16} />用語辞典</button>
        </nav>
        <div className="course-list" role="list" aria-label="学習コース">
          {courseProgress.map(({ course, percent, lessonCount, completeCount }) => (
            <button
              key={course.id}
              type="button"
              className={`course-card${course.id === currentCourse.id ? ' is-selected' : ''}`}
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
            <button type="button" key={lesson.id} className={lesson.id === selectedLesson.id ? 'is-active' : ''} onClick={() => selectLesson(lesson, currentCourse.id)}>
              <span>{lesson.title}</span>
              {progress.completedLessonIds.includes(lesson.id) && <CheckCircle2 size={14} aria-label="完了" />}
            </button>
          ))}
        </div>
      </aside>

      <main className="learning-main">
        {storageError && <div className="learning-storage-error" role="alert"><AlertCircle size={16} />{storageError}<button type="button" onClick={() => setStorageError('')}>閉じる</button></div>}
        {section === 'study' && (
          <>
            <section className="learning-summary">
              <div className="summary-top">
                <div>
                  <span className="section-kicker">PYTHON LEARNING</span>
                  <h1>学習ダッシュボード</h1>
                  <p>{progress.lastLessonId ? `前回の学習: ${lessonMap.get(progress.lastLessonId)?.title ?? selectedLesson.title}` : '最初のレッスンから自分のペースで学べます。'}</p>
                </div>
                <button type="button" className="primary-button subtle" onClick={() => openReview(dueReviews[0]?.lessonId ?? progress.lastLessonId ?? firstLessonId)}>
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
              <div className="stats-grid">
                <StatCard label="完了レッスン" value={`${progress.completedLessonIds.length}/${allLessons.length}`} />
                <StatCard label="問題への挑戦" value={`${allAttempts}`} />
                <StatCard label="正解した回答" value={`${correctAttempts}`} />
                <StatCard label="正答率" value={`${accuracy}%`} />
                <StatCard label="復習待ち" value={`${dueReviews.length}`} />
              </div>
              <article className="recommended-lesson">
                <div><span className="section-kicker">おすすめの次のレッスン</span><strong>{recommendedLesson.title}</strong><p>{recommendedLesson.summary}</p></div>
                <button type="button" className="secondary-button" onClick={() => selectLesson(recommendedLesson, recommendedLesson.courseId)}>学習を始める<ChevronRight size={15} /></button>
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
                    <p>{selectedLesson.summary}</p>
                    <ul>{selectedLesson.objective.map((objective) => <li key={objective}>{objective}</li>)}</ul>
                  </article>
                  <article className="info-block">
                    <h3>重要なポイント</h3>
                    <ul>{selectedLesson.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                  </article>
                  <article className="info-block">
                    <h3>用語の説明</h3>
                    <div className="term-list">
                      {selectedLesson.terms.map((term) => <div key={term.term} className="term-item"><strong>{term.term}</strong><span>{term.reading}</span><p>{term.meaning}</p></div>)}
                    </div>
                  </article>
                  <article className="info-block">
                    <h3>サンプルコード</h3>
                    <pre>{selectedLesson.sampleCode}</pre>
                    <p>実行結果の例: <code>{selectedLesson.expectedOutput}</code></p>
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
                  <article className="info-block">
                    <h3>自分用メモ</h3>
                    <textarea className="learning-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} aria-label="レッスンのメモ" placeholder="気づいたことや、あとで確認したいことを書き留めます" />
                  </article>
                </div>

                <aside className="lesson-practice">
                  <article className="info-block learning-exercise">
                    <div className="exercise-title"><Code2 size={17} /><h3>学習用コード練習</h3></div>
                    <p>{selectedLesson.practice.prompt}</p>
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
                      <button type="button" className="primary-button" onClick={() => beginRun('exercise')} disabled={status !== 'ready'}><CirclePlay size={16} />実行して答え合わせ</button>
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

                  <article className="info-block learning-quiz">
                    <div className="exercise-title"><CircleHelp size={17} /><h3>理解度クイズ</h3></div>
                    <p>{selectedLesson.quiz.question}</p>
                    <fieldset>
                      <legend className="visually-hidden">回答を選択</legend>
                      {selectedLesson.quiz.choices.map((choice) => (
                        <label key={choice} className="quiz-choice">
                          <input type="radio" name={`quiz-${selectedLesson.quiz.id}`} value={choice} checked={selectedQuizAnswer === choice} onChange={() => { setSelectedQuizAnswer(choice); setQuizFeedback('') }} />
                          <span>{choice}</span>
                        </label>
                      ))}
                    </fieldset>
                    <button type="button" className="secondary-button" onClick={checkQuiz} disabled={!selectedQuizAnswer}>クイズを採点</button>
                    {quizFeedback && <div className={`result-box ${selectedQuizAnswer === selectedLesson.quiz.answer ? 'correct' : 'incorrect'}`} role="status"><span>{quizFeedback}</span></div>}
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
            <div className="summary-top"><div><span className="section-kicker">REVIEW</span><h1>復習する</h1><p>間違えた問題は、もう一度練習できます。自分のペースで取り組みましょう。</p></div></div>
            <label className="learning-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="レッスンを検索" aria-label="復習問題を検索" /></label>
            {filteredReviews.length === 0 ? <p className="learning-empty">復習できる問題はまだありません。練習やクイズで間違えた問題がここに表示されます。</p> : (
              <div className="review-list">
                {filteredReviews.map((review) => {
                  const lesson = lessonMap.get(review.lessonId)
                  if (!lesson) return null
                  return <article className="review-card" key={review.exerciseId}><div><strong>{lesson.title}</strong><p>{lesson.summary}</p><small>{review.incorrectAttempts}回間違い · {review.dueAt <= REVIEW_TIMESTAMP ? '復習できます' : `復習予定: ${new Date(review.dueAt).toLocaleDateString('ja-JP')}`}</small></div><button type="button" className="secondary-button" onClick={() => openReview(lesson.id)}>再挑戦</button></article>
                })}
              </div>
            )}
          </section>
        )}

        {section === 'glossary' && (
          <section className="learning-summary learning-secondary-page">
            <div className="summary-top"><div><span className="section-kicker">PYTHON GLOSSARY</span><h1>Python用語辞典</h1><p>用語名や説明文から検索できます。レッスンと一緒に確認しましょう。</p></div></div>
            <label className="learning-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例: 変数、関数、繰り返し" aria-label="用語を検索" /></label>
            <div className="glossary-grid">
              {glossaryEntries.map((entry) => (
                <article className="glossary-card" key={entry.term}>
                  <div><strong>{entry.term}</strong><span>{entry.reading}</span></div>
                  <p>{entry.meaning}</p>
                  <button type="button" className="ghost-button" onClick={() => openReview(entry.lessonId)}>関連レッスンへ<ChevronRight size={15} /></button>
                </article>
              ))}
              {glossaryEntries.length === 0 && <p className="learning-empty">一致する用語がありません。</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>
}

function SparkleIcon() {
  return <BookOpen size={19} aria-hidden="true" />
}
