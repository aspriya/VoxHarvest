import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Loader2, Play, Pause, Scissors, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioEditorModalProps {
    isOpen: boolean
    onClose: () => void
    audioUrl: string | null
    text?: string
    onSave: (start: number, end: number, applyDenoise: boolean) => Promise<void>
    onPreview: (start: number, end: number, applyDenoise: boolean) => Promise<void>
}

export const AudioEditorModal: React.FC<AudioEditorModalProps> = ({
    isOpen,
    onClose,
    audioUrl,
    text,
    onSave,
    onPreview,
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
    const [regionsPlugin, setRegionsPlugin] = useState<RegionsPlugin | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [applyDenoise, setApplyDenoise] = useState(false)
    const [trimRegion, setTrimRegion] = useState<{ start: number; end: number } | null>(null)

    useEffect(() => {
        console.log("AudioEditorModal: Effect triggered", { isOpen, audioUrl: !!audioUrl })
        if (!isOpen || !audioUrl) return

        setIsReady(false) // Reset ready state

        // Use rAF to wait for the DOM paint cycle of the Dialog
        const rafId = requestAnimationFrame(() => {
            if (!containerRef.current) {
                console.error("AudioEditorModal: Container ref is NULL. Retrying...");
                // Fallback: try a small timeout if rAF wasn't enough (rare race condition)
                setTimeout(() => {
                    if (containerRef.current) initWaveSurfer()
                    else console.error("AudioEditorModal: Container ref is STILL NULL");
                }, 50)
                return
            }
            initWaveSurfer()
        })

        function initWaveSurfer() {
            if (!containerRef.current) return

            console.log("AudioEditorModal: Initializing WaveSurfer", {
                container: containerRef.current,
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            })

            // Cleanup existing if any (react strict mode double invoke)
            if (wavesurfer) {
                wavesurfer.destroy()
            }

            try {
                const ws = WaveSurfer.create({
                    container: containerRef.current,
                    waveColor: 'rgb(200, 200, 200)',
                    progressColor: 'rgb(168, 85, 247)', // Purple-500
                    url: audioUrl!,
                    height: 128,
                    interact: true,
                    normalize: true,
                })

                const regs = RegionsPlugin.create()
                const timeline = TimelinePlugin.create({
                    height: 20, // Slightly smaller for tighter fit
                    timeInterval: 0.2,
                    primaryLabelInterval: 1,
                    secondaryLabelInterval: 0.5,
                    style: {
                        color: '#cbd5e1', // slate-300
                        fontSize: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    }
                })

                ws.registerPlugin(regs as any)
                ws.registerPlugin(timeline as any)

                ws.on('ready', () => {
                    console.log("AudioEditorModal: WaveSurfer Ready", ws.getDuration())
                    setIsReady(true)
                    const duration = ws.getDuration()

                    // Clear existing regions if any?
                    regs.clearRegions()

                    // Default region: entire clip
                    regs.addRegion({
                        start: 0,
                        end: duration,
                        color: 'rgba(168, 85, 247, 0.2)', // Purple tint
                        drag: true,
                        resize: true,
                    })
                    setTrimRegion({ start: 0, end: duration })
                })

                ws.on('error', (err) => {
                    console.error("AudioEditorModal: WaveSurfer Error", err)
                })

                ws.on('play', () => setIsPlaying(true))
                ws.on('pause', () => setIsPlaying(false))

                regs.on('region-updated', (region: Region) => {
                    setTrimRegion({ start: region.start, end: region.end })
                })

                regs.on('region-out', (region: Region) => {
                    region.play() // Loop
                })

                setWavesurfer(ws)
                setRegionsPlugin(regs)
            } catch (err) {
                console.error("AudioEditorModal: Init Error", err)
            }
        }

        return () => {
            cancelAnimationFrame(rafId)
            // Cleanup wavesurfer in the separate cleanup effect or rely on state update
        }
    }, [isOpen, audioUrl])

    // Explicit cleanup on unmount/close
    useEffect(() => {
        if (!isOpen && wavesurfer) {
            wavesurfer.destroy()
            setWavesurfer(null)
            setIsReady(false)
        }
    }, [isOpen])

    const handlePlayPause = () => {
        if (!wavesurfer) return
        if (isPlaying) {
            wavesurfer.pause()
        } else {
            if (trimRegion && regionsPlugin) {
                const regions = regionsPlugin.getRegions()
                if (regions.length > 0) {
                    regions[0].play()
                    return
                }
            }
            wavesurfer.play()
        }
    }

    const handleSave = async () => {
        if (!trimRegion) return
        setIsSaving(true)
        try {
            await onSave(trimRegion.start, trimRegion.end, applyDenoise)
            onClose()
        } catch (e) {
            console.error("Save failed", e)
        } finally {
            setIsSaving(false)
        }
    }

    const handlePreviewDenoise = async () => {
        if (!trimRegion) return
        setIsPreviewing(true)
        // Pause visual player
        wavesurfer?.pause()

        try {
            await onPreview(trimRegion.start, trimRegion.end, applyDenoise)
        } catch (e) {
            console.error("Preview failed", e)
        } finally {
            setIsPreviewing(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] bg-slate-900 border-slate-700 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-800 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-lg font-light text-slate-300">
                        <Scissors className="w-5 h-5 text-purple-400" />
                        Audio Editor
                    </DialogTitle>
                    {/* Explicitly handled accessible description */}
                    <div id="dialog-desc" className="sr-only">Editor for trimming and enhancing audio recordings</div>

                    {text ? (
                        <div className="pt-2">
                            <p className="text-xl md:text-2xl font-serif text-slate-100 leading-relaxed text-center px-4 py-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                                "{text}"
                            </p>
                        </div>
                    ) : null}
                </DialogHeader>

                <div className="py-2 space-y-6">
                    {/* HACK: Explicit height and width to ensure render */}
                    {/* Added grid background style */}
                    <div
                        className="relative w-full h-auto py-2 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center flex-col"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div
                            ref={containerRef}
                            className="w-full h-full"
                        />
                        {/* Fallback loading state if needed visually */}
                        {!wavesurfer && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm animate-pulse">
                                Loading Waveform...
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" onClick={handlePlayPause}>
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <span className="text-xs text-slate-400 font-mono">
                                {trimRegion ?
                                    `${trimRegion.start.toFixed(2)}s - ${trimRegion.end.toFixed(2)}s` :
                                    '0.00s - 0.00s'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Wand2 className={cn("w-5 h-5", applyDenoise ? "text-blue-400" : "text-slate-500")} />
                            <div>
                                <Label htmlFor="denoise-toggle" className="cursor-pointer font-medium">Noise Reduction</Label>
                                <p className="text-xs text-slate-400 mt-1">Applies High-Pass & FFT Denoise.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant={applyDenoise ? "secondary" : "ghost"}
                                size="sm"
                                onClick={handlePreviewDenoise}
                                disabled={isPreviewing || !trimRegion || !applyDenoise}
                                title="Hear what the audio sounds like with effects applied"
                            >
                                {isPreviewing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                                Preview Effect
                            </Button>

                            <Button
                                id="denoise-toggle"
                                variant={applyDenoise ? "default" : "outline"}
                                onClick={() => setApplyDenoise(!applyDenoise)}
                                className="h-8"
                            >
                                {applyDenoise ? 'Enabled' : 'Disabled'}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !trimRegion} className="bg-purple-600 hover:bg-purple-700">
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save & Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
