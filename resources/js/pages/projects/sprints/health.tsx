import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Columns3,
    ListTodo,
    Calendar,
    Workflow,
    DollarSign,
    PenTool,
    MessageSquareQuote,
    Sparkles,
    TrendingUp,
    Zap,
    Flame,
    Users,
    Activity,
    Layers,
    ArrowUpRight,
    HelpCircle,
    Info,
    Trash2,
    Check,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface SprintItem {
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
}

interface CurrentSprintInfo {
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_days: number;
    days_elapsed: number;
    time_elapsed_pct: number;
}

interface HealthPillars {
    scope_stability: number;
    burndown_pace: number;
    blocker_resilience: number;
    stale_task_momentum: number;
    time_progress_ratio: number;
}

interface ScopeMetrics {
    committed_points: number;
    completed_points: number;
    remaining_points: number;
    added_scope_points: number;
    scope_volatility_pct: number;
    completion_pct: number;
    total_tasks: number;
    completed_tasks: number;
    stale_tasks: number;
}

interface HeatmapData {
    matrix: Record<string, Record<string, number>>;
    open_count: number;
    escalated_count: number;
    resolved_count: number;
    critical_count: number;
    avg_turnaround_hours: number;
}

interface ImpedimentItem {
    id: string;
    sprint_id: string;
    task_id: string | null;
    task?: {
        id: string;
        key: string;
        title: string;
        priority: string;
    } | null;
    raised_by: { id?: number; name?: string };
    assigned_to: { id?: number; name?: string };
    title: string;
    description: string | null;
    category: string;
    severity: string;
    status: string;
    escalation_level: number;
    escalated_at: string | null;
    escalation_notes: string | null;
    resolved_at: string | null;
    resolution_summary: string | null;
    created_at: string;
}

interface ProjectTask {
    id: string;
    key: string;
    title: string;
}

interface ProjectMember {
    id: number;
    name: string;
}

interface Props {
    project: Project;
    current_sprint: CurrentSprintInfo | null;
    all_sprints: SprintItem[];
    health_score: number;
    health_category: 'Excellent' | 'Good' | 'At Risk' | 'Critical';
    pillars: HealthPillars;
    scope_metrics: ScopeMetrics;
    heatmap: HeatmapData;
    impediments: ImpedimentItem[];
    project_tasks: ProjectTask[];
    project_members: ProjectMember[];
}

export default function SprintHealthIndex({
    project,
    current_sprint,
    all_sprints,
    health_score,
    health_category,
    pillars,
    scope_metrics,
    heatmap,
    impediments,
    project_tasks,
    project_members,
}: Props) {
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'escalated' | 'resolved'>('all');

    // Create Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('technical');
    const [severity, setSeverity] = useState<string>('high');
    const [taskId, setTaskId] = useState<string>('none');
    const [assignedTo, setAssignedTo] = useState<string>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Escalate Modal
    const [escalateModalOpen, setEscalateModalOpen] = useState(false);
    const [selectedImpediment, setSelectedImpediment] = useState<ImpedimentItem | null>(null);
    const [escalationNotes, setEscalationNotes] = useState('');
    const [escalateAssignee, setEscalateAssignee] = useState('none');

    // Resolve Modal
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolutionSummary, setResolutionSummary] = useState('');

    const handleCreateImpediment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!current_sprint || !title.trim()) return;
        setIsSubmitting(true);

        fetch(`/projects/${project.id}/sprints/${current_sprint.id}/impediments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title,
                description,
                category,
                severity,
                task_id: taskId === 'none' ? null : taskId,
                assigned_to: assignedTo === 'none' ? null : Number(assignedTo),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmitting(false);
                setCreateModalOpen(false);
                setTitle('');
                setDescription('');
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleEscalateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImpediment) return;
        setIsSubmitting(true);

        fetch(`/projects/${project.id}/sprints/impediments/${selectedImpediment.id}/escalate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                escalation_notes: escalationNotes,
                assigned_to: escalateAssignee === 'none' ? null : Number(escalateAssignee),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmitting(false);
                setEscalateModalOpen(false);
                setSelectedImpediment(null);
                setEscalationNotes('');
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleResolveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedImpediment) return;
        setIsSubmitting(true);

        fetch(`/projects/${project.id}/sprints/impediments/${selectedImpediment.id}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                resolution_summary: resolutionSummary,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmitting(false);
                setResolveModalOpen(false);
                setSelectedImpediment(null);
                setResolutionSummary('');
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleDelete = (id: string) => {
        fetch(`/projects/${project.id}/sprints/impediments/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const filteredImpediments = impediments.filter((imp) => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'open') return imp.status === 'open' || imp.status === 'investigating';
        if (filterStatus === 'escalated') return imp.status === 'escalated';
        if (filterStatus === 'resolved') return imp.status === 'resolved';
        return true;
    });

    const categoryLabels: Record<string, string> = {
        technical: 'Teknis & Arsitektur',
        external_dependency: 'Dependensi Eksternal',
        resource_bottleneck: 'Bottleneck Tim & Kapasitas',
        unclear_requirements: 'Kebutuhan / Scope Belum Jelas',
        third_party_outage: 'Layanan Pihak Ketiga Down',
    };

    return (
        <AppLayout>
            <Head title={`Radar Kesehatan Sprint - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Sub-navigation Header */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Scrum Sprint Health Radar & Impediment Escalator
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Diagnosis komposit kesehatan sprint, matriks peta panas blocker, dan eskalasi hambatan bertingkat
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Sprint Selector */}
                            {all_sprints.length > 0 && current_sprint && (
                                <Select
                                    value={current_sprint.id}
                                    onValueChange={(val) => router.get(`/projects/${project.id}/sprints/${val}/health`)}
                                >
                                    <SelectTrigger className="h-8 text-xs font-mono w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {all_sprints.map((sp) => (
                                            <SelectItem key={sp.id} value={sp.id}>
                                                {sp.name} ({sp.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {current_sprint && (
                                <Button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Lapor Hambatan Blocker</span>
                                </Button>
                            )}
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Kesehatan Sprint & Blocker</span>
                        </Link>
                    </div>
                </div>

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Health Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Kesehatan Sprint</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {health_score}
                            </span>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                            <Badge
                                className={`text-[10px] ${
                                    health_category === 'Excellent'
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : health_category === 'Good'
                                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                        : health_category === 'At Risk'
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                }`}
                            >
                                {health_category}
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {current_sprint ? current_sprint.name : 'Sprint Baseline'}
                        </div>
                    </div>

                    {/* Scope Volatility */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Volatilitas Scope (Creep)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                +{scope_metrics.scope_volatility_pct}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                (+{scope_metrics.added_scope_points} pts)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Komitmen Awal: {scope_metrics.committed_points} pts
                        </div>
                    </div>

                    {/* Blocker & Critical Impediments */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Hambatan Terbuka</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {heatmap.open_count + heatmap.escalated_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Hambatan</span>
                            {heatmap.critical_count > 0 && (
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                    {heatmap.critical_count} Kritis
                                </Badge>
                            )}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {heatmap.escalated_count} sedang dieskalasi
                        </div>
                    </div>

                    {/* Turnaround Time */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Waktu Resolusi</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {heatmap.avg_turnaround_hours}
                            </span>
                            <span className="text-xs text-muted-foreground">Jam</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {heatmap.resolved_count} hambatan terselesaikan
                        </div>
                    </div>
                </div>

                {/* 5 Health Pillars Diagnostic Radar Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: 5 Pillars Bars */}
                    <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                5 Pilar Diagnostik Kesehatan Sprint
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Metrik komprehensif penilai stabilitas komitmen, ritme burndown, dan ketahanan terhadap hambatan
                            </p>
                        </div>

                        <div className="space-y-3.5 pt-2">
                            {/* Pillar 1 */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-foreground">
                                        🛡️ Stabilitas Komitmen Scope (Anti-Creep)
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {pillars.scope_stability}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-500 transition-all"
                                        style={{ width: `${pillars.scope_stability}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pillar 2 */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-foreground">
                                        ⚡ Kecepatan Burndown vs Waktu Sprint
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {pillars.burndown_pace}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${pillars.burndown_pace}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pillar 3 */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-foreground">
                                        🚫 Ketahanan Terhadap Blocker & Hambatan
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {pillars.blocker_resilience}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-rose-500 transition-all"
                                        style={{ width: `${pillars.blocker_resilience}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pillar 4 */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-foreground">
                                        ⏳ Momentum Tugas In-Progress (Anti-Stale)
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {pillars.stale_task_momentum}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-amber-500 transition-all"
                                        style={{ width: `${pillars.stale_task_momentum}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pillar 5 */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-foreground">
                                        🎯 Rasio Waktu Berlalu vs Poin Selesai
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {pillars.time_progress_ratio}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-purple-500 transition-all"
                                        style={{ width: `${pillars.time_progress_ratio}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Health Circular Badge Summary */}
                    <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-muted/30 to-card p-6 shadow-xs flex flex-col items-center justify-center text-center">
                        <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-muted">
                            <div
                                className={`absolute inset-0 rounded-full border-8 transition-all ${
                                    health_category === 'Excellent'
                                        ? 'border-emerald-500'
                                        : health_category === 'Good'
                                        ? 'border-blue-500'
                                        : health_category === 'At Risk'
                                        ? 'border-amber-500'
                                        : 'border-rose-500'
                                }`}
                                style={{
                                    clipPath: `polygon(0 0, 100% 0, 100% ${health_score}%, 0 ${health_score}%)`,
                                }}
                            />
                            <div className="text-center z-10">
                                <span className="text-3xl font-bold font-mono text-foreground">{health_score}</span>
                                <span className="text-[10px] text-muted-foreground block font-bold">RADAR INDEX</span>
                            </div>
                        </div>

                        <h4 className="font-bold text-sm text-foreground mt-4">
                            Status Sprint: {health_category}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                            {health_category === 'Excellent'
                                ? 'Sprint berjalan sangat sehat dengan risiko keterlambatan minimal.'
                                : health_category === 'Good'
                                ? 'Sprint stabil dengan sedikit penyesuaian yang terkontrol.'
                                : health_category === 'At Risk'
                                ? 'Terdapat hambatan yang memerlukan intervensi Scrum Master.'
                                : 'Sprint dalam kondisi kritis. Segera eskalasi blocker utama!'}
                        </p>
                    </div>
                </div>

                {/* Blockers & Impediments Heatmap Matrix */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                Matriks Peta Panas Hambatan (Blockers Heatmap)
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Distribusi konsentrasi hambatan sprint berdasarkan kategori risiko dan tingkat keparahan
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="text-left py-2 font-semibold">Kategori Hambatan</th>
                                    <th className="text-center py-2 font-semibold">Critical</th>
                                    <th className="text-center py-2 font-semibold">High</th>
                                    <th className="text-center py-2 font-semibold">Medium</th>
                                    <th className="text-center py-2 font-semibold">Low</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Object.keys(heatmap.matrix).map((catKey) => {
                                    const row = heatmap.matrix[catKey] || {};
                                    return (
                                        <tr key={catKey} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-2.5 font-medium text-foreground">
                                                {categoryLabels[catKey] || catKey}
                                            </td>
                                            <td className="text-center py-2.5">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                                        (row.critical || 0) > 0
                                                            ? 'bg-rose-500/20 text-rose-600 border border-rose-500/30'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {row.critical || 0}
                                                </span>
                                            </td>
                                            <td className="text-center py-2.5">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                                        (row.high || 0) > 0
                                                            ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {row.high || 0}
                                                </span>
                                            </td>
                                            <td className="text-center py-2.5">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                                        (row.medium || 0) > 0
                                                            ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {row.medium || 0}
                                                </span>
                                            </td>
                                            <td className="text-center py-2.5">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                                        (row.low || 0) > 0
                                                            ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {row.low || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Impediment Escalator Feed */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 border-b border-border pb-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    filterStatus === 'all'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Semua ({impediments.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus('open')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    filterStatus === 'open'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Terbuka ({heatmap.open_count})
                            </button>
                            <button
                                onClick={() => setFilterStatus('escalated')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    filterStatus === 'escalated'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Tereskalasi ({heatmap.escalated_count})
                            </button>
                            <button
                                onClick={() => setFilterStatus('resolved')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    filterStatus === 'resolved'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                Terselesaikan ({heatmap.resolved_count})
                            </button>
                        </div>
                    </div>

                    {filteredImpediments.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                            <h4 className="text-sm font-bold text-foreground">Tidak Ada Hambatan yang Tercatat</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                Tidak ada blocker aktif dalam kategori ini. Tim dapat fokus menuntaskan backlog sprint.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredImpediments.map((imp) => {
                                const isCritical = imp.severity === 'critical';
                                const isEscalated = imp.status === 'escalated';
                                const isResolved = imp.status === 'resolved';

                                return (
                                    <div
                                        key={imp.id}
                                        className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                                            isResolved
                                                ? 'border-border bg-card opacity-80'
                                                : isEscalated
                                                ? 'border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/30'
                                                : isCritical
                                                ? 'border-amber-500/50 bg-amber-500/5'
                                                : 'border-border bg-card'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Badge
                                                        className={`text-[10px] ${
                                                            isCritical
                                                                ? 'bg-rose-500 text-white'
                                                                : imp.severity === 'high'
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-muted text-foreground'
                                                        }`}
                                                    >
                                                        {imp.severity.toUpperCase()}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {categoryLabels[imp.category] || imp.category}
                                                    </Badge>
                                                    {isEscalated && (
                                                        <Badge className="bg-rose-600 text-white text-[10px] animate-pulse">
                                                            Eskalasi Lvl {imp.escalation_level}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleDelete(imp.id)}
                                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <h4 className="font-bold text-sm text-foreground mt-2">
                                                {imp.title}
                                            </h4>

                                            {imp.description && (
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                    {imp.description}
                                                </p>
                                            )}

                                            {imp.task && (
                                                <div className="mt-3 p-2 rounded-xl bg-muted/40 text-xs flex items-center justify-between">
                                                    <span className="font-mono font-bold text-primary">
                                                        {imp.task.key}
                                                    </span>
                                                    <span className="text-foreground text-[11px] truncate max-w-[200px]">
                                                        {imp.task.title}
                                                    </span>
                                                </div>
                                            )}

                                            {imp.escalation_notes && (
                                                <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300">
                                                    <span className="font-bold">Catatan Eskalasi: </span>
                                                    {imp.escalation_notes}
                                                </div>
                                            )}

                                            {imp.resolution_summary && (
                                                <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300">
                                                    <span className="font-bold">Resolusi: </span>
                                                    {imp.resolution_summary}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground">
                                            <div>
                                                <span>Dilapor: {imp.raised_by.name || 'Anggota'}</span>
                                                {imp.assigned_to?.name && (
                                                    <span className="ml-2 font-bold text-foreground">
                                                        • PIC: {imp.assigned_to.name}
                                                    </span>
                                                )}
                                            </div>

                                            {!isResolved && (
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedImpediment(imp);
                                                            setEscalateModalOpen(true);
                                                        }}
                                                        className="text-[11px] h-7 gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                                    >
                                                        <ArrowUpRight className="h-3 w-3" />
                                                        <span>Eskalasi</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedImpediment(imp);
                                                            setResolveModalOpen(true);
                                                        }}
                                                        className="text-[11px] h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        <span>Selesaikan</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Lapor Hambatan Baru */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-rose-500" />
                            <span>Lapor Hambatan Blocker Sprint</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Laporkan rintangan teknis atau dependensi yang menghambat penyelesaian komitmen sprint.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateImpediment} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Hambatan *
                            </label>
                            <Input
                                placeholder="Contoh: Database Migration Staging Timeout"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Kategori
                                </label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Teknis & Arsitektur</SelectItem>
                                        <SelectItem value="external_dependency">Dependensi Eksternal</SelectItem>
                                        <SelectItem value="resource_bottleneck">Bottleneck Tim & Kapasitas</SelectItem>
                                        <SelectItem value="unclear_requirements">Scope Belum Jelas</SelectItem>
                                        <SelectItem value="third_party_outage">Pihak Ketiga Down</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tingkat Keparahan
                                </label>
                                <Select value={severity} onValueChange={setSeverity}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="critical">Critical (Blok Total)</SelectItem>
                                        <SelectItem value="high">High (Rintangan Utama)</SelectItem>
                                        <SelectItem value="medium">Medium (Variasi Sedang)</SelectItem>
                                        <SelectItem value="low">Low (Minor)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tiket Tugas Terkait (Opsional)
                            </label>
                            <Select value={taskId} onValueChange={setTaskId}>
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Tanpa Tiket Tugas --</SelectItem>
                                    {project_tasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            [{t.key}] {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                PIC Penanggung Jawab (Opsional)
                            </label>
                            <Select value={assignedTo} onValueChange={setAssignedTo}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Belum Ditugaskan --</SelectItem>
                                    {project_members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Penjelasan Rincian
                            </label>
                            <Textarea
                                placeholder="Jelaskan detail blocker dan dampaknya terhadap sprint..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="text-xs min-h-[70px]"
                            />
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
                                disabled={isSubmitting}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isSubmitting ? 'Melaporkan...' : 'Laporkan Hambatan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Eskalasi Hambatan */}
            <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-rose-600" />
                            <span>Eskalasi Hambatan ke Pimpinan Tim</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tingkatkan level eskalasi hambatan ini ke Scrum Master atau Engineering Lead.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEscalateSubmit} className="space-y-3.5 pt-2">
                        <div className="p-2.5 rounded-xl bg-muted/40 text-xs">
                            <span className="font-bold text-foreground block">
                                {selectedImpediment?.title}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                                Level Saat Ini: Lvl {selectedImpediment?.escalation_level}
                            </span>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Alihkan PIC Penanggung Jawab
                            </label>
                            <Select value={escalateAssignee} onValueChange={setEscalateAssignee}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Tetap PIC Saat Ini --</SelectItem>
                                    {project_members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Catatan Tambahan Eskalasi
                            </label>
                            <Textarea
                                placeholder="Alasan mengapa blocker perlu dieskalasi segera..."
                                value={escalationNotes}
                                onChange={(e) => setEscalationNotes(e.target.value)}
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEscalateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isSubmitting ? 'Mengeksekusi...' : 'Eskalasi Sekarang'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Selesaikan Hambatan */}
            <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <span>Tandai Hambatan Terselesaikan</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Dokumentasikan bagaimana blocker ini berhasil diselesaikan untuk pembelajaran tim.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleResolveSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Ringkasan Resolusi Penyelesaian *
                            </label>
                            <Textarea
                                placeholder="Contoh: Migrasi indeks database telah dioptimalkan dan deployment staging selesai."
                                value={resolutionSummary}
                                onChange={(e) => setResolutionSummary(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setResolveModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Tandai Terselesaikan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
