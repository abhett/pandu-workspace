import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Calendar,
    ChevronRight,
    Circle,
    CheckCircle2,
    Clock,
    Diamond,
    Filter,
    Flame,
    Layers,
    Link2,
    Plus,
    Radio,
    Sparkles,
    Trash2,
    TrendingUp,
    Zap,
    Columns3,
    ListTodo,
    DollarSign,
    PenTool,
    Settings,
    Workflow,
    AlertTriangle,
    MessageSquareQuote,
    Activity,
    SlidersHorizontal,
    ArrowRight,
    RefreshCw,
    Table as TableIcon,
    Milestone as MilestoneIcon,
    ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
    type: string;
}

interface CPMTaskMetrics {
    duration: number;
    early_start: number;
    early_finish: number;
    late_start: number;
    late_finish: number;
    total_float: number;
    free_float: number;
    is_critical: boolean;
}

interface TimelineItem {
    id: string;
    parent_id: string | null;
    key: string;
    title: string;
    type: string;
    priority?: string;
    is_milestone: boolean;
    status_name: string;
    status_category: string;
    progress: number;
    start_date: string;
    due_date: string;
    assignee?: string;
    assignee_avatar?: string;
    cpm: CPMTaskMetrics;
}

interface TaskDependencyItem {
    id: string;
    predecessor_id: string;
    successor_id: string;
    type: string;
    lag_days: number;
}

interface TimelineData {
    project_id: string;
    zoom_level: string;
    timeline_start: string;
    timeline_end: string;
    total_days: number;
    today: string;
    weeks: Array<{
        week_number: number;
        label: string;
        start_date: string;
        days: Array<{ day: string; date: string }>;
    }>;
    items: TimelineItem[];
    dependencies: TaskDependencyItem[];
    critical_path_ids: string[];
    metrics: {
        total_duration_days: number;
        critical_tasks_count: number;
        total_tasks_count: number;
        milestones_count: number;
        completed_milestones_count: number;
        average_float_days: number;
    };
}

interface Props {
    project: Project | null;
    availableProjects: Project[];
    timeline: TimelineData | null;
}

export default function TimelineGantt({
    project,
    availableProjects,
    timeline,
}: Props) {
    const [activeTab, setActiveTab] = useState<'gantt' | 'cpm_table' | 'milestones'>('gantt');
    const [zoom, setZoom] = useState<string>(timeline?.zoom_level || 'month');
    const [showCriticalPath, setShowCriticalPath] = useState(true);
    const [isAutoScheduling, setIsAutoScheduling] = useState(false);

    // Dependency Modal State
    const [dependencyModalOpen, setDependencyModalOpen] = useState(false);
    const [predecessorId, setPredecessorId] = useState('');
    const [successorId, setSuccessorId] = useState('');
    const [dependencyType, setDependencyType] = useState('finish_to_start');
    const [lagDays, setLagDays] = useState<number | string>(0);
    const [isSubmittingDep, setIsSubmittingDep] = useState(false);
    const [depError, setDepError] = useState<string | null>(null);

    // Schedule Edit Modal State
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editIsMilestone, setEditIsMilestone] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    const handleProjectChange = (projectId: string) => {
        router.get(`/projects/${projectId}/timeline`);
    };

    const handleZoomChange = (newZoom: string) => {
        setZoom(newZoom);
        if (project) {
            router.get(`/projects/${project.id}/timeline`, { zoom: newZoom }, { preserveState: true });
        }
    };

    // Auto-Schedule Cascading Trigger
    const handleRunAutoSchedule = () => {
        if (!project) return;
        setIsAutoScheduling(true);

        fetch(`/projects/${project.id}/timeline/auto-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsAutoScheduling(false);
                router.reload();
            })
            .catch(() => setIsAutoScheduling(false));
    };

    // Toggle Milestone directly
    const handleToggleMilestone = (taskId: string) => {
        if (!project) return;

        fetch(`/projects/${project.id}/timeline/tasks/${taskId}/milestone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleCreateDependency = (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !predecessorId || !successorId) return;

        setIsSubmittingDep(true);
        setDepError(null);

        fetch(`/projects/${project.id}/timeline/dependencies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                predecessor_id: predecessorId,
                successor_id: successorId,
                type: dependencyType,
                lag_days: Number(lagDays),
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSubmittingDep(false);
                if (!data.success) {
                    setDepError(data.message || 'Gagal menambahkan dependensi.');
                } else {
                    setDependencyModalOpen(false);
                    setPredecessorId('');
                    setSuccessorId('');
                    router.reload();
                }
            })
            .catch(() => {
                setIsSubmittingDep(false);
                setDepError('Terjadi kesalahan jaringan.');
            });
    };

    const handleDeleteDependency = (depId: string) => {
        if (!project) return;

        fetch(`/projects/${project.id}/timeline/dependencies/${depId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => {
            router.reload();
        });
    };

    const handleSaveSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !editingItem) return;

        setIsSavingSchedule(true);

        fetch(`/projects/${project.id}/timeline/tasks/${editingItem.id}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                start_date: editStartDate || null,
                due_date: editDueDate || null,
                is_milestone: editIsMilestone,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingSchedule(false);
                setScheduleModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingSchedule(false));
    };

    const openScheduleModal = (item: TimelineItem) => {
        setEditingItem(item);
        setEditStartDate(item.start_date);
        setEditDueDate(item.due_date);
        setEditIsMilestone(item.is_milestone);
        setScheduleModalOpen(true);
    };

    // Helper to calculate pixel position for Gantt bars
    const calculateBarMetrics = (startDateStr: string, dueDateStr: string) => {
        if (!timeline) return { left: 0, width: 80 };

        const tStart = new Date(timeline.timeline_start).getTime();
        const tEnd = new Date(timeline.timeline_end).getTime();
        const totalDuration = Math.max(1, tEnd - tStart);

        const itemStart = new Date(startDateStr).getTime();
        const itemEnd = new Date(dueDateStr).getTime();

        const leftPercent = Math.max(0, Math.min(100, ((itemStart - tStart) / totalDuration) * 100));
        const rightPercent = Math.max(0, Math.min(100, ((itemEnd - tStart) / totalDuration) * 100));
        const widthPercent = Math.max(2, rightPercent - leftPercent);

        return { left: leftPercent, width: widthPercent };
    };

    return (
        <AppLayout>
            <Head title={`Gantt Timeline & CPM - ${project?.name || 'Pandu'}`} />

            <div className="space-y-6 pb-16">
                {/* Project Navigation Bar */}
                {project && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-xs">
                                {project.key}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {project.key}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Timeline Proyek, Diagram Gantt, Milestone & Analisis Jalur Kritis (CPM)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                href={`/projects/${project.id}/board`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <Columns3 className="h-3.5 w-3.5" />
                                <span>Papan Kanban</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/tasks`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <ListTodo className="h-3.5 w-3.5" />
                                <span>Daftar Tugas</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/timeline`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Gantt & CPM</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/dependencies`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <Workflow className="h-3.5 w-3.5" />
                                <span>Graf Dependensi</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/budget`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Anggaran & Biaya</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/whiteboard`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <PenTool className="h-3.5 w-3.5" />
                                <span>Kanvas Ideasi</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/risks`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Risiko</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/retrospectives`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <MessageSquareQuote className="h-3.5 w-3.5" />
                                <span>Retrospektif</span>
                            </Link>
                            <Link
                                href={`/projects/${project.id}/settings`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span>Pengaturan</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Bento KPI Metrics Header */}
                {timeline && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Durasi Proyek (CPM)</span>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Clock className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                    {timeline.metrics.total_duration_days}
                                </span>
                                <span className="text-xs text-muted-foreground">Hari Kerja</span>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                                Estimasi jalur rantai terpanjang
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Tugas Jalur Kritis</span>
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                    <Flame className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 font-mono">
                                    {timeline.metrics.critical_tasks_count}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    / {timeline.metrics.total_tasks_count} Total Tugas
                                </span>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                                Keterlambatan akan menunda rilis proyek
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Milestones Rilis</span>
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Diamond className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                    {timeline.metrics.completed_milestones_count}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    / {timeline.metrics.milestones_count} Tercapai
                                </span>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                                Titik capaian deliverable penting
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Rata-rata Float (Slack)</span>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <Activity className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                    {timeline.metrics.average_float_days}
                                </span>
                                <span className="text-xs text-muted-foreground">Hari Fleksibilitas</span>
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                                Margin toleransi sebelum jalur kritis
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls & Tab Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('gantt')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'gantt'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Calendar className="h-4 w-4" />
                            <span>Kanvas Gantt Roadmap</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('cpm_table')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'cpm_table'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <TableIcon className="h-4 w-4" />
                            <span>Matriks CPM & Float</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('milestones')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'milestones'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <MilestoneIcon className="h-4 w-4" />
                            <span>Deliverables Milestone ({timeline?.metrics.milestones_count || 0})</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Auto-Schedule Cascading Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRunAutoSchedule}
                            disabled={isAutoScheduling}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isAutoScheduling ? 'animate-spin' : 'text-primary'}`} />
                            <span>Auto-Schedule</span>
                        </Button>

                        {/* Critical Path Toggle */}
                        <Button
                            variant={showCriticalPath ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowCriticalPath(!showCriticalPath)}
                            className={`text-xs h-8 gap-1.5 ${
                                showCriticalPath ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border'
                            }`}
                        >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Jalur Kritis (CPM)</span>
                        </Button>

                        {/* Add Dependency Button */}
                        <Button
                            size="sm"
                            onClick={() => setDependencyModalOpen(true)}
                            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                        >
                            <Link2 className="h-3.5 w-3.5" />
                            <span>+ Dependensi</span>
                        </Button>
                    </div>
                </div>

                {/* TAB 1: Interactive Gantt Roadmap Canvas */}
                {activeTab === 'gantt' && timeline && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        {/* Zoom Level Switcher */}
                        <div className="p-3 border-b border-border/80 bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">Zoom Tampilan:</span>
                                {['day', 'week', 'month'].map((z) => (
                                    <button
                                        key={z}
                                        onClick={() => handleZoomChange(z)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                                            zoom === z
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {z === 'day' ? 'Hari' : z === 'week' ? 'Minggu' : 'Bulan'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                                    <span>Tugas Normal</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded bg-red-500 inline-block shadow-sm shadow-red-500/50" />
                                    <span>Jalur Kritis (CPM)</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                    <span>Milestone</span>
                                </span>
                            </div>
                        </div>

                        {/* Gantt Tree & Canvas Body */}
                        <div className="flex overflow-x-auto">
                            {/* Left Side: Work Items Table */}
                            <div className="w-72 shrink-0 border-r border-border bg-card z-10">
                                <div className="p-3 bg-muted/40 font-bold text-xs text-muted-foreground border-b border-border h-12 flex items-center">
                                    Item Pekerjaan ({timeline.items.length})
                                </div>
                                <div className="divide-y divide-border/60">
                                    {timeline.items.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => openScheduleModal(item)}
                                            className="p-3 hover:bg-muted/30 cursor-pointer transition-colors h-14 flex items-center justify-between gap-2"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {item.is_milestone ? (
                                                    <Diamond className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                                                ) : (
                                                    <Circle className="h-3 w-3 text-primary shrink-0" />
                                                )}
                                                <div className="truncate">
                                                    <div className="font-bold text-xs text-foreground truncate">
                                                        {item.title}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                        {item.key} • {item.cpm.duration}h
                                                    </div>
                                                </div>
                                            </div>

                                            {showCriticalPath && item.cpm.is_critical && (
                                                <Badge className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 px-1 py-0 shrink-0">
                                                    CPM
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Side: Timeline Grid & Horizontal Bars */}
                            <div className="flex-1 min-w-[800px] overflow-x-auto relative">
                                {/* Header Calendar Days/Weeks */}
                                <div className="flex border-b border-border bg-muted/40 h-12">
                                    {timeline.weeks.map((w) => (
                                        <div
                                            key={w.week_number}
                                            className="flex-1 border-r border-border/60 p-2 text-center text-xs text-muted-foreground font-semibold flex flex-col justify-center"
                                        >
                                            <span className="font-mono text-[11px] text-foreground">{w.label}</span>
                                            <span className="text-[10px] text-muted-foreground">{w.start_date}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Rows with Gantt Bars */}
                                <div className="divide-y divide-border/60 relative">
                                    {timeline.items.map((item) => {
                                        const { left, width } = calculateBarMetrics(item.start_date, item.due_date);
                                        const isCritical = showCriticalPath && item.cpm.is_critical;

                                        return (
                                            <div
                                                key={item.id}
                                                className="h-14 relative flex items-center px-2 hover:bg-muted/10 transition-colors"
                                            >
                                                {/* Bar or Diamond Indicator */}
                                                {item.is_milestone ? (
                                                    <div
                                                        className="absolute -translate-x-1/2 z-10 flex items-center gap-1 cursor-pointer"
                                                        style={{ left: `${left}%` }}
                                                        onClick={() => openScheduleModal(item)}
                                                    >
                                                        <div className="w-5 h-5 bg-amber-500 rotate-45 rounded-sm shadow-md flex items-center justify-center text-white text-[9px] font-bold" />
                                                        <span className="text-[10px] font-bold text-foreground whitespace-nowrap bg-background/80 px-1 rounded">
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`absolute h-7 rounded-lg p-1.5 flex items-center justify-between text-white text-xs cursor-pointer shadow-xs transition-all ${
                                                            isCritical
                                                                ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-md ring-2 ring-red-400'
                                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                                        }`}
                                                        style={{
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                        }}
                                                        onClick={() => openScheduleModal(item)}
                                                    >
                                                        <span className="font-bold truncate text-[11px]">
                                                            {item.key}: {item.title}
                                                        </span>
                                                        <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1">
                                                            {item.progress}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: CPM Analysis Table */}
                {activeTab === 'cpm_table' && timeline && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-border/80 bg-muted/20">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                <span>Matriks Rekayasa Jalur Kritis (Critical Path Method Engine)</span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Forward pass (ES, EF) dan Backward pass (LS, LF) menentukan Total Float. Tugas dengan Float = 0 berada pada Jalur Kritis.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                    <tr>
                                        <th className="py-3 px-4">Tugas & Kunci</th>
                                        <th className="py-3 px-4">Durasi (Hari)</th>
                                        <th className="py-3 px-4">Early Start (ES)</th>
                                        <th className="py-3 px-4">Early Finish (EF)</th>
                                        <th className="py-3 px-4">Late Start (LS)</th>
                                        <th className="py-3 px-4">Late Finish (LF)</th>
                                        <th className="py-3 px-4">Total Float (Slack)</th>
                                        <th className="py-3 px-4">Status Jalur</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {timeline.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-foreground">{item.title}</div>
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    {item.key}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold">
                                                {item.cpm.duration}h
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                Hari +{item.cpm.early_start}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                Hari +{item.cpm.early_finish}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                Hari +{item.cpm.late_start}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                Hari +{item.cpm.late_finish}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold">
                                                <span
                                                    className={
                                                        item.cpm.total_float === 0
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-emerald-600 dark:text-emerald-400'
                                                    }
                                                >
                                                    {item.cpm.total_float} Hari
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {item.cpm.is_critical ? (
                                                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold">
                                                        Jalur Kritis (CPM)
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground font-normal">
                                                        Fleksibel ({item.cpm.total_float}h Slack)
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: Milestones Roadmap */}
                {activeTab === 'milestones' && timeline && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {timeline.items
                                .filter((item) => item.is_milestone)
                                .map((milestone) => (
                                    <div
                                        key={milestone.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <Diamond className="h-5 w-5 text-amber-500 fill-amber-500" />
                                                <Badge
                                                    className={`text-[10px] ${
                                                        milestone.status_category === 'done'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                    }`}
                                                >
                                                    {milestone.status_name}
                                                </Badge>
                                            </div>

                                            <h4 className="font-bold text-sm text-foreground mt-3">
                                                {milestone.title}
                                            </h4>
                                            <span className="font-mono text-xs text-muted-foreground block mt-1">
                                                Target: {milestone.due_date}
                                            </span>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleMilestone(milestone.id)}
                                            className="w-full mt-4 text-xs h-8"
                                        >
                                            <span>Ubah Status Milestone</span>
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Tambah Dependensi */}
            <Dialog open={dependencyModalOpen} onOpenChange={setDependencyModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-primary" />
                            <span>Tambah Relasi Dependensi Antar Tugas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Hubungkan tugas pendahulu (Predecessor) ke tugas penerus (Successor).
                        </DialogDescription>
                    </DialogHeader>

                    {depError && (
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs">
                            {depError}
                        </div>
                    )}

                    <form onSubmit={handleCreateDependency} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tugas Pendahulu (Predecessor)
                            </label>
                            <Select value={predecessorId} onValueChange={setPredecessorId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih tugas pendahulu..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeline?.items.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.key}: {item.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tugas Penerus (Successor)
                            </label>
                            <Select value={successorId} onValueChange={setSuccessorId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih tugas penerus..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeline?.items.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.key}: {item.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tipe Relasi
                                </label>
                                <Select value={dependencyType} onValueChange={setDependencyType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="finish_to_start">Finish-to-Start (FS)</SelectItem>
                                        <SelectItem value="start_to_start">Start-to-Start (SS)</SelectItem>
                                        <SelectItem value="finish_to_finish">Finish-to-Finish (FF)</SelectItem>
                                        <SelectItem value="start_to_finish">Start-to-Finish (SF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jeda / Lag (Hari)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={lagDays}
                                    onChange={(e) => setLagDays(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDependencyModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingDep}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSubmittingDep ? 'Menyimpan...' : 'Simpan Dependensi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Jadwal & Milestone */}
            <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <span>Edit Jadwal: {editingItem?.key}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Atur tanggal mulai, tanggal selesai, atau tandai sebagai milestone deliverable.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Mulai
                                </label>
                                <Input
                                    type="date"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Target Selesai
                                </label>
                                <Input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="milestoneCheck"
                                checked={editIsMilestone}
                                onChange={(e) => setEditIsMilestone(e.target.checked)}
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor="milestoneCheck" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                <Diamond className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                <span>Tandai sebagai Milestone Rilis Deliverable</span>
                            </label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setScheduleModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingSchedule}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSavingSchedule ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
