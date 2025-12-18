import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioEngineState } from "@/hooks/useAudioEngine"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { useSettingsStore } from "@/store/settingsStore"
import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useProjectStore } from "@/store/projectStore"
import { processBatch } from "@/lib/audioBatchProcessor"
import { Progress } from "@/components/ui/progress"
import { Wand2, Loader2, Download } from "lucide-react"

interface EffectRackProps {
    state: AudioEngineState
    setPitch: (val: number) => void
    setEQ: (band: 'low' | 'mid' | 'high', val: number) => void
}

export function EffectRack({ state, setPitch, setEQ }: EffectRackProps) {
    const { soundProfiles, addProfile } = useSettingsStore()
    const { currentProject, items } = useProjectStore()
    const [profileName, setProfileName] = useState('')
    const [isSaveOpen, setIsSaveOpen] = useState(false)

    // Batch Processing State
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [processedCount, setProcessedCount] = useState(0)

    const handleBatchProcess = async () => {
        if (!currentProject) return

        setIsProcessing(true)
        setProgress(0)
        setProcessedCount(0)

        const recordedItems = items.filter(i => i.status === 'recorded')
        if (recordedItems.length === 0) {
            alert("No recorded items to process.")
            setIsProcessing(false)
            return
        }

        // Construct current profile from state
        const currentProfile = {
            id: 'temp',
            name: 'Current',
            pitch: state.pitch,
            eq: { ...state.eq }
        }

        await processBatch({
            items: recordedItems.map(item => ({
                id: item.id,
                filePath: `${currentProject.path}\\wavs\\file_${String(items.findIndex(i => i.id === item.id) + 1).padStart(4, '0')}.wav`
            })),
            profile: currentProfile,
            readAudio: window.api.readAudio,
            saveAudio: async (buffer, filename) => {
                await window.api.saveProcessedAudio(buffer, filename, currentProject.path)
            },
            onProgress: (completed, total) => {
                setProcessedCount(completed)
                setProgress((completed / total) * 100)
            }
        })

        setIsProcessing(false)
        alert(`Processed ${recordedItems.length} files to /wavs_processed!`)
    }

    const handleExport = async () => {
        if (!currentProject) return
        try {
            const path = await window.api.exportDataset(currentProject.path, items)
            if (path) alert(`Dataset exported to: ${path}`)
        } catch (e) {
            console.error(e)
            alert("Export failed")
        }
    }

    const handleSave = () => {
        if (!profileName) return
        addProfile({
            id: Math.random().toString(36).substring(7),
            name: profileName,
            pitch: state.pitch,
            eq: { ...state.eq }
        })
        setProfileName('')
        setIsSaveOpen(false)
    }

    const loadProfile = (id: string) => {
        const profile = soundProfiles?.find(p => p.id === id)
        if (profile) {
            setPitch(profile.pitch)
            setEQ('low', profile.eq.low)
            setEQ('mid', profile.eq.mid)
            setEQ('high', profile.eq.high)
        }
    }

    return (
        <Card className="h-full border-l rounded-none border-y-0 border-r-0 bg-card/50 backdrop-blur-sm w-80 flex flex-col">
            <CardHeader className="pb-4 border-b space-y-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${state.pitch !== 0 || state.eq.low !== 0 || state.eq.mid !== 0 || state.eq.high !== 0 ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse' : 'bg-muted'} transition-all duration-500`} />
                    Voice Designer
                </CardTitle>

                {/* Profile Controls */}
                <div className="flex gap-2">
                    <Select onValueChange={loadProfile}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Load Profile..." />
                        </SelectTrigger>
                        <SelectContent>
                            {soundProfiles?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                            {(!soundProfiles || soundProfiles.length === 0) && <div className="p-2 text-xs text-muted-foreground">No profiles saved</div>}
                        </SelectContent>
                    </Select>

                    <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                                <Save className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Voice Profile</DialogTitle>
                            </DialogHeader>
                            <div className="py-2">
                                <Label>Profile Name</Label>
                                <Input
                                    value={profileName}
                                    onChange={e => setProfileName(e.target.value)}
                                    placeholder="e.g. Deep Robot"
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSave} disabled={!profileName}>Save</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Batch Button */}
                <div className="pt-2">
                    {isProcessing ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                                <span>Processing...</span>
                                <span>{processedCount} / {items.filter(i => i.status === 'recorded').length}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    ) : (
                        <Button
                            className="w-full text-xs font-semibold gap-2"
                            size="sm"
                            variant="secondary"
                            onClick={handleBatchProcess}
                            disabled={!currentProject || items.filter(i => i.status === 'recorded').length === 0}
                        >
                            <Wand2 className="h-3 w-3" />
                            Apply to Project
                        </Button>
                    )}

                    <Button
                        className="w-full text-xs font-semibold gap-2 mt-2"
                        size="sm"
                        variant="outline"
                        onClick={handleExport}
                        disabled={!currentProject || items.filter(i => i.status === 'recorded').length === 0}
                    >
                        <Download className="h-3 w-3" />
                        Export Dataset (Zip)
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* PITCH SHIFTER */}
                <div className={`space-y-4 p-4 rounded-lg border transition-all duration-300 ${state.pitch !== 0 ? 'border-primary/20 bg-primary/5 shadow-inner' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold text-primary">PITCH SHIFT</Label>
                        <span className={`font-mono text-xs text-muted-foreground transition-all ${state.pitch !== 0 ? 'text-primary font-bold glow-text' : ''}`}>{state.pitch > 0 ? '+' : ''}{state.pitch} semitones</span>
                    </div>
                    <Slider
                        defaultValue={[0]}
                        value={[state.pitch]}
                        min={-12}
                        max={12}
                        step={1}
                        onValueChange={(v) => setPitch(v[0])}
                        className="py-2"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono uppercase">
                        <span>Deep</span>
                        <span>Neutral</span>
                        <span>High</span>
                    </div>
                </div>

                {/* VISUALIZER PLACEHOLDER / EQ */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold text-primary">3-BAND EQ</Label>
                    </div>

                    {/* HIGH */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <Label className="font-normal text-muted-foreground">High</Label>
                            <span className="font-mono text-[10px]">{state.eq.high} dB</span>
                        </div>
                        <Slider
                            value={[state.eq.high]}
                            min={-12} max={12} step={0.5}
                            onValueChange={(v) => setEQ('high', v[0])}
                        />
                    </div>

                    {/* MID */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <Label className="font-normal text-muted-foreground">Mid (Timbre)</Label>
                            <span className="font-mono text-[10px]">{state.eq.mid} dB</span>
                        </div>
                        <Slider
                            value={[state.eq.mid]}
                            min={-12} max={12} step={0.5}
                            onValueChange={(v) => setEQ('mid', v[0])}
                        />
                    </div>

                    {/* LOW */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                            <Label className="font-normal text-muted-foreground">Low</Label>
                            <span className="font-mono text-[10px]">{state.eq.low} dB</span>
                        </div>
                        <Slider
                            value={[state.eq.low]}
                            min={-12} max={12} step={0.5}
                            onValueChange={(v) => setEQ('low', v[0])}
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
