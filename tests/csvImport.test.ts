import { describe, expect, it } from 'vitest'
import {
  decodeCsvBytes,
  detectCsvEncoding,
  getCsvImportPath,
  validateCsvImportBatch,
} from '../src/services/csvImport'

describe('CSV import helpers', () => {
  it('detects UTF-8 with BOM and decodes Japanese text', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0xe6, 0x97, 0xa5])
    expect(detectCsvEncoding(bytes)).toBe('utf-8')
    expect(decodeCsvBytes(bytes, 'utf-8')).toBe('日')
  })

  it('detects and decodes Shift_JIS', () => {
    const bytes = new Uint8Array([0x82, 0xa0])
    expect(detectCsvEncoding(bytes)).toBe('shift_jis')
    expect(decodeCsvBytes(bytes, 'shift_jis')).toBe('あ')
  })

  it('keeps folder paths relative to their selected root', () => {
    expect(getCsvImportPath('grades.csv', 'datasets/class/grades.csv')).toBe('class/grades.csv')
  })

  it('accepts safe files without overwriting existing names', () => {
    const result = validateCsvImportBatch(
      [
        { path: 'data/new.csv', contents: 'name,score\nA,90\n' },
        { path: 'data/current.csv', contents: 'overwrite' },
        { path: '../escape.csv', contents: 'bad' },
      ],
      { 'data/current.csv': 'preserved' },
      [],
    )
    expect(result.accepted.map(({ path }) => path)).toEqual(['data/new.csv'])
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0]?.reason).toContain('すでにあります')
  })
})
