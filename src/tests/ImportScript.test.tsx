import { render, screen, waitFor, act } from '@testing-library/react'
import App from '../App'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import './setup'
import { useSettingsStore } from '../store/settingsStore'
import { useProjectStore } from '../store/projectStore'

describe('Import Script', () => {
    beforeEach(() => {
        // Reset store and mocks
        useSettingsStore.setState({
            recentProjects: [],
            openaiApiKey: 'test-key',
            theme: 'dark'
        })
        useProjectStore.setState({
            currentProject: {
                id: 'test-proj',
                name: 'Test Project',
                path: 'C:/Test',
                items: [],
                createdAt: '',
                languageMode: 'Sinhala',
                targetSampleRate: 22050,
                currentIndex: 0
            },
            items: []
        })
        vi.clearAllMocks()
        // Mock importScriptFile default
        window.api.importScriptFile = vi.fn().mockResolvedValue(null)
    })

    it('TC-10.1: Imports sentences from TXT file', async () => {
        const user = userEvent.setup()

        // Mock import to return content
        const mockContent = "First Sentence\nSecond Sentence\n\nThird Sentence  "
        window.api.importScriptFile = vi.fn().mockResolvedValue(mockContent)

        // Mock loadProject to simple success to avoid initial loading delay
        // But since we pre-set useProjectStore, ProjectPage might still try to load if route param mismatches.
        // Let's render ProjectPage directly with path override if possible?
        // App uses HashRouter.
        // If we set window.location.hash = '#/project/test-proj', App should render ProjectPage.

        window.location.hash = '#/project/test-proj'

        // Mock loadProject to just return current project to satisfy useEffect
        const testProject = useProjectStore.getState().currentProject!
        window.api.loadProject = vi.fn().mockResolvedValue(testProject)
        useProjectStore.getState().loadProject(testProject) // Ensure store state is sync

        render(<App />)

        // Wait for ProjectPage title
        await waitFor(() => expect(screen.getByText('Test Project')).toBeInTheDocument())

        // Find Import Button (Icon FileText)
        const importBtn = screen.getByTitle('Import TXT')
        expect(importBtn).toBeInTheDocument()

        await user.click(importBtn)

        // API should be called
        expect(window.api.importScriptFile).toHaveBeenCalled()

        // Verify items in store/UI
        // Verify items in store/UI
        await waitFor(() => {
            // Verify items count in UI
            expect(screen.getByText('Script (3)')).toBeInTheDocument()

            // Verify items in store (since virtualization might hide them in JSDOM)
            const items = useProjectStore.getState().items
            expect(items).toHaveLength(3)
            expect(items[0].text).toBe('First Sentence')
            expect(items[1].text).toBe('Second Sentence')
            expect(items[2].text).toBe('Third Sentence')
        })
    })

    it('TC-10.2: Handles empty file or cancel', async () => {
        const user = userEvent.setup()
        window.location.hash = '#/project/test-proj'
        const testProject = useProjectStore.getState().currentProject!
        window.api.loadProject = vi.fn().mockResolvedValue(testProject)

        render(<App />)
        await waitFor(() => expect(screen.getByText('Test Project')).toBeInTheDocument())

        // Case 1: Cancel (returns null)
        window.api.importScriptFile = vi.fn().mockResolvedValue(null)
        await user.click(screen.getByTitle('Import TXT'))

        // No change
        expect(screen.getByText('Script (0)')).toBeInTheDocument()

        // Case 2: Empty string
        window.api.importScriptFile = vi.fn().mockResolvedValue("   \n   ")
        await user.click(screen.getByTitle('Import TXT'))

        expect(screen.getByText('Script (0)')).toBeInTheDocument()
    })
})
