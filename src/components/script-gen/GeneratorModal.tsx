import { useState, useEffect } from 'react'
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wand2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { buildSystemPrompt } from '@/utils/promptBuilder'
import { useProjectStore } from '@/store/projectStore'
import { GENERATION_PRESETS } from '@/constants'

interface GeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string, count: number, systemPromptOverride?: string) => Promise<void>;
    isGenerating: boolean;
}

export default function GeneratorModal({ isOpen, onClose, onGenerate, isGenerating }: GeneratorModalProps) {
    const { currentProject, updateGenSettings } = useProjectStore()

    // State
    const [count, setCount] = useState('5')
    const [mainLang, setMainLang] = useState('Sinhala')
    const [secLang, setSecLang] = useState('')
    const [domain, setDomain] = useState('')
    const [customInst, setCustomInst] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState('')
    const [mode, setMode] = useState<'simple' | 'advanced'>('simple')

    // Load settings on mount/open
    useEffect(() => {
        if (isOpen && currentProject?.genSettings) {
            setMainLang(currentProject.genSettings.mainLanguage || 'Sinhala')
            setSecLang(currentProject.genSettings.secondaryLanguage || '')
            setDomain(currentProject.genSettings.domain || '')
        }
    }, [isOpen, currentProject])

    // Update System Prompt when inputs change
    useEffect(() => {
        const builtPrompt = buildSystemPrompt(mainLang, secLang, domain || 'General', customInst)
        setSystemPrompt(builtPrompt)
    }, [mainLang, secLang, domain, customInst])

    const handleGenerate = async () => {
        // Save settings
        if (mode === 'advanced') {
            console.log('[GeneratorModal] Advanced Mode. Built Prompt:', systemPrompt)
            updateGenSettings({
                mainLanguage: mainLang,
                secondaryLanguage: secLang,
                domain: domain,
                lastPrompt: systemPrompt
            })
            // For advanced, we override system prompt. The 'prompt' arg to generateText becomes less relevant 
            // but we usually send the User Prompt there. 
            // In our architecture, generateText takes (prompt, count).
            // Usually 'prompt' was "Generate 5 sentences about Topic". -> System Prompt was generic.
            // Now we want to send a System Prompt override.
            // The User Prompt can be simple: "Generate {count} sentences." since System Prompt has all rules.

            await onGenerate(`Generate ${count} sentences.`, Number(count), systemPrompt)
        } else {
            // Simple Mode (Legacy behavior or simplified wrap)
            // We can just use the domain as topic
            await onGenerate(domain || 'General', Number(count))
        }
    }

    return (
        <DialogContent className="sm:max-w-[600px] bg-slate-900 text-slate-100 border-slate-800">
            <DialogHeader>
                <DialogTitle>Generate Scripts (AI)</DialogTitle>
                <DialogDescription className="text-slate-400">
                    Create synthetic datasets using LLMs.
                </DialogDescription>
            </DialogHeader>

            <Tabs value={mode} onValueChange={(v: string) => setMode(v as 'simple' | 'advanced')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="simple">Simple</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="simple" className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Topic</Label>
                        <Input
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="e.g. Daily Conversation"
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Count</Label>
                        <Input
                            type="number"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            className="bg-slate-800 border-slate-700"
                            max={50}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 py-4">
                    {/* Presets Selection */}
                    <div className="space-y-2">
                        <Label>Preset (Auto-fill)</Label>
                        <Select onValueChange={(val) => {
                            const p = GENERATION_PRESETS.find(pr => pr.id === val)
                            if (p) {
                                setMainLang(p.mainLanguage)
                                setSecLang(p.secondaryLanguage)
                                setDomain(p.domain)
                            }
                        }}>
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                <SelectValue placeholder="Select a preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {GENERATION_PRESETS.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <span className="font-medium">{p.label}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">- {p.description}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Main Language</Label>
                            <Select value={mainLang} onValueChange={setMainLang}>
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sinhala">Sinhala</SelectItem>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Tamil">Tamil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Secondary Language</Label>
                            <Select value={secLang || "none"} onValueChange={(val) => setSecLang(val === "none" ? "" : val)}>
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="English">English</SelectItem>
                                    <SelectItem value="Sinhala">Sinhala</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Domain / Context</Label>
                        <Input
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="e.g. Tech Review, News, casual"
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Sentence Count</Label>
                        <Input
                            type="number"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            className="bg-slate-800 border-slate-700"
                            max={50}
                        />
                    </div>

                    {/* Preview Section */}
                    <div className="border border-slate-700 rounded-md overflow-hidden">
                        <button
                            onClick={() => setPreviewOpen(!previewOpen)}
                            className="w-full flex items-center justify-between p-3 bg-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200"
                        >
                            <span>SYSTEM PROMPT PREVIEW</span>
                            {previewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {previewOpen && (
                            <div className="p-2 bg-slate-950">
                                <Textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="font-mono text-xs h-40 bg-transparent border-0 focus-visible:ring-0 text-green-400"
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={isGenerating || !domain}>
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    Generate
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}
