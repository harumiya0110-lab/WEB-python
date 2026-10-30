import 'fake-indexeddb/auto'
import { deleteDB, openDB } from 'idb'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Project } from '../src/types/project'
import type { UserTemplate } from '../src/types/template'

const existingProject: Project = {
  id: 'existing-project',
  name: 'Keep me',
  files: { 'main.py': 'print("kept")' },
  directories: [],
  openFiles: ['main.py'],
  activeFile: 'main.py',
  createdAt: 10,
  updatedAt: 20,
}

const template: UserTemplate = {
  id: 'custom-test',
  name: 'Test template',
  description: 'IndexedDB fixture',
  tags: ['test'],
  category: 'Python基礎',
  files: { 'main.py': 'print("template")', 'data/sample.csv': 'x\n1\n' },
  directories: ['data'],
  activeFile: 'main.py',
  createdAt: 30,
  updatedAt: 30,
}

describe('IndexedDB v2 to v3 migration and custom templates', () => {
  beforeAll(async () => {
    await deleteDB('pystudio')
    const oldDatabase = await openDB('pystudio', 2, {
      upgrade(database) {
        database.createObjectStore('projects', { keyPath: 'id' })
        database.createObjectStore('templateFavorites')
      },
    })
    await oldDatabase.put('projects', existingProject)
    await oldDatabase.put('templateFavorites', ['hello-world'], 'guest')
    oldDatabase.close()
  })

  it('preserves existing stores and supports template save, load, update, and delete', async () => {
    const service = await import('../src/services/localProjectService')

    expect(await service.listProjects()).toEqual([existingProject])
    expect(await service.loadTemplateFavorites()).toEqual(['hello-world'])

    await service.saveCustomTemplate(template)
    expect(await service.loadCustomTemplate(template.id)).toEqual(template)
    expect(await service.listCustomTemplates()).toEqual([template])

    const updated = { ...template, name: 'Updated template', updatedAt: 40 }
    await service.updateCustomTemplate(updated)
    expect((await service.loadCustomTemplate(template.id))?.name).toBe('Updated template')
    expect(await service.listProjects()).toEqual([existingProject])

    await service.deleteCustomTemplate(template.id)
    expect(await service.loadCustomTemplate(template.id)).toBeUndefined()
    expect(await service.listCustomTemplates()).toEqual([])
    expect(await service.listProjects()).toEqual([existingProject])

    const database = await openDB('pystudio')
    expect(database.objectStoreNames.contains('projects')).toBe(true)
    expect(database.objectStoreNames.contains('templateFavorites')).toBe(true)
    expect(database.objectStoreNames.contains('customTemplates')).toBe(true)
    database.close()
  })
})
