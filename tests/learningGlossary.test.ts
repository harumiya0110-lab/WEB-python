import { describe, expect, it } from 'vitest'
import { buildPythonGlossary, getPythonGlossaryCategories, pythonGlossary, searchPythonGlossary } from '../src/data/pythonGlossary'
import { learningCourses } from '../src/data/learningCatalog'

describe('Python glossary', () => {
  const entries = buildPythonGlossary(learningCourses, pythonGlossary)

  it('combines curated and lesson terms without duplicate names or invalid lesson references', () => {
    const lessonIds = new Set(learningCourses.flatMap((course) => course.lessons.map(({ id }) => id)))
    expect(entries.length).toBeGreaterThan(pythonGlossary.length)
    expect(new Set(entries.map(({ term }) => term)).size).toBe(entries.length)
    for (const entry of entries) {
      expect(lessonIds.has(entry.lessonId), `${entry.term}: ${entry.lessonId}`).toBe(true)
      expect(entry.category, entry.term).toBeTruthy()
    }
  })

  it('searches formal names, readings, definitions, usage, categories, and related terms', () => {
    const variable = entries.find(({ term }) => term === '変数')
    expect(variable?.relatedTerms).toContain('int')
    expect(searchPythonGlossary(entries, 'int').some(({ term }) => term === 'int')).toBe(true)
    expect(searchPythonGlossary(entries, 'いんと').some(({ term }) => term === 'int')).toBe(true)
    expect(searchPythonGlossary(entries, '整数を表す').some(({ term }) => term === 'int')).toBe(true)
    expect(searchPythonGlossary(entries, '変数').some(({ term }) => term === 'int')).toBe(true)
    expect(searchPythonGlossary(entries, 'VARIABLE').length).toBe(0)
    const filteredByCategory = searchPythonGlossary(entries, 'python', '変数・データ型')
    expect(filteredByCategory.length).toBeGreaterThan(0)
    expect(filteredByCategory.every(({ category }) => category === '変数・データ型')).toBe(true)
    expect(searchPythonGlossary(entries, 'not-a-python-term')).toEqual([])
  })

  it('only exposes categories that have registered terms', () => {
    expect(getPythonGlossaryCategories(entries)).toContain('データ分析')
    expect(getPythonGlossaryCategories(entries)).not.toContain('未登録カテゴリ')
  })
})
