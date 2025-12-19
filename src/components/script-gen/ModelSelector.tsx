import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { useSettingsStore } from '@/store/settingsStore'

export function ModelSelector() {
    const { selectedProvider, selectedModel, setModel } = useSettingsStore()
    const [models, setModels] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchModels = async () => {
        if (!selectedProvider) return
        setLoading(true)
        setError(null)
        try {
            const list = await window.api.getModels(selectedProvider)
            setModels(list)
            // If current selected model is not in the new list, or empty, set default
            if (list.length > 0 && (!selectedModel || !list.includes(selectedModel))) {
                setModel(list[0]) // Select first available
            }
        } catch (error: any) {
            console.error("Failed to fetch models", error)
            setError(error.message?.replace('Error invoking remote method \'get-models\': Error: ', '') || "Failed to load models")
        } finally {
            setLoading(false)
        }
    }

    // Auto-fetch on mount or provider change if list is empty
    useEffect(() => {
        if (models.length === 0) {
            fetchModels()
        }
    }, [selectedProvider])

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
                <Select
                    value={selectedModel}
                    onValueChange={setModel}
                    disabled={loading}
                >
                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 h-8 text-xs">
                        <SelectValue placeholder={loading ? "Loading..." : "Select Model"} />
                    </SelectTrigger>
                    <SelectContent>
                        {models.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-100"
                    onClick={fetchModels}
                    disabled={loading}
                    title="Refresh Models"
                >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
            </div>
            {error && <span className="text-[10px] text-red-400 max-w-[200px] text-right leading-tight">{error}</span>}
            {loading && !error && <span className="text-[10px] text-muted-foreground animate-pulse">Fetching available models...</span>}
        </div>
    )
}
