import { describe, expect, it } from 'vitest'
import type { TablePreview } from '../src/python/protocol'
import {
  hasTableExportTruncation,
  tableExportScope,
  tableToCsv,
  tableToTsv,
} from '../src/python/tableExport'

function makePreview(overrides: Partial<TablePreview> = {}): TablePreview {
  return {
    executionId: 1,
    previewId: 1,
    columns: ['名前', '値', '重複', '重複'],
    index: ['行,1', '行"2'],
    rows: [
      ['田中', 'a,b', 'say "hi"', 'line1\nline2'],
      ['佐藤', 'true', 'NaN', 'tab\tvalue'],
    ],
    cellDetails: [],
    totalRows: 2,
    totalColumns: 4,
    truncated: false,
    ...overrides,
  }
}

describe('DataFrame table export', () => {
  it('creates TSV with index and quotes tabs, newlines and quotes safely', () => {
    expect(tableToTsv(makePreview())).toBe(
      '行\t名前\t値\t重複\t重複\r\n行,1\t田中\ta,b\t"say ""hi"""\t"line1\nline2"\r\n"行""2"\t佐藤\ttrue\tNaN\t"tab\tvalue"',
    )
  })

  it('creates UTF-8 BOM CSV with commas, quotes and multiline cells escaped', () => {
    const csv = tableToCsv(makePreview())
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1)).toBe(
      '行,名前,値,重複,重複\r\n"行,1",田中,"a,b","say ""hi""","line1\nline2"\r\n"行""2",佐藤,true,NaN,tab\tvalue',
    )
  })

  it('exports only the displayed range and reports preview truncation', () => {
    const preview = makePreview({
      columns: ['値'],
      index: ['0'],
      rows: [['表示値']],
      totalRows: 120,
      totalColumns: 3,
      truncated: true,
    })
    expect(tableToCsv(preview)).toContain('表示値')
    expect(tableToCsv(preview)).not.toContain('全データ')
    expect(tableExportScope(preview)).toContain('表示中の1行・1列')
    expect(tableExportScope(preview)).toContain('全データではありません')
    expect(hasTableExportTruncation(preview)).toBe(true)
  })

  it('handles empty tables, duplicate columns, numeric and boolean values', () => {
    const empty = makePreview({
      columns: ['数値', '有効'],
      index: [],
      rows: [],
      totalRows: 0,
      totalColumns: 2,
    })
    expect(tableToCsv(empty)).toBe('\uFEFF行,数値,有効')

    const values = makePreview({
      columns: ['重複', '重複'],
      index: ['0'],
      rows: [['42', 'False']],
      totalRows: 1,
      totalColumns: 2,
    })
    expect(tableToCsv(values)).toBe('\uFEFF行,重複,重複\r\n0,42,False')
  })

  it('includes expanded cell text when available and handles a large visible range', () => {
    const longCell = '長い,日本語の値'
    const cell = makePreview({
      columns: ['説明'],
      index: ['0'],
      rows: [['長い,日本語…']],
      cellDetails: [{ row: 0, column: 0, value: longCell, truncated: false }],
      totalRows: 1,
      totalColumns: 1,
    })
    expect(tableToCsv(cell)).toContain(`"${longCell}"`)

    const large = makePreview({
      columns: Array.from({ length: 20 }, (_, index) => `列${index}`),
      index: Array.from({ length: 100 }, (_, index) => String(index)),
      rows: Array.from({ length: 100 }, (_, row) =>
        Array.from({ length: 20 }, (_, column) => `${row}:${column}`),
      ),
      totalRows: 500,
      totalColumns: 30,
      truncated: true,
    })
    expect(tableToCsv(large).split('\r\n')).toHaveLength(101)
    expect(tableExportScope(large)).toContain('全データではありません')
  })
})
