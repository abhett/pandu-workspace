import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertCircle,
    AlertTriangle,
    AtSign,
    Bot,
    Calendar,
    Check,
    CheckCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    Filter,
    Inbox,
    MessageSquare,
    MoreVertical,
    Sparkles,
    User,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedItem {
    id: string;
    notification_id: string | null;
    task_id: string | null;
    type: string;
    title: string;
    subtitle: string;
    project_name: string;
    project_key: string;
    task_key: string | null;
    priority: string;
    status_name: string;
    status_color: string;
    status_category: string;
    actor_name: string;
    actor_avatar?: string;
    due_date?: string;
    is_overdue: boolean;
    is_read: boolean;
    time_group: 'overdue' | 'today' | 'this_week' | 'earlier';
    created_at: string;
    created_at_formatted: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    counts: {
        all_unread: number;
        assigned: number;
        mentions: number;
        overdue: number;
        ai_insights: number;
    };
    items: FeedItem[];
    total_items: number;
    filters: {
        view: string;
    };
}

export default function InboxPage({ organization, counts, items, total_items, filters }: Props) {
    const [activeView, setActiveView] = useState(filters.view || 'all_unread');
    const [selectedSnoozeItem, setSelectedSnoozeItem] = useState<FeedItem | null>(null);

    const applyView = (view: string) => {
        setActiveView(view);
        router.get(
            '/inbox',
            { view: view !== 'all_unread' ? view : undefined },
            { preserveState: true }
        );
    };

    const handleMarkAllRead = () => {
        fetch('/inbox/mark-all-read', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleMarkSingleRead = (item: FeedItem) => {
        if (!item.notification_id) return;

        fetch(`/inbox/${item.notification_id}/read`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleQuickCompleteTask = (item: FeedItem) => {
        if (!item.task_id) return;

        fetch(`/inbox/tasks/${item.task_id}/complete`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleSnooze = (duration: string) => {
        if (!selectedSnoozeItem?.notification_id) return;

        fetch(`/inbox/${selectedSnoozeItem.notification_id}/snooze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ duration }),
        })
            .then((res) => res.json())
            .then(() => {
                setSelectedSnoozeItem(null);
                router.reload();
            });
    };

    // Group items by time_group
    const overdueItems = items.filter((i) => i.time_group === 'overdue');
    const todayItems = items.filter((i) => i.time_group === 'today');
    const olderItems = items.filter((i) => i.time_group === 'this_week' || i.time_group === 'earlier');

    const renderFeedCard = (item: FeedItem) => {
        return (
            <div
                key={item.id}
                className={cn(
                    'group relative flex items-center gap-3 p-3 rounded-xl transition-all border shadow-2xs',
                    item.is_overdue
                        ? 'bg-red-500/5 border-red-500/20 border-l-4 border-l-red-500 hover:bg-red-500/10'
                        : item.is_read
                        ? 'bg-card/60 border-border opacity-75 hover:opacity-100 hover:bg-muted/30'
                        : 'bg-card border-border hover:bg-muted/30'
                )}
            >
                {/* Indicator Dot */}
                <div
                    className={cn(
                        'size-2 rounded-full shrink-0',
                        item.is_overdue
                            ? 'bg-red-500'
                            : !item.is_read
                            ? 'bg-primary'
                            : 'bg-transparent'
                    )}
                />

                {/* Sender Avatar / Icon */}
                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-foreground font-bold text-xs border border-border">
                    {item.actor_name.charAt(0)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-24">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-xs text-foreground truncate">
                                {item.title}
                            </span>

                            {item.is_overdue && (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] font-mono">
                                    Lewat Tenggat
                                </Badge>
                            )}

                            {item.task_key && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {item.task_key}
                                </span>
                            )}
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {item.created_at_formatted}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-[11px] truncate">
                        <span className="font-semibold text-primary">{item.project_name}</span>
                        <span>•</span>
                        <span className="truncate">{item.subtitle}</span>
                    </div>
                </div>

                {/* Hover Quick Triage Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-card/90 backdrop-blur-sm p-1 rounded-lg border border-border shadow-xs">
                    {item.task_id && (
                        <button
                            onClick={() => handleQuickCompleteTask(item)}
                            className="p-1 hover:bg-emerald-500/10 hover:text-emerald-400 rounded text-muted-foreground transition-colors"
                            title="Tandai Tugas Selesai"
                        >
                            <CheckCircle2 className="size-4" />
                        </button>
                    )}

                    {item.notification_id && !item.is_read && (
                        <button
                            onClick={() => handleMarkSingleRead(item)}
                            className="p-1 hover:bg-muted hover:text-primary rounded text-muted-foreground transition-colors"
                            title="Tandai Sudah Dibaca"
                        >
                            <Check className="size-4" />
                        </button>
                    )}

                    {item.notification_id && (
                        <button
                            onClick={() => setSelectedSnoozeItem(item)}
                            className="p-1 hover:bg-muted hover:text-amber-400 rounded text-muted-foreground transition-colors"
                            title="Tunda Notifikasi (Snooze)"
                        >
                            <Clock className="size-4" />
                        </button>
                    )}

                    {item.task_id && (
                        <Link
                            href={`/tasks?task_id=${item.task_id}`}
                            className="p-1 hover:bg-muted hover:text-foreground rounded text-muted-foreground transition-colors"
                            title="Buka Detail Tugas"
                        >
                            <ExternalLink className="size-4" />
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Kotak Masuk Kerja', href: '#' },
            ]}
        >
            <Head title={`Kotak Masuk Kerja - ${organization.name}`} />

            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-background">
                {/* LEFT SIDEBAR: Categories & Counters */}
                <aside className="w-full lg:w-64 bg-card/60 border-r border-border flex flex-col shrink-0 overflow-y-auto max-h-[calc(100vh-64px)]">
                    <div className="p-4 space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2 block mb-2">
                            Kategori Kotak Masuk
                        </span>

                        {[
                            { id: 'all_unread', label: 'Semua Belum Dibaca', icon: Inbox, count: counts.all_unread },
                            { id: 'assigned', label: 'Ditugaskan ke Saya', icon: User, count: counts.assigned },
                            { id: 'mentions', label: 'Sebutan & Komentar', icon: AtSign, count: counts.mentions },
                            { id: 'overdue', label: 'Lewat Tenggat', icon: AlertTriangle, count: counts.overdue, isAlert: true },
                            { id: 'ai', label: 'Wawasan AI & Otomasi', icon: Sparkles, count: counts.ai_insights },
                            { id: 'archived', label: 'Arsip / Sudah Dibaca', icon: CheckCheck },
                        ].map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = activeView === cat.id;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => applyView(cat.id)}
                                    className={cn(
                                        'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors text-left',
                                        isSelected
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <Icon className={cn('size-4 shrink-0', cat.isAlert ? 'text-red-400' : '')} />
                                        <span className="truncate">{cat.label}</span>
                                    </div>

                                    {cat.count !== undefined && cat.count > 0 && (
                                        <span
                                            className={cn(
                                                'font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                                                cat.isAlert
                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    : isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            {cat.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* MAIN FEED CANVAS */}
                <main className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-64px)]">
                    {/* Top Action Toolbar */}
                    <div className="p-4 border-b border-border bg-card/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                <CheckCheck className="size-3.5" />
                                <span>Tandai Semua Dibaca</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted-foreground">
                                Total <strong>{total_items}</strong> aktivitas
                            </span>
                        </div>
                    </div>

                    {/* Feed Content */}
                    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
                        {items.length > 0 ? (
                            <div className="space-y-6">
                                {/* Overdue Section */}
                                {overdueItems.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-red-500" />
                                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                                                Mendesak & Lewat Tenggat ({overdueItems.length})
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {overdueItems.map(renderFeedCard)}
                                        </div>
                                    </div>
                                )}

                                {/* Today Section */}
                                {todayItems.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-primary" />
                                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                                Hari Ini ({todayItems.length})
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {todayItems.map(renderFeedCard)}
                                        </div>
                                    </div>
                                )}

                                {/* Older Section */}
                                {olderItems.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-muted-foreground" />
                                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                                                Minggu Ini & Sebelumnya ({olderItems.length})
                                            </h3>
                                        </div>
                                        <div className="space-y-2">
                                            {olderItems.map(renderFeedCard)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3 text-muted-foreground border border-dashed border-border rounded-2xl">
                                <CheckCircle2 className="size-12 text-emerald-400 stroke-[1.5]" />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-foreground">Semua Selesai!</h3>
                                    <p className="text-xs max-w-sm">
                                        Kotak masuk Anda bersih. Tidak ada tugas tertunda atau notifikasi yang memerlukan tindakan saat ini.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Snooze Modal */}
            <Dialog open={selectedSnoozeItem !== null} onOpenChange={(open) => !open && setSelectedSnoozeItem(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Clock className="size-4 text-amber-400" /> Tunda Pengingat (Snooze)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2 py-2 text-xs">
                        <p className="text-muted-foreground mb-3 truncate">
                            Tunda pengingat untuk "{selectedSnoozeItem?.title}":
                        </p>

                        {[
                            { id: '1hour', label: '1 Jam ke Depan' },
                            { id: '3hours', label: '3 Jam ke Depan' },
                            { id: 'tomorrow', label: 'Besok Pagi (09:00 WIB)' },
                            { id: 'next_week', label: 'Awal Minggu Depan (Senin 09:00 WIB)' },
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => handleSnooze(opt.id)}
                                className="w-full text-left px-3 py-2 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary border border-border text-xs font-semibold transition-colors flex items-center justify-between"
                            >
                                <span>{opt.label}</span>
                                <Clock className="size-3.5 opacity-60" />
                            </button>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedSnoozeItem(null)} className="text-xs">
                            Batal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
