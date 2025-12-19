# Project Specification: VoxHarvest Desktop (Tier 1 - BYOK Edition)

## 1. Project Overview

Name: VoxHarvest Desktop

Type: Local-First Desktop Application (Electron)

Goal: A professional-grade tool for creating high-quality Text-to-Speech (TTS) datasets (specifically for VITS/Coqui models). It targets low-resource languages like Sinhala and "Singlish" (Code-switching).

Monetization Model: Tier 1 (Bring Your Own Key). The user provides their own OpenAI API Key. The app communicates directly from the client to OpenAI; no intermediate backend server is required.

## 2. Tech Stack & Architecture

* **Runtime:** Electron (latest stable) with `electron-forge` or `electron-builder`.
* **Frontend:** React (TypeScript), Vite.
* **Styling:** Tailwind CSS + **Shadcn/UI** (crucial for the "professional/cool" aesthetic).
* **State Management:** Zustand (for managing the active project session and recording state).
* **Audio Handling:**
  * `Web Audio API` for visualization (waveforms).
  * `MediaRecorder` API for capturing raw input.
  * **ffmpeg-static** (executed via Node `child_process`) to convert raw WebM to 16-bit PCM WAV (22050Hz Mono).
* **Persistence:** `electron-store` (for user settings/API keys) and local JSON files (for project metadata).
* **AI Integration:** `openai` Node.js SDK (running in the Main process or secured Renderer process).

---

## 3. Data Structures

### A. Project Structure (On Disk)

When a user creates a project, the app creates a folder on their file system:

**Plaintext**

```
/My_Voice_Project
  ├── project.json       // App-specific state (current index, theme, etc.)
  ├── metadata.txt       // Standard VITS format (pipe delimited)
  └── wavs/              // Folder containing raw .wav files
      ├── file_0001.wav
      └── ...
```

### B. `project.json` Schema

**JSON**

```
{
  "id": "uuid-v4",
  "name": "Astrology V1",
  "created_at": "ISO-8601",
  "language_mode": "Singlish",
  "target_sample_rate": 22050,
  "current_index": 14,
  "items": [
    { "id": "file_0001", "text": "Sentence text here", "status": "recorded", "duration": 4.5 },
    { "id": "file_0002", "text": "Next sentence...", "status": "pending", "duration": 0 }
  ]
}
```

---

## 4. Functional Modules (User Stories)

### Module 1: Onboarding & Configuration

* **US-1.1 (API Key Setup):** Upon first launch, force the user to a "Settings" view.
  * *Action:* User inputs OpenAI API Key.
  * *System:* Validate key by making a dummy call (e.g., list models). If valid, encrypt/store in `electron-store`.
* **US-1.2 (Dashboard):** Show a list of "Recent Projects" with progress bars (e.g., "45/100 recorded"). Button to "Create New Project."

### Module 2: Project Creation & Generation

* **US-2.1 (New Project):** User clicks "New Project".
  * *Inputs:* Project Name, Save Location (Folder Picker), Description.
* **US-2.2 (AI Generator):** Inside the project, user clicks "Add Sentences."
  * *UI:* A modal asking for "Topic" (e.g., Astrology), "Count" (10-50), and "Style" (Sinhala Only / Mixed Singlish).
  * *Logic:* App sends prompt to OpenAI.
  * *Prompt Engineering:* "Generate {count} sentences about {topic}. Style: {style}. Return ONLY raw text, one sentence per line. No numbering."
  * *Result:* content is parsed and appended to the `items` array in `project.json` with status `pending`.
* **US-2.3 (Extend Script):** User clicks "Add More" at the bottom of the script list.
  * *Action:* Opens the Generator Modal again.
  * *Logic:* New sentences are appended to the existing list (not replacing it).
  * *Context:* (Advanced) The generator is aware of the previous context/mode to maintain consistency.
* **US-2.4 (Import from TXT):** User clicks "Import TXT".
  * *Action:* Opens a native file picker to select a `.txt` file.
  * *Logic:* App reads the file from disk.
  * *Parsing:* Each line in the file becomes a separate script item. Empty lines are ignored.
  * *Result:* Items are appended to `project.json` with status `pending`.

### Module 3: The Recording Studio (Core UI)

* **US-3.1 (Visual Interface):**
  * **Top:** Large text display of the current sentence (`items[current_index]`).
  * **Middle:** Real-time audio visualizer (bars or wave) reacting to microphone input.
  * **Bottom:** Controls (Record, Stop, Play, Next, Previous).
* **US-3.2 (Recording Logic):**
  * User hits Spacebar (or Record button).
  * App records microphone stream.
  * User hits Spacebar again to Stop.
  * App writes temporary file -> Spawns `ffmpeg` process -> Converts to `wavs/file_{index}.wav` (Mono, 22050Hz).
  * Update `project.json` status to `recorded`.
  * Update `project.json` status to `recorded`.
* **US-3.3 (Navigation):** Auto-advance to next sentence on successful save. Allow manual navigation via Left/Right arrow keys.
* **US-3.4 (Script Management):**
  * **Edit:** User can click an "Edit" icon near the text to modify the sentence (fix typos, etc.). Updates `project.json`.
  * **Delete:** User can delete a sentence. App removes it from the list and cleans up associated `project.json` entry.
* **US-3.5 (Playback):**
  * **Play:** User can click a "Play" icon on any "recorded" item to hear the saved audio for verification.
  * **Visual Feedback:** Waveform highlights (e.g., changes color) during playback to indicate active state.

### Module 4: Export & Validation

* **US-4.1 (Metadata Sync):** Every time a recording is saved, the app must rewrite/append to the `metadata.txt` file in the root project folder.
  * *Format:* `file_0001|Sentence text here`
* **US-4.2 (Export):** User clicks "Export Dataset."
  * App zips the `wavs` folder and `metadata.txt` into `[ProjectName]_Dataset.zip`.
  * Opens the file explorer to the location.

---

## 5. Technical Requirements for "Vibe Coding"

### 1. IPC Communication (Electron)

* **Renderer (UI)** should never touch the file system directly.
* Create **IPC Handlers** in `main.ts` (or `preload.ts`):
  * `handle('save-audio', (buffer, filename) => ...)`
  * `handle('generate-text', (prompt) => ...)`
  * `handle('load-project', (path) => ...)`

### 2. Audio Processing Pipeline

* **Constraint:** The browser `MediaRecorder` creates WebM/Ogg.
* **Requirement:** The backend process **MUST** use `ffmpeg` to transcode this to WAV.
  * *Command:* `ffmpeg -i input.webm -ac 1 -ar 22050 output.wav`

### 3. "Singlish" Prompt Strategy

* Use this exact System Prompt logic for the AI generation feature:
  > "You are a native Sri Lankan speaker. Generate sentences that mix English technical/modern terms with Sinhala grammar (Code-switching). Do not transliterate English words (e.g., write 'Project', not 'ප්‍රොජෙක්ට්'). Keep sentences between 5-15 words."
  >

### 4. UI/UX "Vibe"

* Use **Dark Mode** by default.
* Use **Monospace fonts** for the text-to-read (easier for reading aloud).
* Use a **Red/Recording indicator** that pulses during active capture.

---

## 6. Implementation Roadmap (Step-by-Step for the AI)

1. **Scaffold:** `npm create electron-vite` (React + TS). Setup Tailwind & Shadcn.
2. **IPC Layer:** Implement `fileSystem` bridge (read/write JSON, write Blobs to disk).
3. **Settings Page:** Build the OpenAI Key input form + persistence.
4. **Generation:** Build the "AI Prompt" modal and connect to OpenAI API.
5. **Recorder:** Build the `AudioRecorder` component (visualizer + media stream).
6. **FFmpeg:** Integrate `ffmpeg-static` for the conversion pipeline.
# Project Specification: VoxHarvest Desktop (Tier 1 - BYOK Edition)

## 1. Project Overview

Name: VoxHarvest Desktop

Type: Local-First Desktop Application (Electron)

Goal: A professional-grade tool for creating high-quality Text-to-Speech (TTS) datasets (specifically for VITS/Coqui models). It targets low-resource languages like Sinhala and "Singlish" (Code-switching).

Monetization Model: Tier 1 (Bring Your Own Key). The user provides their own OpenAI API Key. The app communicates directly from the client to OpenAI; no intermediate backend server is required.

## 2. Tech Stack & Architecture

* **Runtime:** Electron (latest stable) with `electron-forge` or `electron-builder`.
* **Frontend:** React (TypeScript), Vite.
* **Styling:** Tailwind CSS + **Shadcn/UI** (crucial for the "professional/cool" aesthetic).
* **State Management:** Zustand (for managing the active project session and recording state).
* **Audio Handling:**
  * `Web Audio API` for visualization (waveforms).
  * `MediaRecorder` API for capturing raw input.
  * **ffmpeg-static** (executed via Node `child_process`) to convert raw WebM to 16-bit PCM WAV (22050Hz Mono).
* **Persistence:** `electron-store` (for user settings/API keys) and local JSON files (for project metadata).
* **AI Integration:** `openai` Node.js SDK (running in the Main process or secured Renderer process).

---

## 3. Data Structures

### A. Project Structure (On Disk)

When a user creates a project, the app creates a folder on their file system:

**Plaintext**

```
/My_Voice_Project
  ├── project.json       // App-specific state (current index, theme, etc.)
  ├── metadata.txt       // Standard VITS format (pipe delimited)
  └── wavs/              // Folder containing raw .wav files
      ├── file_0001.wav
      └── ...
```

### B. `project.json` Schema

**JSON**

```
{
  "id": "uuid-v4",
  "name": "Astrology V1",
  "created_at": "ISO-8601",
  "language_mode": "Singlish",
  "target_sample_rate": 22050,
  "current_index": 14,
  "items": [
    { "id": "file_0001", "text": "Sentence text here", "status": "recorded", "duration": 4.5 },
    { "id": "file_0002", "text": "Next sentence...", "status": "pending", "duration": 0 }
  ]
}
```

---

## 4. Functional Modules (User Stories)

### Module 1: Onboarding & Configuration

* **US-1.1 (API Key Setup):** Upon first launch, force the user to a "Settings" view.
  * *Action:* User inputs OpenAI API Key.
  * *System:* Validate key by making a dummy call (e.g., list models). If valid, encrypt/store in `electron-store`.
* **US-1.2 (Dashboard):** Show a list of "Recent Projects" with progress bars (e.g., "45/100 recorded"). Button to "Create New Project."

### Module 2: Project Creation & Generation

* **US-2.1 (New Project):** User clicks "New Project".
  * *Inputs:* Project Name, Save Location (Folder Picker), Description.
* **US-2.2 (AI Generator):** Inside the project, user clicks "Add Sentences."
  * *UI:* A modal asking for "Topic" (e.g., Astrology), "Count" (10-50), and "Style" (Sinhala Only / Mixed Singlish).
  * *Logic:* App sends prompt to OpenAI.
  * *Prompt Engineering:* "Generate {count} sentences about {topic}. Style: {style}. Return ONLY raw text, one sentence per line. No numbering."
  * *Result:* content is parsed and appended to the `items` array in `project.json` with status `pending`.

### Module 3: The Recording Studio (Core UI)

* **US-3.1 (Visual Interface):**
  * **Top:** Large text display of the current sentence (`items[current_index]`).
  * **Middle:** Real-time audio visualizer (bars or wave) reacting to microphone input.
  * **Bottom:** Controls (Record, Stop, Play, Next, Previous).
* **US-3.2 (Recording Logic):**
  * User hits Spacebar (or Record button).
  * App records microphone stream.
  * User hits Spacebar again to Stop.
  * App writes temporary file -> Spawns `ffmpeg` process -> Converts to `wavs/file_{index}.wav` (Mono, 22050Hz).
  * Update `project.json` status to `recorded`.
  * Update `project.json` status to `recorded`.
* **US-3.3 (Navigation):** Auto-advance to next sentence on successful save. Allow manual navigation via Left/Right arrow keys.
* **US-3.4 (Script Management):**
  * **Edit:** User can click an "Edit" icon near the text to modify the sentence (fix typos, etc.). Updates `project.json`.
  * **Delete:** User can delete a sentence. App removes it from the list and cleans up associated `project.json` entry.
* **US-3.5 (Playback):**
  * **Play:** User can click a "Play" icon on any "recorded" item to hear the saved audio for verification.
  * **Visual Feedback:** Waveform highlights (e.g., changes color) during playback to indicate active state.

### Module 4: Export & Validation

* **US-4.1 (Metadata Sync):** Every time a recording is saved, the app must rewrite/append to the `metadata.txt` file in the root project folder.
  * *Format:* `file_0001|Sentence text here`
* **US-4.2 (Export):** User clicks "Export Dataset."
  * App zips the `wavs` folder and `metadata.txt` into `[ProjectName]_Dataset.zip`.
  * Opens the file explorer to the location.

---

## 5. Technical Requirements for "Vibe Coding"

### 1. IPC Communication (Electron)

* **Renderer (UI)** should never touch the file system directly.
* Create **IPC Handlers** in `main.ts` (or `preload.ts`):
  * `handle('save-audio', (buffer, filename) => ...)`
  * `handle('generate-text', (prompt) => ...)`
  * `handle('load-project', (path) => ...)`

### 2. Audio Processing Pipeline

* **Constraint:** The browser `MediaRecorder` creates WebM/Ogg.
* **Requirement:** The backend process **MUST** use `ffmpeg` to transcode this to WAV.
  * *Command:* `ffmpeg -i input.webm -ac 1 -ar 22050 output.wav`

### 3. "Singlish" Prompt Strategy

* Use this exact System Prompt logic for the AI generation feature:
  > "You are a native Sri Lankan speaker. Generate sentences that mix English technical/modern terms with Sinhala grammar (Code-switching). Do not transliterate English words (e.g., write 'Project', not 'ප්‍රොජෙක්ට්'). Keep sentences between 5-15 words."
  >

### 4. UI/UX "Vibe"

* Use **Dark Mode** by default.
* Use **Monospace fonts** for the text-to-read (easier for reading aloud).
* Use a **Red/Recording indicator** that pulses during active capture.

---

## 6. Implementation Roadmap (Step-by-Step for the AI)

1. **Scaffold:** `npm create electron-vite` (React + TS). Setup Tailwind & Shadcn.
2. **IPC Layer:** Implement `fileSystem` bridge (read/write JSON, write Blobs to disk).
3. **Settings Page:** Build the OpenAI Key input form + persistence.
4. **Generation:** Build the "AI Prompt" modal and connect to OpenAI API.
5. **Recorder:** Build the `AudioRecorder` component (visualizer + media stream).
6. **FFmpeg:** Integrate `ffmpeg-static` for the conversion pipeline.
7. **Packaging:** Configure `electron-builder` for Windows `.exe` output.

### Module 5: Temp Recordings
* **US-5.1 (Free Recording):**
  * **Trigger:** If no script sentence is selected (or active), the Record button initiates a 'Temp Recording'.
  * **Behavior:** Captures audio just like a normal recording.
  * **Storage:** Saves as `temp_TIMESTAMP.wav`.
* **US-5.2 (Settings Persistence):**
  * **Capture:** When a temp recording is saved, the current Voice Designer settings (Pitch Shift, EQ High/Mid/Low) are saved with it.
  * **Playback:** When playing a temp recording, the Voice Designer knobs *snap* to the saved settings for that specific clip.
* **US-5.3 (Management):**
  * **List:** A dedicated section shows 'Temp Recordings'.
  * **Delete:** Deleting a temp recording permanently removes the WAV file and the metadata entry. No 'Undo'.

### Module 6: Advanced Script Generation
* **US-6.1 (Dual Language Support):**
  * **UI:** Modal features two tabs: 'Simple' (legacy) and 'Advanced'.
  * **Input:** In Advanced mode, user can select a 'Main Language' (e.g., Sinhala) and a 'Secondary Language' (e.g., English).
  * **Behavior:** The prompt instructs the AI to treat the Secondary Language as a source for loanwords/technical terms, while strictly adhering to the Main Language's grammar.
* **US-6.2 (Prompt Control):**
  * **Preview:** User can view the constructed system prompt before generation.
  * **Edit:** User can manually edit the prompt to add specific instructions (e.g., 'Use formal tone').
  * **Persistence:** The last used custom prompt is saved *per project*.
* **US-6.3 (Presets):**
  * **Selection:** User can choose from presets like 'News Anchor', 'Casual Vlogger', 'Tech Reviewer' to auto-fill the Domain/Style fields.
  * **Scenarios:**
      * *Purist:* Main=Sinhala, Secondary=None -> Formal grammar.
      * *Tech Reviewer:* Main=Sinhala, Secondary=English -> Code-switching enabled.

### Module 7: Dynamic Model Selection
* **US-7.1 (Fetch Models):**
  * **UI:** A "Fetch Models" button (or auto-fetch on open) in the Generator Modal.
  * **Logic:** App queries the current Provider (OpenAI/Gemini) for a list of available models (e.g., `gpt-4o`, `gemini-1.5-pro`).
  * **Filtering:** Filter list to only include chat/text generation models (ignore embedding/audio models).
* **US-7.2 (Model Selection):**
  * **UI:** A dropdown menu to select the desired model.
  * **Default:** Defaults to a sensible baseline (e.g., `gpt-4o-mini` or `gemini-flash`).
  * **Persistence:** The selected model is saved in user settings so it persists across sessions.
* **US-7.3 (Universal Access):**
  * **Scope:** The model selection dropdown is available and synced in both "Simple" and "Advanced" generation tabs.
