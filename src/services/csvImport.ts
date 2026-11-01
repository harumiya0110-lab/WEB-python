import { isValidProjectPath } from '../types/project'
import {
  MAX_CSV_IMPORT_FILES,
  MAX_CSV_PROJECT_DIRECTORIES,
  MAX_CSV_PROJECT_FILES,
  MAX_PROJECT_FILE_BYTES,
  MAX_PROJECT_TOTAL_BYTES,
} from './projectFileLimits'

export type CsvEncoding = 'utf-8' | 'shift_jis'
export type DetectedCsvEncoding = CsvEncoding | 'unknown'

export interface CsvImportSelection {
  path: string
  bytes: Uint8Array
  encoding: CsvEncoding | null
}

export interface CsvImportFile {
  path: string
  contents: string
}

export interface CsvImportRejection {
  path: string
  reason: string
}

export interface CsvImportValidation {
  accepted: CsvImportFile[]
  rejected: CsvImportRejection[]
}

export function getCsvImportPath(fileName: string, relativePath = ''): string {
  return relativePath ? relativePath.split('/').slice(1).join('/') : fileName
}

export function detectCsvEncoding(bytes: Uint8Array): DetectedCsvEncoding {
  for (const encoding of ['utf-8', 'shift_jis'] as const) {
    try {
      new TextDecoder(encoding, { fatal: true }).decode(bytes)
      return encoding
    } catch {
      continue
    }
  }
  return 'unknown'
}

export function decodeCsvBytes(bytes: Uint8Array, encoding: CsvEncoding): string {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes)
  } catch (error) {
    throw new Error(
      `${encoding === 'utf-8' ? 'UTF-8' : 'Shift_JIS'}として読み取れません。文字コードを確認してください。`,
      { cause: error },
    )
  }
}

function normalizedPath(path: string): string {
  return path.normalize('NFC').toLocaleLowerCase('en-US')
}

function isSafeCsvPath(path: string): boolean {
  return (
    isValidProjectPath(path) &&
    path.toLowerCase().endsWith('.csv') &&
    !path.includes(':') &&
    ![...path].some((character) => {
      const code = character.codePointAt(0) ?? 0
      return code < 32 || (code >= 127 && code <= 159)
    }) &&
    path.split('/').every((segment) =>
      !segment.endsWith('.') &&
      !segment.endsWith(' ') &&
      !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    )
  )
}

type ProjectNode = { type: 'file' | 'directory'; path: string }

function addExistingNodes(
  nodes: Map<string, ProjectNode>,
  files: Record<string, string>,
  directories: string[],
): void {
  for (const path of Object.keys(files)) nodes.set(normalizedPath(path), { type: 'file', path })
  for (const path of directories) nodes.set(normalizedPath(path), { type: 'directory', path })
  for (const path of [...Object.keys(files), ...directories]) {
    const parts = path.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join('/')
      if (!nodes.has(normalizedPath(parent))) {
        nodes.set(normalizedPath(parent), { type: 'directory', path: parent })
      }
    }
  }
}

export function validateCsvImportBatch(
  candidates: CsvImportFile[],
  existingFiles: Record<string, string>,
  existingDirectories: string[],
): CsvImportValidation {
  if (candidates.length > MAX_CSV_IMPORT_FILES) {
    return {
      accepted: [],
      rejected: candidates.map(({ path }) => ({
        path,
        reason: `一度に追加できるCSVは${MAX_CSV_IMPORT_FILES}件までです。`,
      })),
    }
  }
  const nodes = new Map<string, ProjectNode>()
  addExistingNodes(nodes, existingFiles, existingDirectories)
  const accepted: CsvImportFile[] = []
  const rejected: CsvImportRejection[] = []
  const encoder = new TextEncoder()
  let totalBytes = Object.values(existingFiles).reduce(
    (total, contents) => total + encoder.encode(contents).byteLength,
    0,
  )
  let fileCount = Object.keys(existingFiles).length
  let directoryCount = [...nodes.values()].filter((node) => node.type === 'directory').length

  for (const candidate of candidates) {
    const { path, contents } = candidate
    const bytes = encoder.encode(contents).byteLength
    let reason: string | null = null
    if (!isSafeCsvPath(path)) reason = '安全なCSVファイルパスではありません。'
    else if (bytes > MAX_PROJECT_FILE_BYTES) reason = 'ファイルが上限（2MB）を超えています。'
    else if (fileCount >= MAX_CSV_PROJECT_FILES) reason = `プロジェクト内のファイル数が上限（${MAX_CSV_PROJECT_FILES}件）に達しています。`
    else if (totalBytes + bytes > MAX_PROJECT_TOTAL_BYTES) reason = 'プロジェクト全体の容量上限（20MB）を超えます。'

    const parts = path.split('/')
    const newDirectories: string[] = []
    if (!reason) {
      for (let index = 1; index < parts.length; index += 1) {
        const parent = parts.slice(0, index).join('/')
        const existing = nodes.get(normalizedPath(parent))
        if (existing?.type === 'file') {
          reason = `保存先の親に同名のファイルがあります: ${parent}`
          break
        }
        if (existing && existing.path !== parent) {
          reason = `保存先のフォルダー名が既存のパスと競合しています: ${parent}`
          break
        }
        if (!existing) newDirectories.push(parent)
      }
    }
    const existingTarget = nodes.get(normalizedPath(path))
    if (!reason && existingTarget) reason = `同じ名前のファイルまたはフォルダーがすでにあります: ${existingTarget.path}`
    const newDirectoryCount = new Set(newDirectories.map(normalizedPath)).size
    if (!reason && directoryCount + newDirectoryCount > MAX_CSV_PROJECT_DIRECTORIES) {
      reason = `プロジェクト内のフォルダー数が上限（${MAX_CSV_PROJECT_DIRECTORIES}件）を超えます。`
    }
    if (reason) {
      rejected.push({ path, reason })
      continue
    }
    for (const directory of newDirectories) nodes.set(normalizedPath(directory), { type: 'directory', path: directory })
    nodes.set(normalizedPath(path), { type: 'file', path })
    directoryCount += newDirectoryCount
    fileCount += 1
    totalBytes += bytes
    accepted.push(candidate)
  }
  return { accepted, rejected }
}

export { MAX_CSV_IMPORT_FILES, MAX_PROJECT_FILE_BYTES, MAX_PROJECT_TOTAL_BYTES }
