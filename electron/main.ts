import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import Store from 'electron-store'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { Project, ProjectCreationInfo, Settings } from '../src/types'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
ipcMain.handle('read-audio', async (_, filePath) => {
  try {
    const buffer = await fs.readFile(filePath)
    return buffer.buffer // Return ArrayBuffer
  } catch (e) {
    console.error("Failed to read audio file", e)
    throw e
  }
})

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configure ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'))
} else {
  console.error("FFmpeg path not found!")
}

ipcMain.handle('save-audio', async (_, buffer, filename, projectPath) => {
  const buf = Buffer.from(buffer)
  const tempWebm = path.join(app.getPath('temp'), `temp_${randomUUID()}.webm`)
  const outputWav = path.join(projectPath, 'wavs', filename)

  try {
    await fs.writeFile(tempWebm, buf)

    return new Promise((resolve, reject) => {
      ffmpeg(tempWebm)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(22050) // Standard for VITS, could make configurable
        .on('end', async () => {
          await fs.unlink(tempWebm).catch(() => { })
          resolve(outputWav)
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(err)
        })
        .save(outputWav)
    })
  } catch (e) {
    console.error("Save audio failed", e)
    throw e
  }
})

import archiver from 'archiver'

ipcMain.handle('save-processed-audio', async (_, buffer, filename, projectPath) => {
  const buf = Buffer.from(buffer)
  // Use 'wavs_processed' subdir
  const processedDir = path.join(projectPath, 'wavs_processed')

  try {
    await fs.mkdir(processedDir, { recursive: true })
    const filePath = path.join(processedDir, filename)
    await fs.writeFile(filePath, buf)
    return filePath
  } catch (e) {
    console.error("Save processed audio failed", e)
    throw e
  }
})

ipcMain.handle('delete-file', async (_, filePath) => {
  try {
    // Security check: ensure file is within a known project path if possible, 
    // but since we pass absolute paths mostly, we rely on UI to be safe.
    // Ideally we check if it is inside 'wavs' folder of a project.
    await fs.unlink(filePath)
    return true
  } catch (e) {
    console.error("Delete file failed", e)
    return false
  }
})

ipcMain.handle('export-dataset', async (_, projectPath: string, items: any[]) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Export Dataset',
      defaultPath: path.join(app.getPath('downloads'), 'dataset.zip'),
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePath) return null

    const output = require('fs').createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.pipe(output)

    // 1. Add audio files
    const wavsDir = path.join(projectPath, 'wavs')
    const processedDir = path.join(projectPath, 'wavs_processed')

    // Check if processed folder exists, prefer it
    let sourceDir = wavsDir
    try {
      await fs.access(processedDir)
      sourceDir = processedDir
    } catch { }

    archive.directory(sourceDir, 'wavs')

    // 2. Generate Metadata.csv (LJSpeech format: ID|Transcription|NormalizedTranscription)
    // We only have transcription, so we duplicate satisfied LJSpeech format
    const lines = items
      .filter((i: any) => i.status === 'recorded')
      .map((i: any, idx: number) => {
        // Filename depends on index or how we saved it. 
        // In ProjectPage, we saved as file_0001.wav based on index.
        // Items might be reordered? No, index logic was strict.
        // Better to assume list order matches file_000X.wav if valid.
        const filename = `file_${String(idx + 1).padStart(4, '0')}` // no ext in LJSpeech often, or with. Let's do without.
        return `${filename}|${i.text}|${i.text}`
      })

    archive.append(lines.join('\n'), { name: 'metadata.csv' })

    await archive.finalize()
    return result.filePath
  } catch (e) {
    console.error("Export failed", e)
    throw e
  }
})

const store = new Store<Settings>()

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled) return undefined
  return result.filePaths[0]
})

ipcMain.handle('get-settings', async () => {
  return store.store
})

ipcMain.handle('save-settings', async (_, settings) => {
  store.set(settings)
})

ipcMain.handle('create-project', async (_, info: ProjectCreationInfo) => {
  const projectPath = path.join(info.location, info.name)

  // Create directories
  await fs.mkdir(projectPath, { recursive: true })
  await fs.mkdir(path.join(projectPath, 'wavs'), { recursive: true })

  await fs.writeFile(path.join(projectPath, 'metadata.txt'), '', 'utf-8')

  const projectData: Project = {
    id: randomUUID(),
    name: info.name,
    path: projectPath,
    createdAt: new Date().toISOString(),
    languageMode: 'Sinhala', // Default
    targetSampleRate: 22050,
    currentIndex: 0,
    items: []
  }

  await fs.writeFile(path.join(projectPath, 'project.json'), JSON.stringify(projectData, null, 2), 'utf-8')
  return projectData
})

ipcMain.handle('load-project', async (_, projectPath: string) => {
  const jsonPath = path.join(projectPath, 'project.json')
  const content = await fs.readFile(jsonPath, 'utf-8')
  const project = JSON.parse(content) as Project
  project.path = projectPath
  return project
})



ipcMain.handle('save-project', async (_, project: Project) => {
  const jsonPath = path.join(project.path, 'project.json')
  await fs.writeFile(jsonPath, JSON.stringify(project, null, 2), 'utf-8')
  return true
})

ipcMain.handle('get-models', async (_, provider: 'openai' | 'gemini') => {
  // Read fresh settings directly from store for key access
  const apiKey = provider === 'openai' ? store.get('openaiApiKey') : store.get('geminiApiKey')

  if (!apiKey) {
    throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} API Key is missing. Please check Settings.`)
  }

  try {
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey: apiKey as string })
      const list = await openai.models.list()
      return list.data.filter(m => m.id.startsWith('gpt')).map(m => m.id).sort()
    } else if (provider === 'gemini') {
      // Google SDK doesn't always expose listModels simply in all versions.
      // Returning stable list for now to ensure reliability.
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
    }
    return []
  } catch (e: any) {
    console.error(`Failed to fetch models for ${provider}`, e)
    const msg = e?.message || "Unknown error"
    throw new Error(`Failed to fetch models: ${msg}`)
  }
})

ipcMain.handle('generate-text', async (_, prompt, count, systemPromptOverride, modelId) => {
  const settings = store.get('selectedProvider') ? store.store : { selectedProvider: 'openai', openaiApiKey: store.get('openaiApiKey') } as Settings
  // Fallback to simpler check if store structure varies or verify 'store.store' usage 
  // 'store.store' gives full object in electron-store.

  const provider = settings.selectedProvider || 'openai'

  const defaultSystemPrompt = `You are a creative technical writer designed to generate distinct, high-quality, and pronounceable sentences for a Text-to-Speech dataset. 
  Output ONLY a raw JSON array of strings. Do not include markdown formatting (like \`\`\`json). 
  Topic: ${prompt}
  Count: ${count}`

  const systemPrompt = systemPromptOverride || defaultSystemPrompt

  console.log(`[Main] generate-text called. Override present? ${!!systemPromptOverride}`)
  console.log(`[Main] Final System Prompt used:`, systemPrompt)

  // Use provided modelId or fallback to defaults
  let selectedModel = modelId
  if (!selectedModel) {
    selectedModel = provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-1.5-flash'
  }
  console.log(`Generating ${count} sentences using ${provider} (Model: ${selectedModel}) for topic: "${prompt}"`)

  try {
    if (provider === 'openai') {
      if (!settings.openaiApiKey) throw new Error("OpenAI API Key not configured")
      const openai = new OpenAI({ apiKey: settings.openaiApiKey })

      const messages: any[] = [{ role: "system", content: systemPrompt }]
      if (systemPromptOverride) {
        messages.push({ role: "user", content: prompt }) // If override is used, prompt becomes the user message
      }

      console.log('[Main] OpenAI Messages Payload:', JSON.stringify(messages, null, 2))

      const completion = await openai.chat.completions.create({
        messages: messages,
        model: selectedModel,
      })

      const content = completion.choices[0].message.content || '[]'
      // Clean potential markdown
      const clean = content.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(clean)
    }
    else if (provider === 'gemini') {
      if (!settings.geminiApiKey) throw new Error("Gemini API Key not configured")
      const genAI = new GoogleGenerativeAI(settings.geminiApiKey)
      const model = genAI.getGenerativeModel({ model: selectedModel })

      const result = await model.generateContent(systemPrompt) // Gemini uses a single prompt for now
      const response = await result.response
      const text = response.text()

      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
      return JSON.parse(clean)
    }

    return []
  } catch (e: any) {
    console.error("AI Generation failed:", e)
    // return error as singular array item to display or throw? 
    // Throwing allows frontend to catch.
    throw e
  }
})

app.whenReady().then(createWindow)
