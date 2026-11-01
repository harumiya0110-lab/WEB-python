import { useCallback, useEffect, useRef, useState } from 'react'
import type { RuntimeStatus, TablePreview, WorkerRequest, WorkerResponse } from '../python/protocol'
import {
  EMPTY_TABLE_PREVIEW_STATE,
  addTablePreviewMessage,
  clearTablePreviewState,
  isCurrentExecutionMessage,
} from '../python/tablePreviewState'

export interface OutputLine {
  channel: 'stdout' | 'stderr' | 'error' | 'system' | 'input'
  text: string
  id: number
}

interface PendingInput {
  requestId: number
  prompt: string
}

export interface RuntimePreview {
  id: number
  dataUrl: string
}

export type RuntimeTablePreview = TablePreview

export function usePythonRuntime() {
  const [status, setStatus] = useState<RuntimeStatus>('loading')
  const [statusMessage, setStatusMessage] = useState('Python環境を準備しています…')
  const [output, setOutput] = useState<OutputLine[]>([])
  const [previews, setPreviews] = useState<RuntimePreview[]>([])
  const [tablePreviews, setTablePreviews] = useState<RuntimeTablePreview[]>([])
  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [activeFile, setActiveFile] = useState('')
  const workerRef = useRef<Worker | null>(null)
  const executionRef = useRef(0)
  const activeExecutionRef = useRef<number | null>(null)
  const outputIdRef = useRef(0)
  const tablePreviewStateRef = useRef(EMPTY_TABLE_PREVIEW_STATE)
  const timeoutRef = useRef<number | undefined>(undefined)
  const mountRef = useRef(false)

  const appendOutput = useCallback((channel: OutputLine['channel'], text: string) => {
    setOutput((current) => [
      ...current,
      { channel, text, id: ++outputIdRef.current },
    ])
  }, [])

  const spawnWorker = useCallback(() => {
    const worker = new Worker(new URL('../python/pyodide.worker.ts', import.meta.url), {
      type: 'module',
      name: 'pystudio-python-runtime',
    })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (!isCurrentExecutionMessage(message, activeExecutionRef.current)) {
        return
      }
      switch (message.type) {
        case 'STATUS':
          setStatus(message.status)
          setStatusMessage(message.message ?? '')
          break
        case 'STDOUT':
          appendOutput('stdout', message.text)
          break
        case 'STDERR':
          appendOutput('stderr', message.text)
          break
        case 'PREVIEW':
          setPreviews((current) => [...current, {
            id: ++outputIdRef.current,
            dataUrl: message.dataUrl,
          }])
          break
        case 'TABLE_PREVIEW': {
          const update = addTablePreviewMessage(
            tablePreviewStateRef.current,
            message,
            activeExecutionRef.current,
          )
          tablePreviewStateRef.current = update.state
          setTablePreviews(update.state.previews)
          if (update.error) appendOutput('stderr', update.error)
          break
        }
        case 'INPUT_REQUEST':
          window.clearTimeout(timeoutRef.current)
          setPendingInput({ requestId: message.requestId, prompt: message.prompt })
          setStatus('waiting-input')
          break
        case 'COMPLETE':
          window.clearTimeout(timeoutRef.current)
          activeExecutionRef.current = null
          setPendingInput(null)
          setDurationMs(message.durationMs)
          appendOutput(
            'system',
            `実行が完了しました（${(message.durationMs / 1000).toFixed(2)}秒）`,
          )
          break
        case 'ERROR':
          window.clearTimeout(timeoutRef.current)
          activeExecutionRef.current = null
          setPendingInput(null)
          setDurationMs(message.durationMs ?? null)
          appendOutput('error', message.message)
          if (message.executionId === undefined) {
            setStatus('error')
            setStatusMessage(`Python環境の初期化に失敗しました: ${message.message}`)
          }
          break
      }
    }
    worker.onerror = (event) => {
      window.clearTimeout(timeoutRef.current)
      activeExecutionRef.current = null
      setPendingInput(null)
      setStatus('error')
      setStatusMessage('Python Workerでエラーが発生しました。')
      appendOutput('error', event.message || 'Python Workerで予期しないエラーが発生しました。')
    }
    workerRef.current = worker
    worker.postMessage({ type: 'INIT' } satisfies WorkerRequest)
  }, [appendOutput])

  const stopForTimeout = useCallback(
    (executionId: number) => {
      if (activeExecutionRef.current !== executionId) return
      workerRef.current?.terminate()
      workerRef.current = null
      activeExecutionRef.current = null
      setPendingInput(null)
      setStatus('loading')
      setStatusMessage('実行時間の上限（20秒）を超えたため停止しました。')
      appendOutput('stderr', '実行時間の上限（20秒）を超えたため、実行を停止しました。')
      if (mountRef.current) spawnWorker()
    },
    [appendOutput, spawnWorker],
  )

  useEffect(() => {
    mountRef.current = true
    spawnWorker()
    return () => {
      mountRef.current = false
      window.clearTimeout(timeoutRef.current)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [spawnWorker])

  const run = useCallback(
    (files: Record<string, string>, file: string) => {
      if (status !== 'ready' || !workerRef.current || activeExecutionRef.current !== null) {
        return false
      }
      const executionId = ++executionRef.current
      activeExecutionRef.current = executionId
      setActiveFile(file)
      setDurationMs(null)
      setPendingInput(null)
      setPreviews([])
      tablePreviewStateRef.current = EMPTY_TABLE_PREVIEW_STATE
      setTablePreviews([])
      appendOutput('system', `${file} を実行しています…`)
      workerRef.current.postMessage({
        type: 'RUN',
        executionId,
        activeFile: file,
        files,
      } satisfies WorkerRequest)
      timeoutRef.current = window.setTimeout(() => stopForTimeout(executionId), 20_000)
      return true
    },
    [appendOutput, status, stopForTimeout],
  )

  const stop = useCallback(() => {
    if (activeExecutionRef.current === null) return
    window.clearTimeout(timeoutRef.current)
    workerRef.current?.terminate()
    workerRef.current = null
    activeExecutionRef.current = null
    setPendingInput(null)
    setStatus('loading')
    setStatusMessage('実行を停止しました。Python環境を再起動しています…')
    appendOutput('system', '実行を停止しました。')
    if (mountRef.current) spawnWorker()
  }, [appendOutput, spawnWorker])

  const submitInput = useCallback(
    (value: string) => {
      if (!pendingInput || !workerRef.current) return
      appendOutput('input', `${pendingInput.prompt}${value}\n`)
      workerRef.current.postMessage({
        type: 'INPUT_RESPONSE',
        requestId: pendingInput.requestId,
        value,
      } satisfies WorkerRequest)
      setPendingInput(null)
      setStatus('running')
      const executionId = activeExecutionRef.current
      if (executionId !== null) {
        timeoutRef.current = window.setTimeout(
          () => stopForTimeout(executionId),
          20_000,
        )
      }
    },
    [appendOutput, pendingInput, stopForTimeout],
  )

  const clearOutput = useCallback(() => {
    setOutput([])
    setPreviews([])
    tablePreviewStateRef.current = clearTablePreviewState(tablePreviewStateRef.current)
    setTablePreviews(tablePreviewStateRef.current.previews)
    outputIdRef.current = 0
  }, [])

  return {
    status,
    statusMessage,
    output,
    previews,
    tablePreviews,
    pendingInput,
    durationMs,
    activeFile,
    run,
    stop,
    submitInput,
    clearOutput,
  }
}
