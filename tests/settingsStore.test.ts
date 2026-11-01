import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const storageValues = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => storageValues.get(key) ?? null,
  setItem: (key: string, value: string) => storageValues.set(key, value),
  removeItem: (key: string) => storageValues.delete(key),
  clear: () => storageValues.clear(),
}

vi.stubGlobal('localStorage', localStorageMock)
const { DEFAULT_SETTINGS, sanitizeSettings, useSettingsStore } = await import('../src/store/settingsStore')

describe('settings store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useSettingsStore.getState().resetSettings()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('starts with the expected defaults', () => {
    const state = useSettingsStore.getState()
    expect({
      theme: state.theme,
      sidebarWidth: state.sidebarWidth,
      previewWidth: state.previewWidth,
      terminalHeight: state.terminalHeight,
      fontSize: state.fontSize,
      showMinimap: state.showMinimap,
      wordWrap: state.wordWrap,
      showSidebar: state.showSidebar,
      showPreview: state.showPreview,
      showTerminal: state.showTerminal,
    }).toEqual(DEFAULT_SETTINGS)
  })

  it('updates and persists theme, editor, panels, and layout settings', () => {
    const state = useSettingsStore.getState()
    state.setTheme('dark')
    state.setEditorSettings({ fontSize: 20, showMinimap: true, wordWrap: 'on' })
    state.setPanelVisibility({ showSidebar: false, showPreview: true, showTerminal: false })
    state.setLayout({ sidebarWidth: 350, previewWidth: 400, terminalHeight: 300 })

    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      fontSize: 20,
      showMinimap: true,
      wordWrap: 'on',
      showSidebar: false,
      showPreview: true,
      showTerminal: false,
      sidebarWidth: 350,
      previewWidth: 400,
      terminalHeight: 300,
    })
    expect(localStorageMock.getItem('pystudio-settings')).toContain('"theme":"dark"')
  })

  it('clamps out-of-range values and sanitizes invalid persisted settings', () => {
    useSettingsStore.getState().setEditorSettings({ fontSize: 80 })
    useSettingsStore.getState().setLayout({ sidebarWidth: 20, previewWidth: 900, terminalHeight: Number.NaN })
    expect(useSettingsStore.getState()).toMatchObject({
      fontSize: 24,
      sidebarWidth: 170,
      previewWidth: 480,
      terminalHeight: DEFAULT_SETTINGS.terminalHeight,
    })

    expect(sanitizeSettings({
      theme: 'neon',
      fontSize: -100,
      sidebarWidth: 900,
      previewWidth: 'wide',
      terminalHeight: 100,
      showMinimap: 'yes',
      wordWrap: 'sometimes',
      showSidebar: false,
    })).toEqual({
      ...DEFAULT_SETTINGS,
      fontSize: 11,
      sidebarWidth: 420,
      terminalHeight: 120,
      showSidebar: false,
    })
  })

  it('resets editor settings or all settings without touching other stored user data', () => {
    const preservedData = [
      ['pystudio-projects', 'keep-existing-projects'],
      ['pystudio-templates', 'keep-existing-templates'],
      ['pystudio-learning-progress', 'keep-existing-learning-progress'],
      ['pystudio-learning-code', 'keep-existing-learning-code'],
    ] as const
    for (const [key, value] of preservedData) localStorageMock.setItem(key, value)
    const state = useSettingsStore.getState()
    state.setTheme('dark')
    state.setEditorSettings({ fontSize: 21, showMinimap: true, wordWrap: 'on' })
    state.setPanelVisibility({ showSidebar: false })
    state.setLayout({ sidebarWidth: 300 })
    useSettingsStore.getState().resetSettings('editor')

    expect(useSettingsStore.getState()).toMatchObject({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    })
    for (const [key, value] of preservedData) expect(localStorageMock.getItem(key)).toBe(value)

    useSettingsStore.getState().setTheme('dark')
    useSettingsStore.getState().resetSettings('all')
    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS)
    for (const [key, value] of preservedData) expect(localStorageMock.getItem(key)).toBe(value)
  })

  it('restores partial or invalid saved data safely during rehydration', async () => {
    localStorageMock.setItem('pystudio-settings', JSON.stringify({
      state: {
        theme: 'unknown',
        fontSize: 200,
        sidebarWidth: -5,
        showPreview: true,
      },
      version: 0,
    }))
    await useSettingsStore.persist.rehydrate()

    expect(useSettingsStore.getState()).toMatchObject({
      theme: DEFAULT_SETTINGS.theme,
      fontSize: 24,
      sidebarWidth: 170,
      previewWidth: DEFAULT_SETTINGS.previewWidth,
      showPreview: true,
    })
  })
})
