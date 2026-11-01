import { describe, expect, it } from 'vitest'
import {
  createPythonFunctionTestHarness,
  getExpectedOutputForInputs,
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
    const cases = [
      { arguments: [1, 2], expected: 3 },
      { arguments: [10, 20], expected: 30 },
      { arguments: [-5, 5], expected: 0 },
    ]
    expect(gradePythonFunctionTests(
      'debug output\n__PYSTUDIO_FUNCTION_TESTS__:[{"passed":true,"actual":3},{"passed":false,"actual":29},{"passed":true,"actual":0}]',
      cases,
    )).toEqual({
      correct: false,
      passedCount: 2,
      totalCount: 3,
      firstFailedCase: 2,
      failedCase: { arguments: [10, 20], expected: 30, actual: 29, error: undefined },
      userOutput: 'debug output',
    })
  })

  it('requires a valid result marker matching the number of cases', () => {
    const cases = [{ arguments: [1], expected: 2 }, { arguments: [3], expected: 4 }]
    expect(gradePythonFunctionTests('output only', cases)).toBeNull()
    expect(gradePythonFunctionTests('__PYSTUDIO_FUNCTION_TESTS__:not-json', cases)).toBeNull()
    expect(gradePythonFunctionTests('__PYSTUDIO_FUNCTION_TESTS__:[{"passed":true}]', cases)).toBeNull()
  })

  it('reports the failing function arguments, expected value, actual value, and error', () => {
    const cases = [
      { arguments: [2, 3], expected: 5 },
      { arguments: [-2, 5], expected: 3 },
    ]
    expect(gradePythonFunctionTests(
      'debug\n__PYSTUDIO_FUNCTION_TESTS__:[{"passed":true,"actual":5},{"passed":false,"actual":-3}]',
      cases,
    )).toMatchObject({
      passedCount: 1,
      totalCount: 2,
      firstFailedCase: 2,
      failedCase: { arguments: [-2, 5], expected: 3, actual: -3 },
      userOutput: 'debug',
    })
    expect(gradePythonFunctionTests(
      '__PYSTUDIO_FUNCTION_TESTS__:[{"passed":false,"error":"ValueError: bad input"}]',
      [{ arguments: ['bad'], expected: 1 }],
    )?.failedCase?.error).toBe('ValueError: bad input')
  })

  it('grades interactive output against the actual string or number input', () => {
    expect(getExpectedOutputForInputs(
      { type: 'template', template: 'こんにちは {0}' },
      ['Aoi'],
    )).toBe('こんにちは Aoi')
    expect(getExpectedOutputForInputs(
      { type: 'integer-add', operand: 3 },
      ['8'],
    )).toBe('11')
    expect(getExpectedOutputForInputs(
      { type: 'integer-add', operand: 3 },
      ['8.5'],
    )).toBeNull()
    expect(getExpectedOutputForInputs(
      { type: 'template', template: 'こんにちは {1}' },
      ['Aoi'],
    )).toBeNull()
  })
})
