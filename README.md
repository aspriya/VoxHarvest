# 🎙️ VoxHarvest

> **Precision-Crafted TTS Dataset Creation for Mixed-Language Synthesis.**

**VoxHarvest** is a specialized desktop application designed to streamline the creation of high-quality Text-to-Speech (TTS) datasets. Built with a unique focus on **code-switching workflows** (e.g., blending a native language with English), it provides a seamless, end-to-end solution from script management to export-ready VITS training data.

Whether you are building a voice model for a local dialect, a mixed-language chatbot, or a high-fidelity audiobook narrator, VoxHarvest simplifies the most tedious part of the process: **Data Preparation**.

## 🚀 Why VoxHarvest?

Creating datasets for modern TTS models like VITS requires more than just recording audio. You need precise segmentation, consistent silence trimming, and perfect alignment between text and audio. VoxHarvest solves this by offering:

*   **⚡ Mixed-Language Support:** Specifically optimized for handling scripts that blend a primary language (such as **Sinhala**) with English, essential for building robust modern TTS models that handle code-switching naturally.
*   **🎯 Precision Recording:** Integrated noise gate and silence detection ensure you capture only what matters—clean, usable audio.
*   **✂️ Built-in Audio Editor:** Trim, cut, and normalize clips instantly without leaving the app. Use the specialized "Audio Editor" modal for fine-tuning.
*   **📊 Project Management:** Organize thousands of clips (sentences) into manageable projects with clear status tracking (Recorded, Skipped, Verified).
*   **🤖 One-Click Export:** Generates the exact directory structure and metadata files required for **VITS fast fine-tuning** on Google Colab. No more manual file renaming!

## ✨ Key Features

-   **Smart Script Import:** Load your sentences from `.txt` files directly into the workflow.
-   **Visual Audio Waveforms:** See exactly what you're recording with real-time waveform visualization.
-   **Quality Assurance:** Review mode allows you to listen back and re-record snippets instantly.
-   **VITS-Ready Output:** Exports a `.zip` file containing `wavs/` and formatted `metadata.csv` (pipe-separated) ready for training.
-   **Metadata Management:** Automatically handles speaker IDs (e.g., `MyVoice`) and file numbering (`file_001.wav`).

## 🛠️ Built With

*   **Core:** [Electron](https://www.electronjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
*   **Audio Processing:** [Wavesurfer.js](https://wavesurfer-js.org/) & [FFmpeg](https://ffmpeg.org/)

## 📦 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/aspriya/VoxHarvest.git
    cd VoxHarvest
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    This will launch the Electron window.

### Building for Production

To create a distributable installer (exe/dmg/deb):

```bash
npm run build
```

## 📖 Usage Guide

1.  **Create a Project:** Launch VoxHarvest and click "New Project". Give it a name (e.g., "News_Dataset_v1").
2.  **Import Script:** Upload a text file containing your sentences (one per line).
3.  **Start Recording:**
    *   Click the microphone icon to start.
    *   Read the displayed sentence.
    *   Stop recording. The app automatically saves the clip.
4.  **Edit & Review:** If a clip has too much silence, open the Editor to trim it.
5.  **Export:** Go to Settings or the Project Dashboard and click "Export Dataset". This creates a `.zip` file.
6.  **Train:** Upload the `.zip` to your VITS Fine-Tuning Colab notebook and start training!

## 🛣️ Roadmap

- [ ] Automated aligner integration (Montreal Forced Aligner).
- [ ] Multi-speaker project support.
- [ ] Auto-transcription for unscripted audio import.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by [Ashan] for the TTS Community.
</p>
