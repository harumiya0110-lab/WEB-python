import { Unzip, UnzipInflate, UnzipPassThrough, zipSync } from 'fflate'
import { isValidProjectPath, type Project } from '../types/project'
import type {
  ArchiveFileEntry,
  BackupArchiveData,
  BackupProjectMetadata,
  BackupTemplateMetadata,
  ParsedPyStudioArchive,
  PyStudioArchiveKind,
  PyStudioArchiveManifest,
} from '../types/archive'
import type { TemplateCategory, TemplateDifficulty, UserTemplate } from '../types/template'

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
const MAX_ARCHIVE_FILES = 100
const MAX_TOTAL_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_BACKUP_ITEMS = 100
const MAX_BACKUP_FAVORITES = 1_000
const SUPPORTED_TEXT_EXTENSIONS = new Set([
  '.py', '.txt', '.md', '.csv', '.json', '.html', '.css', '.js', '.ts', '.yaml', '.yml', '.xml',
])
const encoder = new TextEncoder()
const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  'Python基礎', 'データ構造', '計算・数学', 'ゲーム', 'データ処理', 'グラフ・可視化', '複数ファイル', '実用プログラム',
]

function isTemplateCategory(value: unknown): value is TemplateCategory {
  return typeof value === 'string' && TEMPLATE_CATEGORIES.includes(value as TemplateCategory)
}

function isTemplateDifficulty(value: unknown): value is TemplateDifficulty {
  return value === '初級' || value === '中級' || value === '上級'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown): item is string => typeof item === 'string')
}

function containsControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0
    return code < 32 || (code >= 127 && code <= 159)
  })
}

export interface BackupSnapshot {
  projects: Project[]
  templates: UserTemplate[]
  favoriteIds: string[]
}

function assertSafePath(path: string): void {
  const segments = path.split('/')
  const hasWindowsDeviceName = segments.some((segment) => /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))
  if (
    !isValidProjectPath(path) ||
    path.includes(':') ||
    containsControlCharacters(path) ||
    segments.some((segment) => segment.endsWith('.') || segment.endsWith(' ')) ||
    hasWindowsDeviceName
  ) {
    throw new Error(`安全でないファイルパスです: ${path}`)
  }
}

function assertTextFile(path: string): void {
  assertSafePath(path)
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase()
  if (!SUPPORTED_TEXT_EXTENSIONS.has(extension)) {
    throw new Error(`対応していないファイル形式です: ${path}（UTF-8テキストのみ対応しています）`)
  }
}

function assertProjectFiles(files: Record<string, string>, directories: string[], activeFile: string): void {
  if (directories.length > MAX_ARCHIVE_FILES) {
    throw new Error('プロジェクト内のフォルダー数が上限（100件）を超えています。')
  }
  const nodes = new Map<string, { type: 'file' | 'directory'; path: string }>()
  for (const [path, content] of Object.entries(files)) {
    assertTextFile(path)
    const normalizedPath = path.normalize('NFC').toLocaleLowerCase('en-US')
    if (typeof content !== 'string') throw new Error(`ファイルの内容がテキストではありません: ${path}`)
    if (nodes.has(normalizedPath)) throw new Error(`ファイル名が重複しています: ${path}`)
    nodes.set(normalizedPath, { type: 'file', path })
  }
  for (const directory of directories) {
    assertSafePath(directory)
    const normalizedPath = directory.normalize('NFC').toLocaleLowerCase('en-US')
    const existing = nodes.get(normalizedPath)
    if (existing && (existing.type !== 'directory' || existing.path !== directory)) {
      throw new Error(`ファイルとフォルダーが競合しています: ${directory}`)
    }
    if (!existing) nodes.set(normalizedPath, { type: 'directory', path: directory })
  }
  for (const path of [...Object.keys(files), ...directories]) {
    const segments = path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      const parent = segments.slice(0, index).join('/')
      const key = parent.normalize('NFC').toLocaleLowerCase('en-US')
      const existing = nodes.get(key)
      if (existing?.type === 'file') throw new Error(`ファイルとフォルダーが競合しています: ${parent}`)
      if (existing && existing.path !== parent) {
        throw new Error(`パスの大文字・小文字またはUnicode表記が競合しています: ${parent}`)
      }
      if (!existing) nodes.set(key, { type: 'directory', path: parent })
    }
  }
  if (!Object.keys(files).some((path) => path.toLowerCase().endsWith('.py'))) {
    throw new Error('Pythonファイルが含まれていません。')
  }
  if (!Object.hasOwn(files, activeFile) || !activeFile.toLowerCase().endsWith('.py')) {
    throw new Error('開始ファイルが存在しないPythonファイルを指しています。')
  }
}

function encodeArchiveFile(content: string, path: string): Uint8Array {
  const bytes = encoder.encode(content)
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(`ファイルが上限（2MB）を超えています: ${path}`)
  }
  return bytes
}

function manifestFor(
  kind: PyStudioArchiveKind,
  name: string,
  description: string,
  files: Record<string, string>,
  directories: string[],
  activeFile: string,
  createdAt: number,
  updatedAt: number,
  extras: Partial<Pick<PyStudioArchiveManifest, 'category' | 'difficulty' | 'backup'>> = {},
): PyStudioArchiveManifest {
  const entries: ArchiveFileEntry[] = Object.entries(files).map(([path, content]) => ({
    path,
    size: encoder.encode(content).byteLength,
  }))
  return {
    format: 'pystudio',
    formatVersion: 1,
    kind,
    name,
    description,
    activeFile,
    directories: [...directories],
    files: entries,
    createdAt,
    updatedAt,
    ...extras,
  }
}

function createZip(manifest: PyStudioArchiveManifest, contents: Record<string, string>): Uint8Array {
  if (Object.keys(contents).length + 2 > MAX_ARCHIVE_FILES) {
    throw new Error('ZIPに含められるファイル数は100件までです。')
  }
  const manifestBytes = encoder.encode(JSON.stringify(manifest, null, 2))
  const readmeBytes = encoder.encode(`# ${manifest.name}\n\n${manifest.description}\n\nCreated with PyStudio.\n`)
  if (manifestBytes.byteLength > MAX_FILE_BYTES || readmeBytes.byteLength > MAX_FILE_BYTES) {
    throw new Error('ZIPのmanifestまたは説明ファイルが2MBを超えています。')
  }
  const zipContents: Record<string, Uint8Array> = {
    'pystudio.json': manifestBytes,
    'README.md': readmeBytes,
  }
  for (const [path, content] of Object.entries(contents)) {
    assertTextFile(path)
    zipContents[`files/${path}`] = encodeArchiveFile(content, path)
  }
  const totalSize = Object.values(zipContents).reduce((total, entry) => total + entry.byteLength, 0)
  if (totalSize > MAX_TOTAL_UNCOMPRESSED_BYTES) throw new Error('ZIPに含めるデータが合計20MBを超えています。')
  const archive = zipSync(zipContents, { level: 6 })
  if (archive.byteLength > MAX_ARCHIVE_BYTES) throw new Error('作成したZIPが上限（20MB）を超えています。')
  return archive
}

export function sanitizeArchiveFilename(name: string): string {
  const safe = name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || (code >= 127 && code <= 159) ? '_' : character
    })
    .join('')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 100)
  return `PyStudio_${safe || 'Project'}.zip`
}

export function exportProjectArchive(project: Project): Uint8Array {
  assertProjectFiles(project.files, project.directories, project.activeFile)
  const manifest = manifestFor(
    'project',
    project.name,
    project.description ?? '',
    project.files,
    project.directories,
    project.activeFile,
    project.createdAt ?? project.updatedAt,
    project.updatedAt,
  )
  return createZip(manifest, project.files)
}

export function exportTemplateArchive(template: UserTemplate): Uint8Array {
  assertProjectFiles(template.files, template.directories, template.activeFile)
  const manifest = manifestFor(
    'template',
    template.name,
    template.description,
    template.files,
    template.directories,
    template.activeFile,
    template.createdAt,
    template.updatedAt,
    { category: template.category, difficulty: template.difficulty },
  )
  return createZip(manifest, template.files)
}

export function exportBackupArchive(snapshot: BackupSnapshot, now = Date.now()): Uint8Array {
  if (snapshot.projects.length + snapshot.templates.length > MAX_BACKUP_ITEMS ||
      snapshot.favoriteIds.length > MAX_BACKUP_FAVORITES ||
      new Set(snapshot.favoriteIds).size !== snapshot.favoriteIds.length ||
      snapshot.favoriteIds.some((id) => !id || id.length > 256 || containsControlCharacters(id))) {
    throw new Error('バックアップ内のデータ件数またはお気に入り情報が不正です。')
  }
  const contentFiles: Record<string, string> = {}
  const projectIds = new Set<string>()
  const projects: BackupProjectMetadata[] = snapshot.projects.map((project) => {
    if (!project.id || project.id.length > 256 || containsControlCharacters(project.id) ||
        project.id.includes('/') || project.id.includes('\\') || projectIds.has(project.id)) {
      throw new Error('バックアップ内のプロジェクトIDが不正か重複しています。')
    }
    projectIds.add(project.id)
    assertProjectFiles(project.files, project.directories, project.activeFile)
    const filePaths = Object.keys(project.files)
    for (const path of filePaths) contentFiles[`backup/projects/${encodeURIComponent(project.id)}/${path}`] = project.files[path]
    return {
      ...project,
      description: project.description ?? '',
      files: filePaths,
      directories: [...project.directories],
    }
  })
  const templateIds = new Set<string>()
  const templates: BackupTemplateMetadata[] = snapshot.templates.map((template) => {
    if (!template.id || template.id.length > 256 || containsControlCharacters(template.id) ||
        template.id.includes('/') || template.id.includes('\\') || templateIds.has(template.id)) {
      throw new Error('バックアップ内のテンプレートIDが不正か重複しています。')
    }
    templateIds.add(template.id)
    assertProjectFiles(template.files, template.directories, template.activeFile)
    const filePaths = Object.keys(template.files)
    for (const path of filePaths) contentFiles[`backup/templates/${encodeURIComponent(template.id)}/${path}`] = template.files[path]
    return {
      ...template,
      files: filePaths,
      directories: [...template.directories],
    }
  })
  contentFiles['backup/favorites.json'] = JSON.stringify(snapshot.favoriteIds)
  const backup: BackupArchiveData = { projects, templates, favoriteIds: [...snapshot.favoriteIds] }
  const manifest = manifestFor(
    'backup',
    'PyStudio Backup',
    'PyStudio projects, custom templates, and favorites',
    contentFiles,
    [],
    '',
    now,
    now,
    { backup },
  )
  return createZip(manifest, contentFiles)
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

interface CentralDirectoryFile {
  name: string
  isDirectory: boolean
}

function inspectCentralDirectory(bytes: Uint8Array): CentralDirectoryFile[] {
  const minimum = Math.max(0, bytes.length - 65_557)
  let eocd = -1
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      eocd = offset
      break
    }
  }
  if (eocd < 0 || readUint16(bytes, eocd + 4) !== 0 || readUint16(bytes, eocd + 6) !== 0) {
    throw new Error('ZIPの終端情報が不正か、複数ディスク形式です。')
  }
  const count = readUint16(bytes, eocd + 10)
  if (readUint16(bytes, eocd + 8) !== count) throw new Error('分割されたZIPには対応していません。')
  const directorySize = readUint32(bytes, eocd + 12)
  const directoryOffset = readUint32(bytes, eocd + 16)
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw new Error('ZIP64形式には対応していません。')
  }
  if (directoryOffset + directorySize > eocd) throw new Error('ZIPの中央ディレクトリが不正です。')

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const result: CentralDirectoryFile[] = []
  const names = new Set<string>()
  const fileNames = new Set<string>()
  const directoryNames = new Set<string>()
  let offset = directoryOffset
  while (offset < directoryOffset + directorySize) {
    if (result.length >= MAX_ARCHIVE_FILES * 2) {
      throw new Error('ZIP内のファイルとフォルダー数が上限を超えています。')
    }
    if (readUint32(bytes, offset) !== 0x02014b50 || offset + 46 > bytes.length) {
      throw new Error('ZIPのファイル情報が不正です。')
    }
    const flags = readUint16(bytes, offset + 8)
    const compression = readUint16(bytes, offset + 10)
    const compressedSize = readUint32(bytes, offset + 20)
    const originalSize = readUint32(bytes, offset + 24)
    const nameLength = readUint16(bytes, offset + 28)
    const extraLength = readUint16(bytes, offset + 30)
    const commentLength = readUint16(bytes, offset + 32)
    const externalAttributes = readUint32(bytes, offset + 38)
    const end = offset + 46 + nameLength + extraLength + commentLength
    if (end > directoryOffset + directorySize) throw new Error('ZIPのファイル情報が途中で切れています。')
    if ((flags & 1) !== 0) throw new Error('暗号化されたZIPには対応していません。')
    if (compression !== 0 && compression !== 8) throw new Error('対応していない圧縮方式です。')
    if (compressedSize === 0xffffffff || originalSize === 0xffffffff) throw new Error('ZIP64形式には対応していません。')
    if (originalSize > MAX_FILE_BYTES) throw new Error('ZIP内に2MBを超えるファイルがあります。')
    const originOS = bytes[offset + 5]
    if (![0, 3, 10, 19].includes(originOS)) throw new Error('対応していないZIP作成環境です。')
    const unixMode = originOS === 3 || originOS === 19 ? externalAttributes >>> 16 : 0
    const fileType = unixMode & 0xf000
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    const isDirectory = name.endsWith('/')
    if (
      (fileType !== 0 && fileType !== 0x8000 && fileType !== 0x4000) ||
      ((externalAttributes & 0x400) !== 0) ||
      (fileType === 0x4000 && !isDirectory) ||
      (fileType === 0x8000 && isDirectory) ||
      ((externalAttributes & 0x10) !== 0 && !isDirectory)
    ) {
      throw new Error('シンボリックリンクなどの特殊ファイルには対応していません。')
    }
    const logicalName = isDirectory ? name.slice(0, -1) : name
    assertSafePath(logicalName)
    const normalizedName = logicalName.normalize('NFC').toLocaleLowerCase('en-US')
    if (names.has(normalizedName)) throw new Error(`ZIP内でパスが重複しています: ${name}`)
    names.add(normalizedName)
    if (isDirectory) directoryNames.add(normalizedName)
    else fileNames.add(normalizedName)
    result.push({ name, isDirectory })
    offset = end
  }
  if (offset !== directoryOffset + directorySize) throw new Error('ZIPの中央ディレクトリの長さが一致しません。')
  if (result.length !== count) throw new Error('ZIPのファイル数情報が一致しません。')
  for (const name of fileNames) {
    const parts = name.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join('/')
      if (fileNames.has(parent)) throw new Error(`ZIP内でファイルとフォルダーが競合しています: ${parent}`)
    }
    if (directoryNames.has(name)) throw new Error(`ZIP内でファイルとフォルダーが競合しています: ${name}`)
  }
  for (const name of directoryNames) {
    const parts = name.split('/')
    for (let index = 1; index < parts.length; index += 1) {
      if (fileNames.has(parts.slice(0, index).join('/'))) {
        throw new Error(`ZIP内でファイルとフォルダーが競合しています: ${parts.slice(0, index).join('/')}`)
      }
    }
  }
  const fileCount = result.filter((entry) => !entry.isDirectory).length
  if (fileCount > MAX_ARCHIVE_FILES) throw new Error('ZIP内のファイル数が上限（100件）を超えています。')
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateManifest(value: unknown): PyStudioArchiveManifest {
  if (!isRecord(value) || value.format !== 'pystudio' || value.formatVersion !== 1) {
    throw new Error('PyStudio形式のmanifestではないか、未対応の形式バージョンです。')
  }
  if (!['project', 'template', 'backup'].includes(String(value.kind))) {
    throw new Error('manifestの種類が不正です。')
  }
  if (typeof value.name !== 'string' || !value.name.trim() || typeof value.description !== 'string') {
    throw new Error('manifestの名前または説明が不正です。')
  }
  if (value.name.length > 200 || value.description.length > 10_000) {
    throw new Error('manifestの名前または説明が長すぎます。')
  }
  if (!Array.isArray(value.files) || !Array.isArray(value.directories)) {
    throw new Error('manifestのファイル構成が不正です。')
  }
  const paths = new Set<string>()
  const files: ArchiveFileEntry[] = value.files.map((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.path !== 'string' || !Number.isSafeInteger(entry.size) || Number(entry.size) < 0) {
      throw new Error('manifestのファイル情報が不正です。')
    }
    assertTextFile(entry.path)
    const key = entry.path.normalize('NFC').toLocaleLowerCase('en-US')
    if (paths.has(key)) throw new Error(`manifest内でパスが重複しています: ${entry.path}`)
    paths.add(key)
    return { path: entry.path, size: Number(entry.size) }
  })
  const directories = value.directories.map((directory: unknown) => {
    if (typeof directory !== 'string') throw new Error('manifestのフォルダー情報が不正です。')
    assertSafePath(directory)
    return directory
  })
  const directoryPaths = new Set<string>()
  for (const directory of directories) {
    const key = directory.normalize('NFC').toLocaleLowerCase('en-US')
    if (directoryPaths.has(key) || paths.has(key)) {
      throw new Error('manifest内でファイルとフォルダーが重複しています。')
    }
    directoryPaths.add(key)
  }
  if (directories.some((directory: string) => {
    const parts = directory.split('/')
    return parts.slice(1).some((_, index) => {
      const parent = parts.slice(0, index + 1).join('/').normalize('NFC').toLocaleLowerCase('en-US')
      return paths.has(parent)
    })
  }) || files.some(({ path }) => {
    const parts = path.split('/')
    return parts.slice(1).some((_, index) => {
      const parent = parts.slice(0, index + 1).join('/').normalize('NFC').toLocaleLowerCase('en-US')
      return paths.has(parent)
    })
  })) {
    throw new Error('manifest内でファイルとフォルダーが重複しています。')
  }
  if (
    typeof value.activeFile !== 'string' ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt)
  ) {
    throw new Error('manifestの日時または開始ファイルが不正です。')
  }
  if (value.kind !== 'backup' && (!files.some((file) => file.path === value.activeFile) || !value.activeFile.toLowerCase().endsWith('.py'))) {
    throw new Error('manifestの開始ファイルが存在しないPythonファイルを指しています。')
  }
  if (value.kind === 'template' && (
    !isTemplateCategory(value.category) ||
    (value.difficulty !== undefined && !isTemplateDifficulty(value.difficulty))
  )) {
    throw new Error('manifestのテンプレートカテゴリーまたは難易度が不正です。')
  }
  if (value.kind === 'backup') {
    if (!isRecord(value.backup) || !Array.isArray(value.backup.projects) ||
        !Array.isArray(value.backup.templates) || !Array.isArray(value.backup.favoriteIds)) {
      throw new Error('バックアップ情報がmanifestにありません。')
    }
    if (value.backup.projects.length + value.backup.templates.length > MAX_BACKUP_ITEMS ||
        value.backup.favoriteIds.length > MAX_BACKUP_FAVORITES) {
      throw new Error('バックアップ内のデータ件数が上限を超えています。')
    }
  }
  if (files.length > MAX_ARCHIVE_FILES || directories.length > MAX_ARCHIVE_FILES) {
    throw new Error('manifestのファイルまたはフォルダー数が上限（100件）を超えています。')
  }
  return value as unknown as PyStudioArchiveManifest
}

function expectedArchiveDirectories(manifest: PyStudioArchiveManifest): Set<string> {
  const expected = new Set<string>()
  const addDirectory = (path: string) => {
    const segments = path.split('/')
    for (let index = 1; index <= segments.length; index += 1) {
      expected.add(segments.slice(0, index).join('/').normalize('NFC').toLocaleLowerCase('en-US'))
    }
  }
  const addFileParents = (path: string) => {
    const segments = path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      expected.add(segments.slice(0, index).join('/').normalize('NFC').toLocaleLowerCase('en-US'))
    }
  }
  for (const entry of manifest.files) {
    addFileParents(manifest.kind === 'backup' ? entry.path : `files/${entry.path}`)
  }
  if (manifest.kind === 'backup' && manifest.backup) {
    for (const [kind, items] of [
      ['projects', manifest.backup.projects],
      ['templates', manifest.backup.templates],
    ] as const) {
      for (const item of items) {
        if (!isRecord(item) || typeof item.id !== 'string' || !isStringArray(item.directories)) continue
        let id: string
        try {
          id = encodeURIComponent(item.id)
        } catch (error) {
          throw new Error('バックアップ内のデータIDが不正です。', { cause: error })
        }
        for (const directory of item.directories) addDirectory(`backup/${kind}/${id}/${directory}`)
      }
    }
  } else {
    expected.add('files')
    for (const directory of manifest.directories) addDirectory(`files/${directory}`)
  }
  return expected
}

export async function parsePyStudioArchive(file: Blob): Promise<ParsedPyStudioArchive> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('ZIPファイルが上限（20MB）を超えています。')
  if (file.size < 22) throw new Error('ZIPファイルのサイズが不正です。')

  const bytes = new Uint8Array(await file.arrayBuffer())
  const centralFiles = inspectCentralDirectory(bytes)
  const centralNames = new Set(centralFiles.filter((entry) => !entry.isDirectory).map((entry) => entry.name))
  const inflated = new Map<string, Uint8Array>()
  const chunkLists = new Map<string, Uint8Array[]>()
  const fileSizes = new Map<string, number>()
  let totalSize = 0
  let pending = 0

  await new Promise<void>((resolve, reject) => {
    let completed = false
    const fail = (error: Error) => {
      if (completed) return
      completed = true
      reject(error)
    }
    const unzip = new Unzip((zipEntry) => {
      if (completed) return
      if (zipEntry.name.endsWith('/')) return
      if (!centralNames.has(zipEntry.name)) {
        fail(new Error('ZIPの中央ディレクトリとファイル一覧が一致しません。'))
        return
      }
      if (chunkLists.has(zipEntry.name)) {
        fail(new Error(`ZIP内でパスが重複しています: ${zipEntry.name}`))
        return
      }
      const expectedSize = zipEntry.originalSize
      if (expectedSize === undefined || expectedSize > MAX_FILE_BYTES) {
        fail(new Error('ZIP内にサイズを検証できないファイル、または2MBを超えるファイルがあります。'))
        return
      }
      totalSize += expectedSize
      if (totalSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        fail(new Error('展開後の合計サイズが上限（20MB）を超えています。'))
        return
      }
      pending += 1
      const chunks: Uint8Array[] = []
      let actualSize = 0
      chunkLists.set(zipEntry.name, chunks)
      zipEntry.ondata = (error, chunk, final) => {
        if (error) {
          fail(new Error(`ZIP内のファイルを展開できませんでした: ${zipEntry.name}`, { cause: error }))
          return
        }
        actualSize += chunk.byteLength
        if (actualSize > MAX_FILE_BYTES || actualSize > expectedSize) {
          fail(new Error(`展開後のファイルサイズが不正です: ${zipEntry.name}`))
          return
        }
        chunks.push(chunk)
        if (final) {
          if (actualSize !== expectedSize) {
            fail(new Error(`ZIP内のファイルサイズが一致しません: ${zipEntry.name}`))
            return
          }
          const output = new Uint8Array(actualSize)
          let cursor = 0
          for (const part of chunks) {
            output.set(part, cursor)
            cursor += part.byteLength
          }
          inflated.set(zipEntry.name, output)
          fileSizes.set(zipEntry.name, actualSize)
          pending -= 1
          if (pending === 0 && centralNames.size === inflated.size) {
            completed = true
            resolve()
          }
        }
      }
      try {
        zipEntry.start()
      } catch (error) {
        fail(new Error(`ZIP内の圧縮方式に対応していません: ${zipEntry.name}`, { cause: error }))
      }
    })
    unzip.register(UnzipPassThrough)
    unzip.register(UnzipInflate)
    try {
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
        unzip.push(bytes.subarray(offset, Math.min(bytes.length, offset + 64 * 1024)), offset + 64 * 1024 >= bytes.length)
      }
      if (!completed && pending === 0 && centralNames.size === 0) fail(new Error('ZIPにファイルがありません。'))
      if (!completed && pending === 0 && inflated.size !== centralNames.size) fail(new Error('ZIP内のファイルを完全に展開できませんでした。'))
    } catch (error) {
      fail(error instanceof Error ? error : new Error('ZIPを読み込めませんでした。'))
    }
  })

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const textFiles: Record<string, string> = {}
  for (const [path, content] of inflated) {
    try {
      textFiles[path] = decoder.decode(content)
    } catch (error) {
      throw new Error(`UTF-8テキストとして読み込めません: ${path}`, { cause: error })
    }
  }
  const manifestText = textFiles['pystudio.json']
  if (!manifestText) throw new Error('ZIP内にpystudio.jsonがありません。')
  let rawManifest: unknown
  try {
    rawManifest = JSON.parse(manifestText)
  } catch (error) {
    throw new Error('pystudio.jsonのJSON形式が不正です。', { cause: error })
  }
  const manifest = validateManifest(rawManifest)
  const allowedDirectories = expectedArchiveDirectories(manifest)
  for (const entry of centralFiles) {
    if (entry.isDirectory) {
      const path = entry.name.slice(0, -1).normalize('NFC').toLocaleLowerCase('en-US')
      if (!allowedDirectories.has(path)) {
        throw new Error(`manifestにないフォルダーがZIPに含まれています: ${entry.name}`)
      }
    }
  }
  const expectedArchivePaths = new Set(['pystudio.json', 'README.md'])
  const files: Record<string, string> = {}
  for (const entry of manifest.files) {
    const archivePath = `files/${entry.path}`
    expectedArchivePaths.add(archivePath)
    const content = textFiles[archivePath]
    if (content === undefined || fileSizes.get(archivePath) !== entry.size) {
      throw new Error(`manifestとZIP内のファイルが一致しません: ${entry.path}`)
    }
    files[entry.path] = content
  }
  for (const path of centralNames) {
    if (!expectedArchivePaths.has(path)) throw new Error(`manifestにないファイルがZIPに含まれています: ${path}`)
  }
  if (!centralNames.has('pystudio.json')) throw new Error('ZIP内にpystudio.jsonがありません。')
  if (manifest.kind !== 'backup') {
    assertProjectFiles(files, manifest.directories, manifest.activeFile)
  } else {
    backupSnapshotFromArchive({ manifest, files })
  }
  return { manifest, files }
}

export function archiveFilenameFor(name: string): string {
  return sanitizeArchiveFilename(name)
}

export function downloadArchive(bytes: Uint8Array, filename: string): void {
  const data = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(data).set(bytes)
  const blob = new Blob([data], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function importedTemplateFields(archive: ParsedPyStudioArchive): Omit<UserTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  const manifest = archive.manifest
  if (manifest.kind !== 'template' && manifest.kind !== 'project') {
    throw new Error('このZIPはテンプレートとしてインポートできません。')
  }
  return {
    name: manifest.name,
    description: manifest.description,
    tags: [],
    category: (manifest.category ?? 'Python基礎') as TemplateCategory,
    difficulty: manifest.difficulty,
    files: { ...archive.files },
    directories: [...manifest.directories],
    activeFile: manifest.activeFile,
  }
}

export function importedProjectFields(archive: ParsedPyStudioArchive): Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'openFiles'> {
  if (archive.manifest.kind !== 'project') throw new Error('このZIPはプロジェクトとしてインポートできません。')
  return {
    name: archive.manifest.name,
    description: archive.manifest.description,
    files: { ...archive.files },
    directories: [...archive.manifest.directories],
    activeFile: archive.manifest.activeFile,
  }
}

export function backupSnapshotFromArchive(archive: ParsedPyStudioArchive): BackupSnapshot {
  const metadata = archive.manifest.backup
  if (archive.manifest.kind !== 'backup' || !metadata || !Array.isArray(metadata.projects) ||
      !Array.isArray(metadata.templates) || !Array.isArray(metadata.favoriteIds) ||
      metadata.projects.length + metadata.templates.length > MAX_BACKUP_ITEMS ||
      metadata.favoriteIds.length > MAX_BACKUP_FAVORITES ||
      Object.keys(archive.files).length > MAX_ARCHIVE_FILES) {
    throw new Error('バックアップのメタデータが不正です。')
  }
  const projectIds = new Set<string>()
  const templateIds = new Set<string>()
  const referencedArchivePaths = new Set<string>()
  const readFiles = (kind: 'projects' | 'templates', id: string, paths: unknown): Record<string, string> => {
    if (!id || id.length > 256 || containsControlCharacters(id) ||
        id.includes('/') || id.includes('\\') || !isStringArray(paths)) {
      throw new Error('バックアップ内のデータIDまたはファイル一覧が不正です。')
    }
    const files: Record<string, string> = {}
    for (const path of paths) {
      assertTextFile(path)
      const stored = archive.files[`backup/${kind}/${encodeURIComponent(id)}/${path}`]
      if (stored === undefined || Object.hasOwn(files, path)) {
        throw new Error(`バックアップのファイルが見つからないか重複しています: ${path}`)
      }
      referencedArchivePaths.add(`backup/${kind}/${encodeURIComponent(id)}/${path}`)
      files[path] = stored
    }
    return files
  }
  const projects: Project[] = metadata.projects.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || projectIds.has(entry.id) ||
        typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.activeFile !== 'string' ||
        typeof entry.description !== 'string' || entry.description.length > 10_000 ||
        !isStringArray(entry.directories) || entry.directories.length > MAX_ARCHIVE_FILES ||
        !isStringArray(entry.files) || entry.files.length > MAX_ARCHIVE_FILES ||
        (entry.createdAt !== undefined && (typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt))) ||
        typeof entry.updatedAt !== 'number' || !Number.isFinite(entry.updatedAt) ||
        (entry.lastRunAt !== undefined && (typeof entry.lastRunAt !== 'number' || !Number.isFinite(entry.lastRunAt))) ||
        (entry.openFiles !== undefined && !isStringArray(entry.openFiles))) {
      throw new Error('バックアップ内のプロジェクト情報が不正です。')
    }
    projectIds.add(entry.id)
    const files = readFiles('projects', entry.id, entry.files)
    const directories = entry.directories
    assertProjectFiles(files, directories, entry.activeFile)
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      files,
      directories: [...directories],
      openFiles: [...new Set([
        ...(Array.isArray(entry.openFiles) ? entry.openFiles.filter((path): path is string => typeof path === 'string' && files[path] !== undefined) : []),
        entry.activeFile,
      ])],
      activeFile: entry.activeFile,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lastRunAt: entry.lastRunAt,
    }
  })
  const templates: UserTemplate[] = metadata.templates.map((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || templateIds.has(entry.id) ||
        typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.activeFile !== 'string' ||
        !isStringArray(entry.directories) || !isStringArray(entry.files) ||
        typeof entry.description !== 'string' || entry.description.length > 10_000 ||
        !isTemplateCategory(entry.category) ||
        entry.directories.length > MAX_ARCHIVE_FILES || entry.files.length > MAX_ARCHIVE_FILES ||
        (entry.tags !== undefined && !isStringArray(entry.tags)) ||
        (entry.difficulty !== undefined && !isTemplateDifficulty(entry.difficulty)) ||
        typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt) ||
        typeof entry.updatedAt !== 'number' || !Number.isFinite(entry.updatedAt)) {
      throw new Error('バックアップ内のテンプレート情報が不正です。')
    }
    templateIds.add(entry.id)
    const files = readFiles('templates', entry.id, entry.files)
    const directories = entry.directories
    assertProjectFiles(files, directories, entry.activeFile)
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      tags: entry.tags ?? [],
      category: entry.category,
      difficulty: entry.difficulty,
      files,
      directories: [...directories],
      activeFile: entry.activeFile,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }
  })
  if (metadata.favoriteIds.length > MAX_BACKUP_FAVORITES ||
      metadata.favoriteIds.some((id) => typeof id !== 'string' || !id || id.length > 256 || containsControlCharacters(id)) ||
      new Set(metadata.favoriteIds).size !== metadata.favoriteIds.length) {
    throw new Error('バックアップのお気に入り情報が不正です。')
  }
  const favoriteFile = archive.files['backup/favorites.json']
  if (favoriteFile !== undefined) {
    referencedArchivePaths.add('backup/favorites.json')
    try {
      const favoriteFileIds: unknown = JSON.parse(favoriteFile)
      if (!Array.isArray(favoriteFileIds) || favoriteFileIds.some((id) => typeof id !== 'string')) {
        throw new Error('お気に入り一覧の形式が不正です。')
      }
      if (JSON.stringify(favoriteFileIds) !== JSON.stringify(metadata.favoriteIds)) {
        throw new Error('バックアップ内のお気に入り情報が一致しません。')
      }
    } catch (error) {
      throw new Error('バックアップのお気に入り情報を読み込めません。', { cause: error })
    }
  } else {
    throw new Error('バックアップにお気に入り情報がありません。')
  }
  if (referencedArchivePaths.size !== Object.keys(archive.files).length) {
    throw new Error('バックアップに不明なファイル、または未参照のデータがあります。')
  }
  return {
    projects,
    templates,
    favoriteIds: [...metadata.favoriteIds],
  }
}
