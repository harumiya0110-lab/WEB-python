import type { LearningInputGradingRule, LearningInputTestCase, PythonFunctionTestCase, PythonTestValue } from '../types/learning'

export interface OutputGrade {
  correct: boolean
  expected: string
  actual: string
}

export interface FunctionTestGrade {
  correct: boolean
  passedCount: number
  totalCount: number
  firstFailedCase: number | null
  failedCase: {
    arguments: PythonTestValue[]
    expected: PythonTestValue
    actual?: PythonTestValue
    error?: string
  } | null
  userOutput: string
}

export interface InputTestGrade {
  correct: boolean
  passedCount: number
  totalCount: number
  firstFailedCase: number | null
  failedCase: {
    inputs: string[]
    expected: string
    actual: string
  } | null
}

const FUNCTION_TEST_MARKER = '__PYSTUDIO_FUNCTION_TESTS__:'

function isFunctionCaseResult(result: unknown): result is {
  passed: boolean
  actual?: PythonTestValue
  error?: string
} {
  return typeof result === 'object' && result !== null && !Array.isArray(result) &&
    'passed' in result && typeof result.passed === 'boolean'
}

export function gradePythonOutput(expectedOutput: string, actualOutput: string): OutputGrade {
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/\n+$/, '')
  const expected = normalize(expectedOutput)
  const actual = normalize(actualOutput)
  return { correct: expected === actual, expected, actual }
}

export function getExpectedOutputForInputs(
  rule: LearningInputGradingRule,
  inputs: string[],
): string | null {
  if (rule.type === 'template') {
    let unresolved = false
    const output = rule.template.replace(/\{(\d+)\}/g, (placeholder, rawIndex: string) => {
      const input = inputs[Number(rawIndex)]
      if (input === undefined) {
        unresolved = true
        return placeholder
      }
      return input
    })
    return unresolved ? null : output
  }
  if (inputs.length !== 1 || inputs[0]!.trim() === '') return null
  const value = Number(inputs[0])
  return Number.isInteger(value) ? String(value + rule.operand) : null
}

export function gradePythonInputTests(
  testCases: readonly LearningInputTestCase[],
  actualOutputs: readonly string[],
): InputTestGrade | null {
  if (testCases.length === 0 || testCases.length !== actualOutputs.length) return null
  const grades = testCases.map((testCase, index) =>
    gradePythonOutput(testCase.expectedOutput, actualOutputs[index]!),
  )
  const passedCount = grades.filter((grade) => grade.correct).length
  const firstFailedIndex = grades.findIndex((grade) => !grade.correct)
  const failedCase = firstFailedIndex < 0 ? null : {
    inputs: testCases[firstFailedIndex]!.inputs,
    expected: grades[firstFailedIndex]!.expected,
    actual: grades[firstFailedIndex]!.actual,
  }
  return {
    correct: passedCount === testCases.length,
    passedCount,
    totalCount: testCases.length,
    firstFailedCase: firstFailedIndex < 0 ? null : firstFailedIndex + 1,
    failedCase,
  }
}

export function createPythonFunctionTestHarness(
  functionName: string,
  testCases: readonly PythonFunctionTestCase[],
): string {
  const serializedCases = JSON.stringify(testCases)
  const serializedCasesLiteral = JSON.stringify(serializedCases)
  return [
    'import json as __pystudio_json',
    `__pystudio_cases = __pystudio_json.loads(${serializedCasesLiteral})`,
    `__pystudio_function = globals().get(${JSON.stringify(functionName)})`,
    '__pystudio_results = []',
    'for __pystudio_case in __pystudio_cases:',
    '    try:',
    '        __pystudio_actual = __pystudio_function(*__pystudio_case["arguments"])',
    '        __pystudio_results.append({"passed": __pystudio_actual == __pystudio_case["expected"], "actual": __pystudio_actual})',
    '    except Exception as __pystudio_error:',
    '        __pystudio_results.append({"passed": False, "error": type(__pystudio_error).__name__ + ": " + str(__pystudio_error)})',
    `print(${JSON.stringify(FUNCTION_TEST_MARKER)} + __pystudio_json.dumps(__pystudio_results, default=repr))`,
  ].join('\n')
}

export function gradePythonFunctionTests(
  actualOutput: string,
  testCases: readonly PythonFunctionTestCase[],
): FunctionTestGrade | null {
  const markerIndex = actualOutput.lastIndexOf(FUNCTION_TEST_MARKER)
  if (markerIndex < 0) return null

  const resultStart = markerIndex + FUNCTION_TEST_MARKER.length
  const resultEnd = actualOutput.indexOf('\n', resultStart)
  const serializedResults = actualOutput.slice(resultStart, resultEnd < 0 ? undefined : resultEnd).trim()
  let results: unknown
  try {
    results = JSON.parse(serializedResults)
  } catch {
    return null
  }
  if (!Array.isArray(results) || results.length !== testCases.length || !results.every(isFunctionCaseResult)) {
    return null
  }

  const passedCount = results.filter((result) => result.passed).length
  const failedIndex = results.findIndex((result) => !result.passed)
  const failedResult = failedIndex < 0 ? null : results[failedIndex]!
  const failedTestCase = failedIndex < 0 ? null : testCases[failedIndex]!
  return {
    correct: passedCount === testCases.length,
    passedCount,
    totalCount: testCases.length,
    firstFailedCase: failedIndex < 0 ? null : failedIndex + 1,
    failedCase: failedResult && failedTestCase ? {
      arguments: failedTestCase.arguments,
      expected: failedTestCase.expected,
      actual: failedResult.actual,
      error: failedResult.error,
    } : null,
    userOutput: actualOutput.slice(0, markerIndex).replace(/\n+$/, ''),
  }
}
