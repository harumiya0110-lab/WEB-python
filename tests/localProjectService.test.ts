import 'fake-indexeddb/auto'
import { deleteDB, openDB } from 'idb'
import { beforeAll, describe, expect, it, vi } from 'vitest'
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

    const updated = {
      ...template,
      name: 'Updated template',
      files: { ...template.files, 'start.py': 'print("started")' },
      activeFile: 'start.py',
      updatedAt: 40,
    }
    await service.updateCustomTemplate(updated)
    expect((await service.loadCustomTemplate(template.id))?.name).toBe('Updated template')
    expect(await service.loadCustomTemplate(template.id)).toMatchObject({
      files: updated.files,
      activeFile: 'start.py',
      updatedAt: 40,
    })
    expect(await service.listProjects()).toEqual([existingProject])

    await service.deleteCustomTemplate(template.id)
    expect(await service.loadCustomTemplate(template.id)).toBeUndefined()
    expect(await service.listCustomTemplates()).toEqual([])
    expect(await service.listProjects()).toEqual([existingProject])

    const restored = await service.restoreBackupSnapshot({
      projects: [existingProject],
      templates: [template],
      favoriteIds: ['hello-world', template.id],
    })
    expect(restored).toEqual({ projects: 1, templates: 1 })
    const projectsAfterRestore = await service.listProjects()
    expect(projectsAfterRestore).toHaveLength(2)
    expect(projectsAfterRestore.find((project) => project.id === existingProject.id)).toEqual(existingProject)
    const restoredTemplate = (await service.listCustomTemplates())[0]
    expect(restoredTemplate).toMatchObject({ name: template.name, files: template.files })
    expect(restoredTemplate.id).not.toBe(template.id)
    expect(await service.loadTemplateFavorites()).toEqual(['hello-world', restoredTemplate.id])

    const uuid = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('partial-restore')
      .mockReturnValueOnce(existingProject.id)
    await expect(service.restoreBackupSnapshot({
      projects: [existingProject, { ...existingProject, id: 'second-project' }],
      templates: [],
      favoriteIds: [],
    })).rejects.toThrow('バックアップを復元できませんでした')
    uuid.mockRestore()
    expect(await service.loadProject('partial-restore')).toBeUndefined()
    expect(await service.listProjects()).toHaveLength(2)

    const database = await openDB('pystudio')
    expect(database.objectStoreNames.contains('projects')).toBe(true)
    expect(database.objectStoreNames.contains('templateFavorites')).toBe(true)
    expect(database.objectStoreNames.contains('customTemplates')).toBe(true)
    database.close()
  })

  it('persists an imported CSV as a normal project file', async () => {
    const service = await import('../src/services/localProjectService')
    const importedProject: Project = {
      ...existingProject,
      files: {
        ...existingProject.files,
        'data/scores.csv': '名前,点数\n田中,85\n',
      },
      directories: ['data'],
      updatedAt: 50,
    }

    await service.saveProject(importedProject)
    expect(await service.loadProject(existingProject.id)).toEqual(importedProject)
  })
})
