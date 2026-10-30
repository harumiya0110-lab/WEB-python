import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  backupSnapshotFromArchive,
  exportBackupArchive,
  exportProjectArchive,
  exportTemplateArchive,
  parsePyStudioArchive,
} from '../src/services/archiveService'
import type { Project } from '../src/types/project'
import type { UserTemplate } from '../src/types/template'
import { projectTemplates } from '../src/templates/templateCatalog'

function toBlob(bytes: Uint8Array): Blob {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return new Blob([copy], { type: 'application/zip' })
}

const project: Project = {
  id: 'project-fixture',
  name: '日本語プロジェクト',
  description: 'テキストを保持します。',
  files: {
    'main.py': 'print("こんにちは")\n',
    'data/例.csv': '名前,値\nりんご,3\n',
    'README.md': '# 説明\n',
  },
  directories: ['data'],
  openFiles: ['main.py'],
  activeFile: 'main.py',
  createdAt: 100,
  updatedAt: 200,
}

const template: UserTemplate = {
  id: 'custom-fixture',
  name: 'テストテンプレート',
  description: '複数ファイルのテストです。',
  tags: ['test'],
  category: '複数ファイル',
  difficulty: '初級',
  files: { 'main.py': 'from utils import greet\nprint(greet())\n', 'utils.py': 'def greet():\n    return "hello"\n' },
  directories: [],
  activeFile: 'main.py',
  createdAt: 100,
  updatedAt: 200,
}

describe('PyStudio ZIP archives', () => {
  it('exports and imports a project with Japanese names, content, and folders', async () => {
    const parsed = await parsePyStudioArchive(toBlob(exportProjectArchive(project)))
    expect(parsed.manifest.kind).toBe('project')
    expect(parsed.manifest.name).toBe(project.name)
    expect(parsed.files).toEqual(project.files)
    expect(parsed.manifest.directories).toEqual(['data'])
  })

  it('accepts an empty existing Python start file', async () => {
    const emptyProject = { ...project, files: { 'main.py': '' } }
    const parsed = await parsePyStudioArchive(toBlob(exportProjectArchive(emptyProject)))
    expect(parsed.files['main.py']).toBe('')
  })

  it('exports and imports a multi-file custom template', async () => {
    const parsed = await parsePyStudioArchive(toBlob(exportTemplateArchive(template)))
    expect(parsed.manifest.kind).toBe('template')
    expect(parsed.manifest.category).toBe('複数ファイル')
    expect(parsed.files).toEqual(template.files)
  })

  it('can export all 36 built-in templates without modifying their source data', async () => {
    const originals = JSON.stringify(projectTemplates)
    for (const item of projectTemplates) {
      const parsed = await parsePyStudioArchive(toBlob(exportTemplateArchive({
        ...item,
        createdAt: 0,
        updatedAt: 0,
      })))
      expect(parsed.manifest.kind).toBe('template')
      expect(parsed.manifest.name).toBe(item.name)
      expect(parsed.files).toEqual(item.files)
    }
    expect(JSON.stringify(projectTemplates)).toBe(originals)
  })

  it('round-trips a full backup without merging metadata into file contents', async () => {
    const parsed = await parsePyStudioArchive(toBlob(exportBackupArchive({
      projects: [project],
      templates: [template],
      favoriteIds: ['hello-world', template.id],
    }, 500)))
    const snapshot = backupSnapshotFromArchive(parsed)
    expect(snapshot.projects[0]).toMatchObject({ name: project.name, files: project.files, activeFile: 'main.py' })
    expect(snapshot.templates[0]).toMatchObject({ name: template.name, files: template.files })
    expect(snapshot.favoriteIds).toEqual(['hello-world', template.id])
  })

  it('rejects unsafe archive paths and unsupported file types', async () => {
    const unsafe = zipSync({
      'pystudio.json': strToU8(JSON.stringify({
        format: 'pystudio',
        formatVersion: 1,
        kind: 'project',
        name: 'unsafe',
        description: '',
        activeFile: 'main.py',
        directories: [],
        files: [{ path: '../escape.py', size: 1 }],
        createdAt: 1,
        updatedAt: 1,
      })),
      'README.md': strToU8('unsafe'),
      'files/main.py': strToU8('x'),
    })
    await expect(parsePyStudioArchive(toBlob(unsafe))).rejects.toThrow()

    const mainBytes = strToU8('print(1)')
    const imageBytes = strToU8('binary')
    const unsupported = zipSync({
      'pystudio.json': strToU8(JSON.stringify({
        format: 'pystudio',
        formatVersion: 1,
        kind: 'project',
        name: 'unsupported file',
        description: '',
        activeFile: 'main.py',
        directories: [],
        files: [
          { path: 'main.py', size: mainBytes.length },
          { path: 'image.png', size: imageBytes.length },
        ],
        createdAt: 1,
        updatedAt: 1,
      })),
      'files/main.py': strToU8('print(1)'),
      'files/image.png': imageBytes,
    })
    await expect(parsePyStudioArchive(toBlob(unsupported))).rejects.toThrow('対応していないファイル形式')
  })

  it('rejects ZIP entries marked as symbolic links', async () => {
    const manifest = strToU8(JSON.stringify({
      format: 'pystudio',
      formatVersion: 1,
      kind: 'project',
      name: 'link',
      description: '',
      activeFile: 'main.py',
      directories: [],
      files: [{ path: 'main.py', size: 1 }],
      createdAt: 1,
      updatedAt: 1,
    }))
    const archive = zipSync({
      'pystudio.json': manifest,
      'files/main.py': [strToU8('x'), { os: 3, attrs: 0xa1ff0000 }],
    })
    await expect(parsePyStudioArchive(toBlob(archive))).rejects.toThrow('シンボリックリンク')
  })

  it('rejects an oversized expanded file before allocating its content', async () => {
    const oversizedContent = 'a'.repeat(2 * 1024 * 1024 + 1)
    const oversized = zipSync({
      'pystudio.json': strToU8(JSON.stringify({
        format: 'pystudio',
        formatVersion: 1,
        kind: 'project',
        name: 'large',
        description: '',
        activeFile: 'main.py',
        directories: [],
        files: [{ path: 'main.py', size: new TextEncoder().encode(oversizedContent).length }],
        createdAt: 1,
        updatedAt: 1,
      })),
      'files/main.py': strToU8(oversizedContent),
    })
    await expect(parsePyStudioArchive(toBlob(oversized))).rejects.toThrow('2MBを超える')
  })
})
