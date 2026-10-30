export interface Project {
  id: string
  name: string
  files: Record<string, string>
  directories: string[]
  openFiles: string[]
  activeFile: string
  updatedAt: number
}

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error'

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => character.charCodeAt(0) < 32)
}

export function isValidProjectPath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= 240 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !containsControlCharacter(path) &&
    path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  )
}
