import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function SettingsPage() {
    const navigate = useNavigate()
    const {
        openaiApiKey, geminiApiKey, selectedProvider,
        setApiKey, setProvider, saveSettings
    } = useSettingsStore()
    const { toast } = useToast()

    const [openAIKey, setOpenAIKey] = useState('')
    const [geminiKey, setGeminiKey] = useState('')
    const [provider, setLocalProvider] = useState<'openai' | 'gemini'>('openai')

    useEffect(() => {
        setOpenAIKey(openaiApiKey || '')
        setGeminiKey(geminiApiKey || '')
        setLocalProvider(selectedProvider || 'openai')
    }, [openaiApiKey, geminiApiKey, selectedProvider])

    const handleSave = async () => {
        setApiKey('openai', openAIKey)
        setApiKey('gemini', geminiKey)
        setProvider(provider)
        await saveSettings()
        toast({
            title: "Settings Saved",
            description: "Your preferences have been securely stored.",
        })
    }

    return (
        <div className="container mx-auto p-8 max-w-2xl">
            <Button
                variant="ghost"
                className="mb-6 pl-0 hover:bg-transparent hover:text-primary"
                onClick={() => navigate('/dashboard')}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Configure your AI provider.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">

                    <div className="space-y-4">
                        <Label>AI Provider</Label>
                        <RadioGroup value={provider} onValueChange={(v) => setLocalProvider(v as any)} className="grid grid-cols-2 gap-4">
                            <div>
                                <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                                <Label htmlFor="openai" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                                    <span className="mb-2 text-lg font-semibold">OpenAI</span>
                                    <span className="text-xs text-muted-foreground text-center">GPT-4 / GPT-3.5 Turbo</span>
                                    {provider === 'openai' && <CheckCircle2 className="mt-2 h-4 w-4 text-primary" />}
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="gemini" id="gemini" className="peer sr-only" />
                                <Label htmlFor="gemini" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                                    <span className="mb-2 text-lg font-semibold">Google Gemini</span>
                                    <span className="text-xs text-muted-foreground text-center">Gemini Pro 1.5</span>
                                    {provider === 'gemini' && <CheckCircle2 className="mt-2 h-4 w-4 text-primary" />}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-6">
                        <div className={`space-y-2 transition-opacity ${provider === 'openai' ? 'opacity-100' : 'opacity-50'}`}>
                            <Label htmlFor="openai-key">OpenAI API Key</Label>
                            <Input
                                id="openai-key"
                                type="password"
                                placeholder="sk-..."
                                value={openAIKey}
                                onChange={(e) => setOpenAIKey(e.target.value)}
                                disabled={provider !== 'openai'}
                            />
                        </div>

                        <div className={`space-y-2 transition-opacity ${provider === 'gemini' ? 'opacity-100' : 'opacity-50'}`}>
                            <Label htmlFor="gemini-key">Gemini API Key</Label>
                            <Input
                                id="gemini-key"
                                type="password"
                                placeholder="AIza..."
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                disabled={provider !== 'gemini'}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSave} size="lg">
                            <Save className="mr-2 h-4 w-4" />
                            Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
