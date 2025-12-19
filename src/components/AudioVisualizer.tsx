import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import * as Tone from 'tone'

interface AudioVisualizerProps {
    stream: MediaStream | null
    isRecording: boolean
    isPlaying?: boolean
    playbackAnalyser?: Tone.Analyser | null
}

export default function AudioVisualizer({ stream, isRecording, isPlaying = false, playbackAnalyser }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>()
    const analyserRef = useRef<AnalyserNode>()
    const sourceRef = useRef<MediaStreamAudioSourceNode>()

    useEffect(() => {
        if (!canvasRef.current) return

        let audioCtx: AudioContext | undefined
        let analyser: AnalyserNode | undefined
        let source: MediaStreamAudioSourceNode | undefined

        // Setup for Microphone Stream
        if (stream && !isPlaying) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 2048
            source = audioCtx.createMediaStreamSource(stream)
            source.connect(analyser)
            analyserRef.current = analyser
            sourceRef.current = source
        }

        const canvas = canvasRef.current
        const canvasCtx = canvas.getContext('2d')
        if (!canvasCtx) return

        const bufferLength = 2048 // Standard size
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)

            canvasCtx.fillStyle = 'rgb(20, 20, 25)'
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height)
            canvasCtx.lineWidth = 2

            // Visualization Source Logic
            let buffer: Uint8Array | Float32Array = dataArray
            let isFloat = false

            if (isPlaying && playbackAnalyser) {
                // Get data from Tone.js Analyser
                // Tone.Analyser.getValue() returns Float32Array for 'waveform'
                const val = playbackAnalyser.getValue()

                // Debug log once per second roughly
                if (Math.random() < 0.01) {
                    console.log('[Visualizer] Playing. Analyser value sample:', val[0], 'Length:', val.length)
                }

                if (val instanceof Float32Array) {
                    buffer = val
                    isFloat = true
                }
            } else if (analyser) {
                // Get data from Web Audio Analyser (Mic)
                analyser.getByteTimeDomainData(dataArray)
            } else {
                // Idle / No Source
                canvasCtx.strokeStyle = 'rgb(100, 100, 100)'
                canvasCtx.beginPath()
                canvasCtx.moveTo(0, canvas.height / 2)
                canvasCtx.lineTo(canvas.width, canvas.height / 2)
                canvasCtx.stroke()
                return
            }

            // Set Color
            let strokeColor = 'rgb(0, 255, 200)' // Cyan (Idle)
            if (isRecording) {
                strokeColor = 'rgb(255, 50, 50)' // Red
            } else if (isPlaying) {
                strokeColor = 'rgb(34, 197, 94)' // Green
            }

            canvasCtx.strokeStyle = strokeColor
            canvasCtx.beginPath()

            const sliceWidth = canvas.width / buffer.length
            let x = 0

            for (let i = 0; i < buffer.length; i++) {
                let v = 0
                let y = 0

                if (isFloat) {
                    // Float32Array: range -1 to 1
                    // Map to 0 to canvas.height
                    // v = 0 -> y = height/2
                    v = buffer[i] // raw value
                    y = ((v + 1) / 2) * canvas.height
                } else {
                    // Uint8Array: range 0 to 255
                    // 128 is zero crossing
                    v = buffer[i] / 128.0
                    y = v * canvas.height / 2
                }

                if (i === 0) {
                    canvasCtx.moveTo(x, y)
                } else {
                    canvasCtx.lineTo(x, y)
                }

                x += sliceWidth
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2)
            canvasCtx.stroke()
        }

        draw()

        return () => {
            cancelAnimationFrame(animationRef.current!)
            if (source) source.disconnect()
            if (audioCtx) audioCtx.close()
        }
    }, [stream, isRecording, isPlaying, playbackAnalyser])

    // Border/Glow styles based on state
    let containerClass = "p-4 bg-zinc-950 border-zinc-800 transition-all duration-300"
    if (isRecording) {
        containerClass = "p-4 bg-zinc-950 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all duration-300"
    } else if (isPlaying) {
        containerClass = "p-4 bg-zinc-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all duration-300"
    }

    return (
        <Card className={containerClass}>
            <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-48 rounded-md bg-zinc-900"
            />
        </Card>
    )
}
