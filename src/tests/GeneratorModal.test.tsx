import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GeneratorModal from '@/components/script-gen/GeneratorModal'
import { Dialog } from '@/components/ui/dialog'
import { useProjectStore } from '@/store/projectStore'
import userEvent from '@testing-library/user-event'

// Mock store
vi.mock('@/store/projectStore', () => ({
    useProjectStore: vi.fn()
}))

// Wrapper to render Dialog content
const renderModal = (props: any) => {
    return render(
        <Dialog open={props.isOpen}>
            <GeneratorModal {...props} />
        </Dialog>
    )
}

describe('GeneratorModal', () => {
    const mockOnGenerate = vi.fn()
    const mockOnClose = vi.fn()
    const mockUpdateGenSettings = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
            // Mock return of useProjectStore
            ; (useProjectStore as any).mockReturnValue({
                currentProject: { genSettings: {} },
                updateGenSettings: mockUpdateGenSettings
            })
    })

    it('TC-3.1: Simple Generation Mode', async () => {
        const user = userEvent.setup()
        renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onGenerate: mockOnGenerate,
            isGenerating: false
        })

        // Should start in Simple mode
        expect(screen.getByText('Simple')).toHaveAttribute('data-state', 'active')

        // Fill inputs
        const topicInput = screen.getByLabelText('Topic')
        await user.type(topicInput, 'Space')

        const countInput = screen.getByLabelText('Count')
        await user.clear(countInput)
        await user.type(countInput, '5')

        // Click Generate
        const generateBtn = screen.getByText('Generate')
        expect(generateBtn).toBeEnabled()
        await user.click(generateBtn)

        await waitFor(() => {
            // onGenerate(topic, count)
            expect(mockOnGenerate).toHaveBeenCalledWith('Space', 5)
        })
    })

    it('TC-3.2: Advanced Generation Mode', async () => {
        const user = userEvent.setup()
        renderModal({
            isOpen: true,
            onClose: mockOnClose,
            onGenerate: mockOnGenerate,
            isGenerating: false
        })

        // Switch to Advanced
        const advancedTab = screen.getByText('Advanced')
        await user.click(advancedTab)

        // Wait for tab switch
        await waitFor(() => {
            expect(screen.getByLabelText('Domain / Context')).toBeInTheDocument()
        })

        // Fill details
        const domainInput = screen.getByLabelText('Domain / Context')
        await user.type(domainInput, 'Tech Review')

        const countInput = screen.getByLabelText('Sentence Count')
        await user.clear(countInput)
        await user.type(countInput, '10')

        // Click Generate
        const generateBtn = screen.getByText('Generate')
        await user.click(generateBtn)

        await waitFor(() => {
            // Expect updateGenSettings to save pref
            expect(mockUpdateGenSettings).toHaveBeenCalledWith(expect.objectContaining({
                domain: 'Tech Review'
            }))

            // Expect onGenerate(prompt, count, systemPrompt)
            expect(mockOnGenerate).toHaveBeenCalledWith(
                'Generate 10 sentences.',
                10,
                expect.stringContaining('Sinhala')
            )
        })
    })
})
