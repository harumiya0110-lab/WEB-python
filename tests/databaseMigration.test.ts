import 'fake-indexeddb/auto'
import { deleteDB, openDB } from 'idb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('shared IndexedDB schema migrations', () => {
  beforeEach(async () => {
    vi.resetModules()
    await deleteDB('pystudio')
  })

  it('upgrades version 3 while preserving project, favorite, and template records', async () => {
    const oldDatabase = await openDB('pystudio', 3, {
      upgrade(database) {
        database.createObjectStore('projects', { keyPath: 'id' })
        database.createObjectStore('templateFavorites')
        database.createObjectStore('customTemplates', { keyPath: 'id' })
      },
    })
    await oldDatabase.put('projects', {
      id: 'existing',
      name: 'Existing',
      files: { 'main.py': 'print(1)' },
      directories: [],
      openFiles: ['main.py'],
      activeFile: 'main.py',
      createdAt: 1,
      updatedAt: 2,
    })
    await oldDatabase.put('templateFavorites', ['hello-world'], 'guest')
    await oldDatabase.put('customTemplates', { id: 'saved-template', name: 'Saved' })
    oldDatabase.close()

    const { getDatabase } = await import('../src/services/database')
    const database = await getDatabase()

    expect(await database.get('projects', 'existing')).toMatchObject({ name: 'Existing' })
    expect(await database.get('templateFavorites', 'guest')).toEqual(['hello-world'])
    expect(await database.get('customTemplates', 'saved-template')).toMatchObject({ name: 'Saved' })
    expect(database.objectStoreNames.contains('learningProgress')).toBe(true)
    expect(database.objectStoreNames.contains('learningDrafts')).toBe(true)
    expect(database.objectStoreNames.contains('learningAttempts')).toBe(true)
    database.close()
  })

  it('upgrades version 4 without losing saved learning progress', async () => {
    const oldDatabase = await openDB('pystudio', 4, {
      upgrade(database) {
        database.createObjectStore('projects', { keyPath: 'id' })
        database.createObjectStore('templateFavorites')
        database.createObjectStore('customTemplates', { keyPath: 'id' })
        database.createObjectStore('learningProgress', { keyPath: 'key' })
      },
    })
    const savedProgress = {
      key: 'guest',
      lastLessonId: 'python-print-basics',
      completedLessonIds: ['python-what-is-python'],
      startedLessonIds: ['python-what-is-python', 'python-print-basics'],
      attemptedLessonIds: ['python-what-is-python'],
      lastUpdatedAt: 123,
    }
    await oldDatabase.put('learningProgress', savedProgress)
    oldDatabase.close()

    const { getDatabase } = await import('../src/services/database')
    const database = await getDatabase()

    expect(await database.get('learningProgress', 'guest')).toEqual(savedProgress)
    expect(database.objectStoreNames.contains('learningReview')).toBe(true)
    database.close()
  })
})
