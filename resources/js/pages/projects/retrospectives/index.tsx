import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
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
    MessageSquareQuote,
    Plus,
    Columns3,
    ListTodo,
    Calendar,
    Workflow,
    DollarSign,
    PenTool,
    Settings,
    AlertTriangle,
    CheckCircle2,
    Smile,
    Sparkles,
    Users,
    Clock,
    ArrowRight,
    Play,
    Repeat,
    Shield,
    Trash2,
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

interface RetrospectiveSummary {
    id: string;
    title: string;
    format: string;
    status: string;
    is_anonymous: boolean;
    sentiment_score: number | null;
    summary_notes: string | null;
    sprint: {
        id: string;
        name: string;
        status: string;
    } | null;
    facilitator: {
        id: number;
        name: string;
        avatar: string | null;
    } | null;
    items_count: number;
    action_items_count: number;
    completed_action_items_count: number;
    created_at: string;
}

interface FormatDefinition {
    name: string;
    description: string;
    categories: Array<{
        key: string;
        label: string;
        color: string;
        icon: string;
    }>;
}

interface Props {
    project: Project;
    metrics: {
        total_sessions: number;
        total_action_items: number;
        completed_action_items: number;
        action_completion_rate: number;
        average_sentiment_score: number;
        total_kudos: number;
    };
    retrospectives: RetrospectiveSummary[];
    format_definitions: Record<string, FormatDefinition>;
    sprints: Sprint[];
}

export default function RetrospectivesIndex({
    project,
    metrics,
    retrospectives,
    format_definitions,
    sprints,
}: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        format: 'what_went_well',
        sprint_id: '',
        is_anonymous: false,
    });

    const handleCreateSession = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/projects/${project.id}/retrospectives`, {
            onSuccess: () => {
                setCreateModalOpen(false);
                reset();
            },
        });
    };

    const getFormatBadge = (formatKey: string) => {
        const format = format_definitions[formatKey];
        return format?.name || formatKey;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Aktif Berjalan</Badge>;
            case 'discussing':
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Sedang Diskusi</Badge>;
            case 'closed':
                return <Badge className="bg-muted text-muted-foreground border-border">Selesai / Ditutup</Badge>;
            default:
                return <Badge variant="outline">Draft</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title={`Sprint Retrospectives - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Project Header Navigation */}
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
                                Hub Retrospektif Agile, Voting Umpan Balik Tim & Pelacakan Action Items
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
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

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Sesi Retro</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <MessageSquareQuote className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_sessions}
                            </span>
                            <span className="text-xs text-muted-foreground">Sesi Selesai/Aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Refleksi berkala antar sprint tim
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Penyelesaian Action Items</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.action_completion_rate}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({metrics.completed_action_items}/{metrics.total_action_items})
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tindakan perbaikan yang telah tuntas
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Sentimen Tim</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Smile className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.average_sentiment_score > 0 ? `${metrics.average_sentiment_score} / 5.0` : 'N/A'}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Indeks moral & kepuasan anggota tim
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Apresiasi & Kudus</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_kudos}
                            </span>
                            <span className="text-xs text-muted-foreground">Shoutouts</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Pengakuan kontribusi positif rekan tim
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-foreground">Riwayat Sesi Retrospektif</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Pilih sesi retrospektif untuk membuka papan feedback interaktif atau buat sesi baru.
                        </p>
                    </div>

                    <Button
                        onClick={() => setCreateModalOpen(true)}
                        className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                    >
                        <Plus className="h-4 w-4" />
                        <span>+ Sesi Retrospektif Baru</span>
                    </Button>
                </div>

                {/* Sessions Grid */}
                {retrospectives.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                        <MessageSquareQuote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-foreground">Belum Ada Sesi Retrospektif</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                            Mulai retrospektif akhir sprint untuk mengevaluasi kinerja tim, mengumpulkan ide perbaikan, dan merayakan pencapaian.
                        </p>
                        <Button
                            onClick={() => setCreateModalOpen(true)}
                            size="sm"
                            className="text-xs gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Mulai Sesi Retrospektif Pertama</span>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {retrospectives.map((retro) => (
                            <div
                                key={retro.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground line-clamp-1">
                                                {retro.title}
                                            </h3>
                                            {retro.sprint && (
                                                <Badge variant="outline" className="text-[10px] mt-1 font-mono">
                                                    Sprint: {retro.sprint.name}
                                                </Badge>
                                            )}
                                        </div>
                                        {getStatusBadge(retro.status)}
                                    </div>

                                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>Format Sesi:</span>
                                            <span className="font-semibold text-foreground">
                                                {getFormatBadge(retro.format)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span>Fasilitator:</span>
                                            <span className="font-semibold text-foreground">
                                                {retro.facilitator?.name || 'Belum Ditentukan'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span>Total Masukan:</span>
                                            <span className="font-semibold text-foreground font-mono">
                                                {retro.items_count} Catatan
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span>Action Items:</span>
                                            <span className="font-semibold text-foreground font-mono">
                                                {retro.completed_action_items_count} / {retro.action_items_count} Selesai
                                            </span>
                                        </div>

                                        {retro.sentiment_score !== null && (
                                            <div className="flex items-center justify-between">
                                                <span>Skor Sentimen:</span>
                                                <span className="font-bold text-amber-500 font-mono">
                                                    ⭐ {retro.sentiment_score} / 5.0
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(retro.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </span>

                                    <Link
                                        href={`/projects/${project.id}/retrospectives/${retro.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        <span>Buka Papan Retro</span>
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Buat Sesi Retrospektif */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquareQuote className="h-5 w-5 text-primary" />
                            <span>Mulai Sesi Retrospektif Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pilih format retrospektif agile yang sesuai dengan dinamika tim sprint ini.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Sesi Retrospektif *
                            </label>
                            <Input
                                placeholder="Contoh: Sprint 14 Retrospective - Core Engine Release"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                            {errors.title && <p className="text-[11px] text-destructive mt-1">{errors.title}</p>}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Format Retrospektif
                            </label>
                            <Select
                                value={data.format}
                                onValueChange={(val) => setData('format', val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(format_definitions).map(([key, def]) => (
                                        <SelectItem key={key} value={key}>
                                            {def.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                {format_definitions[data.format]?.description}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tautkan ke Sprint (Opsional)
                            </label>
                            <Select
                                value={data.sprint_id}
                                onValueChange={(val) => setData('sprint_id', val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih Sprint terkait..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tanpa Sprint (General)</SelectItem>
                                    {sprints.map((sprint) => (
                                        <SelectItem key={sprint.id} value={sprint.id}>
                                            {sprint.name} ({sprint.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="isAnonymousCheck"
                                checked={data.is_anonymous}
                                onChange={(e) => setData('is_anonymous', e.target.checked)}
                                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor="isAnonymousCheck" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Mode Masukan Anonim (Identitas penulis disembunyikan)</span>
                            </label>
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
                                disabled={processing}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {processing ? 'Membuat...' : 'Buat Sesi Retro'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
