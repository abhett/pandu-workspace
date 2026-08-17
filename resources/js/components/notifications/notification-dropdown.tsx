import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Bell,
    Check,
    CheckCheck,
    UserPlus,
    MessageSquare,
    AtSign,
    Play,
    Sparkles,
    Settings,
    ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationItem {
    id: string;
    category: string;
    title: string;
    message: string;
    action_url: string;
    icon: string;
    is_read: boolean;
    created_at_formatted: string;
}

export function NotificationDropdown() {
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('unread');

    const fetchNotifications = () => {
        setIsLoading(true);
        fetch('/notifications/unread', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setUnreadCount(data.unread_count || 0);
                setNotifications(data.notifications || []);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchNotifications();
        // Polling every 30 seconds for background freshness
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        fetch(`/notifications/${id}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setUnreadCount(data.unread_count ?? Math.max(0, unreadCount - 1));
                setNotifications((prev) => prev.filter((n) => n.id !== id));
            });
    };

    const handleMarkAllAsRead = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        fetch('/notifications/read-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setUnreadCount(0);
                setNotifications([]);
            });
    };

    const handleItemClick = (item: NotificationItem) => {
        handleMarkAsRead(item.id);
        setOpen(false);
        if (item.action_url && item.action_url !== '#') {
            router.visit(item.action_url);
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
        <DropdownMenu open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) fetchNotifications();
        }}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    title="Notifikasi"
                >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-2xl rounded-2xl border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Notifikasi</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary font-bold">
                                {unreadCount} baru
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 gap-1"
                            >
                                <CheckCheck className="size-3" />
                                <span>Tandai dibaca</span>
                            </Button>
                        )}
                        <Link
                            href="/settings/notifications"
                            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                            title="Pengaturan Notifikasi"
                            onClick={() => setOpen(false)}
                        >
                            <Settings className="size-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
                    {notifications.length === 0 ? (
                        <div className="py-10 px-4 text-center space-y-2">
                            <div className="mx-auto size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <Check className="size-5" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">Semua bersih!</p>
                            <p className="text-[11px] text-muted-foreground">
                                Anda tidak memiliki notifikasi baru yang belum dibaca.
                            </p>
                        </div>
                    ) : (
                        notifications.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className={cn(
                                    'group flex items-start gap-3 p-3.5 hover:bg-muted/40 cursor-pointer transition-colors relative text-xs',
                                    !item.is_read && 'bg-primary/5'
                                )}
                            >
                                <div className="p-2 rounded-xl bg-background border border-border/80 shrink-0 shadow-2xs mt-0.5">
                                    {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex-1 min-w-0 space-y-0.5">
                                    <p className="font-semibold text-foreground line-clamp-1 leading-snug">
                                        {item.title}
                                    </p>
                                    <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                                        {item.message}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground/70 font-medium block pt-0.5">
                                        {item.created_at_formatted}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleMarkAsRead(item.id, e)}
                                    className="opacity-0 group-hover:opacity-100 size-6 rounded-full text-muted-foreground hover:text-foreground shrink-0 self-center"
                                    title="Tandai dibaca"
                                >
                                    <Check className="size-3.5" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 border-t border-border bg-muted/20 text-center">
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                        <span>Buka Pusat Notifikasi Lengkap</span>
                        <ExternalLink className="size-3" />
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
