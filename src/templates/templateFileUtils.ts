import { isValidProjectPath } from '../types/project'

export interface TemplateFileTree {
  files: Record<string, string>
  directories: string[]
  activeFile: string
  selectedFile?: string
}

function normalizedPath(path: string): string {
  return path.normalize('NFC').toLocaleLowerCase('en-US')
}

function assertPathAvailable(
  path: string,
  files: Record<string, string>,
  directories: string[],
  excludedPaths: string[] = [],
): void {
  const key = normalizedPath(path)
  const excluded = new Set(excludedPaths.map(normalizedPath))
  const existing = [...Object.keys(files), ...directories].find(
    (candidate) => normalizedPath(candidate) === key && !excluded.has(normalizedPath(candidate)),
  )
  if (existing) throw new Error(`同じ名前のファイルまたはフォルダーがすでにあります: ${existing}`)
}

function isSafePath(path: string): boolean {
  const segments = path.split('/')
  return (
    isValidProjectPath(path) &&
    ![...path].some((character) => {
      const code = character.codePointAt(0) ?? 0
      return code >= 127 && code <= 159
    }) &&
    !path.includes(':') &&
    !segments.some((segment) =>
      segment.endsWith('.') ||
      segment.endsWith(' ') ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    )
  )
}

export function validateTemplateFileTree(
  files: Record<string, string>,
  directories: string[],
  activeFile: string,
): string {
  const filePaths = Object.keys(files)
  if (!filePaths.some((path) => path.toLowerCase().endsWith('.py'))) {
    return 'Pythonファイルを最低1つ作成してください。'
  }
  if (!Object.hasOwn(files, activeFile) || !activeFile.toLowerCase().endsWith('.py')) {
    return '開始ファイルは存在するPythonファイルを選択してください。'
  }

  const nodes = new Map<string, { type: 'file' | 'directory'; path: string; explicit: boolean }>()
  for (const [path, content] of Object.entries(files)) {
    if (!isSafePath(path)) return `安全でないパスです: ${path}`
    if (typeof content !== 'string') return `ファイルの内容がテキストではありません: ${path}`
    const key = normalizedPath(path)
    if (nodes.has(key)) return `ファイル名が重複しています: ${path}`
    nodes.set(key, { type: 'file', path, explicit: true })
  }

  const explicitDirectories = new Set<string>()
  for (const path of directories) {
    if (!isSafePath(path)) return `安全でないパスです: ${path}`
    const key = normalizedPath(path)
    if (explicitDirectories.has(key)) return `フォルダー名が重複しています: ${path}`
    explicitDirectories.add(key)
    const existing = nodes.get(key)
    if (existing && (existing.type !== 'directory' || existing.path !== path)) {
      return `ファイルとフォルダーの名前が競合しています: ${path}`
    }
    if (!existing) nodes.set(key, { type: 'directory', path, explicit: true })
  }

  for (const path of [...filePaths, ...directories]) {
    const segments = path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      const parent = segments.slice(0, index).join('/')
      const key = normalizedPath(parent)
      const existing = nodes.get(key)
      if (existing?.type === 'file') return `親フォルダーの位置にファイルがあります: ${parent}`
      if (existing && existing.path !== parent) return `パスの大文字・小文字またはUnicode表記が競合しています: ${parent}`
      if (!existing) nodes.set(key, { type: 'directory', path: parent, explicit: false })
    }
  }
  return ''
}

export function renameTemplateFile(
  tree: TemplateFileTree,
  source: string,
  target: string,
): TemplateFileTree {
  if (!Object.hasOwn(tree.files, source)) throw new Error(`ファイルが見つかりません: ${source}`)
  if (!isSafePath(target)) throw new Error('安全でないファイルパスです。')
  assertPathAvailable(target, tree.files, tree.directories, [source])
  const files = { ...tree.files }
  const content = files[source]
  delete files[source]
  files[target] = content
  const activeFile = tree.activeFile === source ? target : tree.activeFile
  const selectedFile = tree.selectedFile === source ? target : tree.selectedFile
  const error = validateTemplateFileTree(files, tree.directories, activeFile)
  if (error) throw new Error(error)
  return { files, directories: [...tree.directories], activeFile, selectedFile }
}

export function renameTemplateFolder(
  tree: TemplateFileTree,
  source: string,
  target: string,
): TemplateFileTree {
  if (!tree.directories.includes(source)) throw new Error(`フォルダーが見つかりません: ${source}`)
  if (!isSafePath(target)) throw new Error('安全でないフォルダーパスです。')
  if (target === source) return { ...tree, files: { ...tree.files }, directories: [...tree.directories] }
  if (target.startsWith(`${source}/`)) throw new Error('フォルダーを自分自身の中へ移動できません。')

  const remap = (path: string) => path === source ? target : path.startsWith(`${source}/`) ? `${target}${path.slice(source.length)}` : path
  const files: Record<string, string> = {}
  const pathKeys = new Set<string>()
  for (const [path, content] of Object.entries(tree.files)) {
    const updatedPath = remap(path)
    const key = normalizedPath(updatedPath)
    if (pathKeys.has(key)) throw new Error(`フォルダー名変更後にファイル名が重複します: ${updatedPath}`)
    pathKeys.add(key)
    files[updatedPath] = content
  }
  const directories = tree.directories.map(remap)
  const directoryKeys = new Set<string>()
  for (const directory of directories) {
    const key = normalizedPath(directory)
    if (directoryKeys.has(key)) throw new Error(`フォルダー名変更後にフォルダーが重複します: ${directory}`)
    directoryKeys.add(key)
  }
  const activeFile = remap(tree.activeFile)
  const selectedFile = tree.selectedFile ? remap(tree.selectedFile) : undefined
  const error = validateTemplateFileTree(files, directories, activeFile)
  if (error) throw new Error(error)
  return { files, directories, activeFile, selectedFile }
}

export function addTemplateFile(tree: TemplateFileTree, path: string): TemplateFileTree {
  if (!isSafePath(path)) throw new Error('安全でないファイルパスです。')
  assertPathAvailable(path, tree.files, tree.directories)
  const files = { ...tree.files, [path]: '' }
  const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const directories = parent ? addTemplateDirectory(tree.directories, parent) : [...tree.directories]
  const error = validateTemplateFileTree(files, directories, tree.activeFile)
  if (error) throw new Error(error)
  return { files, directories, activeFile: tree.activeFile, selectedFile: path }
}

export function createTemplateFolder(tree: TemplateFileTree, path: string): TemplateFileTree {
  assertPathAvailable(path, tree.files, tree.directories)
  const directories = addTemplateDirectory(tree.directories, path)
  const error = validateTemplateFileTree(tree.files, directories, tree.activeFile)
  if (error) throw new Error(error)
  return { files: { ...tree.files }, directories, activeFile: tree.activeFile, selectedFile: tree.selectedFile }
}

export function duplicateTemplateFile(tree: TemplateFileTree, source: string): TemplateFileTree {
  if (!Object.hasOwn(tree.files, source)) throw new Error(`ファイルが見つかりません: ${source}`)
  const dot = source.lastIndexOf('.')
  const target = dot > source.lastIndexOf('/')
    ? `${source.slice(0, dot)}_copy${source.slice(dot)}`
    : `${source}_copy`
  assertPathAvailable(target, tree.files, tree.directories)
  const files = { ...tree.files, [target]: tree.files[source] }
  const error = validateTemplateFileTree(files, tree.directories, tree.activeFile)
  if (error) throw new Error(error)
  return { files, directories: [...tree.directories], activeFile: tree.activeFile, selectedFile: target }
}

export function deleteTemplateFile(tree: TemplateFileTree, source: string): TemplateFileTree {
  if (!Object.hasOwn(tree.files, source)) throw new Error(`ファイルが見つかりません: ${source}`)
  const files = { ...tree.files }
  delete files[source]
  const remainingPaths = Object.keys(files)
  const activeFile = tree.activeFile === source
    ? remainingPaths.find((path) => path.toLowerCase().endsWith('.py')) ?? ''
    : tree.activeFile
  const selectedFile = tree.selectedFile === source ? remainingPaths[0] ?? '' : tree.selectedFile
  return { files, directories: [...tree.directories], activeFile, selectedFile }
}

export function deleteTemplateFolder(tree: TemplateFileTree, source: string): TemplateFileTree {
  if (!tree.directories.includes(source)) throw new Error(`フォルダーが見つかりません: ${source}`)
  const files = Object.fromEntries(
    Object.entries(tree.files).filter(([path]) => path !== source && !path.startsWith(`${source}/`)),
  )
  const directories = tree.directories.filter((path) => path !== source && !path.startsWith(`${source}/`))
  const remainingPaths = Object.keys(files)
  const activeFile = Object.hasOwn(files, tree.activeFile)
    ? tree.activeFile
    : remainingPaths.find((path) => path.toLowerCase().endsWith('.py')) ?? ''
  const selectedFile = Object.hasOwn(files, tree.selectedFile ?? '')
    ? tree.selectedFile
    : remainingPaths[0] ?? ''
  return { files, directories, activeFile, selectedFile }
}

export function addTemplateDirectory(directories: string[], path: string): string[] {
  if (!isSafePath(path)) throw new Error('安全でないフォルダーパスです。')
  const expanded = [...directories]
  const segments = path.split('/')
  for (let index = 1; index <= segments.length; index += 1) {
    const parent = segments.slice(0, index).join('/')
    if (!expanded.includes(parent)) expanded.push(parent)
  }
  return expanded
}

export function getMonacoLanguageForPath(path: string): string {
  switch (path.slice(path.lastIndexOf('.') + 1).toLowerCase()) {
    case 'py': return 'python'
    case 'json': return 'json'
    case 'js': case 'jsx': case 'mjs': case 'cjs': return 'javascript'
    case 'ts': case 'tsx': return 'typescript'
    case 'html': case 'htm': return 'html'
    case 'css': case 'scss': case 'less': return 'css'
    case 'md': case 'markdown': return 'markdown'
    case 'yaml': case 'yml': return 'yaml'
    case 'xml': case 'svg': return 'xml'
    default: return 'plaintext'
  }
}
