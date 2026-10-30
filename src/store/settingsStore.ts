import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type SettingsValues = {
  theme: Theme
  sidebarWidth: number
  previewWidth: number
  terminalHeight: number
  fontSize: number
  showMinimap: boolean
  wordWrap: 'on' | 'off'
  showSidebar: boolean
  showPreview: boolean
  showTerminal: boolean
}

export const DEFAULT_SETTINGS: SettingsValues = {
  theme: 'light',
  sidebarWidth: 228,
  previewWidth: 290,
  terminalHeight: 208,
  fontSize: 14,
  showMinimap: false,
  wordWrap: 'off',
  showSidebar: true,
  showPreview: false,
  showTerminal: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.round(Math.max(min, Math.min(max, value)))
}

export function sanitizeSettings(value: unknown): SettingsValues {
  const stored = isRecord(value) ? value : {}
  return {
    theme: stored.theme === 'dark' || stored.theme === 'light' ? stored.theme : DEFAULT_SETTINGS.theme,
    sidebarWidth: boundedNumber(stored.sidebarWidth, DEFAULT_SETTINGS.sidebarWidth, 170, 420),
    previewWidth: boundedNumber(stored.previewWidth, DEFAULT_SETTINGS.previewWidth, 220, 480),
    terminalHeight: boundedNumber(stored.terminalHeight, DEFAULT_SETTINGS.terminalHeight, 120, 480),
    fontSize: boundedNumber(stored.fontSize, DEFAULT_SETTINGS.fontSize, 11, 24),
    showMinimap: typeof stored.showMinimap === 'boolean' ? stored.showMinimap : DEFAULT_SETTINGS.showMinimap,
    wordWrap: stored.wordWrap === 'on' || stored.wordWrap === 'off' ? stored.wordWrap : DEFAULT_SETTINGS.wordWrap,
    showSidebar: typeof stored.showSidebar === 'boolean' ? stored.showSidebar : DEFAULT_SETTINGS.showSidebar,
    showPreview: typeof stored.showPreview === 'boolean' ? stored.showPreview : DEFAULT_SETTINGS.showPreview,
    showTerminal: typeof stored.showTerminal === 'boolean' ? stored.showTerminal : DEFAULT_SETTINGS.showTerminal,
  }
}

type SettingsState = SettingsValues & {
  setLayout: (layout: Partial<Pick<SettingsValues, 'sidebarWidth' | 'previewWidth' | 'terminalHeight'>>) => void
  setEditorSettings: (
    settings: Partial<Pick<SettingsValues, 'fontSize' | 'showMinimap' | 'wordWrap'>>,
  ) => void
  setPanelVisibility: (
    visibility: Partial<Pick<SettingsValues, 'showSidebar' | 'showPreview' | 'showTerminal'>>,
  ) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  resetSettings: (scope?: 'editor' | 'all') => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLayout: (layout) =>
        set((state) => ({
          sidebarWidth: boundedNumber(layout.sidebarWidth, state.sidebarWidth, 170, 420),
          previewWidth: boundedNumber(layout.previewWidth, state.previewWidth, 220, 480),
          terminalHeight: boundedNumber(layout.terminalHeight, state.terminalHeight, 120, 480),
        })),
      setEditorSettings: (settings) =>
        set((state) => ({
          fontSize: boundedNumber(settings.fontSize, state.fontSize, 11, 24),
          showMinimap: typeof settings.showMinimap === 'boolean' ? settings.showMinimap : state.showMinimap,
          wordWrap: settings.wordWrap === 'on' || settings.wordWrap === 'off' ? settings.wordWrap : state.wordWrap,
        })),
      setPanelVisibility: (visibility) =>
        set((state) => ({
          showSidebar: typeof visibility.showSidebar === 'boolean' ? visibility.showSidebar : state.showSidebar,
          showPreview: typeof visibility.showPreview === 'boolean' ? visibility.showPreview : state.showPreview,
          showTerminal: typeof visibility.showTerminal === 'boolean' ? visibility.showTerminal : state.showTerminal,
        })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      resetSettings: (scope = 'all') =>
        set((state) => ({
          ...(scope === 'all' ? { theme: DEFAULT_SETTINGS.theme } : {}),
          sidebarWidth: DEFAULT_SETTINGS.sidebarWidth,
          previewWidth: DEFAULT_SETTINGS.previewWidth,
          terminalHeight: DEFAULT_SETTINGS.terminalHeight,
          fontSize: DEFAULT_SETTINGS.fontSize,
          showMinimap: DEFAULT_SETTINGS.showMinimap,
          wordWrap: DEFAULT_SETTINGS.wordWrap,
          showSidebar: DEFAULT_SETTINGS.showSidebar,
          showPreview: DEFAULT_SETTINGS.showPreview,
          showTerminal: DEFAULT_SETTINGS.showTerminal,
          ...(scope === 'editor' ? { theme: state.theme } : {}),
        })),
    }),
    {
      name: 'pystudio-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
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
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizeSettings(persistedState),
      }),
    },
  ),
)
