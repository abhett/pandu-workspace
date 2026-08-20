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
    Sparkles,
    Plus,
    Columns3,
    ListTodo,
    Calendar,
    Workflow,
    DollarSign,
    PenTool,
    AlertTriangle,
    MessageSquareQuote,
    Layers,
    Users,
    CheckCircle2,
    Clock,
    Play,
    Trash2,
    ChevronRight,
    ArrowRight,
    HelpCircle,
    TrendingUp,
    ShieldAlert,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface Sprint {
    id: string;
    name: string;
    status: string;
}

interface Moderator {
    id: number;
    name: string;
    avatar: string | null;
}

interface PokerSession {
    id: string;
    title: string;
    card_deck_type: string;
    status: 'voting' | 'revealed' | 'completed';
    consensus_points: number | null;
    moderator: Moderator;
    sprint: { id: string; name: string } | null;
    active_task: { id: string; key: string; title: string } | null;
    votes_count: number;
    created_at: string;
}

interface Props {
    project: Project;
    sprints: Sprint[];
    sessions: PokerSession[];
    metrics: {
        total_sessions: number;
        active_sessions: number;
        completed_sessions: number;
        estimated_tasks: number;
        unestimated_tasks: number;
    };
    deck_definitions: Record<string, { name: string; description: string }>;
}

export default function PlanningPokerIndex({
    project,
    sprints,
    sessions,
    metrics,
    deck_definitions,
}: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [sprintId, setSprintId] = useState<string>('all');
    const [deckType, setDeckType] = useState<string>('fibonacci');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsCreating(true);

        fetch(`/projects/${project.id}/planning-poker`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title,
                sprint_id: sprintId === 'all' ? null : sprintId,
                card_deck_type: deckType,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsCreating(false);
                setCreateModalOpen(false);
                if (data.session?.id) {
                    router.visit(`/projects/${project.id}/planning-poker/${data.session.id}`);
                } else {
                    router.reload();
                }
            })
            .catch(() => setIsCreating(false));
    };

    const handleDeleteSession = (sessionId: string) => {
        fetch(`/projects/${project.id}/planning-poker/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    return (
        <AppLayout>
            <Head title={`Planning Poker - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Sub-navigation Header */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Smart Sprint Planning Poker Room
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ruang estimasi story points kolaboratif, voting kartu tertutup tanpa bias, dan konsensus agile
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => setCreateModalOpen(true)}
                            className="bg-primary text-primary-foreground gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Mulai Sesi Estimasi Baru</span>
                        </Button>
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
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

                {/* Bento KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Sesi Poker</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_sessions}
                            </span>
                            <span className="text-xs text-muted-foreground">Sesi Terdaftar</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.active_sessions} aktif saat ini
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tiket Terestimasi</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.estimated_tasks}
                            </span>
                            <span className="text-xs text-muted-foreground">Story Points Terpasang</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Memiliki nilai estimasi valid
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tiket Menunggu Estimasi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.unestimated_tasks}
                            </span>
                            <span className="text-xs text-muted-foreground">Dalam Backlog</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Siap untuk sesi planning poker
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Sesi Selesai (Completed)</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.completed_sessions}
                            </span>
                            <span className="text-xs text-muted-foreground">Tuntas</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Histori konsensus tersimpan
                        </div>
                    </div>
                </div>

                {/* Sesi List Section */}
                <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-border/80 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">Daftar Sesi Planning Poker</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Masuk ke ruang estimasi untuk melakukan voting interaktif secara real-time
                            </p>
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="p-12 text-center">
                            <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-foreground">Belum Ada Sesi Planning Poker</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                Buat sesi estimasi baru untuk mulai mengestimasi story points bersama tim pengembang secara transparan.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => setCreateModalOpen(true)}
                                className="text-xs gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Buat Sesi Estimasi Pertama</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {sessions.map((sess) => (
                                <div
                                    key={sess.id}
                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-5 w-5" />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    href={`/projects/${project.id}/planning-poker/${sess.id}`}
                                                    className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                                                >
                                                    {sess.title}
                                                </Link>
                                                <Badge
                                                    className={`text-[10px] ${
                                                        sess.status === 'voting'
                                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                                            : sess.status === 'revealed'
                                                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                                    }`}
                                                >
                                                    {sess.status === 'voting'
                                                        ? 'Sedang Voting'
                                                        : sess.status === 'revealed'
                                                        ? 'Kartu Terbuka'
                                                        : 'Selesai'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] capitalize">
                                                    Dek: {sess.card_deck_type.replace('_', ' ')}
                                                </Badge>
                                                {sess.sprint && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Sprint: {sess.sprint.name}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>Moderator: {sess.moderator?.name || 'Tim'}</span>
                                                <span>•</span>
                                                {sess.active_task ? (
                                                    <span className="text-foreground font-medium truncate max-w-md">
                                                        Tiket Aktif: <span className="font-mono">{sess.active_task.key}</span> - {sess.active_task.title}
                                                    </span>
                                                ) : (
                                                    <span>Belum ada tiket aktif</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            asChild
                                            size="sm"
                                            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
                                        >
                                            <Link href={`/projects/${project.id}/planning-poker/${sess.id}`}>
                                                <span>Masuk Ruang Poker</span>
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>

                                        <button
                                            onClick={() => handleDeleteSession(sess.id)}
                                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            title="Hapus Sesi"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Buat Sesi Baru */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <span>Mulai Sesi Planning Poker Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasikan judul sesi, lingkup sprint, dan tipe dek kartu estimasi story point.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Sesi Estimasi *
                            </label>
                            <Input
                                placeholder="Contoh: Sprint 14 Backlog Estimation"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Lingkup Sprint
                                </label>
                                <Select value={sprintId} onValueChange={setSprintId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Backlog Proyek</SelectItem>
                                        {sprints.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name} ({s.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tipe Dek Kartu
                                </label>
                                <Select value={deckType} onValueChange={setDeckType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fibonacci">Standard Fibonacci (0..55)</SelectItem>
                                        <SelectItem value="modified_fibonacci">Modified Fibonacci (0..100)</SelectItem>
                                        <SelectItem value="t_shirt">T-Shirt (XS - XXL)</SelectItem>
                                        <SelectItem value="powers_of_two">Powers of 2 (1..64)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground">
                            Kartu dalam dek ini:{' '}
                            <span className="font-mono text-foreground font-semibold">
                                {deck_definitions[deckType]?.description}
                            </span>
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
                                disabled={isCreating}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isCreating ? 'Membuka Ruang...' : 'Mulai Sesi Poker'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
