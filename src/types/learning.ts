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
  requiredStrings: string[]
  expectedOutput?: string
  scoreHint: string
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
}
