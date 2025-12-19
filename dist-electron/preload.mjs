"use strict";
const electron = require("electron");
const api = {
  createProject: (info) => electron.ipcRenderer.invoke("create-project", info),
  loadProject: (path) => electron.ipcRenderer.invoke("load-project", path),
  saveAudio: (buffer, filename, projectPath) => electron.ipcRenderer.invoke("save-audio", buffer, filename, projectPath),
  saveProcessedAudio: (buffer, filename, projectPath) => electron.ipcRenderer.invoke("save-processed-audio", buffer, filename, projectPath),
  exportDataset: (projectPath, items) => electron.ipcRenderer.invoke("export-dataset", projectPath, items),
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  generateText: (prompt, count, systemPromptOverride, modelId) => electron.ipcRenderer.invoke("generate-text", prompt, count, systemPromptOverride, modelId),
  getModels: (provider) => electron.ipcRenderer.invoke("get-models", provider),
  saveProject: (project) => electron.ipcRenderer.invoke("save-project", project),
  readAudio: (path) => electron.ipcRenderer.invoke("read-audio", path),
  deleteFile: (path) => electron.ipcRenderer.invoke("delete-file", path),
  importScriptFile: () => electron.ipcRenderer.invoke("import-script-file")
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", {
      // Keep existing electron invoke just in case
      ipcRenderer: {
        on: (...args) => electron.ipcRenderer.on(args[0], args[1]),
        off: (...args) => electron.ipcRenderer.off(args[0], args[1]),
        send: (...args) => electron.ipcRenderer.send(args[0], ...args.slice(1)),
        invoke: (...args) => electron.ipcRenderer.invoke(args[0], ...args.slice(1))
      }
    });
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
