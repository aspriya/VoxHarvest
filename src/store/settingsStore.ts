import { create } from 'zustand'
import { Settings, SoundProfile } from '@/types'

interface SettingsState extends Settings {
    setApiKey: (provider: 'openai' | 'gemini', key: string) => void
    setProvider: (provider: 'openai' | 'gemini') => void
    setModel: (model: string) => void
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    addRecentProject: (project: { id: string, name: string, path: string }) => void
    addProfile: (profile: SoundProfile) => void
    removeProfile: (id: string) => void
    loadSettings: () => Promise<void>
    saveSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    openaiApiKey: '',
    geminiApiKey: '',
    selectedProvider: 'openai',
    selectedModel: '',
    theme: 'dark',
    recentProjects: [],
    soundProfiles: [],

    setApiKey: (provider, key) => {
        if (provider === 'openai') set({ openaiApiKey: key })
        else set({ geminiApiKey: key })
        setTimeout(() => get().saveSettings(), 0)
    },
    setProvider: (provider) => {
        set({ selectedProvider: provider })
        setTimeout(() => get().saveSettings(), 0)
    },
    setModel: (model) => {
        set({ selectedModel: model })
        setTimeout(() => get().saveSettings(), 0)
    },
    setTheme: (theme) => {
        set({ theme })
        setTimeout(() => get().saveSettings(), 0)
    },

    addRecentProject: (project) => {
        const newRecent = { ...project, lastOpened: new Date().toISOString() }
        set(state => {
            const current = state.recentProjects || []
            const filtered = current.filter(p => p.path !== project.path)
            return { recentProjects: [newRecent, ...filtered].slice(0, 10) }
        })
        setTimeout(() => get().saveSettings(), 0)
    },

    addProfile: (profile) => {
        set(state => ({ soundProfiles: [...(state.soundProfiles || []), profile] }))
        setTimeout(() => get().saveSettings(), 0)
    },

    removeProfile: (id) => {
        set(state => ({ soundProfiles: (state.soundProfiles || []).filter(p => p.id !== id) }))
        setTimeout(() => get().saveSettings(), 0)
    },

    loadSettings: async () => {
        try {
            const settings = await window.api.getSettings()
            console.log('Loaded settings:', settings)
            if (settings) {
                set({
                    openaiApiKey: settings.openaiApiKey || '',
                    geminiApiKey: settings.geminiApiKey || '',
                    selectedProvider: settings.selectedProvider || 'openai',
                    selectedModel: settings.selectedModel || '',
                    theme: settings.theme || 'dark',
                    recentProjects: settings.recentProjects || [],
                    soundProfiles: settings.soundProfiles || []
                })
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    },

    saveSettings: async () => {
        try {
            const { openaiApiKey, geminiApiKey, selectedProvider, selectedModel, theme, recentProjects, soundProfiles } = get()
            await window.api.saveSettings({
                openaiApiKey, geminiApiKey, selectedProvider, selectedModel, theme, recentProjects, soundProfiles
            })
            console.log('Settings saved')
        } catch (error) {
            console.error('Failed to save settings:', error)
        }
    }
}))
