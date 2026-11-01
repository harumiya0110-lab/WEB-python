export interface OutputGrade {
  correct: boolean
  expected: string
  actual: string
}

export function gradePythonOutput(expectedOutput: string, actualOutput: string): OutputGrade {
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/\n+$/, '')
  const expected = normalize(expectedOutput)
  const actual = normalize(actualOutput)
  return { correct: expected === actual, expected, actual }
}
