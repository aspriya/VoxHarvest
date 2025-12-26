import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptManagerModal from '@/components/ScriptManagerModal'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock Project Items
const mockItems = [
    // Mixed status items
    { id: '1', text: 'Sentence one.', status: 'recorded' as const, duration: 1.5 },
    { id: '2', text: 'Sentence two.', status: 'pending' as const, duration: 0 },
    { id: '3', text: 'Sentence three.', status: 'pending' as const, duration: 0 },
]

// Mock ScrollArea to avoid ResizeObserver errors in JSDOM
// Element.prototype.scrollTo is often missing too.
vi.mock("@/components/ui/scroll-area", () => ({
    ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>
}))


describe('ScriptManagerModal', () => {
    const mockClose = vi.fn()
    const mockAddItems = vi.fn()
    const mockDeleteItem = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('renders correctly when open', () => {
        render(
            <ScriptManagerModal
                isOpen={true}
                onClose={mockClose}
                items={mockItems}
                onAddItems={mockAddItems}
                onDeleteItem={mockDeleteItem}
            />
        )

        expect(screen.getByText('Script Manager')).toBeInTheDocument()
        expect(screen.getByText('Sentence List')).toBeInTheDocument()
        expect(screen.getByText('Bulk Add')).toBeInTheDocument()

        expect(screen.getByText('1')).toBeInTheDocument()
    })

    test('renders nothing when closed', () => {
        const { queryByText } = render(
            <ScriptManagerModal
                isOpen={false}
                onClose={mockClose}
                items={mockItems}
                onAddItems={mockAddItems}
                onDeleteItem={mockDeleteItem}
            />
        )
        expect(queryByText('Script Manager')).not.toBeInTheDocument()
    })

    test('switches tabs', async () => {
        const user = userEvent.setup()
        render(
            <ScriptManagerModal
                isOpen={true}
                onClose={mockClose}
                items={[]}
                onAddItems={mockAddItems}
                onDeleteItem={mockDeleteItem}
            />
        )

        // Switch to Add - use getByRole for tab
        const tab = screen.getByRole('tab', { name: /bulk add/i })
        await user.click(tab)

        expect(await screen.findByPlaceholderText('Paste your script content here...')).toBeInTheDocument()
    })

    test('handles bulk add', async () => {
        const user = userEvent.setup()
        render(
            <ScriptManagerModal
                isOpen={true}
                onClose={mockClose}
                items={[]}
                onAddItems={mockAddItems}
                onDeleteItem={mockDeleteItem}
            />
        )

        const tab = screen.getByRole('tab', { name: /bulk add/i })
        await user.click(tab)

        const textarea = await screen.findByPlaceholderText('Paste your script content here...')
        await user.click(textarea)
        await user.paste('Line 1\nLine 2\nLine 3')

        const addButton = screen.getByRole('button', { name: /add to project/i })
        await user.click(addButton)

        // Parse check
        // expect(mockAddItems).toHaveBeenCalledWith(expect.arrayContaining(['Line 1', 'Line 2', 'Line 3']))
        expect(mockAddItems).toHaveBeenCalledTimes(1)
        expect(mockAddItems.mock.calls[0][0]).toHaveLength(3)
        expect(mockAddItems.mock.calls[0][0]).toEqual(['Line 1', 'Line 2', 'Line 3'])
    })
})
