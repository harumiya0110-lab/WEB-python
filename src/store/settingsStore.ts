import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface SettingsState {
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
  setLayout: (layout: Partial<Pick<SettingsState, 'sidebarWidth' | 'previewWidth' | 'terminalHeight'>>) => void
  setEditorSettings: (
    settings: Partial<Pick<SettingsState, 'fontSize' | 'showMinimap' | 'wordWrap'>>,
  ) => void
  setPanelVisibility: (
    visibility: Partial<
      Pick<SettingsState, 'showSidebar' | 'showPreview' | 'showTerminal'>
    >,
  ) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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
      setLayout: (layout) => set(layout),
      setEditorSettings: (settings) => set(settings),
      setPanelVisibility: (visibility) => set(visibility),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
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
    },
  ),
)
