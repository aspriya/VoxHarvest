import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectItem } from '@/types'
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface ScriptManagerModalProps {
    isOpen: boolean
    onClose: () => void
    items: ProjectItem[]
    onAddItems: (texts: string[]) => void
    onDeleteItem: (id: string) => void
}

export default function ScriptManagerModal({ isOpen, onClose, items, onAddItems, onDeleteItem }: ScriptManagerModalProps) {
    const [bulkText, setBulkText] = useState('')
    const { toast } = useToast()

    // Stats
    const total = items.length
    const recorded = items.filter(i => i.status === 'recorded').length
    const pending = total - recorded

    const handleBulkAdd = () => {
        if (!bulkText.trim()) return

        const lines = bulkText.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)

        if (lines.length === 0) return

        onAddItems(lines)
        setBulkText('')
        toast({
            title: "Added Sentences",
            description: `Successfully added ${lines.length} new sentences to the script.`
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>Script Manager</DialogTitle>
                            <DialogDescription>Manage your project sentences in bulk.</DialogDescription>
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                            <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="font-semibold text-foreground">{recorded}</span> Recorded
                            </div>
                            <div className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1.5 rounded-full">
                                <Circle className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{pending}</span> Pending
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="px-6 border-b bg-muted/40 shrink-0">
                        <TabsList className="bg-transparent p-0 h-12 gap-6">
                            <TabsTrigger value="list" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2">
                                Sentence List
                            </TabsTrigger>
                            <TabsTrigger value="add" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 pt-2">
                                Bulk Add
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="list" className="flex-1 overflow-hidden m-0 p-0 min-h-0 relative">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col p-2">
                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`group flex items-center justify-between p-3 rounded-lg mb-1 transition-colors ${item.status === 'recorded'
                                            ? 'bg-green-500/5 hover:bg-green-500/10 border border-green-500/20'
                                            : 'text-muted-foreground hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex flex-1 min-w-0 items-center gap-4">
                                            <span className={`font-mono text-xs w-8 shrink-0 ${item.status === 'recorded' ? 'text-green-500' : 'opacity-30'}`}>
                                                {(index + 1).toString().padStart(3, '0')}
                                            </span>

                                            <div className="truncate flex-1 font-medium text-sm">
                                                {item.text}
                                            </div>

                                            {item.status === 'recorded' && (
                                                <div className="shrink-0 px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] rounded uppercase font-bold tracking-wider">
                                                    Done
                                                </div>
                                            )}
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                            {item.status !== 'recorded' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm('Delete this sentence?')) onDeleteItem(item.id)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <div className="py-20 text-center text-muted-foreground">
                                        No sentences yet. Switch to "Bulk Add" to create some.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="add" className="flex-1 flex flex-col m-0 p-6 gap-4 overflow-hidden">
                        <div className="space-y-2 shrink-0">
                            <h3 className="text-lg font-semibold">Bulk Add Sentences</h3>
                            <p className="text-sm text-muted-foreground">
                                Paste your script below. Each new line will be treated as a separate sentence.
                            </p>
                        </div>

                        <Textarea
                            placeholder="Paste your script content here..."
                            className="flex-1 font-mono text-sm leading-relaxed resize-none p-4"
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                        />

                        <div className="flex justify-end gap-3 shrink-0 pt-2">
                            <div className="text-xs text-muted-foreground self-center mr-auto">
                                {bulkText.split('\n').filter(l => l.trim().length > 0).length} potential sentences
                            </div>
                            <Button variant="ghost" onClick={() => setBulkText('')}>Clear</Button>
                            <Button onClick={handleBulkAdd} disabled={!bulkText.trim()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add to Project
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
