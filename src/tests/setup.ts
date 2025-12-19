import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron Inter-Process Communication (IPC)
// This simulates the window.api object exposed by preload.ts
Object.defineProperty(window, 'api', {
    value: {
        // Settings
        getSettings: vi.fn().mockResolvedValue({ apiKey: 'test-key', theme: 'dark' }),
        saveSettings: vi.fn().mockResolvedValue(true),

        // File System / Projects
        selectFolder: vi.fn().mockResolvedValue('/mock/path/project'),
        createProject: vi.fn().mockImplementation((name, loc) => Promise.resolve(`project-${Date.now()}`)),
        loadProject: vi.fn().mockResolvedValue({
            id: 'test-project-id',
            name: 'Test Project',
            created_at: new Date().toISOString(),
            items: [],
            current_index: 0
        }),
        saveProject: vi.fn().mockResolvedValue(true),
        readAudio: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        saveAudio: vi.fn().mockResolvedValue(true),
        getRecentProjects: vi.fn().mockResolvedValue([]),
        addToRecentProjects: vi.fn().mockResolvedValue(true),
        removeFromRecentProjects: vi.fn().mockResolvedValue(true),

        // AI
        generateText: vi.fn().mockResolvedValue(['Mock sentence 1.', 'Mock sentence 2.']),
        getModels: vi.fn().mockImplementation((provider) => {
            if (provider === 'openai') return Promise.resolve(['gpt-3.5-turbo', 'gpt-4o'])
            if (provider === 'gemini') return Promise.resolve(['gemini-pro', 'gemini-1.5-flash'])
            return Promise.resolve([])
        }),

        // Utils
        pathJoin: vi.fn().mockImplementation((...args) => args.join('/')),
    },
    writable: true
})

// Mock window.confirm since it's used in delete confirmations
window.confirm = vi.fn(() => true)

// Mock ScrollIntoView (used by react-window or lists often)
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn()
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// Mock AudioContext
// Mock AudioContext manual implementation for AudioVisualizer
window.AudioContext = class AudioContext {
    state = 'running'
    createAnalyser() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            getByteFrequencyData: vi.fn(),
            frequencyBinCount: 1024,
            fftSize: 2048
        }
    }
    createMediaStreamSource() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn()
        }
    }
    close() { return Promise.resolve() }
    resume() { return Promise.resolve() }
    suspend() { return Promise.resolve() }
} as any

// Mock Tone.js to avoid complex Web Audio API interactions in JSDOM
vi.mock('tone', () => ({
    context: {
        decodeAudioData: vi.fn().mockResolvedValue({
            duration: 10,
            length: 1000,
            sampleRate: 44100,
            getChannelData: () => new Float32Array(1000)
        }),
        createMediaStreamDestination: vi.fn(),
    },
    // Add other used exports if necessary
}))
// Mock MediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }] // Mock stream with stop method
        })
    }
})
