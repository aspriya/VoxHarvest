import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProjectPage from '../pages/ProjectPage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { useSettingsStore } from '@/store/settingsStore'

// Mocks
vi.mock('@/components/EffectRack', () => ({
    EffectRack: () => <div data-testid="effect-rack">Effect Rack</div>
}))
vi.mock('@/components/AudioVisualizer', () => ({
    default: () => <div data-testid="audio-visualizer">Visualizer</div>
}))

const mockProject = {
    id: 'test-project',
    name: 'Test Project',
    path: '/mock/path',
    created_at: new Date().toISOString(),
    items: [
        { id: '1', text: 'Sentence 1', status: 'pending', duration: 0 },
        { id: '2', text: 'Sentence 2', status: 'recorded', duration: 5 }
    ],
    current_index: 0
}

describe('ProjectPage Feature', () => {
    beforeEach(() => {
        useProjectStore.getState().loadProject(mockProject as any)
        useSettingsStore.setState({ openaiApiKey: 'test-key' })
        vi.clearAllMocks()
    })

    const renderPage = () => {
        render(
            <MemoryRouter initialEntries={['/project/test-project']}>
                <Routes>
                    <Route path="/project/:id" element={<ProjectPage />} />
                </Routes>
            </MemoryRouter>
        )
    }

    it('verifies Clear Recording (Reset) functionality', async () => {
        renderPage()
        const user = userEvent.setup()

        // Wait for page load by checking for a known item
        await waitFor(() => expect(screen.getByText('Sentence 2')).toBeInTheDocument())

        // Find the recorded item (Sentence 2)
        const recordedItem = screen.getByText('Sentence 2').closest('div[class*="flex items-center group"]')
        expect(recordedItem).toBeInTheDocument()

        // Find Reset Button
        const resetButton = within(recordedItem as HTMLElement).getByTitle('Clear Recording (Keep Text)')

        // Mock confirm to true
        vi.mocked(window.confirm).mockReturnValueOnce(true)

        // Click Reset
        await user.click(resetButton)

        // Verify API Call
        expect(window.api.deleteFile).toHaveBeenCalledWith(expect.stringContaining('file_0002.wav'))

        // Verify UI update: Play button should disappear, indicating status change to pending
        await waitFor(() => {
            const playButton = within(recordedItem as HTMLElement).queryByTitle('Play')
            expect(playButton).not.toBeInTheDocument()
        })
    })
})
