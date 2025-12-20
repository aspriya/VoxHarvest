import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioEditorModal } from '../components/AudioEditorModal'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock WaveSurfer
vi.mock('wavesurfer.js', () => {
    return {
        default: {
            create: vi.fn().mockReturnValue({
                on: vi.fn((event, callback) => {
                    if (event === 'ready') {
                        // Simulate ready immediately
                        setTimeout(callback, 0)
                    }
                }),
                destroy: vi.fn(),
                load: vi.fn(),
                play: vi.fn(),
                pause: vi.fn(),
                getDuration: vi.fn().mockReturnValue(10),
                registerPlugin: vi.fn(),
                setOptions: vi.fn(),
                zoom: vi.fn(),
            }),
        }
    }
})

// Mock RegionsPlugin
vi.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => {
    return {
        default: {
            create: vi.fn().mockReturnValue({
                on: vi.fn(),
                clearRegions: vi.fn(),
                addRegion: vi.fn(),
                getRegions: vi.fn().mockReturnValue([]),
            }),
        }
    }
})

// Mock TimelinePlugin
vi.mock('wavesurfer.js/dist/plugins/timeline.esm.js', () => {
    return {
        default: {
            create: vi.fn().mockReturnValue({
                on: vi.fn(),
            }),
        }
    }
})

describe('AudioEditorModal', () => {
    const mockOnClose = vi.fn()
    const mockOnSave = vi.fn()
    const mockOnPreview = vi.fn()

    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0)
            return 0
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders correctly when open', () => {
        render(
            <AudioEditorModal
                isOpen={true}
                onClose={mockOnClose}
                audioUrl="test.wav"
                text="Test Sentence"
                onSave={mockOnSave}
                onPreview={mockOnPreview}
            />
        )

        expect(screen.getByText('Audio Editor')).toBeInTheDocument()
        expect(screen.getByText('"Test Sentence"')).toBeInTheDocument()
    })

    it('initializes WaveSurfer on mount', async () => {
        render(
            <AudioEditorModal
                isOpen={true}
                onClose={mockOnClose}
                audioUrl="test.wav"
                onSave={mockOnSave}
                onPreview={mockOnPreview}
            />
        )
        // Wait for effect
        await waitFor(() => {
            const playButton = screen.getAllByRole('button')[0]
            expect(playButton).toBeInTheDocument()
        })
    })

    it('calls onSave when save button is clicked', async () => {
        render(
            <AudioEditorModal
                isOpen={true}
                onClose={mockOnClose}
                audioUrl="test.wav"
                onSave={mockOnSave}
                onPreview={mockOnPreview}
            />
        )

        // Wait for ready and state update
        await waitFor(() => {
            expect(screen.getByText(/0.00s - 10.00s/)).toBeInTheDocument()
        })

        const saveButton = screen.getByText('Save & Apply')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalled()
        })
    })

    it('toggles noise reduction', () => {
        render(
            <AudioEditorModal
                isOpen={true}
                onClose={mockOnClose}
                audioUrl="test.wav"
                onSave={mockOnSave}
                onPreview={mockOnPreview}
            />
        )

        const toggleButton = screen.getByText('Disabled')
        fireEvent.click(toggleButton)
        expect(screen.getByText('Enabled')).toBeInTheDocument()
    })

    it('calls onPreview when preview button is clicked', async () => {
        render(
            <AudioEditorModal
                isOpen={true}
                onClose={mockOnClose}
                audioUrl="test.wav"
                onSave={mockOnSave}
                onPreview={mockOnPreview}
            />
        )

        // Wait for ready
        await waitFor(() => {
            expect(screen.getByText(/0.00s - 10.00s/)).toBeInTheDocument()
        })

        // Enable noise reduction to enable preview button
        const toggleButton = screen.getByText('Disabled')
        fireEvent.click(toggleButton)

        const previewButton = screen.getByTitle('Hear what the audio sounds like with effects applied')
        fireEvent.click(previewButton)

        await waitFor(() => {
            expect(mockOnPreview).toHaveBeenCalled()
        })
    })
})
