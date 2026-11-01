import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProject, useProjectStore } from '../src/store/projectStore'

describe('project file batch import', () => {
  beforeEach(() => {
    useProjectStore.getState().initialize(createDefaultProject())
  })

  it('adds multiple CSV files and their folders without replacing existing files', () => {
    const originalMain = useProjectStore.getState().project.files['main.py']
    useProjectStore.getState().addFiles({
      'data/scores.csv': 'name,score\nAoi,90\n',
      'data/class/attendance.csv': 'name,present\nRen,true\n',
    })
    const project = useProjectStore.getState().project
    expect(project.files['main.py']).toBe(originalMain)
    expect(project.files['data/scores.csv']).toContain('Aoi')
    expect(project.files['data/class/attendance.csv']).toContain('Ren')
    expect(project.directories).toContain('data')
    expect(project.directories).toContain('data/class')
    expect(project.activeFile).toBe('data/scores.csv')
  })
})
