import * as Tone from 'tone'
import PQueue from 'p-queue'
import { SoundProfile } from '@/types'

// Concurrency limit to prevent memory crashes
const queue = new PQueue({ concurrency: 1 })

interface BatchProcessOptions {
    items: { id: string, filePath: string }[]
    profile: SoundProfile
    onProgress: (completed: number, total: number) => void
    readAudio: (path: string) => Promise<ArrayBuffer>
    saveAudio: (buffer: ArrayBuffer, filename: string) => Promise<void>
}

export async function processBatch({ items, profile, onProgress, readAudio, saveAudio }: BatchProcessOptions) {
    let completed = 0
    onProgress(0, items.length)

    // Helper to process a single file
    const processFile = async (item: { id: string, filePath: string }) => {
        try {
            // 1. Read File
            const arrayBuffer = await readAudio(item.filePath)
            // Decode using OfflineContext's native AudioContext if possible, but Tone.context is safer for consistency
            // However, for OfflineRendering, we need the buffer data. 
            // We use a temporary AudioContext to decode if Tone does not provide a static decoder that doesn't attach to the Global Context.
            const tempCtx = new AudioContext()
            const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer)


            // 2. Render Offline
            // Duration needs a small buffer to prevent cutting off tails
            const duration = audioBuffer.duration + 0.1

            const renderedBuffer = await Tone.Offline(async () => {
                // Determine pitch offset (Tone.PitchShift uses semitones)
                // We use a standard Player
                const player = new Tone.Player(audioBuffer)

                // Reconstruct Graph
                const pitchShift = new Tone.PitchShift({
                    pitch: profile.pitch,
                    windowSize: 0.05,
                    delayTime: 0,
                    feedback: 0
                })

                const eq = new Tone.EQ3({
                    low: profile.eq.low,
                    mid: profile.eq.mid,
                    high: profile.eq.high
                })

                const limiter = new Tone.Limiter(-1)

                // Connect: Player -> Pitch -> EQ -> Limiter -> Destination
                player.connect(pitchShift)
                pitchShift.connect(eq)
                eq.connect(limiter)
                limiter.toDestination()

                // Schedule Play
                player.start(0)

            }, duration)

            // 3. Convert AudioBuffer to WAV ArrayBuffer (Simple implementation or use helper)
            // Since we need to save it, we need raw bytes. 
            // For now, we'll assume the main process can handle raw Float32Arrays or we convert here.
            // Let's implement a simple WAV encoder here or pass the raw buffer to main.
            // Passing raw audio data (channels loops) to main is heavy.
            // Better to encode to WAV in Renderer (JS) then send.

            const wavBytes = audioBufferToWav(renderedBuffer)

            // 4. Save
            const newFilename = `processed_${item.id}.wav`
            await saveAudio(wavBytes, newFilename)

            // Cleanup
            await tempCtx.close()

        } catch (e) {
            console.error(`Failed to process item ${item.id}`, e)
        } finally {
            completed++
            onProgress(completed, items.length)
        }
    }

    // Add all tasks to queue
    await queue.addAll(items.map(item => () => processFile(item)))
}

// Simple WAV Encoder (PCM 16-bit)
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    // Interleave channels
    const result = new Float32Array(buffer.length * numChannels)
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const val = buffer.getChannelData(channel)[i]
            // Clamping
            result[i * numChannels + channel] = Math.max(-1, Math.min(1, val))
        }
    }

    const dataSize = result.length * 2
    const headerSize = 44
    const totalSize = headerSize + dataSize
    const arrayBuffer = new ArrayBuffer(totalSize)
    const view = new DataView(arrayBuffer)

    // RIFF Chunk
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(view, 8, 'WAVE')

    // fmt Chunk
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // Subchunk1Size
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * 2, true) // ByteRate
    view.setUint16(32, numChannels * 2, true) // BlockAlign
    view.setUint16(34, bitDepth, true)

    // data Chunk
    writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)

    // Write PCM samples
    let offset = 44
    for (let i = 0; i < result.length; i++) {
        const s = Math.max(-1, Math.min(1, result[i]))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
        offset += 2
    }

    return arrayBuffer
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}
