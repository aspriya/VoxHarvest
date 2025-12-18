import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'

interface AudioVisualizerProps {
    stream: MediaStream | null
    isRecording: boolean
    isPlaying?: boolean
}

export default function AudioVisualizer({ stream, isRecording, isPlaying = false }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>()
    const analyserRef = useRef<AnalyserNode>()
    const sourceRef = useRef<MediaStreamAudioSourceNode>()

    useEffect(() => {
        if (!stream || !canvasRef.current) return

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048
        const source = audioCtx.createMediaStreamSource(stream)

        source.connect(analyser)
        analyserRef.current = analyser
        sourceRef.current = source

        const canvas = canvasRef.current
        const canvasCtx = canvas.getContext('2d')
        if (!canvasCtx) return

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)

            analyser.getByteTimeDomainData(dataArray)

            canvasCtx.fillStyle = 'rgb(20, 20, 25)' // Background color
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height)

            canvasCtx.lineWidth = 2

            // Color Logic: Recording (Red) > Playing (Green) > Idle (Cyan)
            let strokeColor = 'rgb(0, 255, 200)' // Cyan (Idle)
            if (isRecording) {
                strokeColor = 'rgb(255, 50, 50)' // Red
            } else if (isPlaying) {
                strokeColor = 'rgb(34, 197, 94)' // Green
            }

            canvasCtx.strokeStyle = strokeColor
            canvasCtx.beginPath()

            const sliceWidth = canvas.width / bufferLength
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                // If playing and no stream activity (flat line), maybe add some fake movement?
                // For now, honestly visualizing the MIC input while playing audio is confusing unless the user is overdubbing.
                // But without connecting to Tone.js destination, we can't visualize the output easily here.
                // We'll stick to color change as requested.

                const v = dataArray[i] / 128.0
                const y = v * canvas.height / 2

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
            source.disconnect()
            audioCtx.close()
        }
    }, [stream, isRecording, isPlaying])

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
