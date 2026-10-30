import { loadPyodide } from 'pyodide'
import { describe, expect, it } from 'vitest'
import {
  DATAFRAME_PREVIEW_LIMITS,
  fitTablePreviewToByteLimit,
  isTablePreview,
  PYTHON_DATAFRAME_PREVIEW_SETUP,
} from '../src/python/dataframePreview'

describe('DataFrame preview conversion', () => {
  it('converts DataFrames, Series and safe fallback values to JSON', async () => {
    const pyodide = await loadPyodide()
    await pyodide.loadPackage('pandas')
    const messages: string[] = []
    let standardOutput = ''
    pyodide.globals.set('__pystudio_table_preview', (json: string) => {
      messages.push(json)
    })
    pyodide.setStdout({ batched: (text) => { standardOutput += text } })
    await pyodide.runPythonAsync(`
${PYTHON_DATAFRAME_PREVIEW_SETUP}
display = _pystudio_display
import pandas as pd
import datetime
frame = pd.DataFrame({
    "名前": ["田中", "佐藤"],
    "数値": [12.5, 7],
    "有効": [True, False],
    "欠損": [None, float("nan")],
    "日時": [pd.Timestamp("2024-01-02"), pd.Timestamp("2024-01-03")],
}, index=["一行目", "二行目"])
display(frame)
print(frame)
display(frame["名前"])
display(pd.DataFrame([[1, 2]], columns=["重複", "重複"]))
display(pd.DataFrame())
display({"message": "通常表示"})
`)

    const [frame, series, duplicateColumns, emptyFrame] = messages.map((json) => JSON.parse(json))
    expect(frame.columns).toContain('名前')
    expect(frame.index).toEqual(['一行目', '二行目'])
    expect(frame.rows[0]).toContain('田中')
    expect(frame.rows[0]).toContain('12.5')
    expect(frame.rows[0]).toContain('True')
    expect(frame.rows[0]).toContain('NaN')
    expect(frame.rows[0].some((cell: string) => cell.startsWith('2024-01-02'))).toBe(true)
    expect(series.columns).toEqual(['名前'])
    expect(series.rows[1]).toEqual(['佐藤'])
    expect(duplicateColumns.columns).toEqual(['重複', '重複'])
    expect(duplicateColumns.rows).toEqual([['1', '2']])
    expect(emptyFrame).toMatchObject({
      columns: [],
      index: [],
      rows: [],
      totalRows: 0,
      totalColumns: 0,
      truncated: false,
    })
    expect(standardOutput).toContain("{'message': '通常表示'}")
    expect(standardOutput).toContain('田中')
    expect(isTablePreview(frame)).toBe(true)
    expect(isTablePreview({ ...frame, rows: [['x'.repeat(301)]] })).toBe(false)
    expect(isTablePreview({ ...frame, cellDetails: undefined })).toBe(false)
    expect(isTablePreview({
      ...frame,
      cellDetails: [{ row: 99, column: 0, value: 'outside', truncated: false }],
    })).toBe(false)
  }, 240_000)

  it('clips large tables and oversized cells within configured limits', async () => {
    const pyodide = await loadPyodide()
    await pyodide.loadPackage('pandas')
    const messages: string[] = []
    pyodide.globals.set('__pystudio_table_preview', (json: string) => {
      messages.push(json)
    })
    await pyodide.runPythonAsync(`
${PYTHON_DATAFRAME_PREVIEW_SETUP}
display = _pystudio_display
import pandas as pd
display(pd.DataFrame([[row * 25 + column for column in range(25)] for row in range(110)]))
display(pd.DataFrame({"長文": ["あ" * 301]}))
display(pd.DataFrame({"極長": ["い" * 2500]}))
display(pd.DataFrame({f"大容量{column}": ["あ" * 300] * 100 for column in range(20)}))
`)

    const [wide, longCell, veryLongCell, large] = messages.map((json) => JSON.parse(json))
    expect(wide.rows).toHaveLength(100)
    expect(wide.columns).toHaveLength(20)
    expect(wide.totalRows).toBe(110)
    expect(wide.totalColumns).toBe(25)
    expect(wide.truncated).toBe(true)
    expect(longCell.rows[0][0]).toHaveLength(DATAFRAME_PREVIEW_LIMITS.cellCharacters)
    expect(longCell.cellDetails[0]).toMatchObject({
      row: 0,
      column: 0,
      value: 'あ'.repeat(301),
      truncated: false,
    })
    expect(longCell.truncated).toBe(true)
    expect(veryLongCell.cellDetails[0].value).toHaveLength(DATAFRAME_PREVIEW_LIMITS.detailCharacters)
    expect(veryLongCell.cellDetails[0].truncated).toBe(true)
    expect(large.rows.length).toBeLessThan(100)
    expect(large.truncated).toBe(true)
    for (const preview of [wide, longCell, veryLongCell, large]) {
      expect(preview.rows.length).toBeLessThanOrEqual(DATAFRAME_PREVIEW_LIMITS.rows)
      expect(preview.columns.length).toBeLessThanOrEqual(DATAFRAME_PREVIEW_LIMITS.columns)
      expect(preview.rows.length * preview.columns.length).toBeLessThanOrEqual(DATAFRAME_PREVIEW_LIMITS.cells)
      expect(new TextEncoder().encode(JSON.stringify(preview)).byteLength).toBeLessThanOrEqual(
        DATAFRAME_PREVIEW_LIMITS.bytes,
      )
      expect(isTablePreview(preview)).toBe(true)
    }
  }, 240_000)

  it('keeps a safe leading portion when the per-run byte budget is nearly full', () => {
    const source = {
      columns: ['value'],
      index: Array.from({ length: 10 }, (_, index) => String(index)),
      rows: Array.from({ length: 10 }, () => ['x'.repeat(100)]),
      cellDetails: [],
      totalRows: 10,
      totalColumns: 1,
      truncated: false,
    }
    const result = fitTablePreviewToByteLimit(source, 7, 1, 500)
    expect(result).not.toBeNull()
    expect(result?.preview.rows.length).toBeGreaterThan(0)
    expect(result?.preview.rows.length).toBeLessThan(10)
    expect(result?.preview.truncated).toBe(true)
    expect(result?.byteLength).toBeLessThanOrEqual(500)
  })
})
