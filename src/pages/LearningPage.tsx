import { AlertCircle, CheckCircle2, ChevronRight, CirclePlay, Lightbulb } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { learningCourses, firstLessonId, lessonMap } from '../data/learningCatalog'
import { usePythonRuntime } from '../hooks/usePythonRuntime'
import { loadLearningProgress, saveLearningProgress } from '../services/learningProgressService'
import type { LearningCourse, LearningLesson, LearningProgressState } from '../types/learning'

const defaultProgress: LearningProgressState = {
  lastLessonId: firstLessonId,
  completedLessonIds: [],
  startedLessonIds: [firstLessonId],
  attemptedLessonIds: [],
  lastUpdatedAt: Date.now(),
}

function getCourseProgress(course: LearningCourse, completed: string[]) {
  const lessonCount = course.lessons.length
  const completeCount = course.lessons.filter((lesson) => completed.includes(lesson.id)).length
  return { lessonCount, completeCount, percent: Math.round((completeCount / Math.max(1, lessonCount)) * 100) }
}

export function LearningPage() {
  const [progress, setProgress] = useState<LearningProgressState>(defaultProgress)
  const [selectedLessonId, setSelectedLessonId] = useState<string>(firstLessonId)
  const [selectedCourseId, setSelectedCourseId] = useState<string>(learningCourses[0]?.id ?? '')
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState<'correct' | 'partial' | 'incorrect' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [hintLevel, setHintLevel] = useState(0)
  const [runtimeCode, setRuntimeCode] = useState('')
  const [runtimeOutput, setRuntimeOutput] = useState('')
  const { output, run, clearOutput, status } = usePythonRuntime()

  useEffect(() => {
    let ignore = false
    void loadLearningProgress().then((saved) => {
      if (ignore) return
      const nextProgress = {
        ...defaultProgress,
        ...saved,
      }
      setProgress(nextProgress)
      if (nextProgress.lastLessonId) {
        setSelectedLessonId(nextProgress.lastLessonId)
        const course = learningCourses.find((item) => item.lessons.some((lesson) => lesson.id === nextProgress.lastLessonId))
        if (course) {
          setSelectedCourseId(course.id)
        }
      }
      if (nextProgress.completedLessonIds.length > 0) {
        setScore('correct')
      }
    })
    return () => {
      ignore = true
    }
  }, [])

  const allLessons = useMemo(() => learningCourses.flatMap((course) => course.lessons), [])
  const courseForCurrentLesson = useMemo(
    () => learningCourses.find((course) => course.lessons.some((lesson) => lesson.id === selectedLessonId)) ?? learningCourses[0],
    [selectedLessonId],
  )

  const selectedLesson = useMemo<LearningLesson | undefined>(
    () => lessonMap.get(selectedLessonId) ?? allLessons[0],
    [allLessons, selectedLessonId],
  )

  useEffect(() => {
    if (!selectedLesson) return
    setAnswer(selectedLesson.practice.starter)
    setRuntimeCode(selectedLesson.sampleCode)
    setHintLevel(0)
    setScore(null)
    setFeedback('')
  }, [selectedLesson])

  useEffect(() => {
    if (status !== 'ready') {
      return
    }
    const text = output.map((line) => line.text).join('')
    if (text.trim()) {
      setRuntimeOutput(text.trim())
    }
  }, [output, status])

  useEffect(() => {
    if (!selectedLesson) return
    void saveLearningProgress({
      ...progress,
      lastLessonId: selectedLesson.id,
      lastUpdatedAt: Date.now(),
    })
  }, [selectedLesson, progress])

  const markLessonAsStarted = (lessonId: string) => {
    setProgress((current) => {
      const started = current.startedLessonIds.includes(lessonId) ? current.startedLessonIds : [...current.startedLessonIds, lessonId]
      const attempted = current.attemptedLessonIds.includes(lessonId) ? current.attemptedLessonIds : [...current.attemptedLessonIds, lessonId]
      return { ...current, startedLessonIds: started, attemptedLessonIds: attempted, lastLessonId: lessonId, lastUpdatedAt: Date.now() }
    })
  }

  const handleSelectLesson = (lessonId: string, courseId: string) => {
    setSelectedLessonId(lessonId)
    setSelectedCourseId(courseId)
    markLessonAsStarted(lessonId)
  }

  const handleSampleRun = () => {
    clearOutput()
    setRuntimeOutput('')
    run({ 'lesson.py': runtimeCode || selectedLesson?.sampleCode || '' }, 'lesson.py')
  }

  const handleCheckAnswer = () => {
    if (!selectedLesson) return
    const normalized = answer.replace(/\s+/g, ' ').trim()
    const required = selectedLesson.practice.requiredStrings
    const checks = required.filter((item) => normalized.includes(item))
    const isCorrect = checks.length === required.length
    const partial = checks.length > 0 && !isCorrect
    setScore(isCorrect ? 'correct' : partial ? 'partial' : 'incorrect')
    setFeedback(
      isCorrect
        ? `${selectedLesson.title}の理解度チェック：正解です。${selectedLesson.quiz.explanation}`
        : partial
          ? `途中までできています。${selectedLesson.practice.scoreHint}`
          : `まだ少しだけ調整が必要です。${selectedLesson.practice.scoreHint}`,
    )

    setProgress((current) => {
      const completed = isCorrect ? [...new Set([...current.completedLessonIds, selectedLesson.id])] : current.completedLessonIds
      const attempted = current.attemptedLessonIds.includes(selectedLesson.id) ? current.attemptedLessonIds : [...current.attemptedLessonIds, selectedLesson.id]
      return { ...current, completedLessonIds: completed, attemptedLessonIds: attempted, lastLessonId: selectedLesson.id, lastUpdatedAt: Date.now() }
    })
  }

  const hints = [
    selectedLesson?.practice.scoreHint ?? 'まずは基本のprint()を使ってみましょう。',
    `使う文法は「${selectedLesson?.practice.requiredStrings[0] ?? 'print()'}」です。`,
    'コードを少しずつ書いて、実行結果を確認しながら整えましょう。',
  ]

  const stats = [
    { label: '完了済み', value: `${progress.completedLessonIds.length}` },
    { label: '挑戦数', value: `${progress.attemptedLessonIds.length}` },
    { label: '正解数', value: `${progress.completedLessonIds.length}` },
    { label: '正答率', value: `${progress.attemptedLessonIds.length > 0 ? Math.round((progress.completedLessonIds.length / progress.attemptedLessonIds.length) * 100) : 0}%` },
  ]

  if (!selectedLesson) {
    return null
  }

  return (
    <div className="learning-page">
      <aside className="learning-sidebar">
        <div className="learning-panel-header">
          <div>
            <span className="section-kicker">LEARNING PATH</span>
            <h2>学習コース</h2>
          </div>
        </div>

        <div className="course-list" role="list">
          {learningCourses.map((course) => {
            const { percent } = getCourseProgress(course, progress.completedLessonIds)
            const isCurrent = course.id === selectedCourseId
            return (
              <button
                key={course.id}
                type="button"
                className={`course-card${isCurrent ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelectedCourseId(course.id)
                  const firstLesson = course.lessons[0]
                  if (firstLesson) {
                    handleSelectLesson(firstLesson.id, course.id)
                  }
                }}
              >
                <div className="course-headline">
                  <span>{course.difficulty}</span>
                  <strong>{percent}%</strong>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="mini-progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="learning-main">
        <section className="learning-summary">
          <div className="summary-top">
            <div>
              <span className="section-kicker">PYTHON LEARNING</span>
              <h1>学習ダッシュボード</h1>
            </div>
            <button type="button" className="primary-button subtle" onClick={() => handleSelectLesson(progress.lastLessonId ?? firstLessonId, selectedCourseId)}>
              前回の続きから学ぶ
            </button>
          </div>

          <div className="stats-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="stat-card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="lesson-shell">
          <div className="lesson-header">
            <div>
              <span className="section-kicker">{courseForCurrentLesson.difficulty}</span>
              <h2>{selectedLesson.title}</h2>
            </div>
            <div className="lesson-tags">
              {selectedLesson.objective.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>

          <div className="lesson-content">
            <div className="lesson-copy">
              <div className="info-block">
                <h3>今回学ぶこと</h3>
                <p>{selectedLesson.summary}</p>
              </div>

              <div className="info-block">
                <h3>重要なポイント</h3>
                <ul>
                  {selectedLesson.keyPoints.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </div>

              <div className="info-block">
                <h3>用語の説明</h3>
                <div className="term-list">
                  {selectedLesson.terms.map((term) => (
                    <div key={term.term} className="term-item">
                      <strong>{term.term}</strong>
                      <span>{term.reading}</span>
                      <p>{term.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-block">
                <h3>サンプルコード</h3>
                <pre>{selectedLesson.sampleCode}</pre>
                <div className="sample-actions">
                  <button type="button" className="secondary-button" onClick={handleSampleRun}>
                    <CirclePlay size={16} />
                    サンプルを実行
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setRuntimeCode(selectedLesson.sampleCode)}>
                    リセット
                  </button>
                </div>
                <div className="runtime-box">
                  <div className="runtime-label">実行結果</div>
                  <pre>{runtimeOutput || 'まだ実行していません。'}</pre>
                </div>
              </div>
            </div>

            <aside className="lesson-practice">
              <div className="info-block">
                <h3>練習問題</h3>
                <p>{selectedLesson.practice.prompt}</p>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={10}
                  aria-label="練習問題のコード"
                />
                <div className="practice-actions">
                  <button type="button" className="primary-button" onClick={handleCheckAnswer}>答え合わせ</button>
                  <button type="button" className="ghost-button" onClick={() => setHintLevel((current) => Math.min(current + 1, hints.length - 1))}>ヒント</button>
                </div>
                <div className="hint-box">
                  <Lightbulb size={16} />
                  <p>{hints[Math.min(hintLevel, hints.length - 1)]}</p>
                </div>
                {feedback && (
                  <div className={`result-box ${score ?? 'neutral'}`}>
                    {score === 'correct' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                    <span>{feedback}</span>
                  </div>
                )}
              </div>

              <div className="info-block">
                <h3>コース一覧</h3>
                <ul className="lesson-list">
                  {courseForCurrentLesson.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button type="button" className={lesson.id === selectedLesson.id ? 'is-active' : ''} onClick={() => handleSelectLesson(lesson.id, courseForCurrentLesson.id)}>
                        <span>{lesson.title}</span>
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
