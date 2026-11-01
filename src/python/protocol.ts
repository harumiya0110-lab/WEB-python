export type RuntimeStatus = 'loading' | 'ready' | 'running' | 'waiting-input' | 'error'

export interface TablePreview {
  executionId: number
  previewId: number
  columns: string[]
  index: string[]
  rows: string[][]
  cellDetails: TableCellDetail[]
  totalRows: number
  totalColumns: number
  truncated: boolean
}

export interface TableCellDetail {
  row: number
  column: number
  value: string
  truncated: boolean
}

export type WorkerRequest =
  | { type: 'INIT' }
  | {
      type: 'RUN'
      executionId: number
      activeFile: string
      files: Record<string, string>
      inputTestCases?: Array<{ inputs: string[] }>
    }
  | { type: 'INPUT_RESPONSE'; requestId: number; value: string }

export type WorkerResponse =
  | { type: 'STATUS'; status: RuntimeStatus; message?: string }
  | { type: 'STDOUT'; executionId: number; text: string }
  | { type: 'STDERR'; executionId: number; text: string }
  | { type: 'INPUT_TEST_RESULT'; executionId: number; index: number; output: string }
  | { type: 'PREVIEW'; executionId: number; dataUrl: string }
  | { type: 'TABLE_PREVIEW'; executionId: number; preview: TablePreview }
  | { type: 'INPUT_REQUEST'; executionId: number; requestId: number; prompt: string }
  | { type: 'COMPLETE'; executionId: number; durationMs: number }
  | {
      type: 'ERROR'
      executionId?: number
      message: string
      durationMs?: number
    }
