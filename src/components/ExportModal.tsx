import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Download, FileAudio, FileType, CheckCircle2 } from 'lucide-react'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    onExport: (format: 'f5' | 'piper' | 'xtts' | 'fish', speakerName: string) => Promise<void>
    isExporting: boolean
}

export default function ExportModal({ isOpen, onClose, onExport, isExporting }: ExportModalProps) {
    const [format, setFormat] = useState<'f5' | 'piper' | 'xtts' | 'fish'>('f5')
    const [speakerName, setSpeakerName] = useState('Ashan') // Default as per request

    const handleExport = () => {
        onExport(format, speakerName)
    }

    const needsSpeakerName = format === 'xtts' || format === 'fish'

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Dataset</DialogTitle>
                    <DialogDescription>
                        Select the target format for your voice model training.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)} className="grid grid-cols-1 gap-4">

                        {/* F5-TTS */}
                        <div>
                            <RadioGroupItem value="f5" id="f5" className="peer sr-only" />
                            <Label
                                htmlFor="f5"
                                className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                                <div className="flex w-full items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <FileType className="h-5 w-5" />
                                        F5-TTS (JSON)
                                    </div>
                                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Recommended</span>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    Generates <code>dataset.json</code> with audio paths and duration. Optimized for modern flow-matching models.
                                </div>
                            </Label>
                        </div>

                        {/* Piper */}
                        <div>
                            <RadioGroupItem value="piper" id="piper" className="peer sr-only" />
                            <Label
                                htmlFor="piper"
                                className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                                <div className="flex w-full items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <FileAudio className="h-5 w-5" />
                                        Piper / LJSpeech (CSV)
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    Classic pipe-separated format <code>id|text</code>. Industry standard for older/production models.
                                </div>
                            </Label>
                        </div>

                        {/* XTTS v2 */}
                        <div>
                            <RadioGroupItem value="xtts" id="xtts" className="peer sr-only" />
                            <Label
                                htmlFor="xtts"
                                className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                                <div className="flex w-full items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <CheckCircle2 className="h-5 w-5" />
                                        XTTS v2 (CSV)
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    Coqui format <code>path|text|speaker</code>. Best for cloning tasks.
                                </div>
                            </Label>
                        </div>

                        {/* Fish Speech */}
                        <div>
                            <RadioGroupItem value="fish" id="fish" className="peer sr-only" />
                            <Label
                                htmlFor="fish"
                                className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                                <div className="flex w-full items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Download className="h-5 w-5" />
                                        Fish Speech (Lab Files)
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    Generates <code>.lab</code> sidecar files and reorganizes into <code>dataset/data/Speaker/</code>.
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>

                    {/* Conditional Speaker Field */}
                    <div className={`space-y-2 transition-all duration-300 overflow-hidden ${needsSpeakerName ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <Label htmlFor="speaker">Speaker Name</Label>
                        <Input
                            id="speaker"
                            value={speakerName}
                            onChange={(e) => setSpeakerName(e.target.value)}
                            placeholder="e.g. Ashan"
                            className="bg-card"
                        />
                        <p className="text-[10px] text-muted-foreground">Required for directory structure or metadata tag.</p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isExporting}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? 'Exporting...' : 'Export Dataset'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
