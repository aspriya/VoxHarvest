# VoxHarvest Desktop - User Guide

Welcome to **VoiceForge Desktop**! This guide is designed to help you run, understand, and build the application, even if you have zero prior experience with Electron.

## 1. Prerequisites
Before you begin, ensure you have **Node.js** installed.
-   **Check**: Open your terminal (Command Prompt or PowerShell) and type `node -v`.
-   **Install**: If not installed, download the LTS version from [nodejs.org](https://nodejs.org/).

## 2. Quick Start (Development)
To run the application in "Development Mode" (where you can edit code and see changes instantly):

1.  **Open Terminal**: Navigate to the project folder:
    ```bash
    cd "d:\Ashan Personal\VoiceForge"
    ```
2.  **Install Dependencies** (Only needed the first time):
    ```bash
    npm install
    ```
    *This downloads all the implementation libraries (React, Electron, Tone.js, etc.) into a `node_modules` folder.*

3.  **Start the App**:
    ```bash
    npm run dev
    ```
    *This command will launch the VoiceForge window. Keep the terminal open while you use the app. If you close the terminal, the app will close.*

## 3. How it Works (For Beginners)
Electron apps are like web browsers that can talk to your computer's system.
*   **The "Main" Process (`electron/main.ts`)**: This is the "Backend" running on your computer. It handles:
    *   Saving files (your recordings).
    *   Creating the application window.
    *   talking to the operating system.
*   **The "Renderer" Process (`src/`)**: This is the "Frontend" (React). It handles:
    *   The UI you see (Buttons, Sliders).
    *   Recording your microphone.
    *   Playing audio effects.

## 4. Key Features to Try
1.  **Settings**: Click the Gear icon. Enter your OpenAI or Gemini API Key to enable script generation.
2.  **Dashboard**: Create a new project (e.g., "My Voice Clone").
3.  **Studio**:
    *   **Generate Script**: Click the "+" button, enter a topic (e.g., "Mars Colonization"), and get sentences.
    *   **Record**: Press `SPACE` or the Microphone button.
    *   **Effects**: Use the "Voice Designer" rack on the right to change Pitch or EQ.
    *   **Apply**: Click "Apply to Project" to process all your recordings with the current effects.
    *   **Export**: Click "Export Dataset" to get a Zip file ready for AI training.

## 5. Building for Production
If you want to create a standalone `.exe` file to share with others:

1.  **Run Build Command**:
    ```bash
    npm run build
    ```
2.  **Locate Installer**:
    Once finished, check the `dist` or `release` folder in your project directory. You will find an installer file there.

## Troubleshooting
*   **"Mic access denied"**: Ensure you have allowed microphone access in your Windows Privacy Settings.
*   **"ffmpeg not found"**: The app uses a built-in ffmpeg, but if you get errors, ensure your antivirus isn't blocking the temp folder.
