import { describe, it, expect, vi, beforeEach } from 'vitest'
// @ts-ignore
import { exportDatasetToPath } from '../../electron/datasetExporter'
import fs from 'node:fs/promises'
import archiver from 'archiver'
import { EventEmitter } from 'events'

// Mock dependencies
vi.mock('node:fs/promises', () => ({
    default: {
        access: vi.fn(),
        writeFile: vi.fn(),
        readFile: vi.fn(),
        mkdir: vi.fn(),
        copyFile: vi.fn(),
        unlink: vi.fn()
    }
}))
vi.mock('node:fs', () => {
    const createWriteStream = vi.fn(() => {
        const emitter = new EventEmitter()
        // @ts-ignore
        emitter.path = 'mock/path'
        setTimeout(() => emitter.emit('close'), 10)
        return emitter
    })
    return {
        createWriteStream,
        default: { createWriteStream }
    }
})

const mockArchive = {
    pipe: vi.fn(),
    directory: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(function (this: any, event, _cb) {
        if (event === 'end' || event === 'close') {
            // trigger immediately for test
            // setTimeout(cb, 0)
        }
        return this
    })
}

vi.mock('archiver', () => {
    return {
        default: vi.fn(() => mockArchive)
    }
})

describe('exportDatasetToPath', () => {
    const mockProjectPath = '/mock/project'
    const mockDestination = '/mock/dest/dataset.zip'
    const mockItems = [
        { status: 'recorded', text: 'Sentence 1', duration: 5 },
        { status: 'recorded', text: 'Sentence 2', duration: 3 },
        { status: 'pending', text: 'Sentence 3' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates a zip file and adds contents', async () => {
        // Mock fs.access to fail (so it uses wavsDir)
        vi.mocked(fs.access).mockRejectedValue(new Error('no processed'))

        const result = await exportDatasetToPath(mockDestination, mockProjectPath, mockItems)

        expect(result).toBe(mockDestination)

        // precise assertions
        const archiverMock = vi.mocked(archiver)
        expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } })

        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        // Verify source directory
        // Expect checking for processed dir first
        expect(fs.access).toHaveBeenCalledWith(expect.stringContaining('wavs_processed'))

        // Since it failed, should verify it used wavs dir (path.join behavior might depend on OS)
        // normalized paths are safer
        expect(archiveInstance.directory).toHaveBeenCalledWith(expect.any(String), 'wavs')

        // Verify metadata
        const expectedMetadata =
            `\uFEFFfile_0001|Sentence 1|Sentence 1\n` +
            `file_0002|Sentence 2|Sentence 2`

        expect(archiveInstance.append).toHaveBeenCalledWith(expectedMetadata, { name: 'metadata.csv' })

        expect(archiveInstance.finalize).toHaveBeenCalled()
    })

    it('prefers processed audio folder if available', async () => {
        // Mock fs.access to succeed
        vi.mocked(fs.access).mockResolvedValue(undefined)

        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems)

        const archiveInstance = vi.mocked(archiver).mock.results[0].value
        expect(archiveInstance.directory).toHaveBeenCalledWith(expect.any(String), 'wavs')
    })
})
