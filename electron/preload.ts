import { ipcRenderer, contextBridge } from 'electron'
import { ProjectCreationInfo, Settings, Project } from '../src/types'

// Custom APIs for renderer
const api = {
  createProject: (info: ProjectCreationInfo) => ipcRenderer.invoke('create-project', info),
  loadProject: (path: string) => ipcRenderer.invoke('load-project', path),
  saveAudio: (buffer: ArrayBuffer, filename: string, projectPath: string) => ipcRenderer.invoke('save-audio', buffer, filename, projectPath),
  saveProcessedAudio: (buffer: ArrayBuffer, filename: string, projectPath: string) => ipcRenderer.invoke('save-processed-audio', buffer, filename, projectPath),
  exportDataset: (projectPath: string, items: any[]) => ipcRenderer.invoke('export-dataset', projectPath, items),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('save-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  generateText: (prompt: string, count: number, systemPromptOverride?: string) => ipcRenderer.invoke('generate-text', prompt, count, systemPromptOverride),
  saveProject: (project: Project) => ipcRenderer.invoke('save-project', project),
  readAudio: (path: string) => ipcRenderer.invoke('read-audio', path),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { // Keep existing electron invoke just in case
      ipcRenderer: {
        on: (...args: Parameters<typeof ipcRenderer.on>) => ipcRenderer.on(args[0], args[1]),
        off: (...args: Parameters<typeof ipcRenderer.off>) => ipcRenderer.off(args[0], args[1]),
        send: (...args: Parameters<typeof ipcRenderer.send>) => ipcRenderer.send(args[0], ...args.slice(1)),
        invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => ipcRenderer.invoke(args[0], ...args.slice(1)),
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

