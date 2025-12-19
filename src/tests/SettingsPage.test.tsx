import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SettingsPage from '@/pages/SettingsPage'
import { MemoryRouter } from 'react-router-dom'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}))

// Mock API is already setup in testing/setup.ts but we can spy on it if needed
// Or rely on the fact that store calls mock API

describe('SettingsPage', () => {

    it('renders the settings form correctly', () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        )

        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
        expect(screen.getByText('Save Configuration')).toBeInTheDocument()
    })

    it('TC-1.1: Allows entering an API key and saving', async () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        )

        const keyInput = screen.getByLabelText(/OpenAI API Key/i)
        fireEvent.change(keyInput, { target: { value: 'sk-test-key-123' } })
        expect(keyInput).toHaveValue('sk-test-key-123')

        const saveBtn = screen.getByText('Save Configuration')
        fireEvent.click(saveBtn)

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                title: "Settings Saved"
            }))
        })

        // Additional verification: check if window.api.saveSettings was called
        // Since we mocked window.api in setup.ts as a global property
        expect(window.api.saveSettings).toHaveBeenCalled()
    })

    it('handles provider switching', () => {
        render(
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        )

        // Select Gemini
        // We find the radio item. Radix UI hides the input, so we might need to click the label.
        // The label has htmlFor="gemini"
        const geminiLabel = screen.getByLabelText(/Google Gemini/i)
        fireEvent.click(geminiLabel)

        // Check if OpenAI input is disabled (based on logic in SettingsPage)
        const openAIInput = screen.getByLabelText(/OpenAI API Key/i)
        expect(openAIInput).toBeDisabled()

        const geminiInput = screen.getByLabelText(/Gemini API Key/i)
        expect(geminiInput).not.toBeDisabled()
    })
})
