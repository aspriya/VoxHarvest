import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'

export const exportDatasetToPath = async (destinationPath: string, projectPath: string, items: any[], format: 'f5' | 'piper' | 'xtts' | 'fish', speakerName: string = 'Speaker'): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const output = createWriteStream(destinationPath)
        const archive = archiver('zip', { zlib: { level: 9 } })

        output.on('close', () => {
            resolve(destinationPath)
        })

        archive.on('error', (err) => {
            reject(err)
        })

        archive.pipe(output)

        // Source WAVs
        const wavsDir = path.join(projectPath, 'wavs')
        const processedDir = path.join(projectPath, 'wavs_processed')

        // Check if processed folder exists, we will check per-file now
        try {
            await fs.access(processedDir)
        } catch { }

        // Sanitize speaker name
        const sanitizedSpeaker = speakerName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Speaker'

        const recordedItems = items.filter((i: any) => i.status === 'recorded')

        // FORMAT LOGIC
        // Export Logic using Smart Sequential Renumbering
        // We map from Source Filename (based on original index) -> Target Filename (sequential index)

        // Helper to get source filename from item original index
        // Note: We need the ORIGINAL index of the item in the full 'items' array
        // But here 'recordedItems' is a filtered list. We need to find the original index.
        // Actually 'items' is passed to the function.

        for (let i = 0; i < recordedItems.length; i++) {
            const item = recordedItems[i]
            // Find original index to locate source file
            const originalIndex = items.findIndex((i: any) => i.id === item.id)
            if (originalIndex === -1) continue // Should not happen

            const sourceFilename = `file_${String(originalIndex + 1).padStart(4, '0')}.wav`
            let sourcePath = path.join(wavsDir, sourceFilename)

            // Check processed dir first
            const processedPath = path.join(processedDir, sourceFilename)
            try {
                await fs.access(processedPath)
                sourcePath = processedPath
            } catch {
                // Fallback to wavsDir - verify it exists
                try {
                    await fs.access(sourcePath)
                } catch {
                    console.warn(`Source file missing for item ${item.text}: ${sourcePath}`)
                    continue
                }
            }

            // Define Target Filename (Sequential 1..N)
            const targetFilename = `file_${String(i + 1).padStart(4, '0')}.wav`

            // Add File to Archive
            if (format === 'fish') {
                archive.file(sourcePath, { name: `dataset/data/${sanitizedSpeaker}/${targetFilename}` })
            } else if (format === 'xtts') {
                // XTTS structure: usually flat in wavs/
                archive.file(sourcePath, { name: `dataset/wavs/${targetFilename}` })
            } else {
                // F5 and Piper: dataset/wavs/file_xxxx.wav
                archive.file(sourcePath, { name: `dataset/wavs/${targetFilename}` })
            }
        }

        // Generate Metadata
        if (format === 'f5') {
            const jsonMetadata = recordedItems.map((item: any, idx: number) => {
                const targetFilename = `file_${String(idx + 1).padStart(4, '0')}.wav`
                return {
                    audio_path: `wavs/${targetFilename}`,
                    text: item.text,
                    duration: item.duration || 0
                }
            })
            archive.append(JSON.stringify(jsonMetadata, null, 2), { name: 'dataset/dataset.json' })

        } else if (format === 'piper') {
            const lines = recordedItems.map((item: any, idx: number) => {
                // Piper ID typically matches filename without extension
                const targetId = `file_${String(idx + 1).padStart(4, '0')}`
                return `${targetId}|${item.text}`
            })
            archive.append(lines.join('\n'), { name: 'dataset/metadata.csv' })

        } else if (format === 'xtts') {
            const lines = recordedItems.map((item: any, idx: number) => {
                const targetFilename = `file_${String(idx + 1).padStart(4, '0')}.wav`
                return `wavs/${targetFilename}|${item.text}|${sanitizedSpeaker}`
            })
            archive.append(lines.join('\n'), { name: 'dataset/metadata.csv' })

        } else if (format === 'fish') {
            // For Fish, we also need .lab files
            for (let i = 0; i < recordedItems.length; i++) {
                const item = recordedItems[i]
                const targetFilename = `file_${String(i + 1).padStart(4, '0')}.wav`
                const targetLabName = `dataset/data/${sanitizedSpeaker}/${targetFilename.replace('.wav', '.lab')}`
                archive.append(item.text, { name: targetLabName })
            }
        }


        await archive.finalize()
    })
}
