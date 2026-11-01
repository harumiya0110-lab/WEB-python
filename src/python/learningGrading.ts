import type { PythonFunctionTestCase } from '../types/learning'

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
  userOutput: string
}

const FUNCTION_TEST_MARKER = '__PYSTUDIO_FUNCTION_TESTS__:'

export function gradePythonOutput(expectedOutput: string, actualOutput: string): OutputGrade {
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/\n+$/, '')
  const expected = normalize(expectedOutput)
  const actual = normalize(actualOutput)
  return { correct: expected === actual, expected, actual }
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
    '        __pystudio_results.append(__pystudio_actual == __pystudio_case["expected"])',
    '    except Exception:',
    '        __pystudio_results.append(False)',
    `print(${JSON.stringify(FUNCTION_TEST_MARKER)} + __pystudio_json.dumps(__pystudio_results))`,
  ].join('\n')
}

export function gradePythonFunctionTests(
  actualOutput: string,
  testCaseCount: number,
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
  if (!Array.isArray(results) || results.length !== testCaseCount || results.some((result) => typeof result !== 'boolean')) {
    return null
  }

  const passedCount = results.filter(Boolean).length
  return {
    correct: passedCount === testCaseCount,
    passedCount,
    totalCount: testCaseCount,
    firstFailedCase: results.findIndex((result) => result === false) + 1 || null,
    userOutput: actualOutput.slice(0, markerIndex).replace(/\n+$/, ''),
  }
}
