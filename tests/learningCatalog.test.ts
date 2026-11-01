import { describe, expect, it } from 'vitest'
import { allLessons, learningCourses } from '../src/data/learningCatalog'

describe('Python learning curriculum', () => {
  it('has fourteen ordered courses and at least fifty unique lessons and quiz prompts', () => {
    expect(learningCourses).toHaveLength(14)
    expect(allLessons.length).toBeGreaterThanOrEqual(50)
    expect(new Set(learningCourses.map(({ id }) => id)).size).toBe(learningCourses.length)
    expect(new Set(allLessons.map(({ id }) => id)).size).toBe(allLessons.length)
    expect(new Set(allLessons.map(({ quiz }) => quiz.id)).size).toBe(allLessons.length)
  })

  it('provides a runnable sample, exercise, hints, solution, and quiz for every lesson', () => {
    for (const lesson of allLessons) {
      expect(lesson.sampleCode.trim(), lesson.id).not.toBe('')
      expect(lesson.expectedOutput, lesson.id).toBeDefined()
      expect(lesson.practice.starter, lesson.id).not.toContain(lesson.practice.solution)
      expect(lesson.practice.hints, lesson.id).toHaveLength(3)
      expect(lesson.practice.solution.trim(), lesson.id).not.toBe('')
      expect(lesson.quiz.choices, lesson.id).toContain(lesson.quiz.answer)
      if (lesson.practice.testCases) {
        expect(lesson.practice.functionName, lesson.id).toBeTruthy()
        expect(lesson.practice.testCases.length, lesson.id).toBeGreaterThan(1)
      }
    }
  })
})
