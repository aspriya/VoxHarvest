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
    file: vi.fn(),
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

    // Gaps in items:
    // Index 0: ID 1 (Recorded) -> Source file_0001
    // Index 1: ID 2 (Pending)  -> Source file_0002 (Skipped)
    // Index 2: ID 3 (Recorded) -> Source file_0003

    const mockItems = [
        { id: '1', status: 'recorded', text: 'Sentence 1', duration: 5 },
        { id: '2', status: 'pending', text: 'Sentence 2' },
        { id: '3', status: 'recorded', text: 'Sentence 3', duration: 3 }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock fs.access to succeed
        vi.mocked(fs.access).mockResolvedValue(undefined)
    })

    it('exports F5-TTS format with sequential renumbering', async () => {
        const result = await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'f5')

        expect(result).toBe(mockDestination)
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        // Check Files: Source (based on org index) -> Target (sequential)
        // Item 1 (Idx 0) -> Source file_0001.wav -> Target file_0001.wav
        // Item 3 (Idx 2) -> Source file_0003.wav -> Target file_0002.wav

        // We can check archive.file calls
        // 1st call
        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0001.wav'), { name: 'dataset/wavs/file_0001.wav' })
        // 2nd call
        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0003.wav'), { name: 'dataset/wavs/file_0002.wav' })

        // Verify JSONMetadata matches Target filenames
        const expectedJSON = [
            { audio_path: "wavs/file_0001.wav", text: "Sentence 1", duration: 5 },
            { audio_path: "wavs/file_0002.wav", text: "Sentence 3", duration: 3 }
        ]
        expect(archiveInstance.append).toHaveBeenCalledWith(JSON.stringify(expectedJSON, null, 2), { name: 'dataset/dataset.json' })
    })

    it('exports Piper format (CSV) with renumbering', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'piper')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0003.wav'), { name: 'dataset/wavs/file_0002.wav' })

        const expectedCSV = "file_0001|Sentence 1\nfile_0002|Sentence 3"
        expect(archiveInstance.append).toHaveBeenCalledWith(expectedCSV, { name: 'dataset/metadata.csv' })
    })

    it('exports XTTS v2 format (CSV) with renumbering', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'xtts', 'Ashan')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0003.wav'), { name: 'dataset/wavs/file_0002.wav' })

        const expectedCSV = "wavs/file_0001.wav|Sentence 1|Ashan\nwavs/file_0002.wav|Sentence 3|Ashan"
        expect(archiveInstance.append).toHaveBeenCalledWith(expectedCSV, { name: 'dataset/metadata.csv' })
    })

    it('exports Fish Speech format with renumbering', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'fish', 'Speaker_1')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0003.wav'), { name: 'dataset/data/Speaker_1/file_0002.wav' })
        expect(archiveInstance.append).toHaveBeenCalledWith('Sentence 3', { name: 'dataset/data/Speaker_1/file_0002.lab' })
    })
})
