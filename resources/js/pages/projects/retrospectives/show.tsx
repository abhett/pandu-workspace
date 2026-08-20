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
    MessageSquareQuote,
    Plus,
    ChevronLeft,
    Heart,
    CheckCircle2,
    Smile,
    Sparkles,
    Shield,
    Trash2,
    Check,
    ArrowRight,
    Star,
    AlertOctagon,
    Frown,
    Play,
    Square,
    Repeat,
    Wind,
    Anchor,
    AlertTriangle,
    Compass,
    CheckCircle,
    User as UserIcon,
    Ticket,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface Member {
    id: number;
    name: string;
    avatar: string | null;
}

interface RetrospectiveItemData {
    id: string;
    category: string;
    content: string;
    votes_count: number;
    is_action_item: boolean;
    action_status: string;
    is_voted_by_me: boolean;
    author: {
        name: string;
        avatar: string | null;
    };
    action_owner: {
        id: number;
        name: string;
        avatar: string | null;
    } | null;
    task: {
        id: string;
        key: string;
        title: string;
        status: string;
    } | null;
    created_at: string;
}

interface CategoryDefinition {
    key: string;
    label: string;
    color: string;
    icon: string;
}

interface FormatMetadata {
    name: string;
    description: string;
    categories: CategoryDefinition[];
}

interface RetrospectiveData {
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
    } | null;
    facilitator: {
        id: number;
        name: string;
        avatar: string | null;
    } | null;
    created_at: string;
}

interface Props {
    project: Project;
    retrospective: RetrospectiveData;
    format_metadata: FormatMetadata;
    items: RetrospectiveItemData[];
    members: Member[];
}

export default function RetrospectiveShow({
    project,
    retrospective,
    format_metadata,
    items,
    members,
}: Props) {
    // Add Item inline states per category
    const [activeInputCategory, setActiveInputCategory] = useState<string | null>(null);
    const [itemContent, setItemContent] = useState('');
    const [isSubmittingItem, setIsSubmittingItem] = useState(false);

    // Close Session Modal
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [sentimentScore, setSentimentScore] = useState<number>(5);
    const [summaryNotes, setSummaryNotes] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // Convert Action Item Modal
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [convertingItem, setConvertingItem] = useState<RetrospectiveItemData | null>(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskType, setTaskType] = useState('task');
    const [taskPriority, setTaskPriority] = useState('high');
    const [taskAssigneeId, setTaskAssigneeId] = useState<string>('none');
    const [isConverting, setIsConverting] = useState(false);

    const handleCreateItem = (category: string) => {
        if (!itemContent.trim()) return;
        setIsSubmittingItem(true);

        fetch(`/projects/${project.id}/retrospectives/${retrospective.id}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                category,
                content: itemContent,
                is_action_item: category === 'action_item',
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingItem(false);
                setItemContent('');
                setActiveInputCategory(null);
                router.reload();
            })
            .catch(() => setIsSubmittingItem(false));
    };

    const handleDeleteItem = (itemId: string) => {
        fetch(`/projects/${project.id}/retrospectives/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleToggleVote = (itemId: string) => {
        fetch(`/projects/${project.id}/retrospectives/items/${itemId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleCloseSession = (e: React.FormEvent) => {
        e.preventDefault();
        setIsClosing(true);

        fetch(`/projects/${project.id}/retrospectives/${retrospective.id}/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                sentiment_score: sentimentScore,
                summary_notes: summaryNotes,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsClosing(false);
                setCloseModalOpen(false);
                router.reload();
            })
            .catch(() => setIsClosing(false));
    };

    const openConvertModal = (item: RetrospectiveItemData) => {
        setConvertingItem(item);
        setTaskTitle(item.content);
        setTaskType('task');
        setTaskPriority('high');
        setTaskAssigneeId('none');
        setConvertModalOpen(true);
    };

    const handleConvertTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!convertingItem) return;

        setIsConverting(true);

        fetch(`/projects/${project.id}/retrospectives/items/${convertingItem.id}/convert-to-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: taskTitle,
                type: taskType,
                priority: taskPriority,
                assignee_id: taskAssigneeId !== 'none' ? Number(taskAssigneeId) : null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsConverting(false);
                setConvertModalOpen(false);
                router.reload();
            })
            .catch(() => setIsConverting(false));
    };

    const getCategoryHeaderStyle = (color: string) => {
        switch (color) {
            case 'emerald':
                return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
            case 'rose':
                return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
            case 'blue':
                return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
            case 'amber':
                return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
            case 'purple':
                return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
            default:
                return 'bg-muted text-foreground border-border';
        }
    };

    return (
        <AppLayout>
            <Head title={`${retrospective.title} - Retrospective`} />

            <div className="space-y-6 pb-16">
                {/* Header Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/projects/${project.id}/retrospectives`}
                            className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold text-foreground">{retrospective.title}</h1>
                                {retrospective.sprint && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        Sprint: {retrospective.sprint.name}
                                    </Badge>
                                )}
                                {retrospective.is_anonymous && (
                                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Masukan Anonim
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Format: <span className="font-semibold text-foreground">{format_metadata.name}</span> • Fasilitator: {retrospective.facilitator?.name || 'Tim'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {retrospective.status !== 'closed' ? (
                            <Button
                                size="sm"
                                onClick={() => setCloseModalOpen(true)}
                                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Tutup Sesi & Catat Skor Sentimen</span>
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">
                                    Sesi Selesai (Skor Sentimen: ⭐ {retrospective.sentiment_score}/5)
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Notes Alert if closed */}
                {retrospective.summary_notes && (
                    <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-xs text-foreground">
                        <div className="font-bold mb-1 flex items-center gap-1.5 text-primary">
                            <Sparkles className="h-4 w-4" />
                            <span>Rangkuman Kesimpulan Sesi Retrospektif:</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {retrospective.summary_notes}
                        </p>
                    </div>
                )}

                {/* Interactive Retrospective Board Columns */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${format_metadata.categories.length > 4 ? '5' : format_metadata.categories.length} gap-4`}>
                    {format_metadata.categories.map((col) => {
                        const colItems = items.filter((i) => i.category === col.key);

                        return (
                            <div
                                key={col.key}
                                className="rounded-2xl border border-border bg-card/60 flex flex-col min-h-[500px] shadow-xs"
                            >
                                {/* Column Header */}
                                <div
                                    className={`p-3.5 border-b rounded-t-2xl font-bold text-xs flex items-center justify-between ${getCategoryHeaderStyle(
                                        col.color
                                    )}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">{col.label}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-background/80">
                                        {colItems.length}
                                    </Badge>
                                </div>

                                {/* Column Body */}
                                <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                                    {/* Inline Add Item Input */}
                                    {retrospective.status !== 'closed' && (
                                        <div>
                                            {activeInputCategory === col.key ? (
                                                <div className="p-3 rounded-xl border border-primary/50 bg-background shadow-xs space-y-2.5">
                                                    <Textarea
                                                        placeholder="Tulis catatan umpan balik..."
                                                        value={itemContent}
                                                        onChange={(e) => setItemContent(e.target.value)}
                                                        className="text-xs min-h-[70px] resize-none"
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setActiveInputCategory(null);
                                                                setItemContent('');
                                                            }}
                                                            className="h-7 text-xs"
                                                        >
                                                            Batal
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleCreateItem(col.key)}
                                                            disabled={isSubmittingItem || !itemContent.trim()}
                                                            className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
                                                        >
                                                            {isSubmittingItem ? 'Menyimpan...' : 'Simpan'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setActiveInputCategory(col.key);
                                                        setItemContent('');
                                                    }}
                                                    className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    <span>Tambah Masukan</span>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Item Cards */}
                                    {colItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3.5 rounded-xl border border-border bg-background shadow-xs hover:border-border/80 transition-all flex flex-col justify-between gap-3"
                                        >
                                            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                                                {item.content}
                                            </p>

                                            {/* Converted Task Link Badge */}
                                            {item.task && (
                                                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold truncate">
                                                        <Ticket className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{item.task.key}: {item.task.title}</span>
                                                    </div>
                                                    <Badge className="text-[9px] bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                                        {item.task.status}
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t border-border/40">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className="text-[11px] font-medium text-foreground truncate">
                                                        {item.author.name}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {/* Convert Action Item to Task CTA */}
                                                    {(item.is_action_item || col.key === 'action_item') && !item.task && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openConvertModal(item)}
                                                            className="h-6 text-[10px] px-2 gap-1 text-primary border-primary/30"
                                                        >
                                                            <Ticket className="h-3 w-3" />
                                                            <span>Buat Tiket</span>
                                                        </Button>
                                                    )}

                                                    {/* Dot Vote Button */}
                                                    <button
                                                        onClick={() => handleToggleVote(item.id)}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono transition-colors ${
                                                            item.is_voted_by_me
                                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                                                                : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        <Heart
                                                            className={`h-3.5 w-3.5 ${
                                                                item.is_voted_by_me ? 'fill-rose-500 text-rose-500' : ''
                                                            }`}
                                                        />
                                                        <span>{item.votes_count}</span>
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal: Tutup Sesi & Catat Skor Sentimen */}
            <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <span>Tutup Sesi Retrospektif</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Evaluasi indeks kepuasan tim pada sprint ini dan simpan rangkuman perbaikan.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCloseSession} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-2">
                                Skor Sentimen / Kepuasan Tim (1 - 5)
                            </label>
                            <div className="flex items-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setSentimentScore(star)}
                                        className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                                            sentimentScore === star
                                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500'
                                                : 'hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        <Star className={`h-6 w-6 ${sentimentScore >= star ? 'fill-amber-500 text-amber-500' : ''}`} />
                                        <span className="text-[10px] font-bold">{star}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Catatan Kesimpulan & Rangkuman Sesi
                            </label>
                            <Textarea
                                placeholder="Tuliskan kesimpulan rapat retrospektif..."
                                value={summaryNotes}
                                onChange={(e) => setSummaryNotes(e.target.value)}
                                className="text-xs min-h-[90px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCloseModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isClosing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                                {isClosing ? 'Menyimpan...' : 'Selesaikan & Tutup Sesi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Konversi Action Item ke Tiket Tugas */}
            <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" />
                            <span>Konversi Action Item ke Tiket Tugas Proyek</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Buat tiket tugas resmi di papan proyek untuk memastikan rencana perbaikan dikerjakan.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleConvertTask} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Tiket Tugas *
                            </label>
                            <Input
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tipe Tugas
                                </label>
                                <Select value={taskType} onValueChange={setTaskType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="task">Tugas Standar</SelectItem>
                                        <SelectItem value="improvement">Peningkatan (Improvement)</SelectItem>
                                        <SelectItem value="story">User Story</SelectItem>
                                        <SelectItem value="bug">Bug Fix</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Prioritas
                                </label>
                                <Select value={taskPriority} onValueChange={setTaskPriority}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Mendesak (Urgent)</SelectItem>
                                        <SelectItem value="highest">Sangat Tinggi</SelectItem>
                                        <SelectItem value="high">Tinggi (High)</SelectItem>
                                        <SelectItem value="medium">Sedang (Medium)</SelectItem>
                                        <SelectItem value="low">Rendah (Low)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Penanggung Jawab (Assignee)
                            </label>
                            <Select value={taskAssigneeId} onValueChange={setTaskAssigneeId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih anggota tim..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Belum Ditugaskan</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConvertModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isConverting}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isConverting ? 'Mengonversi...' : 'Buat Tiket Tugas'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
