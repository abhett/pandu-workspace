import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    GitFork,
    Workflow,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Columns3,
    ListTodo,
    Calendar,
    DollarSign,
    PenTool,
    MessageSquareQuote,
    Sparkles,
    TrendingUp,
    ShieldAlert,
    Layers,
    ArrowRight,
    Play,
    Trash2,
    RefreshCw,
    Activity,
    Sliders,
    HelpCircle,
    Info,
    Flame,
    Zap,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface OtherProject {
    id: string;
    key: string;
    name: string;
}

interface LocalTask {
    id: string;
    key: string;
    title: string;
    estimate_points: number;
    priority: string;
}

interface DependencyTaskInfo {
    id: string;
    key: string;
    title: string;
    priority: string;
    due_date: string | null;
    is_overdue?: boolean;
    status: {
        name: string;
        color: string;
        category: string;
    } | null;
    project: {
        id: string;
        key: string;
        name: string;
    } | null;
    assignees: Array<{ id: number; name: string }>;
}

interface DependencyItem {
    id: string;
    direction: 'inbound' | 'outbound' | 'internal';
    type: string;
    lag_days: number;
    risk_level: 'high' | 'medium' | 'low';
    is_blocker_resolved: boolean;
    predecessor: DependencyTaskInfo | null;
    successor: DependencyTaskInfo | null;
}

interface CycleStep {
    id: string;
    key: string;
    title: string;
    project_key: string;
}

interface SimulationImpactedTask {
    id: string;
    key: string;
    title: string;
    priority: string;
    project_id: string;
    project_key: string;
    project_name: string;
    is_external_project: boolean;
    level: number;
    delay_days: number;
    original_due_date: string | null;
    projected_due_date: string;
    status: string;
}

interface SimulationResult {
    root_task: {
        id: string;
        key: string;
        title: string;
        project_key?: string;
        project_name?: string;
        due_date?: string | null;
    };
    simulated_delay_days: number;
    affected_tasks_count: number;
    affected_projects_count: number;
    affected_tasks: SimulationImpactedTask[];
}

interface Metrics {
    total_cross_dependencies: number;
    inbound_blockers_count: number;
    outbound_blockers_count: number;
    internal_dependencies_count: number;
    high_risk_count: number;
    cycles_count: number;
}

interface Props {
    project: Project;
    metrics: Metrics;
    inbound_dependencies: DependencyItem[];
    outbound_dependencies: DependencyItem[];
    internal_dependencies: DependencyItem[];
    cycles: CycleStep[][];
    other_projects: OtherProject[];
    local_tasks: LocalTask[];
}

export default function CrossProjectDependencyMatrixPage({
    project,
    metrics,
    inbound_dependencies,
    outbound_dependencies,
    internal_dependencies,
    cycles,
    other_projects,
    local_tasks,
}: Props) {
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'internal'>('inbound');

    // Create Modal state
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [predecessorTaskId, setPredecessorTaskId] = useState('');
    const [successorTaskId, setSuccessorTaskId] = useState('');
    const [depType, setDepType] = useState('finish_to_start');
    const [lagDays, setLagDays] = useState('0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Simulation state
    const [simTaskId, setSimTaskId] = useState(local_tasks[0]?.id || '');
    const [simDelayDays, setSimDelayDays] = useState(7);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

    const handleCreateDependency = (e: React.FormEvent) => {
        e.preventDefault();
        if (!predecessorTaskId || !successorTaskId) return;

        setIsSubmitting(true);
        fetch(`/projects/${project.id}/dependencies/matrix/store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                predecessor_id: predecessorTaskId,
                successor_id: successorTaskId,
                type: depType,
                lag_days: Number(lagDays),
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSubmitting(false);
                if (data.success) {
                    setCreateModalOpen(false);
                    router.reload();
                } else {
                    alert(data.message || 'Gagal menambahkan dependensi.');
                }
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleDelete = (depId: string) => {
        fetch(`/projects/${project.id}/dependencies/matrix/${depId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleRunSimulation = () => {
        if (!simTaskId) return;
        setIsSimulating(true);

        fetch(`/projects/${project.id}/dependencies/matrix/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                task_id: simTaskId,
                delay_days: simDelayDays,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSimulating(false);
                if (data.success) {
                    setSimulationResult(data.simulation);
                }
            })
            .catch(() => setIsSimulating(false));
    };

    const currentList =
        activeTab === 'inbound'
            ? inbound_dependencies
            : activeTab === 'outbound'
            ? outbound_dependencies
            : internal_dependencies;

    const renderTypeLabel = (type: string, lag: number) => {
        const labels: Record<string, string> = {
            finish_to_start: 'Finish to Start (FS)',
            start_to_start: 'Start to Start (SS)',
            finish_to_finish: 'Finish to Finish (FF)',
            start_to_finish: 'Start to Finish (SF)',
        };
        return (
            <div className="flex items-center gap-1">
                <span className="font-mono text-[11px] font-semibold">{labels[type] || type}</span>
                {lag > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 font-mono">
                        +{lag}d lag
                    </Badge>
                )}
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title={`Matriks Dependensi Lintas Proyek - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Header & Sub-navigation */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center shadow-xs">
                                <GitFork className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Matriks Dependensi & Pemblokir Lintas Proyek
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Visualisasi blocker inbound & outbound, deteksi deadlock sirkular otomatis, dan simulasi dampak keterlambatan
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                                className="bg-primary text-primary-foreground gap-1.5 text-xs font-semibold shadow-xs"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Tambah Link Dependensi</span>
                            </Button>
                        </div>
                    </div>

                    {/* Subnav links */}
                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/80 overflow-x-auto text-xs">
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
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
                            href={`/projects/${project.id}/dependencies/matrix`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <GitFork className="h-3.5 w-3.5" />
                            <span>Matriks Lintas Proyek</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/budget`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Anggaran</span>
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
                            href={`/projects/${project.id}/planning-poker`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Planning Poker</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/forecast`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Prakiraan & Monte Carlo</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/sprints/health`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Kesehatan Sprint & Blocker</span>
                        </Link>
                    </div>
                </div>

                {/* Deadlock Cycles Alert Banner */}
                {cycles.length > 0 && (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs">
                        <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                            <Flame className="h-4 w-4" />
                            <span>PERINGATAN: Terdeteksi {cycles.length} Siklus Dependensi Sirkular (Deadlock Cycle)!</span>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            Tugas-tugas berikut saling mengunci secara melingkar sehingga tidak ada yang dapat dimulai sebelum yang lain selesai:
                        </p>
                        <div className="mt-2.5 space-y-1.5">
                            {cycles.map((cycle, idx) => (
                                <div key={idx} className="flex items-center gap-2 flex-wrap bg-card/60 p-2 rounded-xl border border-rose-500/20">
                                    {cycle.map((step, sIdx) => (
                                        <React.Fragment key={step.id}>
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                [{step.project_key}] {step.key}
                                            </Badge>
                                            {sIdx < cycle.length - 1 && <ArrowRight className="h-3 w-3 text-rose-500" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Cross-Project Total */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Dependensi Lintas Proyek</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <GitFork className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_cross_dependencies}
                            </span>
                            <span className="text-xs text-muted-foreground">Relasi Aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.internal_dependencies_count} dependensi internal
                        </div>
                    </div>

                    {/* Inbound Blockers */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Inbound Blockers (Proyek Luar)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.inbound_blockers_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Tugas Terhambat</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Menunggu penyelesaian di proyek eksternal
                        </div>
                    </div>

                    {/* Outbound Blockers */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Outbound Blockers</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.outbound_blockers_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Menghambat Proyek Luar</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Komitmen deliverable bagi tim lain
                        </div>
                    </div>

                    {/* Blocker Risk */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Blocker Berisiko Tinggi</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.high_risk_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Kritis / Terlambat</span>
                            {metrics.cycles_count > 0 && (
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                    Deadlock Alert
                                </Badge>
                            )}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Berpotensi memicu keterlambatan berantai
                        </div>
                    </div>
                </div>

                {/* Cascade Delay Impact Simulator Panel */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Simulator Dampak Keterlambatan Berantai (Cascade Delay Simulator)
                                </h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Hitung efek riak pergeseran jadwal penyelesaian tugas hilir lintas proyek bila suatu tugas mengalami penundaan
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pilih Tugas Sumber Keterlambatan:
                            </label>
                            <Select value={simTaskId} onValueChange={setSimTaskId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {local_tasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            [{project.key}] {t.key} - {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Simulasi Hari Keterlambatan: <span className="font-mono text-primary font-bold">{simDelayDays} Hari</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="30"
                                value={simDelayDays}
                                onChange={(e) => setSimDelayDays(Number(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={handleRunSimulation}
                                disabled={isSimulating || !simTaskId}
                                className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                            >
                                <Play className="h-3.5 w-3.5" />
                                <span>{isSimulating ? 'Menganalisis...' : 'Jalankan Simulasi Dampak'}</span>
                            </Button>
                        </div>
                    </div>

                    {simulationResult && (
                        <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border text-xs space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <span className="font-bold text-foreground">
                                        Hasil Simulasi: Penundaan +{simulationResult.simulated_delay_days} Hari pada [
                                        {simulationResult.root_task.project_key}] {simulationResult.root_task.key}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                        {simulationResult.affected_tasks_count} Tugas Hilir Terdampak
                                    </Badge>
                                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                        {simulationResult.affected_projects_count} Proyek Eksternal Terimbas
                                    </Badge>
                                </div>
                            </div>

                            {simulationResult.affected_tasks.length === 0 ? (
                                <p className="text-muted-foreground text-[11px]">
                                    Tugas ini tidak memiliki ketergantungan hilir (tidak memblokir tugas lain). Dampak ripple = 0.
                                </p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {simulationResult.affected_tasks.map((task) => (
                                        <div key={task.id} className="py-2 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    [{task.project_key}] {task.key}
                                                </Badge>
                                                <span className="text-foreground font-semibold">{task.title}</span>
                                                {task.is_external_project && (
                                                    <Badge className="bg-purple-600 text-white text-[10px]">
                                                        {task.project_name}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                                                <span>Level {task.level} Rantai</span>
                                                <ArrowRight className="h-3 w-3" />
                                                <span className="text-rose-600 font-bold">
                                                    +{task.delay_days} Hari ({task.projected_due_date})
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs & Dependency Table */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <button
                            onClick={() => setActiveTab('inbound')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                activeTab === 'inbound'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Inbound Blockers ({inbound_dependencies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('outbound')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                activeTab === 'outbound'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Outbound Blockers ({outbound_dependencies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                activeTab === 'internal'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Dependensi Internal ({internal_dependencies.length})
                        </button>
                    </div>

                    <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                                        <th className="text-left p-3.5 font-semibold">Tugas Pemblokir (Predecessor)</th>
                                        <th className="text-center p-3.5 font-semibold">Tipe Link</th>
                                        <th className="text-left p-3.5 font-semibold">Tugas Terblokir (Successor)</th>
                                        <th className="text-center p-3.5 font-semibold">Status Risiko</th>
                                        <th className="text-right p-3.5 font-semibold">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {currentList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                Tidak ada relasi dependensi pada kategori ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentList.map((dep) => (
                                            <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                                                {/* Predecessor */}
                                                <td className="p-3.5">
                                                    {dep.predecessor ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                                    [{dep.predecessor.project?.key}] {dep.predecessor.key}
                                                                </Badge>
                                                                <span className="font-bold text-foreground truncate max-w-[200px]">
                                                                    {dep.predecessor.title}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                                <span>Status: {dep.predecessor.status?.name || 'Open'}</span>
                                                                {dep.predecessor.is_overdue && (
                                                                    <Badge className="bg-rose-500/10 text-rose-600 text-[10px]">
                                                                        Terlambat
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>

                                                {/* Type */}
                                                <td className="p-3.5 text-center">
                                                    {renderTypeLabel(dep.type, dep.lag_days)}
                                                </td>

                                                {/* Successor */}
                                                <td className="p-3.5">
                                                    {dep.successor ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                                    [{dep.successor.project?.key}] {dep.successor.key}
                                                                </Badge>
                                                                <span className="font-bold text-foreground truncate max-w-[200px]">
                                                                    {dep.successor.title}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                                <span>Status: {dep.successor.status?.name || 'Open'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>

                                                {/* Risk */}
                                                <td className="p-3.5 text-center">
                                                    {dep.is_blocker_resolved ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                                            Terselesaikan
                                                        </Badge>
                                                    ) : dep.risk_level === 'high' ? (
                                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] animate-pulse">
                                                            Risiko Tinggi
                                                        </Badge>
                                                    ) : dep.risk_level === 'medium' ? (
                                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                                            Sedang
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                                                            Rendah
                                                        </Badge>
                                                    )}
                                                </td>

                                                {/* Action */}
                                                <td className="p-3.5 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(dep.id)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Tambah Link Dependensi Lintas Proyek */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GitFork className="h-5 w-5 text-indigo-600" />
                            <span>Tambah Relasi Dependensi Lintas Proyek</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Hubungkan tugas yang harus diselesaikan terlebih dahulu (Predecessor) dengan tugas yang menunggu (Successor).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDependency} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tugas Pemblokir (Predecessor - Harus Selesai Dahulu) *
                            </label>
                            <Select value={predecessorTaskId} onValueChange={setPredecessorTaskId}>
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue placeholder="Pilih tugas pemblokir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {local_tasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            [{project.key}] {t.key} - {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tugas yang Terblokir (Successor - Menunggu Predecessor) *
                            </label>
                            <Select value={successorTaskId} onValueChange={setSuccessorTaskId}>
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue placeholder="Pilih tugas yang terblokir..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {local_tasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            [{project.key}] {t.key} - {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tipe Dependensi
                                </label>
                                <Select value={depType} onValueChange={setDepType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="finish_to_start">Finish to Start (FS)</SelectItem>
                                        <SelectItem value="start_to_start">Start to Start (SS)</SelectItem>
                                        <SelectItem value="finish_to_finish">Finish to Finish (FF)</SelectItem>
                                        <SelectItem value="start_to_finish">Start to Finish (SF)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Lag / Jeda (Hari)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="90"
                                    value={lagDays}
                                    onChange={(e) => setLagDays(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !predecessorTaskId || !successorTaskId}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{isSubmitting ? 'Menyimpan...' : 'Hubungkan Dependensi'}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
