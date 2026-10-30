import { describe, expect, it } from 'vitest'
import { exportProjectArchive, parsePyStudioArchive } from '../src/services/archiveService'
import { createDefaultProject, useProjectStore } from '../src/store/projectStore'

function bytesAsBlob(bytes: Uint8Array): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return new Blob([buffer], { type: 'application/zip' })
}

describe('project file batch updates', () => {
  it('adds imported files and preserves them in project ZIP archives', async () => {
    const project = createDefaultProject()
    useProjectStore.getState().initialize(project)
    useProjectStore.getState().addFiles({
      'data/成績/scores.csv': '名前,点数\n田中,85\n',
    })

    const updated = useProjectStore.getState().project
    expect(updated.files['main.py']).toBe(project.files['main.py'])
    expect(updated.files['data/成績/scores.csv']).toContain('田中')
    expect(updated.directories).toEqual(['data', 'data/成績'])
    expect(updated.openFiles).toEqual(project.openFiles)
    expect(updated.activeFile).toBe(project.activeFile)

    const restored = await parsePyStudioArchive(bytesAsBlob(exportProjectArchive(updated)))
    expect(restored.files['data/成績/scores.csv']).toBe('名前,点数\n田中,85\n')
    expect(restored.manifest.directories).toEqual(['data', 'data/成績'])
  })
})
