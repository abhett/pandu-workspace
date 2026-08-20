import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Bell,
    Bot,
    Calendar,
    Check,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    Clock,
    Flame,
    Home,
    Inbox,
    Layers,
    LayoutGrid,
    MessageSquare,
    Plus,
    Search,
    Sparkles,
    TrendingUp,
    User,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItem {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    story_points?: number;
    project?: { id: string; name: string; key: string };
    assignees?: Array<{ id: string; name: string; avatar?: string }>;
}

interface SprintItem {
    id: string;
    name: string;
    goal?: string;
    start_date?: string;
    end_date?: string;
    status: string;
}

interface NotificationItem {
    id: string;
    title: string;
    message?: string;
    read_at?: string | null;
    created_at?: string;
}

interface MobileProps {
    tasks?: TaskItem[];
    activeSprint?: SprintItem | null;
    notifications?: NotificationItem[];
}

export default function MobileCompanionPage({
    tasks = [],
    activeSprint = null,
    notifications = [],
}: MobileProps) {
    const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'kanban' | 'inbox'>('home');
    const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'high'>('all');
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

    const toggleTaskCompletion = (taskId: string) => {
        setCompletedTaskIds((prev) =>
            prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
        );
    };

    // Default mock tasks if empty
    const displayTasks: TaskItem[] = tasks.length > 0 ? tasks : [
        {
            id: 't-101',
            title: 'Implementasi Autentikasi OAuth2 Google & GitHub',
            status: 'in_progress',
            priority: 'high',
            story_points: 5,
            project: { id: 'p-1', name: 'Core Engine', key: 'COR' },
        },
        {
            id: 't-102',
            title: 'Audit Keamanan Sesi Pengguna & Revoke Token Otomatis',
            status: 'todo',
            priority: 'high',
            story_points: 3,
            project: { id: 'p-1', name: 'Security Hub', key: 'SEC' },
        },
        {
            id: 't-103',
            title: 'Optimasi Latensi Query Elasticsearch Backlog Triage',
            status: 'review',
            priority: 'medium',
            story_points: 8,
            project: { id: 'p-2', name: 'Search Service', key: 'SRH' },
        },
        {
            id: 't-104',
            title: 'Perbaikan UI Breakpoint Mobile Safe-Area Insets',
            status: 'done',
            priority: 'low',
            story_points: 2,
            project: { id: 'p-3', name: 'Frontend App', key: 'UI' },
        },
    ];

    const filteredTasks = displayTasks.filter((t) => {
        if (taskFilter === 'high') return t.priority === 'high';
        if (taskFilter === 'today') return t.status === 'in_progress' || t.status === 'todo';
        return true;
    });

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between max-w-md mx-auto relative shadow-2xl border-x border-border/80 font-sans selection:bg-primary/20 pb-20">
            <Head title="Pandu Mobile Companion" />

            {/* Mobile Header Safe Area */}
            <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shadow-xs">
                        P
                    </div>
                    <div>
                        <h1 className="text-xs font-bold text-foreground">Pandu Mobile</h1>
                        <p className="text-[10px] font-mono text-muted-foreground">
                            {activeTab === 'home' && 'Ringkasan Kerja'}
                            {activeTab === 'tasks' && 'Daftar Tugas'}
                            {activeTab === 'kanban' && 'Papan Kanban'}
                            {activeTab === 'inbox' && 'Notifikasi'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground">
                            Desktop Mode
                        </Button>
                    </Link>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setActiveTab('inbox')}
                            className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground relative"
                        >
                            <Bell className="size-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Tab Content */}
            <main className="flex-1 p-4 space-y-5 animate-fade-in overflow-y-auto">
                {/* 1. TAB: BERANDA / HOME */}
                {activeTab === 'home' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card rounded-2xl border border-border p-4 space-y-1 relative overflow-hidden shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <CheckSquare className="size-3.5" />
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        <TrendingUp className="size-2.5" /> +12%
                                    </span>
                                </div>
                                <h3 className="text-xl font-extrabold text-foreground pt-1">
                                    {displayTasks.length}
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Tugas Aktif</p>
                            </div>

                            <div className="bg-card rounded-2xl border border-border p-4 space-y-1 relative overflow-hidden shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                        <Flame className="size-3.5" />
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        {activeSprint?.name || 'Sprint 42'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-extrabold text-foreground pt-1">
                                    68%
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Progres Sprint</p>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                                </div>
                            </div>
                        </div>

                        {/* AI Insights Hero Glance Card */}
                        <div className="bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl border border-primary/20 p-5 space-y-3 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                <Sparkles className="size-4 animate-spin text-primary" />
                                <span>AI Work Insight</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Berdasarkan velocity tim saat ini, Sprint diprediksi selesai <strong className="text-foreground">2 hari lebih awal</strong>. Tidak ada dependensi kritis yang terblokir.
                            </p>
                        </div>

                        {/* Rekomendasi Blocker Section */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-foreground">Rekomendasi Tindakan</h3>
                                <button type="button" onClick={() => setActiveTab('tasks')} className="text-[11px] text-primary font-semibold">
                                    Lihat Semua
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="bg-card rounded-2xl border border-border p-3.5 flex items-start gap-3 shadow-xs">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="size-4" />
                                    </div>
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-foreground truncate">
                                            Blocker: Integrasi OAuth2
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                                            Belum ada pembaruan commit selama 3 hari berturut-turut.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-card rounded-2xl border border-border p-3.5 flex items-start gap-3 shadow-xs">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="size-4" />
                                    </div>
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-foreground truncate">
                                            Rilis v2.4.1 Siap Staging
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                                            4 Pull Request telah disetujui oleh tim reviewer.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. TAB: TUGAS / TASKS */}
                {activeTab === 'tasks' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'today', label: 'Hari Ini' },
                                { id: 'high', label: 'Prioritas Tinggi' },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setTaskFilter(f.id as any)}
                                    className={cn(
                                        'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                        taskFilter === f.id
                                            ? 'bg-card text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Task List */}
                        <div className="space-y-2.5">
                            {filteredTasks.map((t) => {
                                const isDone = completedTaskIds.includes(t.id) || t.status === 'done';
                                return (
                                    <div
                                        key={t.id}
                                        className={cn(
                                            'bg-card rounded-2xl border border-border p-3.5 flex items-start gap-3 transition-all shadow-xs',
                                            isDone && 'opacity-60 bg-muted/20'
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleTaskCompletion(t.id)}
                                            className={cn(
                                                'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                                                isDone
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-muted-foreground/40 hover:border-primary'
                                            )}
                                        >
                                            {isDone && <Check className="size-3.5 stroke-[3]" />}
                                        </button>

                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    {t.project?.key ? `${t.project.key}-${t.id.replace('t-', '')}` : t.id}
                                                </span>
                                                {t.priority === 'high' && (
                                                    <Badge variant="destructive" className="text-[9px] py-0 px-1.5 h-4 font-mono">
                                                        High
                                                    </Badge>
                                                )}
                                            </div>
                                            <h4 className={cn('text-xs font-bold text-foreground leading-snug', isDone && 'line-through text-muted-foreground')}>
                                                {t.title}
                                            </h4>
                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                                    <Clock className="size-3" /> {t.story_points || 3} SP
                                                </span>
                                                <Badge variant="outline" className="text-[9px] font-mono capitalize">
                                                    {t.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. TAB: KANBAN BOARD */}
                {activeTab === 'kanban' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-foreground">Sprint Kanban Board</h3>
                            <span className="text-[10px] font-mono text-muted-foreground">Swipe horizontal</span>
                        </div>

                        {/* Snap Scrolling Columns */}
                        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 custom-scrollbar -mx-4 px-4">
                            {[
                                { id: 'todo', label: 'To Do', color: 'bg-blue-400', count: 3 },
                                { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-500', count: 2 },
                                { id: 'review', label: 'Review', color: 'bg-purple-400', count: 1 },
                                { id: 'done', label: 'Done', color: 'bg-emerald-400', count: 4 },
                            ].map((col) => (
                                <div
                                    key={col.id}
                                    className="w-[78vw] max-w-[280px] shrink-0 snap-center bg-muted/20 border border-border rounded-2xl p-3.5 space-y-3"
                                >
                                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-2 h-2 rounded-full', col.color)} />
                                            <h4 className="text-xs font-bold text-foreground">{col.label}</h4>
                                        </div>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {col.count}
                                        </span>
                                    </div>

                                    {/* Column Items */}
                                    <div className="space-y-2">
                                        {displayTasks
                                            .filter((t) => col.id === 'todo' || t.status === col.id)
                                            .slice(0, 2)
                                            .map((t) => (
                                                <div
                                                    key={t.id}
                                                    className="bg-card rounded-xl border border-border p-3 space-y-2 shadow-xs"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-mono text-muted-foreground">
                                                            {t.project?.key ? `${t.project.key}-104` : 'T-104'}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                                            {t.priority || 'Med'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                                                        {t.title}
                                                    </p>
                                                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
                                                        <span>{t.story_points || 3} Pts</span>
                                                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px]">
                                                            JD
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. TAB: INBOX / NOTIFIKASI */}
                {activeTab === 'inbox' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-foreground">Inbox Kerja & Notifikasi</h3>
                            <span className="text-[10px] font-mono text-primary font-bold">Tandai Semua Dibaca</span>
                        </div>

                        <div className="space-y-2.5">
                            {[
                                {
                                    id: 'n-1',
                                    title: 'Budi Santoso me-mention Anda di tugas TSK-8492',
                                    desc: '"Tolong cek endpoint auth token callback di PR #42."',
                                    time: '10m lalu',
                                    type: 'mention',
                                },
                                {
                                    id: 'n-2',
                                    title: 'AI Co-Pilot merekomendasikan optimasi sprint',
                                    desc: 'Sprint 42 diproyeksikan selesai 2 hari lebih awal.',
                                    time: '1j lalu',
                                    type: 'ai',
                                },
                                {
                                    id: 'n-3',
                                    title: 'Tugas diselesaikan: Audit Keamanan Sesi',
                                    desc: 'Status diubah menjadi Done oleh Sarah Connor.',
                                    time: '3j lalu',
                                    type: 'done',
                                },
                            ].map((n) => (
                                <div
                                    key={n.id}
                                    className="bg-card rounded-2xl border border-border p-3.5 space-y-1 shadow-xs hover:border-primary/40 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground leading-snug">{n.title}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">{n.time}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{n.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Touch Navigation Bar (Fixed Safe-Area) */}
            <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-50 bg-card/95 backdrop-blur-xl border-t border-border px-3 py-2 flex items-center justify-around">
                {[
                    { id: 'home', label: 'Beranda', icon: Home },
                    { id: 'tasks', label: 'Tugas', icon: CheckSquare },
                    { id: 'kanban', label: 'Papan', icon: LayoutGrid },
                    { id: 'inbox', label: 'Inbox', icon: Inbox },
                ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveTab(item.id as any)}
                            className={cn(
                                'flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all',
                                isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('size-5', isActive && 'scale-110 text-primary')} />
                            <span className="text-[10px]">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
