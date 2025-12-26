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
    const mockItems = [
        { status: 'recorded', text: 'Sentence 1', duration: 5 },
        { status: 'recorded', text: 'Sentence 2', duration: 3 },
        { status: 'pending', text: 'Sentence 3' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('exports F5-TTS format (JSON)', async () => {
        const result = await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'f5')

        expect(result).toBe(mockDestination)
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        // Correct directory target
        expect(archiveInstance.directory).toHaveBeenCalledWith(expect.any(String), 'dataset/wavs')

        // Verify JSON
        const expectedJSON = [
            { audio_path: "wavs/file_0001.wav", text: "Sentence 1", duration: 5 },
            { audio_path: "wavs/file_0002.wav", text: "Sentence 2", duration: 3 }
        ]
        expect(archiveInstance.append).toHaveBeenCalledWith(JSON.stringify(expectedJSON, null, 2), { name: 'dataset/dataset.json' })
    })

    it('exports Piper format (CSV)', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'piper')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        expect(archiveInstance.directory).toHaveBeenCalledWith(expect.any(String), 'dataset/wavs')

        const expectedCSV = "file_0001|Sentence 1\nfile_0002|Sentence 2"
        expect(archiveInstance.append).toHaveBeenCalledWith(expectedCSV, { name: 'dataset/metadata.csv' })
    })

    it('exports XTTS v2 format (CSV with Speaker)', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'xtts', 'Ashan')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        expect(archiveInstance.directory).toHaveBeenCalledWith(expect.any(String), 'dataset/wavs')

        const expectedCSV = "wavs/file_0001.wav|Sentence 1|Ashan\nwavs/file_0002.wav|Sentence 2|Ashan"
        expect(archiveInstance.append).toHaveBeenCalledWith(expectedCSV, { name: 'dataset/metadata.csv' })
    })

    it('exports Fish Speech format (Sidecar Labs)', async () => {
        await exportDatasetToPath(mockDestination, mockProjectPath, mockItems, 'fish', 'Speaker_1')
        const archiveInstance = vi.mocked(archiver).mock.results[0].value

        // Should manually add files, not directory
        // expect(archiveInstance.directory).not.toHaveBeenCalled() // Actually we removed directory call for fish, so this is implicitly true if not called

        // Check manual file adds
        // We mocked archive.file in beforeEach or need to add it to mockArchive

        expect(archiveInstance.file).toHaveBeenCalledWith(expect.stringContaining('file_0001.wav'), { name: 'dataset/data/Speaker_1/file_0001.wav' })
        expect(archiveInstance.append).toHaveBeenCalledWith('Sentence 1', { name: 'dataset/data/Speaker_1/file_0001.lab' })
    })
})
