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
-   **Script Actions**:
    -   **Edit**: Inline text editing.
    -   **Delete**: remove from array. *Note*: Deleting items may leave orphaned WAV files or require filename re-indexing logic (currently handled by strictly index-based filename mapping).
    -   **Playback**: `handlePlayItem` loads specific file into `AudioEngine` for instant review.

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
-   **UX Improvements**:
    -   [ ] **Recorded Time Display**: Calculate and show total duration of recorded items in the project header.
-   **Testing**: E2E test for the "Record -> Save -> Export" critical path.

## Phase 6: Temp Recordings Feature
**Focus**: Flexibility for unscheduled voice capture.

### 6.1 Data Structure Extensions
-   **Schema**: Update `Project` interface to include `tempRecordings`.
-   **Type Definition**:
    ```typescript
    interface TempRecording {
        id: string;
        timestamp: number;
        duration: number;
        settings: { pitch: number; eq: { low: number; mid: number; high: number } };
    }
    ```

### 6.2 UI & Logic
-   **Trigger**: Recording without an active script item creates a 'Temp Recording'.
-   **Storage**: Files saved as `wavs/temp_{timestamp}.wav` (or similar).
-   **Persistence**:
    -   When recording stops, capture current AudioEngine settings (Pitch/EQ).
    -   Save to `project.json` in `tempRecordings` array.
-   **Playback**:
    -   Playing a temp recording *automatically* sets the Audio Engine knobs to the saved values.
-   **Management**:
    -   Display separate list for Temp Recordings.
    -   Allow permanent deletion (File + Metadata).

## Phase 7: Advanced Script Generation
**Focus**: High-quality dataset creation via controlled prompting.

### 7.1 Generator UI Overhaul
-   **Modal**: Split into 'Simple' and 'Advanced' tabs (or just expand fields).
-   **Fields**: Add Dropdowns for Main/Secondary languages. Add 'Domain' text input.
-   **Preview**: Add a collapsible text area showing the generated System Prompt.

### 7.2 Logic & Persistence
-   **Prompt Builder**: Implement `buildSystemPrompt(main, secondary, domain, customInst)` function in frontend.
-   **State**: Save `genSettings` (last prompt, selected languages) into `project.json` or `settings.json`.
-   **Presets**: Hardcode initial presets (News, Casual, Tech) in a `constants.ts` file.

### 7.3 Backend Updates
-   **IPC**: Update `generate-text` to accept an optional `systemPromptOverride`. If present, use it directly instead of constructing one.

### 7.4 Script Extension (Refinement)
-   **Feature**: Ability to add more sentences to an existing project.
-   **UI**: "Add More" button at the bottom of the virtualized list.
-   **Behavior**: Appends generated items to the end of the `items` array.

## Phase 8: Test Suite Implementation (Completed)
**Goal**: Ensure core feature reliability and prevent regressions during future development.

### 8.1 Testing Infrastructure
-   **Framework**: `Vitest` + `JSDOM` for fast, headless unit/integration testing.
-   **Utilities**: `React Testing Library` for component interaction, `user-event` for realistic simulation.
-   **Environment**: Setup in `src/tests/setup.ts` to mock browser APIs absent in Node/JSDOM (`ResizeObserver`, `scrollIntoView`, `PointerEvent`).

### 8.2 Mocking Strategy
-   **Electron IPC**: Fully mocked `window.api` to simulate backend responses (File I/O, Settings, AI) without running Electon.
-   **Audio Engine**:
    -   **Web Audio API**: Manual class-based mock for `window.AudioContext` to support `AudioVisualizer`.
    -   **Tone.js**: Module-level mock for `tone` to bypass complex audio graph initialization issues in test environments.
    -   **MediaStream**: Mocked `navigator.mediaDevices.getUserMedia` and `MediaRecorder` for recording flows.

### 8.3 Coverage Areas
-   **Settings**: API key storage, Theme toggling, AI provider switching.
-   **Dashboard**: Project creation, "Recent Projects" loading.
-   **GeneratorModal**: Simple vs Advanced generation modes, Form accessibility (`aria-label`, `htmlFor`).
-   **ProjectPage**: Project loading, Script item rendering (virtualization), "Extend Script" flow, Dataset Export validation.

## Phase 9: Dynamic Model Selection
**Goal**: Allow users to optimize between cost, speed, and intelligence by selecting specific LLM versions.

### 9.1 Backend (IPC)
-   **New Handler**: `get-models(provider)`
    -   **OpenAI**: Call `GET /v1/models`. Filter items where `id` starts with `gpt`.
    -   **Gemini**: Use Google AI SDK to list available generative models.
-   **Update Handler**: `generate-text(prompt, options)`
    -   Add `modelId` to the `options` object.
    -   Pass this `modelId` to the respective SDK call.

### 9.2 Frontend (UI)
-   **Store Update**: Add `selectedModel` to `useSettingsStore`.
-   **Component**: Create `ModelSelector` component.
    -   Dropdown (Shadcn Select).
    -   "Refresh" button to trigger `get-models` IPC call.
    -   Loading state while fetching.
-   **Integration**:
    -   Place `ModelSelector` in the header or shared area of `GeneratorModal` so it's visible in both Simple/Advanced tabs.
    -   Alternatively, replicate in both tabs if header space is tight.

### 9.3 Testing Strategy
-   **Mocking**: Update `setup.ts` to mock `window.api.getModels()`.
-   **Test Case**: Verify that changing the dropdown updates the store and that the `generate-text` call receives the correct `modelId`.

## Phase 10: Import Sentences from TXT
**Goal**: Allow users to bring their own scripts from external files.
-   **Frontend**: Add "Import TXT" button to sidebar.
-   **Logic**:
    -   Open File Dialog -> Select `.txt`.
    -   Read content -> Split by `\n` -> Filter empty.
    -   Add to project as `pending` items.
## Phase 11: Advanced Audio Editor (Completed)
**Goal:** Empower users to fix recording mistakes (dead air, background noise) without re-recording or leaving the app.

### 11.1 Frontend Architecture
- [x] **Library:** `wavesurfer.js` (latest) + Regions Plugin.
- [x] **Component:** `AudioEditorModal`.
    - [x] **Props:** `isOpen`, `onClose`, `audioUrl`, `onSave`.
    - [x] **State:** Use local React state for `isPlaying`, `regionStart`, `regionEnd`, `noiseReductionEnabled`.
- [x] **UX Pattern:**
    - [x] Modal opens over the main studio.
    - [x] Waveform loads asynchronously.
    - [x] "Play Region" loops the selected area for fine-tuning.
    - [x] "Save" button shows a spinner (awaiting IPC).

### 11.2 Backend Implementation (FFmpeg)
- [x] **IPC Handler:** `trim-audio(filePath, start, end, applyDenoise)`
- [x] **Logic:**
    1.  **Construct Filter Complex:**
        - [x] Base: `-ss {start} -to {end}` (Input seeking is faster/safer).
        - [x] Denoise: If `applyDenoise` is true, add `-af "highpass=f=80, afftdn=nr=10:nf=-25:nt=w"`.
        - [x] *Note:* `afftdn` (FFT Denoise) is effective for white noise but cpu intensive. Fallback to `lowpass` if needed, but modern CPUs handle it fine.
    2.  **Execution:**
        - [x] Run `ffmpeg` outputting to `file_XXXX_edited.wav`.
        - [x] On success, un-link (delete) original `file_XXXX.wav`.
        - [x] Rename `file_XXXX_edited.wav` to `file_XXXX.wav`.
    3.  **Return:** New file size/duration to Renderer.

### 11.3 Cache Handling
- [x] **Challenge:** Electron/Chrome caches audio files by URL. Replacing a file on disk doesn't auto-update the `<audio>` tag or `Tone.Player`.
- [x] **Solution:** When the Editor saves, return a "version timestamp" (e.g., `Date.now()`). The Renderer must append `?v={timestamp}` to the audio URL when re-loading the player.

### 11.4 Denoise Preview Strategy
- [x] **Goal:** WYHIWYG (What You Hear Is What You Get) without destruction.
- [x] **Workflow:**
    1.  User clicks "Preview Effect".
    2.  `preview-audio` IPC called with active region + filter settings.
    3.  Backend creates `temp_preview_UUID.wav` (trimmed & filtered).
    4.  Backend returns `ArrayBuffer`.
    5.  Frontend plays buffer using `Tone.context.decodeAudioData`.
    6.  Temp file is deleted immediately after reading.


## Phase 12: Enhanced Dataset Export
**Goal**: Support multiple dataset formats for modern TTS flow-matching models (F5-TTS, Fish Speech) and legacy standards (Piper, XTTS).

### 12.1 Backend (Export Engine)
-   **Updates**: Modify `export-dataset` IPC handler to accept `format` argument.
-   **Strategies**:
    -   **F5-TTS**: JSON structure (`audio_path`, `text`, `duration`).
    -   **Piper**: CSV (`id|text`), strict filename matching.
    -   **XTTS v2**: CSV (`wavs/path|text|speaker`), absolute or relative paths.
    -   **Fish Speech**: Sidecar `.lab` files + Speaker containment folder.
-   **Refactoring**: Update `datasetExporter.ts` to implement strict adapter pattern for each format.

### 12.2 Frontend (UI)
-   **Modal**: Create `ExportModal`.
-   **Inputs**: Radio Group for format selection.
-   **Logic**: Pass selected format to backend.

## Phase 13: Advanced Script Management
**Goal**: Provide a dedicated interface for managing, editing, and bulk-importing script lines.

### 13.1 Frontend (Script Manager)
-   **UI**: Create `ScriptManagerModal` (or dedicated view).
-   **Features**:
    -   **Visual Distinction**: Highlight recorded vs. pending items.
    -   **Bulk Add**: Text area for copy-pasting multiple new sentences.
    -   **Edit/Delete**: distinct controls for modifying pending items.
-   **Integration**: Add access point from Project Dashboard header.
