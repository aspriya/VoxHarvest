import { render, screen, waitFor, act } from '@testing-library/react'
import App from '../App'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import './setup'
import { useSettingsStore } from '../store/settingsStore'

describe('Application Navigation', () => {
    beforeEach(() => {
        // Reset store and mocks
        useSettingsStore.setState({
            recentProjects: [],
            openaiApiKey: '',
            theme: 'dark'
        })
        vi.clearAllMocks()
        // Reset URL hash
        window.location.hash = ''
    })

    it('TC-10.1: Loads Dashboard by default', async () => {
        render(<App />)
        await waitFor(() => {
            expect(screen.getByText('VoxHarvest')).toBeInTheDocument()
            expect(screen.getByText('Professional VITS Dataset Studio')).toBeInTheDocument()
        })
    })

    it('TC-10.2: Navigates to Settings and back', async () => {
        const user = userEvent.setup()
        render(<App />)

        // Find settings button (by icon or nearby text, simpler to look for button with specific classes or behavior?)
        // In Dashboard.tsx: <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
        // It's the only icon button in the header likely? Or we can query by icon nature.
        // Let's assume test setup allows finding by role button
        // Getting all buttons might be noisy.
        // Dashboard has: Settings button, Configure Now (if no key), New Project, Open Existing.
        // The header settings button has <Settings /> icon. 
        // We can add aria-label to Dashboard buttons for better testing, but for now rely on traversal or test-id.
        // Since I can't edit Dashboard easily right now without side tracking, I'll validly assume it's one of the buttons.
        // Actually, "Configure Now" navigates to settings too.

        await waitFor(() => expect(screen.getByText('VoxHarvest')).toBeInTheDocument())

        const buttons = screen.getAllByRole('button')
        // The settings button is likely the first one or we click "Configure Now" which definitely appears if no API key
        if (screen.queryByText('Configure Now')) {
            await user.click(screen.getByText('Configure Now'))
        } else {
            // Fallback if Logic changes, but with default store state (empty key), Configure Now shows.
            // If not, we might need a specific selector.
        }

        await waitFor(() => {
            // Verify we are on Settings Page
            // SettingsPage usually has "Settings" title or similar.
            expect(screen.getByText('Settings')).toBeInTheDocument()
            expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
        })

        // Navigate back
        // SettingsPage usually has a Back button (ArrowLeft). 
        // Let's look for a button that navigates back.
        const backBtn = screen.getAllByRole('button')[0] // Heuristic: Back button is usually first in header
        await user.click(backBtn)

        await waitFor(() => {
            expect(screen.getByText('VoxHarvest')).toBeInTheDocument()
        })
    })


})
