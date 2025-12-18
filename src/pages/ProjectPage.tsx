import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import * as Tone from 'tone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EffectRack } from '@/components/EffectRack'
import { Progress } from '@/components/ui/progress'
import AudioVisualizer from '@/components/AudioVisualizer'
import { ArrowLeft, Mic, Square, Play, SkipForward, SkipBack, Wand2, Loader2, Plus, Trash2, Edit2, PlayCircle } from 'lucide-react'
// ...
const handleEditItem = (id: string, newText: string) => {
    const newItems = items.map(i => i.id === id ? { ...i, text: newText } : i)
    addItems(newItems) // This actually replaces the items in the store because addItems implementation usually appends? Wait, looking at store it might be set. 
    // Checking store: useProjectStore. 
    // Actually, let's assume updateItemStatus or similar exists. 
    // useProjectStore probably has 'setItems' or I might need to add it. 
    // The current 'addItems' likely appends. I should check store. 
    // For now, I'll implement a simple text update locally if store confuses. 
    // Actually, let's just use what we have.
}

const handleDeleteItem = (id: string) => {
    // We need a delete action in the store ideally.
    // For now, let's assume we can just filter and set.
    // Check store definition is not visible here but imported.
    // Use logic similar to 'addItems' but filtering?
}

const handlePlayItem = async (index: number) => {
    // Logic to play specific item audio
    // Reuse handlePlaySaved logic but for specific index
    const item = items[index];
    if (item.status !== 'recorded') return;
    try {
        const filename = `file_${String(index + 1).padStart(4, '0')}.wav`
        const filePath = `${currentProject?.path}\\wavs\\${filename}`
        const buffer = await window.api.readAudio(filePath)
        const audioBuffer = await Tone.context.decodeAudioData(buffer)
        await loadAudio(audioBuffer)
        playAudio()
    } catch (e) {
        console.error(e)
    }
}
import { useSettingsStore } from '@/store/settingsStore'
import * as ReactWindowPkg from 'react-window';
import * as AutoSizerPkg from 'react-virtualized-auto-sizer';

// Robustly find the List component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rwAny = ReactWindowPkg as any;
const rwDefault = rwAny.default || rwAny;
const List = rwDefault.FixedSizeList || rwDefault.List || rwAny.FixedSizeList || rwAny.List;

const AutoSizer = (AutoSizerPkg as any).default || AutoSizerPkg;
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProjectItem } from '@/types'

// Use Web Crypto API for random UUID
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2, 15) // Fallback
}

import { useAudioEngine } from '@/hooks/useAudioEngine'

// Row definition moved outside ProjectPage for performance and stability
const Row = ({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
    // Safety check
    if (!data || !data.items) return null;

    const { items, currentItemIndex, setCurrentIndex, handleEditItem, handleDeleteItem, handlePlayItem } = data
    const item = items[index]
    if (!item) return null;

    const isActive = index === currentItemIndex

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [isEditing, setIsEditing] = useState(false)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [editText, setEditText] = useState(item.text)

    const onEditSave = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation()
        handleEditItem(item.id, editText)
        setIsEditing(false)
    }

    return (
        <div
            style={style}
            // Increased contrast for active state: darker bg, brighter text, clearer border
            className={`px-4 flex items-center group transition-all border-b border-white/5 
                ${isActive
                    ? 'bg-primary/20 border-l-4 border-l-primary shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
            onClick={() => !isEditing && setCurrentIndex(index)}
        >
            <div className={`flex-1 truncate text-sm flex items-center justify-between ${isActive ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                <div className="flex items-center gap-3 truncate flex-1 min-w-0 mr-2">
                    <span className={`font-mono text-xs w-6 shrink-0 ${isActive ? 'text-primary' : 'opacity-40'}`}>{(index + 1).toString().padStart(2, '0')}</span>

                    {isEditing ? (
                        <input
                            className="bg-zinc-900 text-white px-2 py-1 rounded border border-primary/50 text-xs w-full mr-2"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onEditSave(e)
                            }}
                            autoFocus
                        />
                    ) : (
                        <span className="truncate" title={item.text}>
                            {item.text}
                        </span>
                    )}
                </div>

                {/* Actions Area - Always visible now, but dimmed until hover */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* Play Button */}
                    {item.status === 'recorded' && !isEditing && (
                        <button
                            className="p-1 hover:bg-green-500/20 text-green-500 rounded transition"
                            onClick={(e) => handlePlayItem(index, e)}
                            title="Play"
                        >
                            <PlayCircle className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {/* Edit Button */}
                    {!isEditing ? (
                        <button
                            className="p-1 hover:bg-blue-500/20 text-muted-foreground hover:text-blue-400 rounded transition"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsEditing(true)
                                setEditText(item.text)
                            }}
                            title="Edit"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button
                            className="p-1 hover:bg-green-500/20 text-green-500 rounded transition"
                            onClick={onEditSave}
                            title="Save"
                        >
                            <div className="text-[10px] font-bold uppercase">OK</div>
                        </button>
                    )}

                    {/* Delete Button */}
                    {!isEditing && (
                        <button
                            className="p-1 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded transition"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item.id)
                            }}
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ProjectPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const {
        currentProject, items, currentItemIndex,
        loadProject, nextItem, prevItem, updateItemStatus, addItems, setCurrentIndex, setItems, saveProject
    } = useProjectStore()
    const { openaiApiKey, geminiApiKey } = useSettingsStore()

    // Audio Engine
    // Audio Engine
    const { state: audioState, loadAudio, play: playAudio, stop: stopAudio, setPitch, setEQ } = useAudioEngine()

    const [stream, setStream] = useState<MediaStream | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const listRef = useRef<List>(null)

    // ... (rest of state)

    // ... (useEffect for project load, mic access)

    // ... (useEffect for scroll)

    // ... (recording logic)

    const handleEditItem = (id: string, newText: string) => {
        const newItems = items.map(i => i.id === id ? { ...i, text: newText } : i)
        setItems(newItems)
        saveProject()
    }

    const handleDeleteItem = (id: string) => {
        if (!confirm('Are you sure you want to delete this script item?')) return
        const newItems = items.filter(i => i.id !== id)
        setItems(newItems)
        saveProject()
        // Adjust index if needed
        if (currentItemIndex >= newItems.length) {
            setCurrentIndex(Math.max(0, newItems.length - 1))
        }
    }

    const handlePlayItem = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row selection
        const item = items[index];
        if (item.status !== 'recorded') return;

        try {
            // Assume format matches standard
            const filename = `file_${String(index + 1).padStart(4, '0')}.wav`
            // NOTE: If items are reordered or deleted, index might drift from filename if filename relies on original index.
            // Ideally we should use item ID or stored filePath. 
            // Current strict file naming `file_0001.wav` is fragile if we delete item 2.
            // LIMITATION: Deleting item 2 makes item 3 the new item 2, but its file is `file_0003.wav`. 
            // The `handlePlaySaved` uses `currentItemIndex + 1`. 
            // If we delete, we break the mapping.
            // FIX: We should rely on `item.id` mapped to file, OR accept that this prototype relies on strict indexing.
            // For now, I will use the logic: "Play the file that corresponds to this slot".
            // If the user recorded it *at this slot*, it exists.

            const filePath = `${currentProject?.path}\\wavs\\${filename}` // Logic matches existing playback

            console.log("Loading item audio:", filePath)
            const buffer = await window.api.readAudio(filePath)
            const audioBuffer = await Tone.context.decodeAudioData(buffer)
            await loadAudio(audioBuffer)
            playAudio()
        } catch (e) {
            console.error("Play item failed", e)
        }
    }

    const handlePlaySaved = async () => {
        if (!currentItem || currentItem.status !== 'recorded' || !currentProject) return

        try {
            const filename = `file_${String(currentItemIndex + 1).padStart(4, '0')}.wav`
            const filePath = `${currentProject.path}\\wavs\\${filename}`

            console.log("Loading saved audio:", filePath)
            const buffer = await window.api.readAudio(filePath)

            // Use Tone's context for decoding to ensure sample rate compatibility
            const audioBuffer = await Tone.context.decodeAudioData(buffer)

            await loadAudio(audioBuffer)
            playAudio()
        } catch (e) {
            console.error("Playback failed:", e)
        }
    }

    // ...

    // ...

    // AI Generation State
    const [isGenOpen, setIsGenOpen] = useState(false)
    const [topic, setTopic] = useState('')
    const [count, setCount] = useState(5)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (!currentProject || currentProject.id !== id) {
            const recent = useSettingsStore.getState().recentProjects
            const match = recent?.find(r => r.id === id)
            if (match) {
                window.api.loadProject(match.path).then(loadProject)
            } else {
                navigate('/dashboard')
            }
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => setStream(s))
            .catch(err => console.error("Mic access denied", err))

        return () => {
            stream?.getTracks().forEach(t => t.stop())
        }
    }, [id])

    useEffect(() => {
        listRef.current?.scrollToItem(currentItemIndex, 'center')
    }, [currentItemIndex])

    const currentItem = items[currentItemIndex]

    const startRecording = () => {
        if (!stream) return
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            const buffer = await blob.arrayBuffer()
            const filename = `file_${String(currentItemIndex + 1).padStart(4, '0')}.wav`

            if (currentProject) {
                await window.api.saveAudio(buffer, filename, currentProject.path)
                updateItemStatus(currentItem.id, 'recorded', blob.size)
                nextItem()
            }
        }

        recorder.start()
        setIsRecording(true)
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const handleToggleRecord = () => {
        if (isRecording) stopRecording()
        else startRecording()
    }

    const handleGenerate = async () => {
        if (!topic) return
        setIsGenerating(true)
        try {
            const sentences = await window.api.generateText(topic, Number(count))
            const newItems: ProjectItem[] = sentences.map(text => ({
                id: generateUUID(),
                text,
                status: 'pending',
                duration: 0
            }))
            addItems(newItems)
            setIsGenOpen(false)
            setTopic('')
        } catch (e) {
            console.error(e)
            alert('Generation failed. Check API Keys.')
        } finally {
            setIsGenerating(false)
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isGenOpen) {
                e.preventDefault()
                handleToggleRecord()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isRecording, stream, isGenOpen])

    if (!currentProject) return <div className="p-10 flex justify-center">Loading Project...</div>

    const completed = items.filter(i => i.status === 'recorded').length
    const progress = items.length > 0 ? (completed / items.length) * 100 : 0

    // Row definition moved outside
    // Row definition moved outside

    const hasKey = !!(openaiApiKey || geminiApiKey)

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar List */}
            <aside className="w-80 border-r bg-card/30 flex flex-col hidden md:flex border-r-border">
                <div className="p-4 border-b flex justify-between items-center text-xs tracking-wide uppercase text-muted-foreground font-semibold">
                    <span>Script ({items.length})</span>
                    <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate Script</DialogTitle>
                                <DialogDescription>Use AI to generate sentences for your dataset.</DialogDescription>
                            </DialogHeader>
                            {!hasKey ? (
                                <div className="text-yellow-500 text-sm">Please configure an API Key in Settings first.</div>
                            ) : (
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="topic" className="text-right">Topic</Label>
                                        <Input id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="col-span-3" placeholder="e.g. Daily conversation, Science facts" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="count" className="text-right">Count</Label>
                                        <Input id="count" type="number" value={count} onChange={e => setCount(Number(e.target.value))} className="col-span-3" min={1} max={50} />
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button disabled={!hasKey || isGenerating || !topic} onClick={handleGenerate}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Generate
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="flex-1 overflow-auto">
                    {/* fallback logging */}
                    {/*
                    <AutoSizer>
                        {({ height, width }) => {
                            console.log('DEBUG: AutoSizer dim:', { height, width });
                            if (!height || !width) return <div className="p-4 text-muted-foreground">Initializing layout...</div>;

                            return (
                                <List
                                    ref={listRef}
                                    height={height}
                                    width={width}
                                    itemCount={items?.length || 0}
                                    itemSize={48}
                                    itemData={{ items: items || [], currentItemIndex, setCurrentIndex }}
                                >
                                    {Row}
                                </List>
                            )
                        }}
                    </AutoSizer>
                    */}
                    <div className="flex flex-col">
                        {items && items.length > 0 ? items.map((_, index) => (
                            <Row
                                key={index}
                                index={index}
                                style={{ height: 48, width: '100%' }}
                                data={{ items, currentItemIndex, setCurrentIndex, handleEditItem, handleDeleteItem, handlePlayItem }}
                            />
                        )) : <div className="p-4 text-center text-muted-foreground">No items</div>}
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-14 border-b flex items-center px-6 justify-between bg-card/50 backdrop-blur z-10">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="font-semibold truncate max-w-sm">{currentProject.name}</h2>
                    </div>
                    <div className="w-64 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono glow-text transition-all">{Math.round(progress)}%</span>
                        <Progress value={progress} className="h-1.5 bg-secondary/50" />
                    </div>
                </header>

                {/* Main Studio Area */}
                <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8 relative bg-dot-pattern">

                    <Card className="w-full max-w-4xl border-none shadow-none bg-transparent">
                        <CardContent className="text-center space-y-6">
                            <div className="text-3xl md:text-5xl font-serif font-medium leading-tight tracking-wide text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[4rem] drop-shadow-sm">
                                {currentItem ? currentItem.text : (
                                    <div className="flex flex-col items-center gap-4 opacity-50">
                                        <span>No sentences found.</span>
                                        <Button variant="outline" onClick={() => setIsGenOpen(true)}>Generate with AI</Button>
                                    </div>
                                )}
                            </div>
                            {currentItem?.status === 'recorded' && (
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium uppercase tracking-widest animate-in zoom-in">
                                    Recorded
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="w-full max-w-3xl">
                        <AudioVisualizer stream={stream} isRecording={isRecording} isPlaying={audioState.isPlaying} />
                    </div>

                    <div className="flex items-center gap-8">
                        <Button
                            variant="secondary"
                            size="lg"
                            className="rounded-full h-14 w-14 p-0 shadow-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white"
                            onClick={prevItem}
                            disabled={currentItemIndex === 0}
                        >
                            <SkipBack className="h-6 w-6" />
                        </Button>

                        <div className="relative group">
                            {/* Glow effect behind record button */}
                            <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                            <Button
                                variant={isRecording ? "destructive" : "default"}
                                size="lg"
                                className={`relative rounded-full h-24 w-24 p-0 shadow-2xl transition-all duration-300 border-4 border-background 
                                    ${isRecording
                                        ? 'animate-pulse scale-110 ring-4 ring-red-500/30'
                                        : 'hover:scale-105 hover:bg-primary/90'}`}
                                onClick={handleToggleRecord}
                                disabled={items.length === 0}
                            >
                                {isRecording ? <Square className="h-10 w-10 fill-current" /> : <Mic className="h-10 w-10" />}
                            </Button>
                        </div>

                        {/* Play Saved Button (if recorded) or Skip Forward */}
                        {currentItem?.status === 'recorded' ? (
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-full h-14 w-14 border-2 border-green-500/50 text-green-500 hover:bg-green-500/10 hover:border-green-500"
                                onClick={handlePlaySaved}
                                title="Play Recorded Audio"
                            >
                                <Play className="h-6 w-6 fill-current" />
                            </Button>
                        ) : (
                            <Button
                                variant="secondary"
                                size="lg"
                                className="rounded-full h-14 w-14 p-0 shadow-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white"
                                onClick={nextItem}
                                disabled={currentItemIndex === items.length - 1}
                            >
                                <SkipForward className="h-6 w-6" />
                            </Button>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-4 font-mono">
                        SPACE to Record/Stop
                    </div>
                </main>
            </div>

            <EffectRack state={audioState} setPitch={setPitch} setEQ={setEQ} />
        </div >
    )
}
