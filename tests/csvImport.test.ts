import { describe, expect, it } from 'vitest'
import {
  MAX_CSV_IMPORT_FILES,
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_TOTAL_BYTES,
  decodeCsvBytes,
  detectCsvEncoding,
  getCsvImportPath,
  validateCsvImportBatch,
} from '../src/services/csvImport'

const utf8 = new TextEncoder()

describe('CSV import helpers', () => {
  it('detects UTF-8 with and without BOM and removes the BOM when decoding', () => {
    const text = '名前,点数\n田中,85'
    const plain = utf8.encode(text)
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...plain])

    expect(detectCsvEncoding(plain)).toBe('utf-8')
    expect(detectCsvEncoding(withBom)).toBe('utf-8')
    expect(decodeCsvBytes(withBom, 'utf-8')).toBe(text)
  })

  it('detects and decodes Shift_JIS Japanese text', () => {
    const bytes = new Uint8Array([
      0x96, 0xbc, 0x91, 0x4f, 0x2c, 0x93, 0x63, 0x92, 0x86,
    ])
    expect(detectCsvEncoding(bytes)).toBe('shift_jis')
    expect(decodeCsvBytes(bytes, 'shift_jis')).toBe('名前,田中')
  })

  it('requires an explicit choice when bytes are not valid UTF-8 or Shift_JIS', () => {
    expect(detectCsvEncoding(new Uint8Array([0xff, 0x82]))).toBe('unknown')
    expect(() => decodeCsvBytes(new Uint8Array([0xff]), 'utf-8')).toThrow('文字コードを確認')
  })

  it('retains nested folder paths and removes the selected directory root', () => {
    expect(getCsvImportPath('scores.csv')).toBe('scores.csv')
    expect(getCsvImportPath('scores.csv', 'dataset/data/scores.csv')).toBe('data/scores.csv')
  })

  it('adds safe CSV paths and rejects overwrites, invalid paths, and file-directory conflicts', () => {
    const result = validateCsvImportBatch(
      [
        { path: 'data/scores.csv', contents: '名前,点数\n田中,85\n' },
        { path: 'data/SCORES.csv', contents: 'duplicate' },
        { path: '../escape.csv', contents: 'unsafe' },
        { path: 'existing.csv/child.csv', contents: 'conflict' },
        { path: 'README.md', contents: 'wrong extension' },
      ],
      { 'main.py': 'print("ok")', 'existing.csv': 'already here' },
      [],
    )

    expect(result.accepted).toEqual([
      { path: 'data/scores.csv', contents: '名前,点数\n田中,85\n' },
    ])
    expect(result.rejected).toHaveLength(4)
    expect(result.rejected.map(({ reason }) => reason).join(' ')).toContain('同じ名前')
    expect(result.rejected.map(({ reason }) => reason).join(' ')).toContain('安全')
    expect(result.rejected.map(({ reason }) => reason).join(' ')).toContain('親に同名')
  })

  it('enforces per-file, project total, file-count, and batch limits', () => {
    const oversizedFile = 'x'.repeat(MAX_PROJECT_FILE_BYTES + 1)
    const oversized = validateCsvImportBatch(
      [{ path: 'large.csv', contents: oversizedFile }],
      {},
      [],
    )
    expect(oversized.rejected[0]?.reason).toContain('2MB')

    const totalLimited = validateCsvImportBatch(
      [{ path: 'extra.csv', contents: 'x' }],
      { 'existing.txt': 'x'.repeat(MAX_PROJECT_TOTAL_BYTES) },
      [],
    )
    expect(totalLimited.rejected[0]?.reason).toContain('容量上限')

    const countLimited = validateCsvImportBatch(
      [{ path: 'extra.csv', contents: 'x' }],
      Object.fromEntries(
        Array.from({ length: 98 }, (_, index) => [`file${index}.txt`, '']),
      ),
      [],
    )
    expect(countLimited.rejected[0]?.reason).toContain('ファイル数')

    const batch = validateCsvImportBatch(
      Array.from({ length: MAX_CSV_IMPORT_FILES + 1 }, (_, index) => ({
        path: `file${index}.csv`,
        contents: '',
      })),
      {},
      [],
    )
    expect(batch.accepted).toHaveLength(0)
    expect(batch.rejected).toHaveLength(MAX_CSV_IMPORT_FILES + 1)
  })
})
