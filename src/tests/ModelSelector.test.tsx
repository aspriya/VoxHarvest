import { render, screen, waitFor, act } from '@testing-library/react'
import { ModelSelector } from '../components/script-gen/ModelSelector'
import { useSettingsStore } from '../store/settingsStore'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import './setup'

describe('ModelSelector', () => {
    beforeEach(() => {
        useSettingsStore.setState({
            selectedProvider: 'openai',
            selectedModel: '',
            openaiApiKey: 'test-key'
        })
        vi.clearAllMocks()
    })

    it('TC-9.1: Fetches and displays models on mount', async () => {
        render(<ModelSelector />)

        // It should call getModels
        expect(window.api.getModels).toHaveBeenCalledWith('openai')

        // Should eventually show the select (using data from setup.ts mock: gpt-3.5-turbo, gpt-4o)
        // Since we auto-select the first one if empty
        await waitFor(() => {
            const trigger = screen.getByRole('combobox') // Radix UI Select trigger
            expect(trigger).toHaveTextContent('gpt-3.5-turbo')
        })
    })

    it('TC-9.2: Allows changing model', async () => {
        const user = userEvent.setup()
        render(<ModelSelector />)

        // Wait for load
        await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('gpt-3.5-turbo'))

        // Open dropdown
        await user.click(screen.getByRole('combobox'))

        // Select gpt-4o (Radix UI renders options in a separate portal but testing-library usually finds them if we use correct query)
        // Radix options are usually 'option' role or just text
        const option = await screen.findByText('gpt-4o')
        await user.click(option)

        // Verify store update
        expect(useSettingsStore.getState().selectedModel).toBe('gpt-4o')
    })

    it('TC-9.3: Refreshes models on button click', async () => {
        const user = userEvent.setup()
        render(<ModelSelector />)

        const refreshBtn = screen.getByRole('button', { name: /Refresh Models/i }) // check logic for aria-label or title title="Refresh Models"

        // Clear mock to track new call
        vi.clearAllMocks()

        await user.click(refreshBtn)

        expect(window.api.getModels).toHaveBeenCalledTimes(1)
    })
})
