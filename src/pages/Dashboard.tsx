import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Settings, FolderOpen, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
    const navigate = useNavigate()
    const { recentProjects, loadSettings, openaiApiKey } = useSettingsStore()

    useEffect(() => {
        loadSettings()
    }, [])

    const handleCreateProject = async () => {
        const dir = await window.api.selectDirectory()
        if (dir) {
            // Logic to trigger create project modal or flow
            // For now, let's assume we prompt for name or have a modal.
            // The roadmap says "New Project button -> selectDir -> createProject".
            // We'll need a way to get the project name.
            // Let's implement a simple prompt for now or a proper dialog later.
            const projectName = `Project ${new Date().getTime()}` // Placeholder
            const project = await window.api.createProject({ name: projectName, location: dir })
            useSettingsStore.getState().addRecentProject(project)
            navigate(`/project/${project.id}`)
        }
    }

    const handleOpenProject = async () => {
        const dir = await window.api.selectDirectory()
        if (dir) {
            const project = await window.api.loadProject(dir)
            useSettingsStore.getState().addRecentProject(project)
            navigate(`/project/${project.id}`)
        }
    }

    return (
        <div className="container mx-auto p-10 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">VoxHarvest</h1>
                    <p className="text-muted-foreground mt-2">Professional VITS Dataset Studio</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {!openaiApiKey && (
                <Card className="bg-yellow-500/10 border-yellow-500/50">
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div className="text-yellow-600 dark:text-yellow-400">
                            You haven't configured your OpenAI API Key yet. AI generation will be disabled.
                        </div>
                        <Button variant="outline" className="border-yellow-500/50 text-yellow-600" onClick={() => navigate('/settings')}>
                            Configure Now
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer" onClick={handleCreateProject}>
                    <CardContent className="flex flex-col items-center justify-center h-48 gap-4">
                        <div className="p-4 rounded-full bg-primary/10 text-primary">
                            <Plus className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold">New Project</h3>
                            <p className="text-sm text-muted-foreground">Create a fresh dataset from scratch</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer" onClick={handleOpenProject}>
                    <CardContent className="flex flex-col items-center justify-center h-48 gap-4">
                        <div className="p-4 rounded-full bg-secondary text-secondary-foreground">
                            <FolderOpen className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-semibold">Open Existing</h3>
                            <p className="text-sm text-muted-foreground">Locate a project folder on disk</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Recent Projects</h2>
                {recentProjects && recentProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recentProjects.map((p) => (
                            <Card key={p.path} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={async () => {
                                // Verify path exists?
                                try {
                                    const loaded = await window.api.loadProject(p.path)
                                    useSettingsStore.getState().addRecentProject(loaded)
                                    navigate(`/project/${loaded.id}`)
                                } catch (e) {
                                    console.error("Failed to open recent", e)
                                    // Maybe show toast error
                                }
                            }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.name}</CardTitle>
                                    <CardDescription className="truncate" title={p.path}>{p.path}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {p.lastOpened ? formatDistanceToNow(new Date(p.lastOpened), { addSuffix: true }) : 'Unknown'}
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        No recent projects found.
                    </div>
                )}
            </div>
        </div>
    )
}
