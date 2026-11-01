import { describe, expect, it } from 'vitest'
import {
  createPythonFunctionTestHarness,
  gradePythonFunctionTests,
  gradePythonOutput,
} from '../src/python/learningGrading'

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

  it('creates a Python harness with multiple argument and return-value cases', () => {
    const cases = [
      { arguments: [1, 2], expected: 3 },
      { arguments: [-5, 5], expected: 0 },
    ]
    const harness = createPythonFunctionTestHarness('add', cases)
    expect(harness).toContain('globals().get("add")')
    expect(harness).toContain(JSON.stringify(JSON.stringify(cases)))
    expect(harness).toContain('__PYSTUDIO_FUNCTION_TESTS__:')
  })

  it('grades all function test cases and removes the private result marker from output', () => {
    expect(gradePythonFunctionTests('debug output\n__PYSTUDIO_FUNCTION_TESTS__:[true,false,true]', 3)).toEqual({
      correct: false,
      passedCount: 2,
      totalCount: 3,
      firstFailedCase: 2,
      userOutput: 'debug output',
    })
  })

  it('requires a valid result marker matching the number of cases', () => {
    expect(gradePythonFunctionTests('output only', 2)).toBeNull()
    expect(gradePythonFunctionTests('__PYSTUDIO_FUNCTION_TESTS__:not-json', 2)).toBeNull()
    expect(gradePythonFunctionTests('__PYSTUDIO_FUNCTION_TESTS__:[true]', 2)).toBeNull()
  })
})
