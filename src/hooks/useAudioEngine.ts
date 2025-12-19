import { useRef, useEffect, useState, useCallback } from 'react'
import * as Tone from 'tone'

export interface AudioEngineState {
    isPlaying: boolean
    isReady: boolean
    pitch: number // Semitones (-12 to 12)
    eq: {
        low: number
        mid: number
        high: number
    }
}

export const useAudioEngine = () => {
    const [state, setState] = useState<AudioEngineState>({
        isPlaying: false,
        isReady: false,
        pitch: 0,
        eq: { low: 0, mid: 0, high: 0 }
    })

    // Tone.js Nodes References
    // State to hold the analyser instance so it triggers re-render when ready
    const [analyserNode, setAnalyserNode] = useState<Tone.Analyser | null>(null)

    // Tone.js Nodes References
    const player = useRef<Tone.Player | null>(null)
    const pitchShift = useRef<Tone.PitchShift | null>(null)
    const eq = useRef<Tone.EQ3 | null>(null)
    const limiter = useRef<Tone.Limiter | null>(null)

    // Initialize Audio Graph
    useEffect(() => {
        const init = async () => {
            // Create temporary refs since we are inside effect
            const limit = new Tone.Limiter(-1)
            const ana = new Tone.Analyser("waveform", 2048)

            // Connect chain
            limit.connect(ana)
            ana.toDestination()

            // Update refs
            limiter.current = limit
            setAnalyserNode(ana)

            eq.current = new Tone.EQ3(0, 0, 0).connect(limit)
            pitchShift.current = new Tone.PitchShift({
                pitch: 0,
                windowSize: 0.05,
                delayTime: 0,
                feedback: 0
            }).connect(eq.current)

            player.current = new Tone.Player().connect(pitchShift.current)
            player.current.onstop = () => setState(s => ({ ...s, isPlaying: false }))

            setState(s => ({ ...s, isReady: true }))
        }

        init()

        return () => {
            player.current?.dispose()
            pitchShift.current?.dispose()
            eq.current?.dispose()
            limiter.current?.dispose()
            setAnalyserNode(prev => {
                prev?.dispose()
                return null
            })
        }
    }, [])

    const loadAudio = useCallback(async (urlOrBuffer: string | AudioBuffer) => {
        if (!player.current) return

        await Tone.loaded()
        if (urlOrBuffer instanceof AudioBuffer) {
            player.current.buffer = new Tone.ToneAudioBuffer(urlOrBuffer)
        } else {
            await player.current.load(urlOrBuffer)
        }
    }, [])

    const play = useCallback(async () => {
        if (!player.current) return
        await Tone.start() // Ensure Context is running
        if (player.current.state === 'started') {
            player.current.stop()
        }
        player.current.start()
        setState(s => ({ ...s, isPlaying: true }))
    }, [])

    const stop = useCallback(() => {
        if (!player.current) return
        player.current.stop()
        setState(s => ({ ...s, isPlaying: false }))
    }, [])

    const setPitch = useCallback((pitch: number) => {
        if (pitchShift.current) {
            pitchShift.current.pitch = pitch
            setState(s => ({ ...s, pitch }))
        }
    }, [])

    const setEQ = useCallback((band: 'low' | 'mid' | 'high', value: number) => {
        if (eq.current) {
            if (band === 'low') eq.current.low.value = value
            else if (band === 'mid') eq.current.mid.value = value
            else if (band === 'high') eq.current.high.value = value

            setState(s => ({
                ...s,
                eq: {
                    ...s.eq,
                    [band]: value
                }
            }))
        }
    }, [])

    return {
        state,
        loadAudio,
        play,
        stop,
        setPitch,
        setEQ,
        analyser: analyserNode
    }
}
