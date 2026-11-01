import { describe, expect, it } from 'vitest'
import { loadPyodide } from 'pyodide'
import { allLessons } from '../src/data/learningCatalog'
import { pythonGlossary } from '../src/data/pythonGlossary'
import { getExpectedOutputForInputs, gradePythonOutput } from '../src/python/learningGrading'

describe('learning code examples on Pyodide', () => {
  it('executes every lesson sample, exercise solution, and glossary example', async () => {
    const pyodide = await loadPyodide()
    await pyodide.loadPackage(['pandas', 'matplotlib'])
    let output = ''
    let decoder = new TextDecoder()
    pyodide.setStdout({
      write: (buffer) => {
        output += decoder.decode(buffer, { stream: true })
        return buffer.length
      },
    })
    const runCode = async (source: string) => {
      output = ''
      decoder = new TextDecoder()
      await pyodide.runPythonAsync(`exec(${JSON.stringify(source)}, {})`)
      output += decoder.decode()
      return output
    }
    pyodide.runPython(`
import builtins, matplotlib
matplotlib.use("Agg", force=True)
import matplotlib.pyplot as plt
plt.show = lambda *args, **kwargs: None
`)

    for (const lesson of allLessons) {
      const sampleInput = lesson.practice.inputGradingRule?.type === 'template' ? 'PyStudio' : '12'
      pyodide.globals.set('__pystudio_test_input', sampleInput)
      pyodide.runPython('builtins.input = lambda prompt="": __pystudio_test_input')
      output = await runCode(lesson.sampleCode)
      expect(gradePythonOutput(lesson.expectedOutput, output).correct, `${lesson.id} sample: expected ${JSON.stringify(lesson.expectedOutput)}, got ${JSON.stringify(output)}`).toBe(true)

      const inputs = lesson.practice.inputGradingRule?.type === 'template'
        ? ['Aoi']
        : lesson.practice.inputGradingRule?.type === 'integer-add'
          ? ['12']
          : ['12']
      pyodide.globals.set('__pystudio_test_input', inputs[0]!)
      pyodide.runPython('builtins.input = lambda prompt="": __pystudio_test_input')
      let solution = lesson.practice.solution
      let expectedOutput = lesson.practice.expectedOutput
      if (lesson.practice.inputGradingRule) {
        expectedOutput = getExpectedOutputForInputs(lesson.practice.inputGradingRule, inputs) ?? ''
      }
      if (lesson.practice.functionName && lesson.practice.testCases) {
        const cases = JSON.stringify(lesson.practice.testCases)
        solution += `\nimport json as __test_json\n__test_cases = __test_json.loads(${JSON.stringify(cases)})\nfor __test_case in __test_cases:\n    assert ${lesson.practice.functionName}(*__test_case["arguments"]) == __test_case["expected"]`
        expectedOutput = ''
      }
      output = await runCode(solution)
      expect(gradePythonOutput(expectedOutput, output).correct, `${lesson.id} solution: expected ${JSON.stringify(expectedOutput)}, got ${JSON.stringify(output)}`).toBe(true)
    }

    for (const term of pythonGlossary) {
      output = await runCode(term.exampleCode ?? '')
      expect(gradePythonOutput(term.exampleOutput ?? '', output).correct, `${term.term} glossary example`).toBe(true)
    }
  }, 240_000)
})
