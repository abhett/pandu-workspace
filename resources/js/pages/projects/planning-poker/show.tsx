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
    Sparkles,
    ChevronLeft,
    Eye,
    RotateCcw,
    CheckCircle,
    CheckCircle2,
    Users,
    Clock,
    AlertCircle,
    HelpCircle,
    Coffee,
    ArrowRight,
    Check,
    ListTodo,
    Shield,
    Flame,
    Zap,
    TrendingUp,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface DeckCard {
    value: string;
    numeric: number | null;
}

interface SessionData {
    id: string;
    title: string;
    card_deck_type: string;
    deck_config: {
        name: string;
        description: string;
        cards: DeckCard[];
    };
    status: 'voting' | 'revealed' | 'completed';
    consensus_points: number | null;
    is_moderator: boolean;
    moderator: {
        id: number;
        name: string;
        avatar: string | null;
    };
    sprint: {
        id: string;
        name: string;
    } | null;
}

interface ActiveTask {
    id: string;
    key: string;
    title: string;
    description: string | null;
    priority: string;
    type: string;
    estimate_points: number | null;
    assignees: Array<{ id: number; name: string; avatar: string | null }>;
}

interface VoteItem {
    id: string;
    user: {
        id: number;
        name: string;
        avatar: string | null;
    };
    has_voted: boolean;
    vote_value: string;
    numeric_value: number | null;
    voted_at: string;
}

interface Statistics {
    total_votes: number;
    average: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    has_consensus: boolean;
    suggested_points: number | null;
}

interface QueueTask {
    id: string;
    key: string;
    title: string;
    priority: string;
    type: string;
    estimate_points: number | null;
    is_active: boolean;
}

interface EstimatedTask {
    id: string;
    key: string;
    title: string;
    priority: string;
    type: string;
    estimate_points: number;
}

interface Props {
    project: Project;
    session: SessionData;
    active_task: ActiveTask | null;
    my_vote: string | null;
    votes: VoteItem[];
    statistics: Statistics;
    queue_tasks: QueueTask[];
    estimated_tasks: EstimatedTask[];
}

export default function PlanningPokerShow({
    project,
    session,
    active_task,
    my_vote,
    votes,
    statistics,
    queue_tasks,
    estimated_tasks,
}: Props) {
    const [isCastingVote, setIsCastingVote] = useState(false);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [finalPoints, setFinalPoints] = useState<string>(
        statistics.suggested_points !== null ? statistics.suggested_points.toString() : '5'
    );
    const [isApplying, setIsApplying] = useState(false);

    const handleCastVote = (cardValue: string) => {
        if (!active_task) return;
        setIsCastingVote(true);

        fetch(`/projects/${project.id}/planning-poker/${session.id}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ vote_value: cardValue }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsCastingVote(false);
                router.reload();
            })
            .catch(() => setIsCastingVote(false));
    };

    const handleReveal = () => {
        fetch(`/projects/${project.id}/planning-poker/${session.id}/reveal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleReset = () => {
        fetch(`/projects/${project.id}/planning-poker/${session.id}/reset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleSelectTask = (taskId: string) => {
        fetch(`/projects/${project.id}/planning-poker/${session.id}/select-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ task_id: taskId }),
        }).then(() => router.reload());
    };

    const handleApplyPoints = (e: React.FormEvent) => {
        e.preventDefault();
        if (!active_task) return;
        setIsApplying(true);

        fetch(`/projects/${project.id}/planning-poker/${session.id}/apply-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                estimate_points: parseFloat(finalPoints),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsApplying(false);
                setApplyModalOpen(false);
                router.reload();
            })
            .catch(() => setIsApplying(false));
    };

    const isRevealed = session.status === 'revealed' || session.status === 'completed';

    return (
        <AppLayout>
            <Head title={`${session.title} - Planning Poker`} />

            <div className="space-y-6 pb-24">
                {/* Header Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/projects/${project.id}/planning-poker`}
                            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold text-foreground">{session.title}</h1>
                                <Badge
                                    className={`text-xs ${
                                        session.status === 'voting'
                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                            : session.status === 'revealed'
                                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    }`}
                                >
                                    {session.status === 'voting'
                                        ? 'Sedang Voting'
                                        : session.status === 'revealed'
                                        ? 'Kartu Terbuka'
                                        : 'Selesai'}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                    Dek: {session.deck_config.name}
                                </Badge>
                                {session.sprint && (
                                    <Badge variant="secondary" className="text-xs">
                                        Sprint: {session.sprint.name}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Moderator: <span className="font-semibold text-foreground">{session.moderator?.name}</span> • Proyek: {project.name}
                            </p>
                        </div>
                    </div>

                    {/* Moderator Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {session.status === 'voting' ? (
                            <Button
                                size="sm"
                                onClick={handleReveal}
                                className="bg-primary text-primary-foreground text-xs gap-1.5 font-semibold shadow-xs"
                            >
                                <Eye className="h-4 w-4" />
                                <span>Buka Kartu (Reveal All)</span>
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setFinalPoints(
                                        statistics.suggested_points !== null
                                            ? statistics.suggested_points.toString()
                                            : '5'
                                    );
                                    setApplyModalOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold shadow-xs"
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span>Terapkan Story Points & Lanjut</span>
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="text-xs gap-1.5"
                            title="Reset voting tiket saat ini"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset Voting</span>
                        </Button>
                    </div>
                </div>

                {/* Main Workspace: Left Task Queue & Center/Right Estimation Arena */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Task Queue (4 cols) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                                <div>
                                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                        <ListTodo className="h-4 w-4 text-primary" />
                                        <span>Antrean Backlog</span>
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">
                                        {queue_tasks.length} tiket menunggu estimasi
                                    </span>
                                </div>
                            </div>

                            {queue_tasks.length === 0 ? (
                                <div className="p-6 text-center text-xs text-muted-foreground">
                                    Semua tiket dalam lingkup ini telah memiliki estimasi story points!
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                    {queue_tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => handleSelectTask(task.id)}
                                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                                task.is_active
                                                    ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30'
                                                    : 'border-border bg-card hover:bg-muted/40'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono font-bold text-[11px] text-primary">
                                                    {task.key}
                                                </span>
                                                <Badge variant="outline" className="text-[9px] uppercase">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            <p className="font-semibold text-foreground mt-1 line-clamp-2">
                                                {task.title}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Estimated tasks summary */}
                            {estimated_tasks.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-border/80">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                        <span className="font-medium">Sudah Terestimasi ({estimated_tasks.length})</span>
                                    </div>
                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                        {estimated_tasks.map((t) => (
                                            <div
                                                key={t.id}
                                                className="p-2 rounded-lg bg-muted/30 flex items-center justify-between text-[11px]"
                                            >
                                                <span className="truncate max-w-[200px] text-muted-foreground">
                                                    <span className="font-mono font-semibold text-foreground">{t.key}</span> - {t.title}
                                                </span>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 font-mono text-[10px]">
                                                    {t.estimate_points} pts
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center / Right Panel: Poker Table Arena (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Active Task Hero Card */}
                        {active_task ? (
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-primary">
                                                {active_task.key}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                {active_task.priority}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {active_task.type}
                                            </Badge>
                                            {active_task.estimate_points && (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                                                    Estimasi Sekarang: {active_task.estimate_points} pts
                                                </Badge>
                                            )}
                                        </div>
                                        <h2 className="text-base font-bold text-foreground mt-2">
                                            {active_task.title}
                                        </h2>
                                        {active_task.description && (
                                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto bg-muted/20 p-3 rounded-xl">
                                                {active_task.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
                                <HelpCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                <h3 className="text-sm font-bold text-foreground">Tidak Ada Tiket yang Sedang Diestimasi</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Pilih tiket dari antrean di sebelah kiri untuk mulai estimasi story points.
                                </p>
                            </div>
                        )}

                        {/* Virtual Poker Arena Table */}
                        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-muted/20 to-card p-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <h3 className="font-bold text-sm text-foreground">
                                        Meja Estimasi Tim ({votes.length} Suara Terkumpul)
                                    </h3>
                                </div>

                                {session.status === 'voting' && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Voting Sedang Berlangsung</span>
                                    </span>
                                )}
                            </div>

                            {/* Consensus Statistics Box if Revealed */}
                            {isRevealed && statistics.total_votes > 0 && (
                                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-indigo-500/10 border border-primary/20">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">
                                                    Rekomendasi Poin Konsensus:
                                                </span>
                                                <Badge className="bg-primary text-primary-foreground text-sm font-bold font-mono px-3 py-0.5">
                                                    {statistics.suggested_points} Story Points
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                {statistics.has_consensus
                                                    ? '🎉 Konsensus Penuh! Semua anggota tim sepakat pada nilai yang sama.'
                                                    : '⚖️ Terdapat variasi estimasi. Diskusikan alasan perbedaan sebelum menetapkan poin akhir.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs font-mono">
                                            <div className="text-center">
                                                <span className="text-[10px] text-muted-foreground block">Rata-rata</span>
                                                <span className="font-bold text-foreground">{statistics.average}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[10px] text-muted-foreground block">Median</span>
                                                <span className="font-bold text-foreground">{statistics.median}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[10px] text-muted-foreground block">Min / Max</span>
                                                <span className="font-bold text-foreground">
                                                    {statistics.min} - {statistics.max}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Participant Cards Grid */}
                            {votes.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Belum ada anggota tim yang memilih kartu. Pilih kartu pada dek di bawah untuk memberikan estimasi Anda!
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {votes.map((vote) => (
                                        <div
                                            key={vote.id}
                                            className="p-4 rounded-2xl border border-border bg-card flex flex-col items-center justify-between text-center gap-3 shadow-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                                                    {vote.user.name.charAt(0)}
                                                </div>
                                                <span className="text-xs font-bold text-foreground truncate max-w-[100px]">
                                                    {vote.user.name}
                                                </span>
                                            </div>

                                            {/* Card Presentation */}
                                            {isRevealed ? (
                                                <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex flex-col items-center justify-center font-mono font-bold text-2xl shadow-sm">
                                                    {vote.vote_value === '☕' ? (
                                                        <Coffee className="h-6 w-6" />
                                                    ) : (
                                                        vote.vote_value
                                                    )}
                                                </div>
                                            ) : (
                                                <div
                                                    className={`w-14 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                                                        vote.vote_value !== 'HIDDEN'
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                                                    }`}
                                                >
                                                    {vote.vote_value !== 'HIDDEN' ? (
                                                        <span className="font-mono font-bold text-xl">
                                                            {vote.vote_value}
                                                        </span>
                                                    ) : (
                                                        <Check className="h-6 w-6" />
                                                    )}
                                                </div>
                                            )}

                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                {isRevealed
                                                    ? 'Terbuka'
                                                    : vote.vote_value !== 'HIDDEN'
                                                    ? 'Pilihan Anda'
                                                    : 'Sudah Memilih'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interactive Card Deck Selector */}
                        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h3 className="font-bold text-sm text-foreground">
                                        Pilih Kartu Estimasi Anda ({session.deck_config.name})
                                    </h3>
                                </div>
                                {my_vote && (
                                    <span className="text-xs font-semibold text-primary">
                                        Pilihan Anda Saat Ini: <span className="font-mono font-bold">{my_vote}</span>
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1">
                                {session.deck_config.cards.map((card) => {
                                    const isSelected = my_vote === card.value;

                                    return (
                                        <button
                                            key={card.value}
                                            type="button"
                                            disabled={isCastingVote || !active_task}
                                            onClick={() => handleCastVote(card.value)}
                                            className={`w-14 h-20 rounded-2xl border-2 flex flex-col items-center justify-between p-2 font-mono transition-all transform hover:-translate-y-1.5 shrink-0 ${
                                                isSelected
                                                    ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 -translate-y-2'
                                                    : 'border-border bg-card hover:border-primary/50 text-foreground hover:bg-muted/40'
                                            }`}
                                        >
                                            <span className="text-[10px] self-start font-bold">
                                                {card.value}
                                            </span>
                                            <span className="text-xl font-bold my-auto">
                                                {card.value === '☕' ? <Coffee className="h-5 w-5" /> : card.value}
                                            </span>
                                            <span className="text-[10px] self-end font-bold">
                                                {card.value}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Terapkan Story Points */}
            <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            <span>Terapkan Story Points ke Tiket</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Simpan poin konsensus pada tiket{' '}
                            <span className="font-mono font-bold text-foreground">
                                {active_task?.key}
                            </span>{' '}
                            dan otomatis lanjutkan estimasi ke tiket berikutnya.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApplyPoints} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Nilai Akhir Story Points *
                            </label>
                            <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max="999"
                                value={finalPoints}
                                onChange={(e) => setFinalPoints(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
                            <div>
                                Rekomendasi Konsensus: <span className="font-bold font-mono text-foreground">{statistics.suggested_points ?? '-'}</span>
                            </div>
                            <div>
                                Rata-rata Tim: <span className="font-mono text-foreground">{statistics.average ?? '-'}</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setApplyModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isApplying}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                                {isApplying ? 'Menyimpan...' : 'Simpan & Lanjut Tiket Berikutnya'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
