export type LearningDifficulty = '初級' | '中級' | '応用'

export interface LearningTerm {
  term: string
  reading: string
  meaning: string
}

export interface LearningQuiz {
  id: string
  question: string
  choices: string[]
  answer: string
  explanation: string
}

export interface LessonPractice {
  title: string
  prompt: string
  starter: string
  expectedOutput: string
  hints: [string, string, string]
  solution: string
  scoreHint?: string
}

export interface LearningLesson {
  id: string
  courseId: string
  title: string
  summary: string
  objective: string[]
  keyPoints: string[]
  terms: LearningTerm[]
  sampleCode: string
  expectedOutput: string
  commonMistakes: string[]
  nextStep: string
  practice: LessonPractice
  quiz: LearningQuiz
}

export interface LearningCourse {
  id: string
  title: string
  description: string
  difficulty: LearningDifficulty
  lessons: LearningLesson[]
}

export interface LearningProgressState {
  lastLessonId: string | null
  completedLessonIds: string[]
  startedLessonIds: string[]
  attemptedLessonIds: string[]
  lastUpdatedAt: number
  practicePassedLessonIds?: string[]
  quizPassedLessonIds?: string[]
  notes?: Record<string, string>
  favoriteLessonIds?: string[]
  hintUsage?: Record<string, number>
  solutionViewedExerciseIds?: string[]
}
