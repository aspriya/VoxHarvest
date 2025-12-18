# VoxHarvest Desktop - Implementation Roadmap

This document outlines the phased approach to building VoiceForge Desktop, with specific technical details for implementation.

> **Architect's Note**: This roadmap stresses **Performance** (Virtualization for long lists, Queueing for file IO) and **Scalability** (Batch processing limits).

## Phase 1: Scaffolding & Foundation (Completed)
- [x] **Project Init**: Initialized with `electron-vite`, React, TypeScript.
- [x] **Styling**: Configured Tailwind CSS v3 and Shadcn/UI (manual cn helper).
- [x] **IPC Architecture**:
    -   Exposed `window.api` via `contextBridge`.
    -   Defined strict TypeScript interfaces (`Projectile`, `Settings`, `IpcApi`).
    -   Implemented `main` process handlers for File System operations (`fs/promises`).

## Phase 2: Core User Flows
**Focus**: Robust data flow and reliable file I/O.

### 2.1 Settings & Storage
-   **Tech**: `electron-store`.
-   **Architecture**:
    -   **Pattern**: "Single Source of Truth" in Main Process.
    -   Renderer calls `api.getSettings()` on mount.
    -   Renderer calls `api.saveSettings(newSettings)` -> Main persists -> Main sends `settings-updated` event (optional, or just re-fetch).

### 2.2 Dashboard & Project Management
-   **Logic**:
    -   Dashboard loads "Recent Projects" (LRU list in `electron-store`).
    -   **Project Loading**: Large JSON files (if >10MB) should be streamed, but for <5000 items `JSON.parse` is fine.
    -   **Validation**: Schema validation (e.g., Zod) on `project.json` load to prevent crashes from corrupted files.

### 2.3 The Recording Studio (Renderer)
-   **UI Performance**:
    -   **Virtualization**: Use `react-window` or `virtuoso` for the sentence list. Rendering 5000 DOM nodes will crash/lag the app.
-   **Audio Pipeline (Critical)**:
    -   **Input**: `navigator.mediaDevices.getUserMedia()`.
    -   **Processing**: `MediaRecorder` (WebM).
    -   **Output**:
        -   Renderer sends `ArrayBuffer` + `itemId` (NOT filename).
        -   **Main Process**:
            -   Generates filename `file_{index}.wav` securely.
            -   **Queueing**: Use `p-queue` or simple promise chain to prevent file write race conditions if user spam-clicks "Next".
            -   **FFmpeg**: Spawn `ffmpeg` process.
-   **State**: `useProjectStore` (Zustand) holds the *working* copy. Syncs to disk via "Auto-save" (debounce 2s) or immediate save on status change.

### 2.4 AI Text Generation (Multi-Provider)
-   **Providers**: OpenAI (GPT-3.5/4) and Google Gemini (Flash/Pro).
-   **Security**: API Keys never leave Main process storage.
-   **Pattern**: User Prompt -> IPC -> Select SDK (OpenAI/Gemini) -> Result.

## Phase 3: Voice Effects Rack (The "Vibe" Layer)
**Architectural Challenge**: Real-time preview vs High-fidelity Render.

### 3.1 Audio Engine
-   **Library**: `Tone.js`.
-   **Component**: `AudioEngine` hook. NOT global state, scoped to the Studio view.
-   **Signal Path**: `Tone.Player` -> `Tone.PitchShift` -> `Tone.EQ3` -> `Tone.Master`.

### 3.2 UI Integration (Completed)
-   **Rack UI**: Linear slider layout + Glassmorphism.
-   **Structure**: Right-hand accessible panel.

### 3.3 Sound Profiles (New)
-   **Goal**: Save/Load knob settings.
-   **Storage**: `settings.json` (Global) so profiles persist across projects.
-   **UI**: "Save Current" button, Dropdown for presets (e.g., "Deep Mystery", "Helium", "Robot").

### 3.4 Preview Strategy
-   **Post-Record Preview**:
    -   User records `raw.wav`.
    -   App loads `raw.wav` into `Tone.Player`.
    -   Playback applies live effects.

## Phase 4: Batch Processing & Export
**Architectural Challenge**: Memory leaks and CPU hogging.

### 4.1 Batch Processor Logic (Renderer-side)
-   **Concurrency**: Limit to 1 or 2 files at a time to prevent audio context crashes.
-   **Library**: `p-queue` to manage concurrency.
-   **Process**:
    1.  **Iterate**: Loop through `project.items` where status is 'recorded'.
    2.  **Load**: `window.api.readAudio()` -> `AudioBuffer`.
    3.  **Offline Render**: 
        -   Create `Tone.Offline(context => { ... })`.
        -   Re-create the graph (Player -> PitchShift -> EQ -> Destination) inside the callback.
        -   `player.start(0)`.
    4.  **Cleanup**: `context.dispose()` explicitly after each render.
    5.  **Save**: `window.api.saveProcessedAudio(buffer, filename)`.
    6.  **Progress**: Update UI progress bar.

### 4.2 Dataset Export
-   **Tech**: `archiver`.
-   **UX**: Show indeterminate loader or progress bar during compression.

## Phase 5: Polish & Vibe
-   **Visuals**: Glassmorphism, specific "Cyberpunk/Studio" aesthetic.
-   **Testing**: E2E test for the "Record -> Save -> Export" critical path.
