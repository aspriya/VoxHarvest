import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'

export const exportDatasetToPath = async (destinationPath: string, projectPath: string, items: any[]): Promise<string> => {
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

        // 1. Add audio files
        const wavsDir = path.join(projectPath, 'wavs')
        const processedDir = path.join(projectPath, 'wavs_processed')

        // Check if processed folder exists, prefer it
        let sourceDir = wavsDir
        try {
            await fs.access(processedDir)
            sourceDir = processedDir
        } catch { }

        // archiver.directory appends the contents of the directory to the zip
        // The second argument is the prefix in the zip file
        archive.directory(sourceDir, 'wavs')

        // 2. Generate Metadata.csv (LJSpeech format: ID|Transcription|NormalizedTranscription)
        // We only have transcription, so we duplicate satisfied LJSpeech format
        const lines = items
            .filter((i: any) => i.status === 'recorded')
            .map((i: any, idx: number) => {
                // Filename depends on index or how we saved it. 
                // In ProjectPage, we saved as file_0001.wav based on index.
                // Assuming items are in order.
                const filename = `file_${String(idx + 1).padStart(4, '0')}`
                return `${filename}|${i.text}|${i.text}`
            })

        archive.append('\uFEFF' + lines.join('\n'), { name: 'metadata.csv' })

        await archive.finalize()
    })
}
