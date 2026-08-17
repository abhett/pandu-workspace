import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BarChart2,
    Calendar,
    CheckCircle2,
    Clock,
    Columns3,
    Flame,
    FolderKanban,
    Layers,
    ListTodo,
    MoreHorizontal,
    MoveRight,
    Play,
    Plus,
    Search,
    Settings,
    Sparkles,
    Target,
    Trash2,
    TrendingDown,
    Users,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type TaskItem = {
    id: string;
    key: string;
    title: string;
    type: string;
    priority: string;
    estimate_points: number | null;
    due_date: string | null;
    status_id: string;
    status_name: string;
    status_color: string;
    status_category: string;
    is_completed: boolean;
    rank: string;
    assignees: Array<{ id: number; name: string; email: string }>;
};

type ActiveSprintData = {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    started_at: string | null;
    days_remaining: number | null;
    committed_points: number;
    total_points: number;
    completed_points: number;
    tasks_count: number;
    completed_tasks_count: number;
    tasks: TaskItem[];
} | null;

type FutureSprintData = {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_points: number;
    tasks_count: number;
    tasks: TaskItem[];
};

type CompletedSprintData = {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    committed_points: number | null;
    completed_points: number | null;
};

type BurndownDay = {
    date: string;
    day_label: string;
    ideal_remaining: number;
    actual_remaining: number | null;
};

interface Props {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    project: {
        id: string;
        name: string;
        key: string;
        slug: string;
        type: string;
        color: string;
        icon: string;
    };
    statuses: Array<{
        id: string;
        name: string;
        slug: string;
        category: string;
        color: string;
        position: number;
        is_completed: boolean;
    }>;
    activeSprint: ActiveSprintData;
    futureSprints: FutureSprintData[];
    completedSprints: CompletedSprintData[];
    backlog: {
        tasks: TaskItem[];
        total_points: number;
        tasks_count: number;
    };
    members: Array<{
        id: number;
        name: string;
        email: string;
    }>;
}

export default function ProjectBacklog({
    organization,
    project,
    statuses,
    activeSprint,
    futureSprints,
    completedSprints,
    backlog,
    members,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [createSprintModalOpen, setCreateSprintModalOpen] = useState(false);
    const [startSprintModalOpen, setStartSprintModalOpen] = useState(false);
    const [completeSprintModalOpen, setCompleteSprintModalOpen] = useState(false);
    const [burndownModalOpen, setBurndownModalOpen] = useState(false);
    const [selectedSprintToStart, setSelectedSprintToStart] = useState<FutureSprintData | null>(null);
    const [burndownData, setBurndownData] = useState<{ sprint: any; days: BurndownDay[] } | null>(null);
    const [loadingBurndown, setLoadingBurndown] = useState(false);

    // AI Summary Modal
    const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
    const [aiSummaryData, setAiSummaryData] = useState<any>(null);
    const [loadingAiSummary, setLoadingAiSummary] = useState(false);
    const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);

    // Create Sprint Form
    const createSprintForm = useForm({
        name: '',
        goal: '',
        start_date: '',
        end_date: '',
    });

    // Start Sprint Form
    const startSprintForm = useForm({
        name: '',
        goal: '',
        duration_weeks: '2',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    });

    // Complete Sprint Form
    const completeSprintForm = useForm({
        destination_type: 'backlog',
        target_sprint_id: futureSprints[0]?.id || '',
    });

    const handleCreateSprint = (e: React.FormEvent) => {
        e.preventDefault();
        createSprintForm.post(`/projects/${project.id}/sprints`, {
            onSuccess: () => {
                setCreateSprintModalOpen(false);
                createSprintForm.reset();
            },
        });
    };

    const openStartSprintModal = (sprint: FutureSprintData) => {
        setSelectedSprintToStart(sprint);
        startSprintForm.setData({
            name: sprint.name,
            goal: sprint.goal || '',
            duration_weeks: '2',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        });
        setStartSprintModalOpen(true);
    };

    const handleStartSprint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSprintToStart) return;

        startSprintForm.post(`/projects/${project.id}/sprints/${selectedSprintToStart.id}/start`, {
            onSuccess: () => {
                setStartSprintModalOpen(false);
            },
        });
    };

    const handleCompleteSprint = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSprint) return;

        completeSprintForm.post(`/projects/${project.id}/sprints/${activeSprint.id}/complete`, {
            onSuccess: () => {
                setCompleteSprintModalOpen(false);
            },
        });
    };

    const handleMoveTask = (taskId: string, sprintId: string | null) => {
        router.patch(
            `/projects/${project.id}/tasks/${taskId}/sprint`,
            { sprint_id: sprintId },
            { preserveScroll: true }
        );
    };

    const handleDeleteSprint = (sprintId: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus sprint ini? Semua task akan dikembalikan ke Backlog.')) {
            router.delete(`/projects/${project.id}/sprints/${sprintId}`);
        }
    };

    const openBurndownChart = (sprintId: string) => {
        setLoadingBurndown(true);
        setBurndownModalOpen(true);
        fetch(`/projects/${project.id}/sprints/${sprintId}/burndown`)
            .then((res) => res.json())
            .then((data) => {
                setBurndownData(data);
                setLoadingBurndown(false);
            })
            .catch(() => setLoadingBurndown(false));
    };

    const handleGenerateAiSummary = (sprintId: string) => {
        setLoadingAiSummary(true);
        setAiSummaryError(null);
        setAiSummaryData(null);
        setAiSummaryModalOpen(true);

        fetch(`/projects/${project.id}/ai/sprint-summary/${sprintId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setAiSummaryData(data.data);
                } else {
                    setAiSummaryError(data.error || 'Gagal menghasilkan ringkasan AI.');
                }
                setLoadingAiSummary(false);
            })
            .catch((err) => {
                setAiSummaryError(err.message || 'Terjadi kesalahan jaringan.');
                setLoadingAiSummary(false);
            });
    };

    const filterTasks = (tasks: TaskItem[]) => {
        if (!searchQuery.trim()) return tasks;
        const q = searchQuery.toLowerCase();
        return tasks.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.key.toLowerCase().includes(q) ||
                t.assignees.some((a) => a.name.toLowerCase().includes(q))
        );
    };

    const getPriorityBadge = (p: string) => {
        switch (p) {
            case 'highest':
                return <span className="text-xs font-semibold text-rose-500">▲▲ Highest</span>;
            case 'high':
                return <span className="text-xs font-semibold text-orange-500">▲ High</span>;
            case 'medium':
                return <span className="text-xs text-amber-500">■ Medium</span>;
            case 'low':
                return <span className="text-xs text-blue-400">▼ Low</span>;
            default:
                return <span className="text-xs text-slate-400">▽ Lowest</span>;
        }
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case 'bug':
                return <span className="rounded bg-rose-500/10 px-1 py-0.5 text-[10px] font-bold text-rose-400">BUG</span>;
            case 'story':
                return <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[10px] font-bold text-emerald-400">STORY</span>;
            case 'epic':
                return <span className="rounded bg-purple-500/10 px-1 py-0.5 text-[10px] font-bold text-purple-400">EPIC</span>;
            default:
                return <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[10px] font-bold text-blue-400">TASK</span>;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title={`Backlog & Sprints - ${project.name}`} />

            {/* Header */}
            <div className="border-b border-border bg-card/60 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Link href="/projects" className="hover:text-foreground">
                                    Proyek
                                </Link>
                                <span>/</span>
                                <span className="text-foreground">{project.name}</span>
                                <span>/</span>
                                <span className="font-semibold text-primary">Backlog & Sprints</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                                <div
                                    className="flex size-9 items-center justify-center rounded-lg text-white shadow-sm"
                                    style={{ backgroundColor: project.color || '#3b82f6' }}
                                >
                                    <FolderKanban className="size-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        KEY: {project.key} • Metodologi: <span className="uppercase text-primary font-semibold">{project.type}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs & Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1">
                                <Link
                                    href={`/projects/${project.id}`}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                                >
                                    <Activity className="size-3.5" />
                                    Overview
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/board`}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                                >
                                    <Columns3 className="size-3.5" />
                                    Board
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/tasks`}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                                >
                                    <ListTodo className="size-3.5" />
                                    Tasks
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/backlog`}
                                    className="flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm"
                                >
                                    <Layers className="size-3.5" />
                                    Backlog
                                </Link>
                                <Link
                                    href={`/projects/${project.id}/settings`}
                                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                                >
                                    <Settings className="size-3.5" />
                                    Settings
                                </Link>
                            </div>

                            <Button
                                onClick={() => setCreateSprintModalOpen(true)}
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                            >
                                <Plus className="size-4" />
                                Buat Sprint
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Workspace Content */}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Search Bar */}
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari task di backlog / sprint..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span>Active Sprint</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-blue-500" />
                            <span>Planned Sprints ({futureSprints.length})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-slate-500" />
                            <span>Backlog ({backlog.tasks_count})</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 1. ACTIVE SPRINT SECTION */}
                    {activeSprint ? (
                        <div className="rounded-xl border-2 border-emerald-500/40 bg-card p-5 shadow-sm">
                            <div className="flex flex-col gap-3 pb-4 border-b border-border md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30 gap-1 text-xs">
                                            <Flame className="size-3 animate-pulse" />
                                            Active Sprint
                                        </Badge>
                                        <h2 className="text-lg font-bold text-foreground">{activeSprint.name}</h2>
                                    </div>
                                    {activeSprint.goal && (
                                        <p className="mt-1 text-xs text-muted-foreground italic">
                                            Goal: "{activeSprint.goal}"
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-3.5" />
                                            {activeSprint.start_date} – {activeSprint.end_date}
                                        </span>
                                        {activeSprint.days_remaining !== null && (
                                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                                <Clock className="size-3.5" />
                                                {activeSprint.days_remaining} hari tersisa
                                            </span>
                                        )}
                                        <span>
                                            Committed:{' '}
                                            <strong className="text-foreground">{activeSprint.committed_points} SP</strong>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => handleGenerateAiSummary(activeSprint.id)}
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                                    >
                                        <Sparkles className="size-3.5" />
                                        <span>AI Summary</span>
                                    </Button>
                                    <Button
                                        onClick={() => openBurndownChart(activeSprint.id)}
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <TrendingDown className="size-3.5 text-primary" />
                                        Burndown
                                    </Button>
                                    <Button
                                        onClick={() => setCompleteSprintModalOpen(true)}
                                        size="sm"
                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    >
                                        <CheckCircle2 className="size-4" />
                                        Selesaikan Sprint
                                    </Button>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                    <span className="text-muted-foreground">
                                        Progress Selesai:{' '}
                                        <strong className="text-foreground">
                                            {activeSprint.completed_tasks_count} / {activeSprint.tasks_count} task
                                        </strong>
                                    </span>
                                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {activeSprint.completed_points} / {activeSprint.total_points || activeSprint.committed_points} SP
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{
                                            width: `${
                                                activeSprint.total_points > 0
                                                    ? Math.min(100, Math.round((activeSprint.completed_points / activeSprint.total_points) * 100))
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Active Sprint Tasks List */}
                            <div className="mt-4 space-y-2">
                                {filterTasks(activeSprint.tasks).length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                                        Tidak ada task di dalam Sprint ini. Pindahkan task dari Backlog di bawah.
                                    </div>
                                ) : (
                                    filterTasks(activeSprint.tasks).map((task) => (
                                        <div
                                            key={task.id}
                                            className="group flex items-center justify-between rounded-lg border border-border bg-card/40 p-2.5 transition hover:border-primary/40 hover:bg-card"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {getTypeIcon(task.type)}
                                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                                    {task.key}
                                                </span>
                                                <span className={`text-xs font-medium ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {task.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {getPriorityBadge(task.priority)}

                                                <span
                                                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                                    style={{ backgroundColor: task.status_color }}
                                                >
                                                    {task.status_name}
                                                </span>

                                                {task.estimate_points !== null && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                                                        {task.estimate_points} SP
                                                    </span>
                                                )}

                                                {/* Actions */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-7">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleMoveTask(task.id, null)}>
                                                            <ArrowRight className="mr-2 size-3.5" /> Pindahkan ke Backlog
                                                        </DropdownMenuItem>
                                                        {futureSprints.map((s) => (
                                                            <DropdownMenuItem key={s.id} onClick={() => handleMoveTask(task.id, s.id)}>
                                                                <MoveRight className="mr-2 size-3.5" /> Pindah ke {s.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center">
                            <Zap className="mx-auto size-8 text-muted-foreground/60 mb-2" />
                            <h3 className="text-sm font-semibold text-foreground">Tidak Ada Sprint yang Sedang Aktif</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                                Mulai salah satu sprint yang telah direncanakan di bawah untuk memulai pelacakan waktu dan papan kerja tim.
                            </p>
                        </div>
                    )}

                    {/* 2. PLANNED / FUTURE SPRINTS SECTION */}
                    {futureSprints.map((sprint) => (
                        <div key={sprint.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex flex-col gap-3 pb-4 border-b border-border md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-xs">
                                            Planned
                                        </Badge>
                                        <h3 className="text-base font-bold text-foreground">{sprint.name}</h3>
                                        <span className="text-xs text-muted-foreground">
                                            ({sprint.tasks_count} task • {sprint.total_points} SP)
                                        </span>
                                    </div>
                                    {sprint.goal && (
                                        <p className="mt-1 text-xs text-muted-foreground italic">
                                            Goal: "{sprint.goal}"
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => openStartSprintModal(sprint)}
                                        size="sm"
                                        className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Play className="size-3.5 fill-current" />
                                        Mulai Sprint
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="size-8">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteSprint(sprint.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-3.5" /> Hapus Sprint
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Sprint Tasks */}
                            <div className="mt-3 space-y-2">
                                {filterTasks(sprint.tasks).length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                                        Sprint ini belum memiliki task. Pindahkan task dari Backlog di bawah ke sprint ini.
                                    </div>
                                ) : (
                                    filterTasks(sprint.tasks).map((task) => (
                                        <div
                                            key={task.id}
                                            className="group flex items-center justify-between rounded-lg border border-border bg-card/40 p-2.5 transition hover:border-primary/40 hover:bg-card"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {getTypeIcon(task.type)}
                                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                                    {task.key}
                                                </span>
                                                <span className="text-xs font-medium text-foreground">
                                                    {task.title}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                {getPriorityBadge(task.priority)}

                                                <span
                                                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                                    style={{ backgroundColor: task.status_color }}
                                                >
                                                    {task.status_name}
                                                </span>

                                                {task.estimate_points !== null && (
                                                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                                                        {task.estimate_points} SP
                                                    </span>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-7">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {activeSprint && (
                                                            <DropdownMenuItem onClick={() => handleMoveTask(task.id, activeSprint.id)}>
                                                                <MoveRight className="mr-2 size-3.5" /> Pindah ke {activeSprint.name} (Aktif)
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleMoveTask(task.id, null)}>
                                                            <ArrowRight className="mr-2 size-3.5" /> Pindahkan ke Backlog
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}

                    {/* 3. PROJECT BACKLOG CONTAINER */}
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <div>
                                <h3 className="text-base font-bold text-foreground">Backlog Proyek</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {backlog.tasks_count} task yang belum ditugaskan ke sprint • Total Estimasi:{' '}
                                    <strong className="text-foreground">{backlog.total_points} SP</strong>
                                </p>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                            >
                                <Link href={`/projects/${project.id}/tasks`}>
                                    <Plus className="size-3.5" />
                                    Buat Task Baru
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-4 space-y-2">
                            {filterTasks(backlog.tasks).length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                                    Backlog kosong. Semua task telah dimasukkan ke dalam sprint atau belum ada task yang dibuat.
                                </div>
                            ) : (
                                filterTasks(backlog.tasks).map((task) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center justify-between rounded-lg border border-border bg-card/40 p-2.5 transition hover:border-primary/40 hover:bg-card"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {getTypeIcon(task.type)}
                                            <span className="font-mono text-xs font-bold text-muted-foreground">
                                                {task.key}
                                            </span>
                                            <span className="text-xs font-medium text-foreground">
                                                {task.title}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {getPriorityBadge(task.priority)}

                                            <span
                                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                                style={{ backgroundColor: task.status_color }}
                                            >
                                                {task.status_name}
                                            </span>

                                            {task.estimate_points !== null ? (
                                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                                                    {task.estimate_points} SP
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground italic">Belum ada SP</span>
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="size-7">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {activeSprint && (
                                                        <DropdownMenuItem onClick={() => handleMoveTask(task.id, activeSprint.id)}>
                                                            <MoveRight className="mr-2 size-3.5" /> Masukkan ke {activeSprint.name} (Aktif)
                                                        </DropdownMenuItem>
                                                    )}
                                                    {futureSprints.map((s) => (
                                                        <DropdownMenuItem key={s.id} onClick={() => handleMoveTask(task.id, s.id)}>
                                                            <MoveRight className="mr-2 size-3.5" /> Masukkan ke {s.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE SPRINT MODAL */}
            <Dialog open={createSprintModalOpen} onOpenChange={setCreateSprintModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateSprint}>
                        <DialogHeader>
                            <DialogTitle>Buat Sprint Baru</DialogTitle>
                            <DialogDescription>
                                Sprint baru akan dibuat dalam status perencanaan (Planned/Future).
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="sprint_name">Nama Sprint</Label>
                                <Input
                                    id="sprint_name"
                                    placeholder={`Contoh: ${project.key} Sprint ${futureSprints.length + 2}`}
                                    value={createSprintForm.data.name}
                                    onChange={(e) => createSprintForm.setData('name', e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="sprint_goal">Sprint Goal (Tujuan)</Label>
                                <Textarea
                                    id="sprint_goal"
                                    placeholder="Contoh: Menyelesaikan otentikasi 2FA dan integrasi payment gateway."
                                    value={createSprintForm.data.goal}
                                    onChange={(e) => createSprintForm.setData('goal', e.target.value)}
                                    className="mt-1 text-xs"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateSprintModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={createSprintForm.processing}>
                                {createSprintForm.processing ? <Spinner className="mr-2" /> : null}
                                Simpan Sprint
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* START SPRINT MODAL */}
            <Dialog open={startSprintModalOpen} onOpenChange={setStartSprintModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleStartSprint}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Play className="size-4 text-emerald-500 fill-current" />
                                Mulai Sprint: {selectedSprintToStart?.name}
                            </DialogTitle>
                            <DialogDescription>
                                Sprint ini akan menjadi sprint aktif proyek. Baseline committed story points akan dikunci.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="start_name">Nama Sprint</Label>
                                <Input
                                    id="start_name"
                                    value={startSprintForm.data.name}
                                    onChange={(e) => startSprintForm.setData('name', e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>

                            <div>
                                <Label htmlFor="start_goal">Tujuan Sprint (Sprint Goal)</Label>
                                <Input
                                    id="start_goal"
                                    value={startSprintForm.data.goal}
                                    onChange={(e) => startSprintForm.setData('goal', e.target.value)}
                                    placeholder="Contoh: Menyelesaikan MVP otentikasi dan pembayaran"
                                    className="text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="start_start_date">Tanggal Mulai</Label>
                                    <Input
                                        id="start_start_date"
                                        type="date"
                                        value={startSprintForm.data.start_date}
                                        onChange={(e) => startSprintForm.setData('start_date', e.target.value)}
                                        required
                                        className="text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="start_end_date">Tanggal Berakhir</Label>
                                    <Input
                                        id="start_end_date"
                                        type="date"
                                        value={startSprintForm.data.end_date}
                                        onChange={(e) => startSprintForm.setData('end_date', e.target.value)}
                                        required
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg bg-muted/40 p-3 text-xs">
                                <p className="font-semibold text-foreground">Ringkasan Komitmen:</p>
                                <p className="text-muted-foreground mt-1">
                                    Total Task: <strong>{selectedSprintToStart?.tasks_count || 0}</strong> • Story Points:{' '}
                                    <strong>{selectedSprintToStart?.total_points || 0} SP</strong>
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStartSprintModalOpen(false)}
                                disabled={startSprintForm.processing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={startSprintForm.processing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {startSprintForm.processing ? 'Memulai...' : 'Mulai Sprint Sekarang'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* COMPLETE SPRINT MODAL */}
            <Dialog open={completeSprintModalOpen} onOpenChange={setCompleteSprintModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCompleteSprint}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="size-5 text-emerald-500" />
                                Selesaikan: {activeSprint?.name}
                            </DialogTitle>
                            <DialogDescription>
                                Ringkasan penyelesaian dan routing task yang belum tuntas.
                            </DialogDescription>
                        </DialogHeader>

                        {activeSprint && (
                            <div className="space-y-4 py-4">
                                <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Task Selesai:</span>
                                        <strong className="text-emerald-500 font-semibold">
                                            {activeSprint.completed_tasks_count} task ({activeSprint.completed_points} SP)
                                        </strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Task Belum Selesai:</span>
                                        <strong className="text-amber-500 font-semibold">
                                            {activeSprint.tasks_count - activeSprint.completed_tasks_count} task ({activeSprint.total_points - activeSprint.completed_points} SP)
                                        </strong>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="destination_type">Tujuan Pemindahan Task yang Belum Selesai</Label>
                                    <Select
                                        value={completeSprintForm.data.destination_type}
                                        onValueChange={(val) => completeSprintForm.setData('destination_type', val)}
                                    >
                                        <SelectTrigger id="destination_type" className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="backlog">Pindahkan ke Backlog Proyek</SelectItem>
                                            {futureSprints.length > 0 && (
                                                <SelectItem value="sprint">Pindahkan ke Sprint Berikutnya</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {completeSprintForm.data.destination_type === 'sprint' && (
                                    <div>
                                        <Label htmlFor="target_sprint">Pilih Sprint Tujuan</Label>
                                        <Select
                                            value={completeSprintForm.data.target_sprint_id}
                                            onValueChange={(val) => completeSprintForm.setData('target_sprint_id', val)}
                                        >
                                            <SelectTrigger id="target_sprint" className="mt-1">
                                                <SelectValue placeholder="Pilih sprint" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {futureSprints.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCompleteSprintModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={completeSprintForm.processing}>
                                {completeSprintForm.processing ? <Spinner className="mr-2" /> : null}
                                Selesaikan Sprint
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* BURNDOWN CHART MODAL */}
            <Dialog open={burndownModalOpen} onOpenChange={setBurndownModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingDown className="size-5 text-primary" />
                            Burndown Chart - {burndownData?.sprint.name}
                        </DialogTitle>
                        <DialogDescription>
                            Perbandingan garis ideal sisa story points vs pengerjaan aktual tim harian.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingBurndown ? (
                            <div className="flex h-48 items-center justify-center">
                                <Spinner />
                            </div>
                        ) : burndownData ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs px-2">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-slate-400" />
                                        <span className="text-muted-foreground">Garis Ideal (Target)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 rounded-full bg-emerald-500" />
                                        <span className="font-semibold text-emerald-500">Garis Aktual</span>
                                    </div>
                                </div>

                                {/* Custom SVG Line Chart */}
                                <div className="h-60 w-full rounded-lg border border-border bg-card/40 p-4">
                                    <svg viewBox="0 0 500 200" className="h-full w-full overflow-visible">
                                        {/* Grid lines */}
                                        <line x1="40" y1="20" x2="480" y2="20" stroke="currentColor" strokeOpacity="0.1" />
                                        <line x1="40" y1="90" x2="480" y2="90" stroke="currentColor" strokeOpacity="0.1" />
                                        <line x1="40" y1="160" x2="480" y2="160" stroke="currentColor" strokeOpacity="0.1" />

                                        {/* Y Axis Labels */}
                                        <text x="30" y="24" fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="end">
                                            {burndownData.sprint.committed_points}
                                        </text>
                                        <text x="30" y="94" fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="end">
                                            {Math.round(burndownData.sprint.committed_points / 2)}
                                        </text>
                                        <text x="30" y="164" fontSize="10" fill="currentColor" fillOpacity="0.5" textAnchor="end">
                                            0
                                        </text>

                                        {/* Ideal Line (Dashed) */}
                                        <polyline
                                            fill="none"
                                            stroke="#94a3b8"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            points={burndownData.days
                                                .map((d, i) => {
                                                    const x = 50 + (i / Math.max(1, burndownData.days.length - 1)) * 420;
                                                    const maxPts = burndownData.sprint.committed_points || 1;
                                                    const y = 160 - (d.ideal_remaining / maxPts) * 140;
                                                    return `${x},${y}`;
                                                })
                                                .join(' ')}
                                        />

                                        {/* Actual Line */}
                                        <polyline
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="3"
                                            points={burndownData.days
                                                .filter((d) => d.actual_remaining !== null)
                                                .map((d, i, arr) => {
                                                    const x = 50 + (i / Math.max(1, burndownData.days.length - 1)) * 420;
                                                    const maxPts = burndownData.sprint.committed_points || 1;
                                                    const y = 160 - (d.actual_remaining! / maxPts) * 140;
                                                    return `${x},${y}`;
                                                })
                                                .join(' ')}
                                        />

                                        {/* Data points for actual line */}
                                        {burndownData.days
                                            .filter((d) => d.actual_remaining !== null)
                                            .map((d, i) => {
                                                const x = 50 + (i / Math.max(1, burndownData.days.length - 1)) * 420;
                                                const maxPts = burndownData.sprint.committed_points || 1;
                                                const y = 160 - (d.actual_remaining! / maxPts) * 140;
                                                return (
                                                    <circle
                                                        key={d.date}
                                                        cx={x}
                                                        cy={y}
                                                        r="4"
                                                        className="fill-emerald-500 stroke-card stroke-2"
                                                    />
                                                );
                                            })}
                                    </svg>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setBurndownModalOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 6. AI SPRINT SUMMARY MODAL */}
            <Dialog open={aiSummaryModalOpen} onOpenChange={setAiSummaryModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Sparkles className="size-4" />
                            </span>
                            <DialogTitle className="text-base font-bold">
                                Ringkasan Sprint AI & Retrospektif
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs">
                            Analisis otomatis berbasis model AI untuk pencapaian, velocity, hambatan, dan rekomendasi sprint.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        {loadingAiSummary ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                <p className="text-xs font-semibold text-muted-foreground animate-pulse">
                                    AI sedang menganalisis data sprint, tugas, dan velocity...
                                </p>
                            </div>
                        ) : aiSummaryError ? (
                            <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <AlertCircle className="size-4" />
                                    <span>Gagal memproses analisis AI</span>
                                </p>
                                <p>{aiSummaryError}</p>
                            </div>
                        ) : aiSummaryData ? (
                            <div className="space-y-4 text-xs">
                                {/* Health Score & Executive Summary */}
                                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                                            Ringkasan Eksekutif
                                        </span>
                                        <Badge variant="outline" className="text-[11px] font-mono text-emerald-500 border-emerald-500/30">
                                            Skor Kesehatan: {aiSummaryData.overall_health_score}/100
                                        </Badge>
                                    </div>
                                    <p className="text-foreground leading-relaxed">
                                        {aiSummaryData.executive_summary}
                                    </p>
                                    <p className="text-muted-foreground italic text-[11px]">
                                        {aiSummaryData.velocity_analysis}
                                    </p>
                                </div>

                                {/* Key Achievements */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                                        <span>Pencapaian Utama (Key Achievements)</span>
                                    </h4>
                                    <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/40">
                                        {aiSummaryData.key_achievements?.map((ach: string, idx: number) => (
                                            <p key={idx} className="text-foreground text-xs">
                                                • {ach}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Identified Blockers */}
                                {aiSummaryData.identified_blockers?.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                            <AlertCircle className="size-3.5 text-amber-500" />
                                            <span>Kendala & Risiko Terdeteksi</span>
                                        </h4>
                                        <div className="space-y-1.5 pl-2 border-l-2 border-amber-500/40">
                                            {aiSummaryData.identified_blockers.map((blk: string, idx: number) => (
                                                <p key={idx} className="text-foreground text-xs">
                                                    • {blk}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Retrospective Recommendations */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                        <Zap className="size-3.5 text-primary" />
                                        <span>Rekomendasi Retrospektif</span>
                                    </h4>
                                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/40">
                                        {aiSummaryData.retrospective_recommendations?.map((rec: string, idx: number) => (
                                            <p key={idx} className="text-foreground text-xs">
                                                • {rec}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAiSummaryModalOpen(false)}
                            className="text-xs"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
