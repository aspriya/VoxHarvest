# VoxHarvest Desktop - Comprehensive Test Plan

**Version:** 1.0
**Date:** 2025-12-19
**Author:** System Architect
**Status:** Draft

## 1. Introduction

This document outlines the test cases for the "VoxHarvest Desktop" application (formerly VoiceForge). It is designed to cover all currently implemented features, including Project Management, AI Script Generation, Audio Recording, Real-time Effects, and Dataset Export.

**Objective:** Ensure functional correctness and stability of existing features before further development.

---

## 2. Test Strategy

*   **Manual Testing:** Most UI/UX features require manual verification.
*   **Platform:** Windows (Electron build/Dev mode).
*   **Prerequisites:**
    *   Active Internet Connection (for AI generation).
    *   Valid OpenAI API Key.
    *   Microphone connected and accessible.

---

## 3. Test Cases

### 3.1 Module 1: Onboarding & Settings

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-1.1** | **API Key Validation (Success)** | App is fresh/reset. | 1. Navigate to Settings page.<br>2. Enter a valid OpenAI API Key.<br>3. Click "Save Settings". | 1. Success toast appears.<br>2. API Key is saved to persistent storage.<br>3. "Selected Provider" defaults to OpenAI. |
| **TC-1.2** | **API Key Validation (Failure)** | App is fresh/reset. | 1. Enter an invalid string (e.g., "invalid-key").<br>2. Click "Save Settings". | 1. Error toast/message appears indicating validation failure.<br>2. Key is NOT saved. |
| **TC-1.3** | **Theme Toggle** | None. | 1. Toggle "Dark Mode" switch in Settings. | 1. Application UI theme switches between Light and Dark modes instantly. |
| **TC-1.4** | **Persistence** | Settings saved. | 1. Close the application.<br>2. Re-open the application. | 1. Application remembers the API Key and Theme settings. |

### 3.2 Module 2: Dashboard & Project Management

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-2.1** | **Create New Project** | None. | 1. Click "Create New Project" on Dashboard.<br>2. Enter Name: "Test Proj", Location: (Select Folder).<br>3. Click "Create". | 1. App navigates to the Project Page.<br>2. "Test Proj" folder is created on disk.<br>3. `project.json` is initialized. |
| **TC-2.2** | **Load Recent Project** | Project exists. | 1. Navigate to Dashboard.<br>2. Click on a project card in "Recent Projects". | 1. App navigates to the Project Page.<br>2. Project data (script, recordings) loads correctly. |
| **TC-2.3** | **Delete Project** | Project exists. | 1. On Dashboard, click "Delete" (Trash icon) on a project card.<br>2. Confirm dialog. | 1. Project is removed from the Recent list.<br>2. (Optional) user might need to manually check if folder is deleted (depending on implementation safety). |

### 3.3 Module 3: Script Generation (Advanced)

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-3.1** | **Generate Script (Simple)** | Inside Project. | 1. Click "Add Sentences".<br>2. Select "Simple" tab.<br>3. Topic: "Space", Count: 5.<br>4. Click "Generate". | 1. Loading state appears.<br>2. 5 new sentences about Space appear in the sidebar.<br>3. Progress bar updates. |
| **TC-3.2** | **Generate Script (Advanced/Dual Lang)** | Inside Project. | 1. Click "Add Sentences".<br>2. Select "Advanced" tab.<br>3. Presets: "Tech Reviewer".<br>4. Verify Main: "Sinhala", Secondary: "English".<br>5. Click "Generate". | 1. Generated text contains Sinhala sentences with English technical terms (Code-Switching).<br>2. No transliteration (English words in English script). |
| **TC-3.3** | **Extending Script ("Add More")** | Project has items. | 1. Scroll to bottom of sidebar.<br>2. Click "Add More".<br>3. Generate 3 more sentences. | 1. New items are APPENDED to the existing list.<br>2. Existing items are NOT deleted/overwritten. |

### 3.4 Module 4: Recording Studio (Core)

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-4.1** | **Record & Save** | Item selected. | 1. Select a pending item.<br>2. Press Spacebar (or click Mic).<br>3. Speak into mic.<br>4. Press Spacebar to Stop. | 1. Visualizer acts active (Red).<br>2. On stop, "Recorded" badge appears.<br>3. Audio is saved to disk (`wavs/file_xxxx.wav`).<br>4. Auto-advances to next item. |
| **TC-4.2** | **Waveform Visualization (Mic)** | None. | 1. Observe Visualizer when idle.<br>2. Speak without recording.<br>3. Start Recording. | 1. Idle: Cyan flat/low line.<br>2. Speak (Idle): Should show movement (if monitoring enabled) or stay flat.<br>3. Recording: Red waveform active and reactive to voice. |
| **TC-4.3** | **Playback & Visualization** | Item recorded. | 1. Select recorded item.<br>2. Click "Play" button.<br>3. Observe Visualizer. | 1. Audio plays back clearly.<br>2. Visualizer turns Green.<br>3. Waveform moves in sync with the *playing audio* (not mic). |
| **TC-4.4** | **Re-record** | Item recorded. | 1. Select a "Recorded" item.<br>2. Start Recording again.<br>3. Confirm warning (if any) or overwrite. | 1. New audio replaces the old file.<br>2. Duration metadata updates. |

### 3.5 Module 5: Audio Effects (Voice Designer)

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-5.1** | **Pitch Shift** | Playback active. | 1. Play a recording.<br>2. Move Pitch slider to +5.<br>3. Listen. | 1. Voice becomes "chipmunk-like" (higher pitch) in real-time. |
| **TC-5.2** | **EQ Adjustments** | Playback active. | 1. Play a recording.<br>2. Boost "Low" slider to max. | 1. Audio has more bass/depth in real-time. |
| **TC-5.3** | **Profile Reset** | Effects applied. | 1. Click "Reset" (or set sliders to 0). | 1. Audio returns to natural/recorded state. |

### 3.6 Module 6: Temp Recordings

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-6.1** | **Create Temp Recording** | No script item selected. | 1. Click Record button (or Space) while NO item is active (or verify behavior if logic permits).<br> *Note: Current implementation might require a specific "Free Record" mode or just recording when nothing is selected.* | 1. Recording saves to "Temp Recordings" list in sidebar.<br>2. Timestamped name. |
| **TC-6.2** | **Delete Temp Recording** | Temp rec exists. | 1. Click "Trash" icon on a temp recording. | 1. Confirm dialog.<br>2. Item disappears from list.<br>3. File deleted from disk. |

### 3.7 Module 7: Export

| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-7.1** | **Export Dataset (Multi-Format)** | Project has recordings. | 1. Click "Export Dataset" in header.<br>2. Select Format (e.g., F5-TTS, Fish Speech).<br>3. Enter Speaker Name (if prompted).<br>4. Click "Export". | 1. Modal appears with format options.<br>2. Zip file generated.<br>3. Correct folder structure (e.g., `dataset.json` for F5, subfolders for Fish). |
| **TC-7.2** | **Metadata Verification** | Export done. | 1. Unzip the exported file.<br>2. Check metadata file. | 1. F5: `dataset.json` with duration.<br>2. Piper: `metadata.csv` with pipe info.<br>3. Recordings renamed sequentially (file_0001, file_0002) regardless of gaps. |

### 3.8 Module 8: Script Manager
| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-8.1** | **Open Script Manager** | Inside Project. | 1. Click "Edit" (Pencil) icon in sidebar header. | 1. Modal opens displaying all sentences.<br>2. Recorded items are Green, Pending are Gray. |
| **TC-8.2** | **Bulk Add** | Manager Open. | 1. Switch to "Add" tab.<br>2. Paste multiple lines of text.<br>3. Click "Add Sentences". | 1. New items are added to sidebar.<br>2. Manager closes (or updates). |

### 3.9 Module 9: Clear Recording
| ID | Test Case | Pre-conditions | Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-9.1** | **Clear/Reset Recording** | Item "Recorded". | 1. Hover item row in project.<br>2. Click Orange "Reset" icon.<br>3. Confirm dialog. | 1. "Recorded" badge/color reverts to default.<br>2. "Play" button disappears.<br>3. Audio file deleted from disk (backend verify). |

---

## 4. Reporting Bugs

If any test case fails:
1.  Screenshot the error or unexpected behavior.
2.  Copy the Console Logs (Ctrl+Shift+I -> Console).
3.  Report in the issue tracker with the Step ID where it failed.
