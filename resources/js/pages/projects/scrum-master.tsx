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
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Flame,
    Layers,
    Play,
    Plus,
    Sparkles,
    TrendingUp,
    User,
    Check,
    ArrowUpRight,
    HelpCircle,
    Flag,
    RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
    type: string;
}

interface ActiveSprint {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
}

interface SprintHealth {
    sprint_id: string;
    sprint_name: string;
    days_remaining: number;
    total_days: number;
    days_passed: number;
    completion_percent: number;
    expected_completion_percent: number;
    burn_rate_text: string;
    burn_rate_diff: number;
    burn_rate_color: string;
    story_points: {
        total: number;
        completed: number;
        in_progress: number;
        todo: number;
    };
    tasks_count: {
        total: number;
        completed: number;
        in_progress: number;
        todo: number;
        blocked: number;
    };
    scope_added_points: number;
    ai_confidence: {
        score: number;
        label: string;
        tier: 'high' | 'moderate' | 'risk';
    };
}

interface BlockerItem {
    id: string;
    task_id: string;
    task_key: string;
    task_title: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    reported_by_name: string;
    owner_name: string;
    owner_avatar?: string;
    blocked_since: string;
    created_at: string;
}

interface StandupTask {
    id: string;
    key: string;
    title: string;
    assignee?: string;
}

interface Props {
    project: Project;
    activeSprint: ActiveSprint | null;
    sprintHealth: SprintHealth | null;
    blockers: BlockerItem[];
    standupTasks: {
        done_recently: StandupTask[];
        in_progress: StandupTask[];
        blocked: BlockerItem[];
    };
    allSprints: Array<{
        id: string;
        name: string;
        status: string;
    }>;
}

export default function ScrumMasterWorkspace({
    project,
    activeSprint,
    sprintHealth,
    blockers,
    standupTasks,
    allSprints,
}: Props) {
    const [selectedBlocker, setSelectedBlocker] = useState<BlockerItem | null>(null);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolutionNote, setResolutionNote] = useState('');
    const [isResolving, setIsResolving] = useState(false);

    const [endSprintModalOpen, setEndSprintModalOpen] = useState(false);
    const [isEndingSprint, setIsEndingSprint] = useState(false);

    const handleResolveBlocker = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBlocker) return;

        setIsResolving(true);
        fetch(`/projects/${project.id}/tasks/${selectedBlocker.task_id}/blockers/${selectedBlocker.id}/resolve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ resolution_note: resolutionNote }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsResolving(false);
                setResolveModalOpen(false);
                setResolutionNote('');
                router.reload();
            })
            .catch(() => setIsResolving(false));
    };

    const handleEndSprint = () => {
        if (!activeSprint) return;
        setIsEndingSprint(true);

        fetch(`/projects/${project.id}/sprints/${activeSprint.id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(() => {
                setIsEndingSprint(false);
                setEndSprintModalOpen(false);
                router.reload();
            })
            .catch(() => setIsEndingSprint(false));
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <Badge className="bg-red-600 text-white text-[10px] font-bold">CRITICAL</Badge>;
            case 'high':
                return <Badge className="bg-orange-500 text-white text-[10px] font-bold">HIGH</Badge>;
            case 'medium':
                return <Badge className="bg-amber-500 text-white text-[10px] font-bold">MEDIUM</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">LOW</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Proyek', href: '/projects' },
                { title: project.name, href: `/projects/${project.id}` },
                { title: 'Scrum Master Workspace', href: `/projects/${project.id}/scrum-master` },
            ]}
        >
            <Head title={`Scrum Master - ${project.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-border">
                    <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                            WORKSPACE SCRUM MASTER
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {project.name} ({project.key})
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {activeSprint ? (
                            <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-border">
                                <Calendar className="size-4 text-primary" />
                                <span>{activeSprint.name}</span>
                                <span className="text-muted-foreground font-normal">
                                    ({activeSprint.start_date || 'N/A'} - {activeSprint.end_date || 'N/A'})
                                </span>
                            </div>
                        ) : (
                            <Badge variant="outline" className="text-xs">Tidak Ada Sprint Aktif</Badge>
                        )}

                        <Link href={`/projects/${project.id}/reports`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1.5">
                                <TrendingUp className="size-3.5" />
                                <span>Laporan Agile</span>
                            </Button>
                        </Link>

                        <Link href={`/projects/${project.id}/workload`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1.5">
                                <Layers className="size-3.5" />
                                <span>Kapasitas Tim</span>
                            </Button>
                        </Link>

                        {activeSprint && activeSprint.status === 'active' && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setEndSprintModalOpen(true)}
                                className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90"
                            >
                                <Flag className="size-3.5" />
                                <span>Selesaikan Sprint</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* 1. Sprint Health Cockpit Grid */}
                {sprintHealth ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Days Remaining */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider font-bold">
                                    Sisa Hari
                                </span>
                                <Clock className="size-4 text-blue-500" />
                            </div>
                            <div className="my-3">
                                <span className="text-3xl font-bold font-mono text-foreground">
                                    {String(sprintHealth.days_remaining).padStart(2, '0')}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                    / {sprintHealth.total_days} hari
                                </span>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, Math.round((sprintHealth.days_passed / sprintHealth.total_days) * 100))}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Completion % */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider font-bold">
                                    Penyelesaian
                                </span>
                                <CheckCircle2 className="size-4 text-emerald-500" />
                            </div>
                            <div className="my-3">
                                <span className="text-3xl font-bold font-mono text-emerald-500">
                                    {sprintHealth.completion_percent}%
                                </span>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, sprintHealth.completion_percent)}%` }}
                                />
                            </div>
                        </div>

                        {/* Burn Rate */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider font-bold">
                                    Burn Rate
                                </span>
                                <Flame className="size-4 text-amber-500" />
                            </div>
                            <div className="my-3">
                                <span className={cn('text-lg font-bold font-mono', sprintHealth.burn_rate_color)}>
                                    {sprintHealth.burn_rate_text}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Target Ideal: {sprintHealth.expected_completion_percent}%
                            </p>
                        </div>

                        {/* Story Points */}
                        <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider font-bold">
                                    Story Points
                                </span>
                                <Layers className="size-4 text-purple-500" />
                            </div>
                            <div className="my-2 space-y-1 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-emerald-500">Done:</span>
                                    <span className="font-bold">{sprintHealth.story_points.completed} pts</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-blue-500">In Progress:</span>
                                    <span className="font-bold">{sprintHealth.story_points.in_progress} pts</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">To Do:</span>
                                    <span className="font-bold">{sprintHealth.story_points.todo} pts</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border">
                                Total: {sprintHealth.story_points.total} pts ({sprintHealth.tasks_count.total} tasks)
                            </span>
                        </div>

                        {/* AI Confidence & Scope */}
                        <div className="bg-gradient-to-br from-card to-primary/5 rounded-2xl p-5 border border-primary/20 flex flex-col justify-between shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-primary font-mono uppercase tracking-wider font-bold flex items-center gap-1">
                                    <Sparkles className="size-3.5" /> AI Confidence
                                </span>
                            </div>
                            <div className="my-2">
                                <span
                                    className={cn(
                                        'text-xl font-bold font-mono',
                                        sprintHealth.ai_confidence.tier === 'high'
                                            ? 'text-emerald-500'
                                            : sprintHealth.ai_confidence.tier === 'moderate'
                                            ? 'text-amber-500'
                                            : 'text-red-500'
                                    )}
                                >
                                    {sprintHealth.ai_confidence.label}
                                </span>
                                {sprintHealth.scope_added_points > 0 && (
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        +{sprintHealth.scope_added_points} pts scope creep
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {sprintHealth.tasks_count.blocked > 0
                                    ? `⚠️ ${sprintHealth.tasks_count.blocked} tugas terhambat`
                                    : '✅ Bebas blocker'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center bg-card rounded-2xl border border-border">
                        <HelpCircle className="size-8 mx-auto text-muted-foreground mb-2" />
                        <h3 className="font-semibold text-sm">Tidak ada metrik sprint aktif</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Mulai sprint baru di menu Backlog untuk mengaktifkan pemantauan real-time.
                        </p>
                    </div>
                )}

                {/* Middle Grid: Blocker Center (2/3) & Daily Standup Board (1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Blocker Center */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                                    <AlertTriangle className="size-4" />
                                </div>
                                <h2 className="text-sm font-bold text-foreground">
                                    Pusat Hambatan & Blocker
                                </h2>
                                {blockers.length > 0 && (
                                    <Badge className="bg-red-500 text-white text-[10px]">
                                        {blockers.length} Aktif
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            {blockers.length === 0 ? (
                                <div className="py-12 px-4 text-center space-y-2">
                                    <div className="mx-auto size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                        <Check className="size-5" />
                                    </div>
                                    <p className="text-xs font-bold text-foreground">Alur Kerja Lancar!</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Tidak ada tugas yang dilaporkan terhambat (*blocked*) saat ini.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {blockers.map((b) => (
                                        <div
                                            key={b.id}
                                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {getSeverityBadge(b.severity)}
                                                    <Link
                                                        href={`/projects/${project.id}?task=${b.task_id}`}
                                                        className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                                                    >
                                                        <span>[{b.task_key}] {b.task_title}</span>
                                                        <ArrowUpRight className="size-3 text-muted-foreground" />
                                                    </Link>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                                    "{b.reason}"
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                                                    <span>Pemilik: <strong>{b.owner_name}</strong></span>
                                                    <span>•</span>
                                                    <span>Terhambat: <strong>{b.blocked_since}</strong></span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedBlocker(b);
                                                    setResolveModalOpen(true);
                                                }}
                                                className="text-xs gap-1.5 shrink-0 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                                            >
                                                <CheckCircle2 className="size-3.5" />
                                                <span>Selesaikan Blocker</span>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Standup Board */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Sparkles className="size-4" />
                            </div>
                            <h2 className="text-sm font-bold text-foreground">
                                Asisten Daily Standup
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {/* In Progress Focus */}
                            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                    <span className="flex items-center gap-1.5 text-blue-500">
                                        <Clock className="size-3.5" /> Fokus Hari Ini ({standupTasks.in_progress.length})
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {standupTasks.in_progress.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground">Tidak ada task in-progress.</p>
                                    ) : (
                                        standupTasks.in_progress.map((t) => (
                                            <div key={t.id} className="text-xs p-2 rounded-xl bg-muted/40 flex justify-between items-center">
                                                <span className="font-semibold text-foreground truncate max-w-[200px]">
                                                    [{t.key}] {t.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{t.assignee || '-'}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Completed Recently */}
                            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                    <span className="flex items-center gap-1.5 text-emerald-500">
                                        <CheckCircle2 className="size-3.5" /> Selesai Kemarin/Hari Ini ({standupTasks.done_recently.length})
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {standupTasks.done_recently.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground">Belum ada tugas selesai 48 jam terakhir.</p>
                                    ) : (
                                        standupTasks.done_recently.map((t) => (
                                            <div key={t.id} className="text-xs p-2 rounded-xl bg-muted/40 flex justify-between items-center">
                                                <span className="line-through text-muted-foreground truncate max-w-[200px]">
                                                    [{t.key}] {t.title}
                                                </span>
                                                <span className="text-[10px] text-emerald-500 font-bold">Done</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resolve Blocker Dialog */}
            <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            Selesaikan Hambatan Tugas
                        </DialogTitle>
                    </DialogHeader>

                    {selectedBlocker && (
                        <form onSubmit={handleResolveBlocker} className="space-y-4">
                            <div className="p-3 rounded-xl bg-muted/50 text-xs space-y-1">
                                <p className="font-semibold text-foreground">[{selectedBlocker.task_key}] {selectedBlocker.task_title}</p>
                                <p className="text-muted-foreground">"{selectedBlocker.reason}"</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Catatan Resolusi (Opsional)
                                </label>
                                <Textarea
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                    placeholder="Jelaskan bagaimana hambatan ini diselesaikan atau keputusan yang diambil..."
                                    rows={3}
                                    className="text-xs"
                                />
                            </div>

                            <DialogFooter>
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
                                    disabled={isResolving}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                    {isResolving ? 'Menyimpan...' : 'Tandai Selesai'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* End Sprint Confirmation Dialog */}
            <Dialog open={endSprintModalOpen} onOpenChange={setEndSprintModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            Konfirmasi Selesaikan Sprint
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 text-xs text-muted-foreground">
                        <p>
                            Anda akan menyelesaikan sprint <strong>"{activeSprint?.name}"</strong>.
                        </p>
                        <p>
                            Tugas yang telah berstatus <strong>Done</strong> akan ditandai selesai dalam sprint ini. Tugas yang belum selesai akan otomatis dikembalikan ke <strong>Backlog</strong> atau dapat dipindahkan ke sprint berikutnya.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEndSprintModalOpen(false)}
                            className="text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            disabled={isEndingSprint}
                            onClick={handleEndSprint}
                            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                            {isEndingSprint ? 'Memproses...' : 'Ya, Selesaikan Sprint'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
