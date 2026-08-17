import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    Settings,
    UserPlus,
    MessageSquare,
    AtSign,
    Play,
    Sparkles,
    Filter,
    ArrowRight,
    Inbox,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItem {
    id: string;
    category: string;
    title: string;
    message: string;
    action_url: string;
    icon: string;
    read_at: string | null;
    is_read: boolean;
    created_at: string;
    created_at_formatted: string;
    data: Record<string, any>;
}

interface NotificationCounts {
    all: number;
    unread: number;
    assigned: number;
    mention: number;
    comment: number;
    sprint: number;
    ai: number;
}

interface Props {
    notifications: {
        data: NotificationItem[];
        current_page: number;
        last_page: number;
        total: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    counts: NotificationCounts;
    currentCategory: string;
    unreadOnly: boolean;
}

export default function NotificationIndex({
    notifications,
    counts,
    currentCategory,
    unreadOnly,
}: Props) {
    const [isProcessing, setIsProcessing] = useState(false);

    const categories = [
        { key: 'all', label: 'Semua Notifikasi', icon: Inbox, count: counts.all },
        { key: 'assigned', label: 'Ditugaskan ke Saya', icon: UserPlus, count: counts.assigned },
        { key: 'mention', label: 'Sebutan (@Mentions)', icon: AtSign, count: counts.mention },
        { key: 'comment', label: 'Komentar & Diskusi', icon: MessageSquare, count: counts.comment },
        { key: 'sprint', label: 'Siklus Sprint', icon: Play, count: counts.sprint },
        { key: 'ai', label: 'Asisten AI & Laporan', icon: Sparkles, count: counts.ai },
    ];

    const handleCategoryChange = (cat: string) => {
        router.get(
            '/notifications',
            {
                category: cat,
                unread_only: unreadOnly ? 1 : undefined,
            },
            { preserveState: true }
        );
    };

    const handleToggleUnreadOnly = () => {
        router.get(
            '/notifications',
            {
                category: currentCategory,
                unread_only: !unreadOnly ? 1 : undefined,
            },
            { preserveState: true }
        );
    };

    const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        fetch(`/notifications/${id}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => {
            router.reload();
        });
    };

    const handleMarkAllAsRead = () => {
        fetch('/notifications/read-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => {
            router.reload();
        });
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        fetch(`/notifications/${id}`, {
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

    const handleItemClick = (item: NotificationItem) => {
        if (!item.is_read) {
            handleMarkAsRead(item.id);
        }
        if (item.action_url && item.action_url !== '#') {
            router.visit(item.action_url);
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'assigned':
                return <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500 bg-blue-500/5">Tugas</Badge>;
            case 'mention':
                return <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-500 bg-purple-500/5">Sebutan</Badge>;
            case 'comment':
                return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">Komentar</Badge>;
            case 'sprint':
                return <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/5">Sprint</Badge>;
            case 'ai':
                return <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-500 bg-indigo-500/5">AI</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">Sistem</Badge>;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'assigned':
                return <UserPlus className="size-4 text-blue-500" />;
            case 'mention':
                return <AtSign className="size-4 text-purple-500" />;
            case 'comment':
                return <MessageSquare className="size-4 text-emerald-500" />;
            case 'sprint':
                return <Play className="size-4 text-amber-500 fill-current" />;
            case 'ai':
                return <Sparkles className="size-4 text-indigo-500" />;
            default:
                return <Bell className="size-4 text-primary" />;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Pusat Notifikasi', href: '/notifications' },
            ]}
        >
            <Head title="Pusat Notifikasi" />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Title Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <Bell className="size-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                    Pusat Notifikasi
                                </h1>
                                {counts.unread > 0 && (
                                    <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                                        {counts.unread} Belum Dibaca
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pantau penugasan tugas, diskusi, sebutan (@mention), dan pembaruan sistem Anda secara real-time.
                            </p>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant={unreadOnly ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleToggleUnreadOnly}
                            className="text-xs gap-1.5 h-8"
                        >
                            <Filter className="size-3.5" />
                            <span>{unreadOnly ? 'Semua Status' : 'Hanya Belum Dibaca'}</span>
                        </Button>

                        {counts.unread > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="text-xs gap-1.5 h-8"
                            >
                                <CheckCheck className="size-3.5" />
                                <span>Tandai Semua Dibaca</span>
                            </Button>
                        )}

                        <Link href="/settings/notifications">
                            <Button variant="ghost" size="icon" className="size-8" title="Pengaturan Preferensi Notifikasi">
                                <Settings className="size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Category Sidebar */}
                    <div className="md:col-span-4 lg:col-span-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1">
                            Kategori
                        </p>
                        <div className="space-y-1">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = currentCategory === cat.key;

                                return (
                                    <button
                                        key={cat.key}
                                        onClick={() => handleCategoryChange(cat.key)}
                                        className={cn(
                                            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group',
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon className={cn('size-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                                            <span>{cat.label}</span>
                                        </div>
                                        {cat.count > 0 && (
                                            <span
                                                className={cn(
                                                    'text-[10px] px-2 py-0.5 rounded-full font-bold',
                                                    isActive
                                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10'
                                                )}
                                            >
                                                {cat.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-2 mt-4 text-xs">
                            <p className="font-semibold text-foreground">💡 Tips Kolaborasi</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Gunakan <strong>@nama</strong> di komentar tugas untuk memanggil rekan kerja langsung ke obrolan.
                            </p>
                        </div>
                    </div>

                    {/* Notifications Feed */}
                    <div className="md:col-span-8 lg:col-span-9 space-y-4">
                        {notifications.data.length === 0 ? (
                            <div className="py-16 px-4 rounded-3xl border border-border/80 bg-card/40 text-center space-y-3">
                                <div className="mx-auto size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
                                    <CheckCircle2 className="size-6 text-emerald-500" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground">Tidak Ada Notifikasi</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    {unreadOnly
                                        ? 'Semua notifikasi dalam kategori ini telah dibaca.'
                                        : 'Belum ada riwayat notifikasi pada kategori yang dipilih.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {notifications.data.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleItemClick(item)}
                                        className={cn(
                                            'group relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:border-primary/40',
                                            item.is_read
                                                ? 'bg-card/50 border-border/70 opacity-80 hover:opacity-100'
                                                : 'bg-card border-primary/20 shadow-xs'
                                        )}
                                    >
                                        {!item.is_read && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary" />
                                        )}

                                        <div className="p-2.5 rounded-xl bg-background border border-border/80 shrink-0 shadow-2xs">
                                            {getCategoryIcon(item.category)}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {getCategoryBadge(item.category)}
                                                <span className="text-xs font-bold text-foreground">
                                                    {item.title}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium ml-auto">
                                                    {item.created_at_formatted}
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {item.message}
                                            </p>
                                        </div>

                                        {/* Action buttons on hover */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                                            {!item.is_read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => handleMarkAsRead(item.id, e)}
                                                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                                                    title="Tandai telah dibaca"
                                                >
                                                    <Check className="size-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title="Hapus notifikasi"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                            <div className="p-1 rounded-lg text-primary">
                                                <ArrowRight className="size-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {notifications.last_page > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    Halaman {notifications.current_page} dari {notifications.last_page} ({notifications.total} total)
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!notifications.prev_page_url}
                                        onClick={() => notifications.prev_page_url && router.visit(notifications.prev_page_url)}
                                        className="text-xs gap-1"
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        <span>Sebelumnya</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!notifications.next_page_url}
                                        onClick={() => notifications.next_page_url && router.visit(notifications.next_page_url)}
                                        className="text-xs gap-1"
                                    >
                                        <span>Berikutnya</span>
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
