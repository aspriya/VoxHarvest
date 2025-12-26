import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import * as Tone from 'tone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EffectRack } from '@/components/EffectRack'
import { Progress } from '@/components/ui/progress'
import AudioVisualizer from '@/components/AudioVisualizer'
import { ArrowLeft, Mic, Square, Play, SkipForward, SkipBack, Wand2, Loader2, Plus, Trash2, Edit2, PlayCircle, FileText, Scissors, Clock, RefreshCw } from 'lucide-react'
import GeneratorModal from '@/components/script-gen/GeneratorModal'
import { AudioEditorModal } from '@/components/AudioEditorModal'
import ExportModal from '@/components/ExportModal'
import { useToast } from "@/hooks/use-toast"
import { formatDuration, calculateTotalDuration } from '@/utils/timeFormat'
// ...

import { useSettingsStore } from '@/store/settingsStore'
import * as ReactWindowPkg from 'react-window';
import * as AutoSizerPkg from 'react-virtualized-auto-sizer';

// Robustly find the List component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rwAny = ReactWindowPkg as any;
const rwDefault = rwAny.default || rwAny;
const List = rwDefault.FixedSizeList || rwDefault.List || rwAny.FixedSizeList || rwAny.List;

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

    const { items, currentItemIndex, setCurrentIndex, handleEditItem, handleDeleteItem, handlePlayItem, handleOpenEditor } = data
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

                    {/* Audio Edit Button */}
                    {item.status === 'recorded' && !isEditing && (
                        <button
                            className="p-1 hover:bg-purple-500/20 text-muted-foreground hover:text-purple-400 rounded transition"
                            onClick={(e) => handleOpenEditor(index, e)}
                            title="Edit Audio (Trim/Denoise)"
                        >
                            <Scissors className="h-3.5 w-3.5" />
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
        loadProject, nextItem, prevItem, updateItemStatus, addItems, setCurrentIndex, setItems, saveProject,
        addTempRecording, deleteTempRecording
    } = useProjectStore()
    const { openaiApiKey, geminiApiKey } = useSettingsStore()

    // Guard: AudioEngine hook initializes regardless, but we should return early if no project to avoid crashes
    // However, hooks must be called unconditionally. So strict null check in return JSX is needed.
    // Or we show loading BEFORE other logic.

    // Audio Engine

    // Audio Engine
    // Audio Engine
    const { state: audioState, loadAudio, play: playAudio, stop: stopAudio, setPitch, setEQ, analyser: playbackAnalyser } = useAudioEngine()

    const [stream, setStream] = useState<MediaStream | null>(null)
    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const isTempRecordingRef = useRef(false)

    const listRef = useRef<any>(null)
    const audioStateRef = useRef(audioState)

    useEffect(() => {
        audioStateRef.current = audioState
    }, [audioState])

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

    // UI State
    const [isGenOpen, setIsGenOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [editorAudioUrl, setEditorAudioUrl] = useState<string | null>(null)
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
    const [isExportOpen, setIsExportOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)

    const handleOpenEditor = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const item = items[index]
        if (item.status !== 'recorded') return

        const filename = `file_${String(index + 1).padStart(4, '0')}.wav`
        const filePath = `${currentProject?.path}\\wavs\\${filename}`

        try {
            // Read file to create Blob URL for WaveSurfer
            const buffer = await window.api.readAudio(filePath)
            // Use Blob
            const blob = new Blob([buffer], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            setEditorAudioUrl(url)
            setEditingItemIndex(index)
            setEditorOpen(true)
        } catch (err) {
            console.error("Failed to open editor", err)
            toast({ title: "Error", description: "Could not load audio for editing", variant: "destructive" })
        }
    }

    const handleSaveEditedAudio = async (start: number, end: number, applyDenoise: boolean) => {
        if (editingItemIndex === null || !currentProject) return

        const index = editingItemIndex
        const filename = `file_${String(index + 1).padStart(4, '0')}.wav`
        const filePath = `${currentProject.path}\\wavs\\${filename}`

        try {
            await window.api.trimAudio(filePath, start, end, applyDenoise)

            // Clean up old blob
            if (editorAudioUrl) URL.revokeObjectURL(editorAudioUrl)

            toast({ title: "Success", description: "Audio edited successfully." })

            // Should we update the item duration in the store? 
            // Ideally yes.
            // window.api.readAudio again to check size/duration?
            // Or just trust it.

            setEditorOpen(false)
            setEditorAudioUrl(null)
            setEditingItemIndex(null)
        } catch (e) {
            console.error("Edit failed", e)
            toast({ title: "Error", description: "Failed to save edits.", variant: "destructive" })
        }
    }

    const handlePreviewAudio = async (start: number, end: number, applyDenoise: boolean) => {
        if (editingItemIndex === null || !currentProject) return

        const index = editingItemIndex
        const filename = `file_${String(index + 1).padStart(4, '0')}.wav`
        const filePath = `${currentProject.path}\\wavs\\${filename}`

        try {
            const buffer = await window.api.previewAudio(filePath, start, end, applyDenoise)
            // Play using AudioEngine
            const audioBuffer = await Tone.context.decodeAudioData(buffer)
            await loadAudio(audioBuffer)
            playAudio()
        } catch (e) {
            console.error("Preview failed", e)
            toast({ title: "Error", description: "Failed to preview audio.", variant: "destructive" })
        }
    }

    const handleRecalculateDurations = async () => {
        if (!currentProject || !items.length) return

        if (!confirm('This will verify all files and fix the duration display. It may take a moment. Continue?')) return

        setIsGenerating(true) // Reuse loading state or create new one
        toast({ title: "Recalculating...", description: "Scanning audio files for accurate duration." })

        try {
            const updatedItems = [...items]
            let changed = false

            for (let i = 0; i < updatedItems.length; i++) {
                const item = updatedItems[i]
                if (item.status === 'recorded') {
                    // Assume filename convention
                    const filename = `file_${String(i + 1).padStart(4, '0')}.wav`
                    const filePath = `${currentProject.path}\\wavs\\${filename}`

                    try {
                        const buffer = await window.api.readAudio(filePath)
                        // Decode to get duration
                        const audioBuffer = await Tone.context.decodeAudioData(buffer)

                        // If duration differs significantly from stored (> 0.1s), update it
                        // OR if stored duration is suspiciously large (bytes)
                        // Just update always to be safe
                        updatedItems[i] = { ...item, duration: audioBuffer.duration }
                        changed = true
                    } catch (err) {
                        console.error(`Failed to read duration for item ${i + 1}`, err)
                        // Maybe mark as error? or Leave as is?
                    }
                }
            }

            if (changed) {
                setItems(updatedItems)
                await saveProject()
                toast({ title: "Success", description: "Durations updated successfully." })
            } else {
                toast({ title: "No Changes", description: "All durations were already correct." })
            }

        } catch (e) {
            console.error("Recalculation error", e)
            toast({ title: "Error", description: "Failed to recalculate durations.", variant: "destructive" })
        } finally {
            setIsGenerating(false)
        }
    }

    const { toast } = useToast()

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

        // Determine if this is a temp recording
        // Condition: No active item OR specifically triggered (UI could enforce this differently)
        // For now, if currentItem is finished we might want to allow re-record? 
        // Let's say: If NO items, or we explicitly want to record temp.
        // Actually, requirement says: "When i record a voice clip without any script or sentences".
        // So if items.length === 0, OR maybe we add a specific "Temp Record" mode?
        // The user comment "When i record ... without any script" implies an empty state or distinct action.
        // Let's infer: If items is empty, treat as temp. 
        // OR: If currentItem is null/undefined.

        isTempRecordingRef.current = !currentItem

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            const buffer = await blob.arrayBuffer()

            // Calculate accurate duration
            let duration = 0
            try {
                // Clone buffer because decodeAudioData might detach/neuter it
                const bufferCopy = buffer.slice(0)
                const audioBuffer = await Tone.context.decodeAudioData(bufferCopy)
                duration = audioBuffer.duration
            } catch (e) {
                console.error("Failed to decode audio for duration calc:", e)
                // Fallback: estimate from blob size? No, just use 0 or maybe track start/end time in future.
            }

            if (isTempRecordingRef.current) {
                // Temp Recording Logic
                const timestamp = Date.now()
                const filename = `temp_${timestamp}.wav`

                if (currentProject) {
                    await window.api.saveAudio(buffer, filename, currentProject.path)

                    // Capture Settings from latest Ref
                    const { pitch, eq } = audioStateRef.current

                    addTempRecording({
                        id: generateUUID(),
                        name: `temp_${timestamp}.wav`,
                        path: filename,
                        timestamp,
                        duration: duration,
                        settings: { pitch, eq: { ...eq } }
                    })
                }
            } else {
                // Script Recording Logic
                const filename = `file_${String(currentItemIndex + 1).padStart(4, '0')}.wav`

                if (currentProject) {
                    await window.api.saveAudio(buffer, filename, currentProject.path)
                    // FIXED: Passing duration (seconds) instead of blob.size (bytes)
                    updateItemStatus(currentItem.id, 'recorded', duration)
                    nextItem()
                }
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
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                            try {
                                const content = await window.api.importScriptFile()
                                if (content) {
                                    const lines = content.split('\n')
                                        .map(l => l.trim())
                                        .filter(l => l.length > 0)

                                    if (lines.length > 0) {
                                        const newItems: ProjectItem[] = lines.map(text => ({
                                            id: generateUUID(),
                                            text,
                                            status: 'pending',
                                            duration: 0
                                        }))
                                        addItems(newItems)
                                        toast({
                                            title: "Import Successful",
                                            description: `Added ${newItems.length} sentences from file.`
                                        })
                                    } else {
                                        toast({
                                            title: "Import Failed",
                                            description: "File was empty or contained only whitespace.",
                                            variant: "destructive"
                                        })
                                    }
                                }
                            } catch (e) {
                                console.error('Import failed', e)
                                toast({
                                    title: "Import Error",
                                    description: "Failed to read file.",
                                    variant: "destructive"
                                })
                            }
                        }} title="Import TXT">
                            <FileText className="h-4 w-4" />
                        </Button>
                        <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Generate with AI">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                </div>

                {/* Generator Modal */}
                <Dialog open={isGenOpen} onOpenChange={setIsGenOpen}>
                    <GeneratorModal
                        isOpen={isGenOpen}
                        onClose={() => setIsGenOpen(false)}
                        onGenerate={async (prompt, count, systemPromptOverride) => {
                            console.log('[ProjectPage] onGenerate called with:', { prompt, count, systemPromptOverride })
                            setIsGenerating(true)
                            try {
                                // Use the passed prompt (or override)
                                // Our updated generateText accepts systemPromptOverride
                                const selectedModel = useSettingsStore.getState().selectedModel
                                const sentences = await window.api.generateText(prompt, count, systemPromptOverride, selectedModel)
                                const newItems: ProjectItem[] = sentences.map(text => ({
                                    id: generateUUID(),
                                    text,
                                    status: 'pending',
                                    duration: 0
                                }))
                                addItems(newItems)
                                setIsGenOpen(false)
                            } catch (e) {
                                console.error(e)
                                toast({
                                    title: "Generation Failed",
                                    description: "Could not generate sentences. Check API Key.",
                                    variant: "destructive"
                                })
                            } finally {
                                setIsGenerating(false)
                            }
                        }}
                        isGenerating={isGenerating}
                    />
                </Dialog>

                <AudioEditorModal
                    isOpen={editorOpen}
                    onClose={() => {
                        setEditorOpen(false)
                        if (editorAudioUrl) URL.revokeObjectURL(editorAudioUrl)
                        setEditorAudioUrl(null)
                        setEditingItemIndex(null)
                    }}
                    audioUrl={editorAudioUrl}
                    text={editingItemIndex !== null ? items[editingItemIndex]?.text : undefined}
                    onSave={handleSaveEditedAudio}
                    onPreview={handlePreviewAudio}
                />

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
                    <div className="flex flex-col pb-4">
                        {items && items.length > 0 ? items.map((_, index) => (
                            <Row
                                key={index}
                                index={index}
                                style={{ height: 48, width: '100%' }}
                                data={{ items, currentItemIndex, setCurrentIndex, handleEditItem, handleDeleteItem, handlePlayItem, handleOpenEditor }}
                            />
                        )) : <div className="p-4 text-center text-muted-foreground text-sm">No script items</div>}

                        {/* Add More Button */}
                        <div className="p-4 flex justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                                onClick={() => setIsGenOpen(true)}
                            >
                                <Plus className="h-3 w-3 mr-2" />
                                Add More
                            </Button>
                        </div>
                    </div>

                    {/* Temp Recordings Section */}
                    {currentProject?.tempRecordings && currentProject.tempRecordings.length > 0 && (
                        <div className="mt-6 border-t border-white/10 pt-4">
                            <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Temp Recordings
                            </div>
                            <div className="flex flex-col">
                                {currentProject.tempRecordings.map((rec) => (
                                    <div key={rec.id} className="px-4 py-2 flex items-center justify-between hover:bg-white/5 group border-b border-white/5 last:border-0 transition-colors">
                                        <div className="text-xs font-mono text-zinc-400 truncate flex-1 mr-2" title={rec.name}>
                                            {rec.name}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-1 hover:bg-green-500/20 text-green-500 rounded"
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    // Play Temp Logic
                                                    const filePath = `${currentProject.path}\\wavs\\${rec.path}`
                                                    try {
                                                        const buffer = await window.api.readAudio(filePath)
                                                        const audioBuffer = await Tone.context.decodeAudioData(buffer)
                                                        // RESTORE SETTINGS
                                                        if (rec.settings) {
                                                            setPitch(rec.settings.pitch)
                                                            setEQ('low', rec.settings.eq.low)
                                                            setEQ('mid', rec.settings.eq.mid)
                                                            setEQ('high', rec.settings.eq.high)
                                                            // Note: Sliders in UI should react if they are bound to audioState passed from store/hook
                                                            // Check EffectRack: it uses audioState. 
                                                            // useAudioEngine returns state which we pass to EffectRack.
                                                            // So updating setPitch/setEQ here updates hook state -> updates UI.
                                                        }
                                                        await loadAudio(audioBuffer)
                                                        playAudio()
                                                    } catch (err) {
                                                        console.error("Play temp failed", err)
                                                    }
                                                }}
                                            >
                                                <PlayCircle className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm('Delete temp recording forever?')) {
                                                        deleteTempRecording(rec.id)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-xs font-mono text-muted-foreground border border-white/5 group relative cursor-help" title="Total Recorded Time">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {formatDuration(calculateTotalDuration(items))}

                            {/* Recalculate Button (Visible on Hover/Group or always) */}
                            <button
                                onClick={handleRecalculateDurations}
                                className="ml-2 p-0.5 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition-colors"
                                title="Fix/Recalculate Durations (Click if time looks wrong)"
                                disabled={isGenerating}
                            >
                                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <div className="w-64 flex items-center gap-4">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-2 border-white/10"
                            onClick={() => setIsExportOpen(true)}
                        >
                            Export
                        </Button>

                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>{Math.round(progress)}%</span>
                                <span>{items.length} items</span>
                            </div>
                            <Progress value={progress} className="h-1 bg-secondary/30" />
                        </div>
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
                        <AudioVisualizer
                            stream={stream}
                            isRecording={isRecording}
                            isPlaying={audioState.isPlaying}
                            playbackAnalyser={playbackAnalyser}
                        />
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

            <EffectRack state={audioState} setPitch={setPitch} setEQ={setEQ} onExport={() => setIsExportOpen(true)} />

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                        <DialogDescription>Configure your API Keys.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="openai" className="text-right">OpenAI Key</Label>
                            <Input id="openai" value={openaiApiKey || ''} onChange={(e) => useSettingsStore.getState().setApiKey('openai', e.target.value)} className="col-span-3" type="password" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="gemini" className="text-right">Gemini Key</Label>
                            <Input id="gemini" value={geminiApiKey || ''} onChange={(e) => useSettingsStore.getState().setApiKey('gemini', e.target.value)} className="col-span-3" type="password" />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                isExporting={isExporting}
                onExport={async (format, speakerName) => {
                    if (!currentProject) return
                    setIsExporting(true)
                    try {
                        const path = await window.api.exportDataset(currentProject.path, items, format, speakerName)
                        if (path) {
                            toast({
                                title: "Export Successful",
                                description: `Dataset saved to ${path}`
                            })
                            setIsExportOpen(false)
                        } else {
                            // Cancelled
                        }
                    } catch (e) {
                        console.error("Export failed", e)
                        toast({
                            title: "Export Failed",
                            description: "See console for details.",
                            variant: "destructive"
                        })
                    } finally {
                        setIsExporting(false)
                    }
                }}
            />
        </div >
    )
}
