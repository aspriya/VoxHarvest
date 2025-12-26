import { ipcMain, app, dialog, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import Store from "electron-store";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
const exportDatasetToPath = async (destinationPath, projectPath, items, format, speakerName = "Speaker") => {
  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(destinationPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => {
      resolve(destinationPath);
    });
    archive.on("error", (err) => {
      reject(err);
    });
    archive.pipe(output);
    const wavsDir = path.join(projectPath, "wavs");
    const processedDir = path.join(projectPath, "wavs_processed");
    let sourceDir = wavsDir;
    try {
      await fs.access(processedDir);
      sourceDir = processedDir;
    } catch {
    }
    const sanitizedSpeaker = speakerName.replace(/[^a-zA-Z0-9_-]/g, "_") || "Speaker";
    const recordedItems = items.filter((i) => i.status === "recorded");
    if (format === "f5") {
      archive.directory(sourceDir, "dataset/wavs");
      const jsonMetadata = recordedItems.map((item, idx) => {
        const filename = `file_${String(idx + 1).padStart(4, "0")}.wav`;
        return {
          audio_path: `wavs/${filename}`,
          text: item.text,
          duration: item.duration || 0
          // Use stored duration or 0
        };
      });
      archive.append(JSON.stringify(jsonMetadata, null, 2), { name: "dataset/dataset.json" });
    } else if (format === "piper") {
      archive.directory(sourceDir, "dataset/wavs");
      const lines = recordedItems.map((item, idx) => {
        const filename = `file_${String(idx + 1).padStart(4, "0")}`;
        return `${filename}|${item.text}`;
      });
      archive.append(lines.join("\n"), { name: "dataset/metadata.csv" });
    } else if (format === "xtts") {
      archive.directory(sourceDir, "dataset/wavs");
      const lines = recordedItems.map((item, idx) => {
        const filename = `file_${String(idx + 1).padStart(4, "0")}.wav`;
        return `wavs/${filename}|${item.text}|${sanitizedSpeaker}`;
      });
      archive.append(lines.join("\n"), { name: "dataset/metadata.csv" });
    } else if (format === "fish") {
      try {
        for (let i = 0; i < recordedItems.length; i++) {
          const item = recordedItems[i];
          const filename = `file_${String(i + 1).padStart(4, "0")}.wav`;
          const sourceFile = path.join(sourceDir, filename);
          const targetWavName = `dataset/data/${sanitizedSpeaker}/${filename}`;
          const targetLabName = `dataset/data/${sanitizedSpeaker}/${filename.replace(".wav", ".lab")}`;
          try {
            archive.file(sourceFile, { name: targetWavName });
            archive.append(item.text, { name: targetLabName });
          } catch (e) {
            console.warn(`Could not add file for export: ${sourceFile}`);
          }
        }
      } catch (e) {
        console.error("Fish speech export setup failed", e);
        reject(e);
        return;
      }
    }
    await archive.finalize();
  });
};
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
ipcMain.handle("read-audio", async (_, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.buffer;
  } catch (e) {
    console.error("Failed to read audio file", e);
    throw e;
  }
});
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath.replace("app.asar", "app.asar.unpacked"));
} else {
  console.error("FFmpeg path not found!");
}
ipcMain.handle("save-audio", async (_, buffer, filename, projectPath) => {
  const buf = Buffer.from(buffer);
  const tempWebm = path.join(app.getPath("temp"), `temp_${randomUUID()}.webm`);
  const outputWav = path.join(projectPath, "wavs", filename);
  try {
    await fs.writeFile(tempWebm, buf);
    return new Promise((resolve, reject) => {
      ffmpeg(tempWebm).toFormat("wav").audioCodec("pcm_s16le").audioChannels(1).audioFrequency(22050).on("end", async () => {
        await fs.unlink(tempWebm).catch(() => {
        });
        resolve(outputWav);
      }).on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      }).save(outputWav);
    });
  } catch (e) {
    console.error("Save audio failed", e);
    throw e;
  }
});
ipcMain.handle("trim-audio", async (_, filePath, start, end, applyDenoise) => {
  const tempEdited = path.join(app.getPath("temp"), `edited_${randomUUID()}.wav`);
  try {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(filePath).inputOptions([`-ss ${start}`, `-to ${end}`]).toFormat("wav").audioCodec("pcm_s16le").audioChannels(1).audioFrequency(22050);
      const filters = [];
      if (applyDenoise) {
        filters.push("highpass=f=80");
        filters.push("afftdn=nr=10:nf=-25:nt=w");
      }
      if (filters.length > 0) {
        command = command.audioFilters(filters);
      }
      command.on("end", async () => {
        try {
          await fs.copyFile(tempEdited, filePath);
          await fs.unlink(tempEdited);
          resolve(true);
        } catch (err) {
          console.error("Error replacing file:", err);
          reject(err);
        }
      }).on("error", (err) => {
        console.error("FFmpeg trim error:", err);
        reject(err);
      }).save(tempEdited);
    });
  } catch (e) {
    console.error("Trim audio failed", e);
    throw e;
  }
});
ipcMain.handle("preview-audio", async (_, filePath, start, end, applyDenoise) => {
  const tempPreview = path.join(app.getPath("temp"), `preview_${randomUUID()}.wav`);
  try {
    await new Promise((resolve, reject) => {
      let command = ffmpeg(filePath).inputOptions([`-ss ${start}`, `-to ${end}`]).toFormat("wav").audioCodec("pcm_s16le").audioChannels(1).audioFrequency(22050);
      const filters = [];
      if (applyDenoise) {
        filters.push("highpass=f=80");
        filters.push("afftdn=nr=10:nf=-25:nt=w");
      }
      if (filters.length > 0) {
        command = command.audioFilters(filters);
      }
      command.on("end", resolve).on("error", reject).save(tempPreview);
    });
    const buffer = await fs.readFile(tempPreview);
    await fs.unlink(tempPreview).catch(() => {
    });
    return buffer.buffer;
  } catch (e) {
    console.error("Preview audio failed", e);
    throw e;
  }
});
ipcMain.handle("save-processed-audio", async (_, buffer, filename, projectPath) => {
  const buf = Buffer.from(buffer);
  const processedDir = path.join(projectPath, "wavs_processed");
  try {
    await fs.mkdir(processedDir, { recursive: true });
    const filePath = path.join(processedDir, filename);
    await fs.writeFile(filePath, buf);
    return filePath;
  } catch (e) {
    console.error("Save processed audio failed", e);
    throw e;
  }
});
ipcMain.handle("delete-file", async (_, filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (e) {
    console.error("Delete file failed", e);
    return false;
  }
});
ipcMain.handle("export-dataset", async (_, projectPath, items, format, speakerName) => {
  try {
    const defaultName = format === "fish" ? "dataset_fish.zip" : "dataset.zip";
    const result = await dialog.showSaveDialog({
      title: "Export Dataset",
      defaultPath: path.join(app.getPath("downloads"), defaultName),
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }]
    });
    if (result.canceled || !result.filePath) return null;
    await exportDatasetToPath(result.filePath, projectPath, items, format, speakerName);
    return result.filePath;
  } catch (e) {
    console.error("Export failed", e);
    throw e;
  }
});
const store = new Store();
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled) return void 0;
  return result.filePaths[0];
});
ipcMain.handle("import-script-file", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openFile"],
    filters: [{ name: "Text Files", extensions: ["txt"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const content = await fs.readFile(result.filePaths[0], "utf-8");
    return content;
  } catch (e) {
    console.error("Failed to read script file", e);
    throw e;
  }
});
ipcMain.handle("get-settings", async () => {
  return store.store;
});
ipcMain.handle("save-settings", async (_, settings) => {
  store.set(settings);
});
ipcMain.handle("create-project", async (_, info) => {
  const projectPath = path.join(info.location, info.name);
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, "wavs"), { recursive: true });
  await fs.writeFile(path.join(projectPath, "metadata.txt"), "", "utf-8");
  const projectData = {
    id: randomUUID(),
    name: info.name,
    path: projectPath,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    languageMode: "Sinhala",
    // Default
    targetSampleRate: 22050,
    currentIndex: 0,
    items: []
  };
  await fs.writeFile(path.join(projectPath, "project.json"), JSON.stringify(projectData, null, 2), "utf-8");
  return projectData;
});
ipcMain.handle("load-project", async (_, projectPath) => {
  const jsonPath = path.join(projectPath, "project.json");
  const content = await fs.readFile(jsonPath, "utf-8");
  const project = JSON.parse(content);
  project.path = projectPath;
  return project;
});
ipcMain.handle("save-project", async (_, project) => {
  const jsonPath = path.join(project.path, "project.json");
  await fs.writeFile(jsonPath, JSON.stringify(project, null, 2), "utf-8");
  return true;
});
ipcMain.handle("get-models", async (_, provider) => {
  const apiKey = provider === "openai" ? store.get("openaiApiKey") : store.get("geminiApiKey");
  if (!apiKey) {
    throw new Error(`${provider === "openai" ? "OpenAI" : "Gemini"} API Key is missing. Please check Settings.`);
  }
  try {
    if (provider === "openai") {
      const openai = new OpenAI({ apiKey });
      const list = await openai.models.list();
      return list.data.filter((m) => m.id.startsWith("gpt")).map((m) => m.id).sort();
    } else if (provider === "gemini") {
      return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    }
    return [];
  } catch (e) {
    console.error(`Failed to fetch models for ${provider}`, e);
    const msg = (e == null ? void 0 : e.message) || "Unknown error";
    throw new Error(`Failed to fetch models: ${msg}`);
  }
});
ipcMain.handle("generate-text", async (_, prompt, count, systemPromptOverride, modelId) => {
  const settings = store.get("selectedProvider") ? store.store : { selectedProvider: "openai", openaiApiKey: store.get("openaiApiKey") };
  const provider = settings.selectedProvider || "openai";
  const defaultSystemPrompt = `You are a creative technical writer designed to generate distinct, high-quality, and pronounceable sentences for a Text-to-Speech dataset. 
  Output ONLY a raw JSON array of strings. Do not include markdown formatting (like \`\`\`json). 
  Topic: ${prompt}
  Count: ${count}`;
  const systemPrompt = systemPromptOverride || defaultSystemPrompt;
  console.log(`[Main] generate-text called. Override present? ${!!systemPromptOverride}`);
  console.log(`[Main] Final System Prompt used:`, systemPrompt);
  let selectedModel = modelId;
  if (!selectedModel) {
    selectedModel = provider === "openai" ? "gpt-3.5-turbo" : "gemini-1.5-flash";
  }
  console.log(`Generating ${count} sentences using ${provider} (Model: ${selectedModel}) for topic: "${prompt}"`);
  try {
    if (provider === "openai") {
      if (!settings.openaiApiKey) throw new Error("OpenAI API Key not configured");
      const openai = new OpenAI({ apiKey: settings.openaiApiKey });
      const messages = [{ role: "system", content: systemPrompt }];
      if (systemPromptOverride) {
        messages.push({ role: "user", content: prompt });
      }
      console.log("[Main] OpenAI Messages Payload:", JSON.stringify(messages, null, 2));
      const completion = await openai.chat.completions.create({
        messages,
        model: selectedModel
      });
      const content = completion.choices[0].message.content || "[]";
      const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(clean);
    } else if (provider === "gemini") {
      if (!settings.geminiApiKey) throw new Error("Gemini API Key not configured");
      const genAI = new GoogleGenerativeAI(settings.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(clean);
    }
    return [];
  } catch (e) {
    console.error("AI Generation failed:", e);
    throw e;
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
