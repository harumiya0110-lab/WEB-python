import { describe, expect, it } from 'vitest'
import { gradePythonOutput } from '../src/python/learningGrading'

describe('learning output grading', () => {
  it('ignores a trailing newline and normalizes Windows line endings', () => {
    expect(gradePythonOutput('日本語\r\n85\r\n', '日本語\n85')).toEqual({
      correct: true,
      expected: '日本語\n85',
      actual: '日本語\n85',
    })
  })

  it('preserves meaningful whitespace and output order', () => {
    expect(gradePythonOutput('A B\n2', 'AB\n2').correct).toBe(false)
    expect(gradePythonOutput('first\nsecond', 'second\nfirst').correct).toBe(false)
  })

  it('does not accept an empty solution or extra output', () => {
    expect(gradePythonOutput('ready', '').correct).toBe(false)
    expect(gradePythonOutput('ready', 'ready\nextra').correct).toBe(false)
  })
})
