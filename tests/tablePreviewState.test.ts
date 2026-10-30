import { describe, expect, it } from 'vitest'
import {
  DATAFRAME_PREVIEW_LIMITS,
  isTablePreview,
} from '../src/python/dataframePreview'
import {
  EMPTY_TABLE_PREVIEW_STATE,
  addTablePreviewMessage,
  clearTablePreviewState,
  isCurrentExecutionMessage,
} from '../src/python/tablePreviewState'
import type { TablePreview, WorkerResponse } from '../src/python/protocol'

function preview(executionId: number, previewId: number): TablePreview {
  return {
    executionId,
    previewId,
    columns: ['名前'],
    index: ['0'],
    rows: [['りんご']],
    cellDetails: [],
    totalRows: 1,
    totalColumns: 1,
    truncated: false,
  }
}

function tableMessage(executionId: number, previewId: number): WorkerResponse {
  return { type: 'TABLE_PREVIEW', executionId, preview: preview(executionId, previewId) }
}

describe('Worker table preview messages', () => {
  it('adds multiple valid previews for the active execution only', () => {
    let state = EMPTY_TABLE_PREVIEW_STATE
    const first = addTablePreviewMessage(state, tableMessage(4, 1), 4)
    state = first.state
    const stale = addTablePreviewMessage(state, tableMessage(3, 1), 4)
    expect(stale.state).toBe(state)
    expect(stale.error).toBeUndefined()
    const second = addTablePreviewMessage(state, tableMessage(4, 2), 4)
    state = second.state
    expect(state.previews.map((item) => item.previewId)).toEqual([1, 2])
    expect(state.bytes).toBeGreaterThan(0)
  })

  it('rejects malformed, out-of-order and mismatched execution previews', () => {
    const mismatch = addTablePreviewMessage(
      EMPTY_TABLE_PREVIEW_STATE,
      { type: 'TABLE_PREVIEW', executionId: 5, preview: preview(6, 1) },
      5,
    )
    expect(mismatch.error).toContain('不正')
    const malformed = addTablePreviewMessage(
      EMPTY_TABLE_PREVIEW_STATE,
      { type: 'TABLE_PREVIEW', executionId: 5, preview: { executionId: 5, previewId: 1 } },
      5,
    )
    expect(malformed.error).toContain('不正')
    const outOfOrder = addTablePreviewMessage(EMPTY_TABLE_PREVIEW_STATE, tableMessage(5, 2), 5)
    expect(outOfOrder.error).toContain('件数')
  })

  it('caps preview count and resets previews and byte accounting for the next run', () => {
    let state = EMPTY_TABLE_PREVIEW_STATE
    for (let id = 1; id <= DATAFRAME_PREVIEW_LIMITS.previews; id += 1) {
      const update = addTablePreviewMessage(state, tableMessage(8, id), 8)
      expect(update.error).toBeUndefined()
      state = update.state
    }
    const extra = addTablePreviewMessage(state, tableMessage(8, 6), 8)
    expect(extra.state).toBe(state)
    expect(extra.error).toContain('件数')

    const cleared = clearTablePreviewState(state)
    expect(cleared.previews).toHaveLength(0)
    expect(cleared.bytes).toBe(state.bytes)
    expect(cleared.previewCount).toBe(DATAFRAME_PREVIEW_LIMITS.previews)
    const nextRun = addTablePreviewMessage(EMPTY_TABLE_PREVIEW_STATE, tableMessage(9, 1), 9)
    expect(nextRun.state.previews).toHaveLength(1)
  })

  it('clears displayed tables without accepting old sequence IDs from an ongoing run', () => {
    const first = addTablePreviewMessage(EMPTY_TABLE_PREVIEW_STATE, tableMessage(11, 1), 11)
    const cleared = clearTablePreviewState(first.state)
    expect(cleared.previews).toHaveLength(0)
    const second = addTablePreviewMessage(cleared, tableMessage(11, 2), 11)
    expect(second.error).toBeUndefined()
    expect(second.state.previews.map((item) => item.previewId)).toEqual([2])
    const stale = addTablePreviewMessage(second.state, tableMessage(11, 1), 11)
    expect(stale.error).toContain('件数')
  })

  it('rejects oversized cell details and messages that exceed the data budget', () => {
    const excessiveDetails = {
      columns: Array.from({ length: 20 }, (_, index) => `列${index}`),
      index: Array.from({ length: 100 }, (_, index) => String(index)),
      rows: Array.from({ length: 100 }, () => Array.from({ length: 20 }, () => '値')),
      cellDetails: Array.from({ length: 100 }, (_, index) => ({
        row: index,
        column: 0,
        value: 'あ'.repeat(DATAFRAME_PREVIEW_LIMITS.detailCharacters),
        truncated: false,
      })),
      totalRows: 100,
      totalColumns: 20,
      truncated: true,
    }
    expect(isTablePreview(excessiveDetails)).toBe(false)

    const tooLarge = {
      columns: Array.from({ length: 20 }, (_, index) => `列${index}`),
      index: Array.from({ length: 100 }, (_, index) => String(index)),
      rows: Array.from({ length: 100 }, () =>
        Array.from({ length: 20 }, () => 'あ'.repeat(DATAFRAME_PREVIEW_LIMITS.cellCharacters)),
      ),
      cellDetails: [],
      totalRows: 100,
      totalColumns: 20,
      truncated: false,
    }
    const update = addTablePreviewMessage(
      EMPTY_TABLE_PREVIEW_STATE,
      { type: 'TABLE_PREVIEW', executionId: 10, preview: { ...tooLarge, executionId: 10, previewId: 1 } },
      10,
    )
    expect(update.error).toContain('容量上限')
  })

  it('filters messages from old runs while preserving current stdout and stderr routing', () => {
    const staleOutput: WorkerResponse = { type: 'STDOUT', executionId: 1, text: 'old' }
    const staleError: WorkerResponse = { type: 'STDERR', executionId: 1, text: 'old error' }
    const stdout: WorkerResponse = { type: 'STDOUT', executionId: 2, text: 'current' }
    const stderr: WorkerResponse = { type: 'STDERR', executionId: 2, text: 'current error' }
    expect(isCurrentExecutionMessage(staleOutput, 2)).toBe(false)
    expect(isCurrentExecutionMessage(staleError, 2)).toBe(false)
    expect(isCurrentExecutionMessage(stdout, 2)).toBe(true)
    expect(isCurrentExecutionMessage(stderr, 2)).toBe(true)
    expect(isCurrentExecutionMessage({ type: 'STATUS', status: 'ready' }, 2)).toBe(true)
  })
})
