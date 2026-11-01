import { describe, expect, it } from 'vitest'
import { allLessons, learningCourses } from '../src/data/learningCatalog'
import { pythonGlossary } from '../src/data/pythonGlossary'

describe('Python learning curriculum', () => {
  it('has fourteen ordered courses and at least fifty unique lessons and quiz prompts', () => {
    expect(learningCourses).toHaveLength(14)
    expect(allLessons.length).toBeGreaterThanOrEqual(50)
    expect(new Set(learningCourses.map(({ id }) => id)).size).toBe(learningCourses.length)
    expect(new Set(allLessons.map(({ id }) => id)).size).toBe(allLessons.length)
    expect(new Set(allLessons.map(({ quiz }) => quiz.id)).size).toBe(allLessons.length)
    expect(learningCourses.map(({ id }) => id)).toEqual([
      'python-intro',
      'variable-types',
      'operators',
      'user-input',
      'conditionals',
      'loops',
      'sequences',
      'dictionary-strings',
      'functions',
      'files-errors-modules',
      'object-oriented',
      'practical-programming',
      'advanced-python',
      'data-analysis',
    ])
  })

  it('provides a runnable sample, exercise, hints, solution, and quiz for every lesson', () => {
    expect(allLessons.filter((lesson) => (lesson.practice.testCases?.length ?? 0) > 1).length).toBeGreaterThanOrEqual(7)
    const lessonIds = new Set(allLessons.map(({ id }) => id))
    for (const lesson of allLessons) {
      expect(lesson.sampleCode.trim(), lesson.id).not.toBe('')
      expect(lesson.expectedOutput, lesson.id).toBeDefined()
      expect(lesson.practice.starter, lesson.id).not.toContain(lesson.practice.solution)
      expect(lesson.practice.hints, lesson.id).toHaveLength(3)
      expect(lesson.practice.solution.trim(), lesson.id).not.toBe('')
      expect(lesson.quiz.choices, lesson.id).toContain(lesson.quiz.answer)
      expect(lesson.quiz.choices, lesson.id).toHaveLength(3)
      expect(new Set(lesson.quiz.choices).size, lesson.id).toBe(lesson.quiz.choices.length)
      expect(lesson.explanation, lesson.id).toBeTruthy()
      expect(lesson.syntax, lesson.id).toBeTruthy()
      expect(lesson.sampleLineExplanations, lesson.id).toHaveLength(lesson.sampleCode.split('\n').length)
      expect(lesson.nextStep, lesson.id).toBeTruthy()
      for (const prerequisiteId of lesson.prerequisites ?? []) {
        expect(lessonIds.has(prerequisiteId), `${lesson.id}: ${prerequisiteId}`).toBe(true)
      }
      for (const term of lesson.terms) {
        expect(term.reading, `${lesson.id}: ${term.term}`).not.toBe('レッスンのキーワード')
        expect(term.reading, `${lesson.id}: ${term.term}`).not.toBe(term.term)
        expect(term.usage, `${lesson.id}: ${term.term}`).toBeTruthy()
        expect(term.exampleCode, `${lesson.id}: ${term.term}`).toBeTruthy()
      }
      if (lesson.sampleLineExplanations) {
        expect(lesson.sampleLineExplanations, lesson.id).not.toContain('この行ではコードを実行します。')
      }
      if (lesson.practice.testCases) {
        expect(lesson.practice.functionName, lesson.id).toBeTruthy()
        expect(lesson.practice.testCases.length, lesson.id).toBeGreaterThan(1)
      }
      if (lesson.practice.inputGradingRule) {
        expect(lesson.practice.starter, lesson.id).toContain('input(')
        if (lesson.practice.inputGradingRule.testCases) {
          expect(lesson.practice.inputGradingRule.testCases.length, lesson.id).toBeGreaterThan(1)
          for (const testCase of lesson.practice.inputGradingRule.testCases) {
            expect(testCase.inputs.length, lesson.id).toBeGreaterThan(0)
            expect(testCase.expectedOutput, lesson.id).toBeDefined()
          }
        }
      }
    }
  })

  it('keeps glossary references valid and provides complete, searchable examples', () => {
    const lessonIds = new Set(allLessons.map(({ id }) => id))
    expect(new Set(pythonGlossary.map(({ term }) => term)).size).toBe(pythonGlossary.length)
    for (const entry of pythonGlossary) {
      expect(lessonIds.has(entry.lessonId), `${entry.term}: ${entry.lessonId}`).toBe(true)
      expect(entry.reading, entry.term).toBeTruthy()
      expect(entry.meaning, entry.term).toBeTruthy()
      expect(entry.usage, entry.term).toBeTruthy()
      expect(entry.exampleCode, entry.term).toBeTruthy()
      expect(entry.exampleOutput, entry.term).toBeDefined()
      expect(entry.category, entry.term).toBeTruthy()
    }
  })
})
