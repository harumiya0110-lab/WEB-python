export type LearningDifficulty = '初級' | '中級' | '応用'

export interface LearningTerm {
  term: string
  reading: string
  meaning: string
  usage?: string
  exampleCode?: string
  exampleOutput?: string
  relatedTerms?: string[]
  category?: string
}

export interface LearningQuiz {
  id: string
  question: string
  choices: string[]
  answer: string
  explanation: string
  choiceExplanations?: Record<string, string>
}

export type PythonTestValue = string | number | boolean | null | PythonTestValue[] | { [key: string]: PythonTestValue }

export interface PythonFunctionTestCase {
  arguments: PythonTestValue[]
  expected: PythonTestValue
}

export type LearningInputGradingRule =
  | { type: 'template'; template: string }
  | { type: 'integer-add'; operand: number }

export interface LessonPractice {
  title: string
  prompt: string
  starter: string
  expectedOutput: string
  hints: [string, string, string]
  solution: string
  scoreHint?: string
  functionName?: string
  testCases?: PythonFunctionTestCase[]
  inputGradingRule?: LearningInputGradingRule
}

export interface LearningLesson {
  id: string
  courseId: string
  title: string
  summary: string
  explanation?: string
  syntax?: string
  sampleLineExplanations?: string[]
  prerequisites?: string[]
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
