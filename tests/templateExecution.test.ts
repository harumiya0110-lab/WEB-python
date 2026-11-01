import { describe, expect, it } from 'vitest'
import { loadPyodide } from 'pyodide'
import { projectTemplates } from '../src/templates/templateCatalog'
import { PYTHON_DATAFRAME_PREVIEW_SETUP } from '../src/python/dataframePreview'

describe('template execution on Pyodide', () => {
  it('executes all 36 templates with their complete project files', async () => {
    const pyodide = await loadPyodide()
    await pyodide.loadPackage(['pandas', 'matplotlib'])
    let output = ''
    pyodide.setStdout({ batched: (text) => { output += text } })
    pyodide.runPython(`
import builtins, random, sys
from pathlib import Path
sys.path.insert(0, "/home/pyodide")
builtins.input = lambda prompt="": "1"
random.randint = lambda low, high: low
import matplotlib
matplotlib.use("Agg", force=True)
import matplotlib.pyplot as plt
plt.show = lambda *args, **kwargs: None
`)

    const expectedOutput: Record<string, string> = {
      'hello-world': 'Hello, world!',
      'while-loop': 'スタート!',
      'multi-file-project': 'Hello, PyStudio!',
      'simple-calculator': '足し算: 2.0',
      'input-introduction': 'こんにちは、1さん！',
      'guess-number': '正解です！',
      'csv-analysis': '平均点: 85.0点',
      'csv-writing': 'name, score',
      'csv-summary-report': '数学: 2人',
      'pandas-basics': '平均価格:',
    }

    const tablePreviews: string[] = []
    pyodide.globals.set('__pystudio_table_preview', (json: string) => {
      tablePreviews.push(json)
    })
    let previousFiles: string[] = []
    for (const template of projectTemplates) {
      output = ''
      const previousPreviewCount = tablePreviews.length
      pyodide.runPython(`${PYTHON_DATAFRAME_PREVIEW_SETUP}\ndisplay = _pystudio_display`)
      for (const path of previousFiles) {
        pyodide.FS.unlink(`/home/pyodide/${path}`)
      }
      const fileList = Object.keys(template.files)
      for (const path of fileList) {
        const absolute = `/home/pyodide/${path}`
        const separator = absolute.lastIndexOf('/')
        pyodide.FS.mkdirTree(absolute.slice(0, separator))
        pyodide.FS.writeFile(absolute, template.files[path])
      }
      pyodide.FS.chdir('/home/pyodide')
      const result = pyodide.runPython(template.files[template.activeFile])
      previousFiles = fileList
      if (result && typeof result.destroy === 'function') result.destroy()
      if (template.category === 'グラフ・可視化') {
        expect(pyodide.runPython('len(plt.get_fignums())'), template.id).toBeGreaterThan(0)
        pyodide.runPython('plt.close("all")')
      } else {
        expect(output.trim(), template.id).not.toBe('')
        const expected = expectedOutput[template.id]
        if (expected) expect(output, template.id).toContain(expected)
      }
      if (template.id === 'pandas-basics') {
        expect(tablePreviews.length).toBeGreaterThan(previousPreviewCount)
        const pandasPreviews = tablePreviews.slice(previousPreviewCount).map((json) => JSON.parse(json))
        expect(pandasPreviews.some((preview) => preview.columns.includes('商品'))).toBe(true)
        expect(pandasPreviews.some((preview) => preview.columns.includes('価格'))).toBe(true)
      }
      pyodide.runPython(`
for _module in ${JSON.stringify(fileList.filter((path) => path.endsWith('.py')).map((path) => path.replace(/\.py$/, '').replaceAll('/', '.')))}:
    sys.modules.pop(_module, None)
`)
    }

    expect(output.trim()).toContain('PyStudioから保存しました')
    expect(projectTemplates).toHaveLength(36)
  }, 240_000)
})
