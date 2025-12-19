export interface Project {
    id: string;
    name: string;
    path: string;
    createdAt: string;
    languageMode: 'Sinhala' | 'Singlish';
    targetSampleRate: number;
    currentIndex: number;
    items: ProjectItem[];
    tempRecordings?: TempRecording[];
    genSettings?: GenerationSettings;
}

export interface GenerationSettings {
    mainLanguage: string;
    secondaryLanguage?: string;
    domain: string;
    lastPrompt?: string;
}

export interface TempRecording {
    id: string;
    name: string;
    path: string;
    timestamp: number;
    duration: number;
    settings: {
        pitch: number;
        eq: { low: number; mid: number; high: number };
    };
}

export interface ProjectItem {
    id: string;
    text: string;
    status: 'pending' | 'recorded' | 'skipped';
    duration: number;
    filePath?: string;
}

export interface RecentProject {
    id: string;
    name: string;
    path: string;
    lastOpened: string;
}

export interface SoundProfile {
    id: string;
    name: string;
    pitch: number;
    eq: { low: number; mid: number; high: number };
}

export interface Settings {
    openaiApiKey?: string;
    geminiApiKey?: string;
    selectedProvider?: 'openai' | 'gemini';
    selectedModel?: string; // Phase 9: Dynamic model
    theme?: 'light' | 'dark' | 'system';
    recentProjects?: RecentProject[];
    soundProfiles?: SoundProfile[];
}

export interface ProjectCreationInfo {
    name: string;
    location: string;
    description?: string;
}

export interface IpcApi {
    createProject: (info: ProjectCreationInfo) => Promise<Project>;
    loadProject: (path: string) => Promise<Project>;
    saveAudio: (buffer: ArrayBuffer, filename: string, projectPath: string) => Promise<string>;
    saveProcessedAudio: (buffer: ArrayBuffer, filename: string, projectPath: string) => Promise<string>;
    exportDataset: (projectPath: string, items: ProjectItem[]) => Promise<string>;
    getSettings: () => Promise<Settings>;
    saveSettings: (settings: Settings) => Promise<void>;
    selectDirectory: () => Promise<string | undefined>;
    generateText: (prompt: string, count: number, systemPromptOverride?: string, modelId?: string) => Promise<string[]>;
    getModels: (provider: 'openai' | 'gemini') => Promise<string[]>;
    saveProject: (project: Project) => Promise<boolean>;
    readAudio: (path: string) => Promise<ArrayBuffer>;
    deleteFile: (path: string) => Promise<boolean>;
    importScriptFile: () => Promise<string | null>;
}
