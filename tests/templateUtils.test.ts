import { describe, expect, it } from 'vitest'
import { projectTemplates } from '../src/templates/templateCatalog'
import { createProjectFromTemplate, createUserTemplateFromProject } from '../src/templates/templateUtils'
import type { Project } from '../src/types/project'

describe('template project copying', () => {
  it('creates a new project with independent files, folders and the correct start file', () => {
    const template = projectTemplates.find(({ id }) => id === 'multi-file-project')
    if (!template) throw new Error('Multi-file fixture is missing')
    const originalFiles = { ...template.files }

    const project = createProjectFromTemplate(template)

    expect(project.id).not.toBe(template.id)
    expect(project.activeFile).toBe('main.py')
    expect(project.openFiles).toEqual(['main.py'])
    expect(project.files).toEqual(originalFiles)
    expect(project.directories).toEqual(template.directories)
    project.files['main.py'] = 'changed'
    expect(template.files['main.py']).toBe(originalFiles['main.py'])
  })

  it('snapshots project files and directories without sharing mutable containers', () => {
    const source: Project = {
      id: 'source',
      name: 'Source project',
      description: 'Snapshot me',
      files: { 'main.py': 'print("before")', 'data/sample.csv': 'a,b\n1,2\n' },
      directories: ['data'],
      openFiles: ['main.py'],
      activeFile: 'main.py',
      createdAt: 1,
      updatedAt: 1,
    }

    const template = createUserTemplateFromProject(source, {
      name: source.name,
      description: source.description ?? '',
      tags: ['learning', ' learning ', ''],
      category: 'Python基礎',
    })

    source.files['main.py'] = 'changed'
    source.directories.push('changed')
    expect(template.files['main.py']).toBe('print("before")')
    expect(template.directories).toEqual(['data'])
    expect(template.tags).toEqual(['learning'])
    expect(template.difficulty).toBeUndefined()
    expect(template.activeFile).toBe('main.py')
    expect(template.id).not.toBe(source.id)
  })
})
