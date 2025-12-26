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

        // Check if processed folder exists, prefer it
        let sourceDir = wavsDir
        try {
            await fs.access(processedDir)
            sourceDir = processedDir
        } catch { }

        // Sanitize speaker name
        const sanitizedSpeaker = speakerName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Speaker'

        const recordedItems = items.filter((i: any) => i.status === 'recorded')

        // FORMAT LOGIC
        if (format === 'f5') {
            // F5-TTS:
            // dataset/wavs/*.wav
            // dataset/dataset.json
            archive.directory(sourceDir, 'dataset/wavs')

            const jsonMetadata = recordedItems.map((item: any, idx: number) => {
                const filename = `file_${String(idx + 1).padStart(4, '0')}.wav`
                return {
                    audio_path: `wavs/${filename}`,
                    text: item.text,
                    duration: item.duration || 0 // Use stored duration or 0
                }
            })

            archive.append(JSON.stringify(jsonMetadata, null, 2), { name: 'dataset/dataset.json' })

        } else if (format === 'piper') {
            // Piper (LJSpeech):
            // dataset/wavs/*.wav
            // dataset/metadata.csv (id|text) - No header

            archive.directory(sourceDir, 'dataset/wavs')

            const lines = recordedItems.map((item: any, idx: number) => {
                const filename = `file_${String(idx + 1).padStart(4, '0')}` // ID without extension usually
                return `${filename}|${item.text}`
            })

            archive.append(lines.join('\n'), { name: 'dataset/metadata.csv' })

        } else if (format === 'xtts') {
            // XTTS v2:
            // dataset/wavs/*.wav
            // dataset/metadata.csv (wavs/file.wav|text|speaker_name)

            archive.directory(sourceDir, 'dataset/wavs')

            const lines = recordedItems.map((item: any, idx: number) => {
                const filename = `file_${String(idx + 1).padStart(4, '0')}.wav`
                return `wavs/${filename}|${item.text}|${sanitizedSpeaker}`
            })

            archive.append(lines.join('\n'), { name: 'dataset/metadata.csv' })

        } else if (format === 'fish') {
            // Fish Speech:
            // dataset/data/{SpeakerName}/*.wav
            // dataset/data/{SpeakerName}/*.lab

            // We need to iterate files and append them individually to new structure
            // archiver.directory can't rename files easily during add, so we manually add files?
            // "archive.file(path, { name: ... })"

            try {
                // Get list of files in sourceDir
                // Better approach: Since we know the filenames from `items`, use that.
                // Assuming items are strictly ordered 1..N.
                // If not, we might fail to find files if previous index logic holds.
                // Let's rely on reading the directory or strict convention. 
                // Using convention `file_XXXX.wav`.

                for (let i = 0; i < recordedItems.length; i++) {
                    const item = recordedItems[i]
                    const filename = `file_${String(i + 1).padStart(4, '0')}.wav`
                    const sourceFile = path.join(sourceDir, filename)
                    const targetWavName = `dataset/data/${sanitizedSpeaker}/${filename}`
                    const targetLabName = `dataset/data/${sanitizedSpeaker}/${filename.replace('.wav', '.lab')}`

                    // Verify existence
                    try {
                        // Add WAV
                        archive.file(sourceFile, { name: targetWavName })
                        // Add LAB
                        archive.append(item.text, { name: targetLabName })
                    } catch (e) {
                        console.warn(`Could not add file for export: ${sourceFile}`)
                    }
                }
            } catch (e) {
                console.error("Fish speech export setup failed", e)
                reject(e)
                return
            }
        }

        await archive.finalize()
    })
}
