/// <reference lib="webworker" />

import type { PyodideAPI } from 'pyodide'
import type { WorkerRequest, WorkerResponse } from './protocol'

const workerScope = self as DedicatedWorkerGlobalScope
const pyodideVersion = '0.28.3'
const outputLimit = 100_000
let pyodide: PyodideAPI | undefined
let activeExecutionId: number | undefined
let nextInputId = 0
let writtenFiles = new Set<string>()
let outputCharacters = 0
let outputLimitReached = false
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
  if (clipped) post({ type, executionId: activeExecutionId, text: clipped })
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
    pyodide.setStdout({ batched: (text) => writeOutput('STDOUT', text) })
    pyodide.setStderr({ batched: (text) => writeOutput('STDERR', text) })
  }
  post({ type: 'STATUS', status: 'ready', message: 'Python Ready' })
}

async function runPython(
  executionId: number,
  activeFile: string,
  files: Record<string, string>,
): Promise<void> {
  if (!pyodide) throw new Error('Python実行環境が初期化されていません。')
  activeExecutionId = executionId
  outputCharacters = 0
  outputLimitReached = false
  const startedAt = performance.now()
  post({ type: 'STATUS', status: 'running' })

  try {
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
    pyodide.globals.set('__pystudio_input', (prompt: string) => {
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

    await pyodide.runPythonAsync(`
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
}
_pystudio_result = eval(
    _pystudio_code,
    _pystudio_namespace,
    _pystudio_namespace,
)
if _pystudio_inspect.isawaitable(_pystudio_result):
    await _pystudio_result
`)
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
    void runPython(request.executionId, request.activeFile, request.files)
  }
})
