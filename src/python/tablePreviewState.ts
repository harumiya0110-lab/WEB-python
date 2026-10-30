import type { TablePreview, WorkerResponse } from './protocol'
import { DATAFRAME_PREVIEW_LIMITS, isTablePreview } from './dataframePreview'

export interface TablePreviewState {
  previews: TablePreview[]
  bytes: number
  previewCount: number
}

export interface TablePreviewUpdate {
  state: TablePreviewState
  error?: string
}

export const EMPTY_TABLE_PREVIEW_STATE: TablePreviewState = {
  previews: [],
  bytes: 0,
  previewCount: 0,
}

export function clearTablePreviewState(state: TablePreviewState): TablePreviewState {
  return { ...state, previews: [] }
}

export function isCurrentExecutionMessage(
  message: WorkerResponse,
  activeExecutionId: number | null,
): boolean {
  return !('executionId' in message) ||
    message.executionId === undefined ||
    message.executionId === activeExecutionId
}

export function addTablePreviewMessage(
  state: TablePreviewState,
  value: unknown,
  activeExecutionId: number | null,
): TablePreviewUpdate {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return { state, error: 'DataFrameプレビューの形式が不正なため表示できません。' }
  }
  const message = value as Partial<WorkerResponse>
  if (message.type !== 'TABLE_PREVIEW') return { state }
  if (
    typeof message.executionId !== 'number' ||
    message.executionId !== activeExecutionId
  ) {
    return { state }
  }
  if (!('preview' in message) || !message.preview || typeof message.preview !== 'object') {
    return { state, error: 'DataFrameプレビューの形式が不正なため表示できません。' }
  }

  const preview = message.preview as Partial<TablePreview>
  const previewData = {
    columns: preview.columns,
    index: preview.index,
    rows: preview.rows,
    cellDetails: preview.cellDetails,
    totalRows: preview.totalRows,
    totalColumns: preview.totalColumns,
    truncated: preview.truncated,
  }
  if (
    preview.executionId !== message.executionId ||
    !Number.isSafeInteger(preview.previewId) ||
    preview.previewId !== state.previewCount + 1 ||
    preview.previewId > DATAFRAME_PREVIEW_LIMITS.previews ||
    !isTablePreview(previewData)
  ) {
    return { state, error: 'DataFrameプレビューの形式または件数が不正なため表示できません。' }
  }

  const bytes = new TextEncoder().encode(JSON.stringify({
    ...previewData,
    executionId: preview.executionId,
    previewId: preview.previewId,
  })).byteLength
  if (bytes > DATAFRAME_PREVIEW_LIMITS.bytes || state.bytes + bytes > DATAFRAME_PREVIEW_LIMITS.bytes) {
    return { state, error: 'DataFrameプレビューの容量上限を超えたため表示できません。' }
  }
  return {
    state: {
      bytes: state.bytes + bytes,
      previews: [...state.previews, preview as TablePreview],
      previewCount: state.previewCount + 1,
    },
  }
}
