export type RuntimeStatus = 'loading' | 'ready' | 'running' | 'waiting-input' | 'error'

export type WorkerRequest =
  | { type: 'INIT' }
  | {
      type: 'RUN'
      executionId: number
      activeFile: string
      files: Record<string, string>
    }
  | { type: 'INPUT_RESPONSE'; requestId: number; value: string }

export type WorkerResponse =
  | { type: 'STATUS'; status: RuntimeStatus; message?: string }
  | { type: 'STDOUT'; executionId: number; text: string }
  | { type: 'STDERR'; executionId: number; text: string }
  | { type: 'INPUT_REQUEST'; executionId: number; requestId: number; prompt: string }
  | { type: 'COMPLETE'; executionId: number; durationMs: number }
  | {
      type: 'ERROR'
      executionId?: number
      message: string
      durationMs?: number
    }
