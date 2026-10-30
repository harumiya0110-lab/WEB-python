import { create } from 'zustand'
import type { Project, SaveStatus } from '../types/project'

interface ProjectState {
  project: Project
  saveStatus: SaveStatus
  initialized: boolean
  storageError: string | null
  initialize: (project: Project) => void
  updateFile: (path: string, contents: string) => void
  addFile: (path: string) => void
  duplicateFile: (path: string) => void
  addDirectory: (path: string) => void
  deleteDirectory: (path: string) => void
  renameFile: (path: string, newPath: string) => void
  deleteFile: (path: string) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  setSaveStatus: (status: SaveStatus) => void
  setStorageError: (message: string | null) => void
}

const createDefaultProject = (): Project => ({
  id: 'guest-workspace',
  name: 'マイプロジェクト',
  files: {
    'main.py': 'from utils import greet\n\ngreet("PyStudio")\n',
    'utils.py': 'def greet(name):\n    print(f"Hello, {name}!")\n',
  },
  directories: [],
  openFiles: ['main.py', 'utils.py'],
  activeFile: 'main.py',
  updatedAt: Date.now(),
})

const setProject = (project: Project): Pick<ProjectState, 'project' | 'saveStatus'> => ({
  project: { ...project, updatedAt: Date.now() },
  saveStatus: 'saving',
})

export const useProjectStore = create<ProjectState>((set) => ({
  project: createDefaultProject(),
  saveStatus: 'loading',
  initialized: false,
  storageError: null,
  initialize: (project) => set({ ...setProject(project), initialized: true }),
  updateFile: (path, contents) =>
    set((state) => ({
      ...setProject({
        ...state.project,
        files: { ...state.project.files, [path]: contents },
      }),
    })),
  addFile: (path) =>
    set((state) => ({
      ...setProject({
        ...state.project,
        files: { ...state.project.files, [path]: '' },
        openFiles: state.project.openFiles.includes(path)
          ? state.project.openFiles
          : [...state.project.openFiles, path],
        activeFile: path,
      }),
    })),
  duplicateFile: (path) =>
    set((state) => {
      const contents = state.project.files[path]
      if (contents === undefined) return state
      const dotIndex = path.lastIndexOf('.')
      const stem = dotIndex > path.lastIndexOf('/') ? path.slice(0, dotIndex) : path
      const extension = dotIndex > path.lastIndexOf('/') ? path.slice(dotIndex) : ''
      let copyPath = `${stem} (copy)${extension}`
      let suffix = 2
      while (state.project.files[copyPath] !== undefined) {
        copyPath = `${stem} (copy ${suffix})${extension}`
        suffix += 1
      }
      return {
        ...setProject({
          ...state.project,
          files: { ...state.project.files, [copyPath]: contents },
          openFiles: [...state.project.openFiles, copyPath],
          activeFile: copyPath,
        }),
      }
    }),
  addDirectory: (path) =>
    set((state) => {
      const directories = new Set(state.project.directories)
      const parts = path.split('/')
      for (let index = 1; index <= parts.length; index += 1) {
        directories.add(parts.slice(0, index).join('/'))
      }
      return {
        ...setProject({
          ...state.project,
          directories: [...directories].sort(),
        }),
      }
    }),
  deleteDirectory: (path) =>
    set((state) => {
      const removedFiles = Object.keys(state.project.files).filter((file) =>
        file.startsWith(`${path}/`),
      )
      const files = { ...state.project.files }
      removedFiles.forEach((file) => delete files[file])
      const openFiles = state.project.openFiles.filter(
        (file) => !file.startsWith(`${path}/`),
      )
      return {
        ...setProject({
          ...state.project,
          files,
          directories: state.project.directories.filter(
            (directory) =>
              directory !== path && !directory.startsWith(`${path}/`),
          ),
          openFiles,
          activeFile: removedFiles.includes(state.project.activeFile)
            ? (openFiles[0] ?? Object.keys(files)[0] ?? '')
            : state.project.activeFile,
        }),
      }
    }),
  renameFile: (path, newPath) =>
    set((state) => {
      const { [path]: contents, ...remainingFiles } = state.project.files
      if (contents === undefined) return state
      const files = { ...remainingFiles, [newPath]: contents }
      return {
        ...setProject({
          ...state.project,
          files,
          openFiles: state.project.openFiles.map((file) =>
            file === path ? newPath : file,
          ),
          activeFile:
            state.project.activeFile === path ? newPath : state.project.activeFile,
        }),
      }
    }),
  deleteFile: (path) =>
    set((state) => {
      const { [path]: _removed, ...files } = state.project.files
      const openFiles = state.project.openFiles.filter((file) => file !== path)
      const activeFile =
        state.project.activeFile === path
          ? (openFiles[0] ?? Object.keys(files)[0] ?? '')
          : state.project.activeFile
      return {
        ...setProject({ ...state.project, files, openFiles, activeFile }),
      }
    }),
  openFile: (path) =>
    set((state) => ({
      ...setProject({
        ...state.project,
        activeFile: path,
        openFiles: state.project.openFiles.includes(path)
          ? state.project.openFiles
          : [...state.project.openFiles, path],
      }),
    })),
  closeFile: (path) =>
    set((state) => {
      const openFiles = state.project.openFiles.filter((file) => file !== path)
      return {
        ...setProject({
          ...state.project,
          openFiles,
          activeFile:
            state.project.activeFile === path
              ? (openFiles[0] ?? '')
              : state.project.activeFile,
        }),
      }
    }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setStorageError: (storageError) => set({ storageError }),
}))

export { createDefaultProject }
