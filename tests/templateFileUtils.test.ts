import { describe, expect, it } from 'vitest'
import {
  addTemplateFile,
  createTemplateFolder,
  deleteTemplateFile,
  deleteTemplateFolder,
  duplicateTemplateFile,
  getMonacoLanguageForPath,
  renameTemplateFile,
  renameTemplateFolder,
  validateTemplateFileTree,
} from '../src/templates/templateFileUtils'

const tree = {
  files: {
    'main.py': 'print("ok")',
    'data/raw/input.csv': 'value\n1\n',
    'data/raw/transform.py': 'print("transform")',
    'README.md': '# notes',
  },
  directories: ['data', 'data/raw'],
  activeFile: 'data/raw/transform.py',
  selectedFile: 'data/raw/input.csv',
}

describe('template file tree operations', () => {
  it('renames a folder and updates nested files, directories, selection, and start file', () => {
    const updated = renameTemplateFolder(tree, 'data', 'datasets')

    expect(updated.files).toMatchObject({
      'datasets/raw/input.csv': 'value\n1\n',
      'datasets/raw/transform.py': 'print("transform")',
    })
    expect(updated.directories).toEqual(['datasets', 'datasets/raw'])
    expect(updated.selectedFile).toBe('datasets/raw/input.csv')
    expect(updated.activeFile).toBe('datasets/raw/transform.py')
    expect(tree.files['data/raw/input.csv']).toBe('value\n1\n')
  })

  it('rejects folder renames that collide after case-folding or Unicode normalization', () => {
    const conflicting = { ...tree, directories: [...tree.directories, 'datasets'] }
    expect(() => renameTemplateFolder(conflicting, 'data', 'datasets')).toThrow()

    const unicodeTree = {
      files: { 'main.py': '', 'café/one.py': '', 'cafe\u0301/two.py': '' },
      directories: ['café', 'cafe\u0301'],
      activeFile: 'main.py',
    }
    expect(validateTemplateFileTree(unicodeTree.files, unicodeTree.directories, unicodeTree.activeFile)).toContain('重複')
  })

  it('adds a file and nested folders without overwriting existing content', () => {
    const withFile = addTemplateFile(tree, 'data/new.py')
    expect(withFile.files['data/new.py']).toBe('')
    expect(withFile.selectedFile).toBe('data/new.py')
    expect(withFile.directories).toContain('data')
    expect(() => addTemplateFile(tree, 'MAIN.py')).toThrow('すでにあります')

    const withFolder = createTemplateFolder(tree, 'data/archive/2025')
    expect(withFolder.directories).toEqual(['data', 'data/raw', 'data/archive', 'data/archive/2025'])
    expect(() => createTemplateFolder(tree, 'data/raw/input.csv')).toThrow()
  })

  it('renames files and preserves the active and selected paths', () => {
    const updated = renameTemplateFile(tree, 'data/raw/transform.py', 'data/raw/clean.py')
    expect(updated.files['data/raw/clean.py']).toBe('print("transform")')
    expect(updated.files['data/raw/transform.py']).toBeUndefined()
    expect(updated.activeFile).toBe('data/raw/clean.py')
    expect(updated.selectedFile).toBe('data/raw/input.csv')
    expect(() => renameTemplateFile(tree, 'main.py', 'data/raw/input.csv')).toThrow()
  })

  it('duplicates and deletes files while keeping valid selection and start file paths', () => {
    const copied = duplicateTemplateFile(tree, 'data/raw/input.csv')
    expect(copied.files['data/raw/input_copy.csv']).toBe(tree.files['data/raw/input.csv'])
    expect(copied.selectedFile).toBe('data/raw/input_copy.csv')
    expect(() => duplicateTemplateFile({ ...tree, files: { ...tree.files, 'data/raw/input_copy.csv': '' } }, 'data/raw/input.csv')).toThrow()

    const deleted = deleteTemplateFile(tree, 'data/raw/transform.py')
    expect(deleted.files['data/raw/transform.py']).toBeUndefined()
    expect(deleted.activeFile).toBe('main.py')
    expect(deleted.selectedFile).toBe('data/raw/input.csv')
  })

  it('deletes a folder and all nested files and directories', () => {
    const updated = deleteTemplateFolder(tree, 'data')
    expect(updated.files).toEqual({ 'main.py': 'print("ok")', 'README.md': '# notes' })
    expect(updated.directories).toEqual([])
    expect(updated.activeFile).toBe('main.py')
    expect(updated.selectedFile).toBe('main.py')
  })

  it('maps supported extensions to Monaco language identifiers', () => {
    expect(getMonacoLanguageForPath('main.py')).toBe('python')
    expect(getMonacoLanguageForPath('config.json')).toBe('json')
    expect(getMonacoLanguageForPath('app.ts')).toBe('typescript')
    expect(getMonacoLanguageForPath('page.html')).toBe('html')
    expect(getMonacoLanguageForPath('notes.md')).toBe('markdown')
    expect(getMonacoLanguageForPath('values.csv')).toBe('plaintext')
    expect(getMonacoLanguageForPath('unknown.bin')).toBe('plaintext')
  })
})
