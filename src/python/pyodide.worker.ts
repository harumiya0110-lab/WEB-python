/// <reference lib="webworker" />

import type { PyodideAPI } from 'pyodide'
import {
  DATAFRAME_PREVIEW_LIMITS,
  fitTablePreviewToByteLimit,
  isTablePreview,
  PYTHON_DATAFRAME_PREVIEW_SETUP,
} from './dataframePreview'
import type { WorkerRequest, WorkerResponse } from './protocol'

const workerScope = self as DedicatedWorkerGlobalScope
const pyodideVersion = '0.28.3'
const outputLimit = 100_000
const previewLimit = 5_000_000
let pyodide: PyodideAPI | undefined
let activeExecutionId: number | undefined
let nextInputId = 0
let writtenFiles = new Set<string>()
let outputCharacters = 0
let outputLimitReached = false
let tablePreviewBytes = 0
let tablePreviewCount = 0
let stdoutDecoder = new TextDecoder()
let stderrDecoder = new TextDecoder()
let automaticInputs: string[] | null = null
let capturedStdout: string | null = null
const inputResolvers = new Map<number, (value: string) => void>()

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => character.charCodeAt(0) < 32)
}

function post(message: WorkerResponse): void {
  workerScope.postMessage(message)
}

function writeOutput(type: 'STDOUT' | 'STDERR', text: string): void {
  if (activeExecutionId === undefined) return
  if (outputCharacters >= outputLimit) {
    if (!outputLimitReached) {
      post({
        type: 'STDERR',
        executionId: activeExecutionId,
        text: '\n[出力が上限（100,000文字）に達しました]\n',
      })
      outputLimitReached = true
    }
    return
  }
  const remaining = outputLimit - outputCharacters
  const clipped = text.slice(0, remaining)
  outputCharacters += clipped.length
  if (clipped) {
    if (type === 'STDOUT' && capturedStdout !== null) capturedStdout += clipped
    else post({ type, executionId: activeExecutionId, text: clipped })
  }
  if (text.length > remaining) {
    post({
      type: 'STDERR',
      executionId: activeExecutionId,
      text: '\n[出力が上限（100,000文字）に達しました]\n',
    })
    outputCharacters = outputLimit
    outputLimitReached = true
  }
}

function writeOutputBytes(type: 'STDOUT' | 'STDERR', buffer: Uint8Array): number {
  const decoder = type === 'STDOUT' ? stdoutDecoder : stderrDecoder
  const text = decoder.decode(buffer, { stream: true })
  if (text) writeOutput(type, text)
  return buffer.length
}

function flushOutputDecoders(): void {
  const stdout = stdoutDecoder.decode()
  const stderr = stderrDecoder.decode()
  if (stdout) writeOutput('STDOUT', stdout)
  if (stderr) writeOutput('STDERR', stderr)
}

function normalizeProjectPath(path: string): string {
  const parts = path.split('/')
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    parts.some((part) => !part || part === '.' || part === '..') ||
    containsControlCharacter(path)
  ) {
    throw new Error(`使用できないファイルパスです: ${path}`)
  }
  return `/home/pyodide/${path}`
}

async function initializeRuntime(): Promise<void> {
  if (!pyodide) {
    post({ type: 'STATUS', status: 'loading', message: 'Python環境を準備しています…' })
    const indexURL = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`
    const pyodideModule = (await import(
      /* @vite-ignore */
      `${indexURL}pyodide.mjs`
    )) as typeof import('pyodide')
    pyodide = await pyodideModule.loadPyodide({ indexURL })
    pyodide.setStdout({ write: (buffer) => writeOutputBytes('STDOUT', buffer) })
    pyodide.setStderr({ write: (buffer) => writeOutputBytes('STDERR', buffer) })
  }
  post({ type: 'STATUS', status: 'ready', message: 'Python Ready' })
}

async function runPython(
  executionId: number,
  activeFile: string,
  files: Record<string, string>,
  inputTestCases?: Array<{ inputs: string[] }>,
): Promise<void> {
  if (!pyodide) throw new Error('Python実行環境が初期化されていません。')
  activeExecutionId = executionId
  outputCharacters = 0
  outputLimitReached = false
  stdoutDecoder = new TextDecoder()
  stderrDecoder = new TextDecoder()
  automaticInputs = null
  capturedStdout = null
  tablePreviewBytes = 0
  tablePreviewCount = 0
  const startedAt = performance.now()
  post({ type: 'STATUS', status: 'running' })

  try {
    const projectSource = Object.entries(files)
      .filter(([path]) => path.endsWith('.py'))
      .map(([, source]) => source)
      .join('\n')
    const packages = [
      { name: 'matplotlib', pattern: /^\s*(?:import\s+matplotlib(?:\.|\s|$)|from\s+matplotlib(?:\.|\s|$))/m },
      { name: 'pandas', pattern: /^\s*(?:import\s+pandas(?:\.|\s|$)|from\s+pandas(?:\.|\s|$))/m },
    ]
    for (const packageInfo of packages) {
      if (!packageInfo.pattern.test(projectSource)) continue
      post({
        type: 'STATUS',
        status: 'running',
        message: `${packageInfo.name} を準備しています（初回は時間がかかります）…`,
      })
      await pyodide.loadPackage(packageInfo.name, {
        messageCallback: (message) => {
          post({ type: 'STATUS', status: 'running', message })
        },
      })
    }

    const root = '/home/pyodide'
    pyodide.FS.chdir(root)
    for (const previousPath of writtenFiles) {
      pyodide.FS.unlink(normalizeProjectPath(previousPath))
    }
    writtenFiles = new Set()
    for (const [path, contents] of Object.entries(files)) {
      const absolutePath = normalizeProjectPath(path)
      const directory = absolutePath.slice(0, absolutePath.lastIndexOf('/'))
      pyodide.FS.mkdirTree(directory)
      pyodide.FS.writeFile(absolutePath, contents)
      writtenFiles.add(path)
    }

    pyodide.globals.set('__pystudio_source', files[activeFile] ?? '')
    pyodide.globals.set('__pystudio_filename', activeFile)
    const projectModules = Object.keys(files)
      .filter((path) => path.endsWith('.py'))
      .map((path) => path.replace(/\.py$/, '').split('/').join('.'))
      .filter((moduleName) => !moduleName.endsWith('.__init__'))
    pyodide.globals.set('__pystudio_modules', projectModules)
    pyodide.globals.set('__pystudio_preview', (dataUrl: string) => {
      if (dataUrl.length > previewLimit) {
        writeOutput('STDERR', '\n[プレビュー画像が大きすぎるため表示できません]\n')
        return
      }
      post({ type: 'PREVIEW', executionId, dataUrl })
    })
    pyodide.globals.set('__pystudio_table_preview', (json: string) => {
      if (tablePreviewCount >= DATAFRAME_PREVIEW_LIMITS.previews) {
        writeOutput('STDERR', '\n[DataFrameプレビューは1回の実行につき5件までです]\n')
        return false
      }
      let payload: unknown
      try {
        payload = JSON.parse(json)
      } catch {
        writeOutput('STDERR', '\n[DataFrameプレビューを読み込めませんでした]\n')
        return false
      }
      if (!isTablePreview(payload)) {
        writeOutput('STDERR', '\n[DataFrameプレビューの形式が不正です]\n')
        return false
      }
      const fittedPreview = fitTablePreviewToByteLimit(
        payload,
        executionId,
        tablePreviewCount + 1,
        DATAFRAME_PREVIEW_LIMITS.bytes - tablePreviewBytes,
      )
      if (!fittedPreview) {
        writeOutput('STDERR', '\n[DataFrameプレビューの残り容量が不足しているため、表示できません]\n')
        return false
      }
      tablePreviewBytes += fittedPreview.byteLength
      tablePreviewCount += 1
      post({
        type: 'TABLE_PREVIEW',
        executionId,
        preview: fittedPreview.preview,
      })
      return true
    })
    pyodide.globals.set('__pystudio_input', (prompt: string) => {
      if (automaticInputs !== null) {
        const value = automaticInputs.shift()
        if (value === undefined) throw new Error('自動入力テストに必要な入力値が不足しています。')
        return Promise.resolve(value)
      }
      const requestId = ++nextInputId
      post({ type: 'INPUT_REQUEST', executionId, requestId, prompt })
      post({ type: 'STATUS', status: 'waiting-input' })
      return new Promise<string>((resolve) => inputResolvers.set(requestId, resolve))
    })

    await pyodide.runPythonAsync(`
import importlib as _pystudio_importlib
import sys as _pystudio_sys
for _pystudio_module in __pystudio_modules:
    _pystudio_sys.modules.pop(_pystudio_module, None)
_pystudio_importlib.invalidate_caches()
`)

    if (/^\s*(?:import\s+matplotlib(?:\.|\s|$)|from\s+matplotlib(?:\.|\s|$))/m.test(projectSource)) {
      await pyodide.runPythonAsync(`
import base64 as _pystudio_base64
import io as _pystudio_io
import matplotlib as _pystudio_matplotlib
_pystudio_matplotlib.use("Agg", force=True)
import matplotlib.pyplot as _pystudio_plt

def _pystudio_show(*args, **kwargs):
    for _pystudio_figure_number in _pystudio_plt.get_fignums():
        _pystudio_buffer = _pystudio_io.BytesIO()
        _pystudio_plt.figure(_pystudio_figure_number).savefig(
            _pystudio_buffer, format="png", bbox_inches="tight"
        )
        _pystudio_encoded = _pystudio_base64.b64encode(
            _pystudio_buffer.getvalue()
        ).decode("ascii")
        __pystudio_preview("data:image/png;base64," + _pystudio_encoded)
    _pystudio_plt.close("all")

_pystudio_plt.show = _pystudio_show
`)
    }

    await pyodide.runPythonAsync(PYTHON_DATAFRAME_PREVIEW_SETUP)

    const executionSource = `
import ast as _pystudio_ast
import inspect as _pystudio_inspect

class _PyStudioInputTransformer(_pystudio_ast.NodeTransformer):
    def visit_FunctionDef(self, node):
        return node
    def visit_AsyncFunctionDef(self, node):
        return node
    def visit_Lambda(self, node):
        return node
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, _pystudio_ast.Name) and node.func.id == "input":
            return _pystudio_ast.copy_location(
                _pystudio_ast.Await(
                    value=_pystudio_ast.Call(
                        func=_pystudio_ast.Name(id="__pystudio_input", ctx=_pystudio_ast.Load()),
                        args=node.args,
                        keywords=node.keywords,
                    )
                ),
                node,
            )
        return node

_pystudio_tree = _pystudio_ast.parse(__pystudio_source, filename=__pystudio_filename)
_pystudio_tree = _PyStudioInputTransformer().visit(_pystudio_tree)
_pystudio_ast.fix_missing_locations(_pystudio_tree)
_pystudio_code = compile(
    _pystudio_tree,
    __pystudio_filename,
    "exec",
    flags=_pystudio_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT,
)
_pystudio_namespace = {
    "__name__": "__main__",
    "__file__": __pystudio_filename,
    "__builtins__": __builtins__,
    "__pystudio_input": __pystudio_input,
    "display": _pystudio_display,
}
_pystudio_result = eval(
    _pystudio_code,
    _pystudio_namespace,
    _pystudio_namespace,
)
if _pystudio_inspect.isawaitable(_pystudio_result):
    await _pystudio_result
`
    if (inputTestCases) {
      for (const [index, testCase] of inputTestCases.entries()) {
        automaticInputs = [...testCase.inputs]
        capturedStdout = ''
        stdoutDecoder = new TextDecoder()
        stderrDecoder = new TextDecoder()
        await pyodide.runPythonAsync(executionSource)
        flushOutputDecoders()
        post({
          type: 'INPUT_TEST_RESULT',
          executionId,
          index,
          output: capturedStdout,
        })
      }
      automaticInputs = null
      capturedStdout = null
    } else {
      await pyodide.runPythonAsync(executionSource)
    }
    post({
      type: 'COMPLETE',
      executionId,
      durationMs: performance.now() - startedAt,
    })
  } catch (error) {
    post({
      type: 'ERROR',
      executionId,
      message: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - startedAt,
    })
  } finally {
    flushOutputDecoders()
    automaticInputs = null
    capturedStdout = null
    activeExecutionId = undefined
    post({ type: 'STATUS', status: 'ready', message: 'Python Ready' })
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type === 'INPUT_RESPONSE') {
    const resolve = inputResolvers.get(request.requestId)
    if (resolve) {
      inputResolvers.delete(request.requestId)
      resolve(request.value)
    }
    return
  }
  if (request.type === 'INIT') {
    void initializeRuntime().catch((error: unknown) => {
      post({
        type: 'ERROR',
        message: error instanceof Error ? error.message : String(error),
      })
    })
    return
  }
  if (request.type === 'RUN') {
    void runPython(request.executionId, request.activeFile, request.files, request.inputTestCases)
  }
})
