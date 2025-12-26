import { create } from 'zustand'
import { Project, ProjectItem, TempRecording } from '@/types'

interface ProjectState {
    currentProject: Project | null
    items: ProjectItem[]
    currentItemIndex: number

    // Actions
    loadProject: (project: Project) => void
    setItems: (items: ProjectItem[]) => void
    addItems: (newItems: ProjectItem[]) => void
    setCurrentIndex: (index: number) => void
    nextItem: () => void
    prevItem: () => void
    updateItemStatus: (id: string, status: ProjectItem['status'], duration?: number) => void
    resetItemStatus: (id: string) => void
    saveProject: () => Promise<void>
    // Temp Recording Actions
    addTempRecording: (recording: TempRecording) => void
    deleteTempRecording: (id: string) => Promise<void>
    // Gen Settings
    updateGenSettings: (settings: import('@/types').GenerationSettings) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    currentProject: null,
    items: [],
    currentItemIndex: 0,

    loadProject: (project) => {
        set({
            currentProject: project,
            items: project.items || [],
            currentItemIndex: project.currentIndex || 0
        })
    },

    setItems: (items) => set({ items }),

    addItems: (newItems) => {
        set(state => ({
            items: [...state.items, ...newItems]
        }))
        get().saveProject()
    },

    setCurrentIndex: (index) => {
        const { items } = get()
        if (index >= 0 && index < items.length) {
            set({ currentItemIndex: index })
        }
    },

    nextItem: () => {
        const { currentItemIndex, items } = get()
        if (currentItemIndex < items.length - 1) {
            set({ currentItemIndex: currentItemIndex + 1 })
        }
    },

    prevItem: () => {
        const { currentItemIndex } = get()
        if (currentItemIndex > 0) {
            set({ currentItemIndex: currentItemIndex - 1 })
        }
    },

    updateItemStatus: (id, status, duration) => {
        set(state => ({
            items: state.items.map(item =>
                item.id === id ? { ...item, status, duration: duration ?? item.duration } : item
            )
        }))
        // Trigger auto-save
        get().saveProject()
    },

    resetItemStatus: (id) => {
        set(state => ({
            items: state.items.map(item =>
                item.id === id ? { ...item, status: 'pending', duration: 0 } : item
            )
        }))
        get().saveProject()
    },

    addTempRecording: (recording) => {
        set(state => {
            const currentTemp = state.currentProject?.tempRecordings || []
            return {
                currentProject: state.currentProject ? {
                    ...state.currentProject,
                    tempRecordings: [...currentTemp, recording]
                } : null
            }
        })
        get().saveProject()
    },

    deleteTempRecording: async (id) => {
        const { currentProject } = get()
        if (!currentProject || !currentProject.tempRecordings) return

        const recording = currentProject.tempRecordings.find(r => r.id === id)
        if (!recording) return

        // Delete from internal list
        set(state => ({
            currentProject: state.currentProject ? {
                ...state.currentProject,
                tempRecordings: (state.currentProject.tempRecordings || []).filter(r => r.id !== id)
            } : null
        }))

        // Delete actual file
        const filePath = `${currentProject.path}\\wavs\\${recording.path}`
        await window.api.deleteFile(filePath)

        get().saveProject()
    },

    updateGenSettings: (settings) => {
        set(state => ({
            currentProject: state.currentProject ? {
                ...state.currentProject,
                genSettings: settings
            } : null
        }))
        get().saveProject()
    },

    saveProject: async () => {
        const { currentProject, items, currentItemIndex } = get()
        if (!currentProject) return

        // Update local object
        const updatedProject: Project = {
            ...currentProject,
            items,
            currentIndex: currentItemIndex,
            tempRecordings: currentProject.tempRecordings,
            genSettings: currentProject.genSettings
        }

        // Persist to disk (IPC)
        try {
            await window.api.saveProject(updatedProject)
            console.log('Project saved successfully.')
        } catch (e) {
            console.error('Failed to save project:', e)
        }
    }
}))
