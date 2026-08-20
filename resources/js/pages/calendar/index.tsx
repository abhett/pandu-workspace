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
} from '@/components/ui/dialog';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Diamond,
    Filter,
    Flag,
    FolderKanban,
    Layers,
    Plus,
    Sparkles,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarTask {
    id: string;
    key: string;
    title: string;
    project_id: string;
    project_name: string;
    project_key: string;
    priority: string;
    is_milestone: boolean;
    status_name: string;
    status_category: string;
    is_completed: boolean;
    is_past_due: boolean;
    due_date: string | null;
    assignee?: string;
    assignee_avatar?: string;
}

interface CalendarSprint {
    id: string;
    name: string;
    project_name: string;
    is_start: boolean;
    is_end: boolean;
}

interface CalendarDay {
    date: string;
    day_number: number;
    day_name: string;
    is_current_month: boolean;
    is_today: boolean;
    tasks: CalendarTask[];
    sprints: CalendarSprint[];
}

interface CalendarData {
    year: number;
    month: number;
    month_name: string;
    prev_month: { year: number; month: number };
    next_month: { year: number; month: number };
    today: string;
    summary: {
        total_tasks: number;
        completed_tasks: number;
        overdue_tasks: number;
    };
    days: CalendarDay[];
    project: {
        id: string;
        name: string;
        key: string;
    } | null;
    available_projects: Array<{
        id: string;
        name: string;
        key: string;
        type: string;
    }>;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: {
        id: string;
        name: string;
        key: string;
        type: string;
    } | null;
    calendar: CalendarData;
}

export default function TeamCalendar({ organization, project, calendar }: Props) {
    const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

    // Reschedule Task Modal State
    const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
    const [newDueDate, setNewDueDate] = useState('');
    const [isSavingDate, setIsSavingDate] = useState(false);

    const navigateMonth = (year: number, month: number) => {
        const url = project ? `/projects/${project.id}/calendar` : '/calendar';
        router.get(url, { year, month }, { preserveState: true });
    };

    const handleProjectFilter = (projectId: string) => {
        if (projectId === 'all') {
            router.get('/calendar');
        } else {
            router.get(`/projects/${projectId}/calendar`);
        }
    };

    const openRescheduleModal = (task: CalendarTask, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTask(task);
        setNewDueDate(task.due_date || '');
    };

    const handleSaveDueDate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;

        setIsSavingDate(true);

        fetch(`/tasks/${selectedTask.id}/due-date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                due_date: newDueDate || null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingDate(false);
                setSelectedTask(null);
                router.reload();
            })
            .catch(() => setIsSavingDate(false));
    };

    const weekDayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: project?.name || 'Kalender', href: project ? `/projects/${project.id}` : '#' },
                { title: 'Jadwal & Kalender', href: '#' },
            ]}
        >
            <Head title={`Kalender Tim & Jadwal - ${project?.name || organization.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div>
                            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                                TEAM SCHEDULE & DUE DATES
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground capitalize">
                                {calendar.month_name}
                            </h1>
                        </div>

                        {/* Month Navigator */}
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                            <button
                                onClick={() => navigateMonth(calendar.prev_month.year, calendar.prev_month.month)}
                                className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                title="Bulan Sebelumnya"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <button
                                onClick={() => {
                                    const now = new Date();
                                    navigateMonth(now.getFullYear(), now.getMonth() + 1);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-card transition-colors"
                            >
                                Hari Ini
                            </button>
                            <button
                                onClick={() => navigateMonth(calendar.next_month.year, calendar.next_month.month)}
                                className="p-1.5 hover:bg-card rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                title="Bulan Selanjutnya"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Project Filter */}
                        <select
                            value={project?.id || 'all'}
                            onChange={(e) => handleProjectFilter(e.target.value)}
                            className="h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                        >
                            <option value="all">Semua Proyek Organisasi</option>
                            {calendar.available_projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.key})
                                </option>
                            ))}
                        </select>

                        {/* View Switch */}
                        <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border">
                            <button
                                onClick={() => setViewMode('month')}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                    viewMode === 'month' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Bulan
                            </button>
                            <button
                                onClick={() => setViewMode('agenda')}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                    viewMode === 'agenda' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Agenda
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Summary Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center shadow-xs">
                        <div>
                            <span className="text-[11px] font-mono uppercase text-muted-foreground font-bold">Total Tugas Bulan Ini</span>
                            <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{calendar.summary.total_tasks}</p>
                        </div>
                        <CalendarIcon className="size-5 text-primary" />
                    </div>

                    <div className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center shadow-xs">
                        <div>
                            <span className="text-[11px] font-mono uppercase text-muted-foreground font-bold">Tugas Selesai</span>
                            <p className="text-2xl font-bold font-mono text-emerald-500 mt-0.5">{calendar.summary.completed_tasks}</p>
                        </div>
                        <CheckCircle2 className="size-5 text-emerald-500" />
                    </div>

                    <div className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center shadow-xs">
                        <div>
                            <span className="text-[11px] font-mono uppercase text-muted-foreground font-bold">Lewat Tenggat (Overdue)</span>
                            <p className="text-2xl font-bold font-mono text-red-500 mt-0.5">{calendar.summary.overdue_tasks}</p>
                        </div>
                        <Clock className="size-5 text-red-500" />
                    </div>
                </div>

                {/* Month Grid View */}
                {viewMode === 'month' && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                        {/* Days of Week Header */}
                        <div className="grid grid-cols-7 bg-muted/40 border-b border-border text-center py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                            {weekDayNames.map((d, i) => (
                                <div key={i} className={cn(i === 0 || i === 6 ? 'text-muted-foreground/60' : 'text-foreground')}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* 42 Calendar Cells Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr bg-border/40 gap-px">
                            {calendar.days.map((day, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        'bg-card p-2 min-h-[120px] flex flex-col gap-1 relative group transition-colors',
                                        !day.is_current_month && 'bg-muted/10 opacity-40',
                                        day.is_today && 'bg-primary/5 ring-1 ring-primary/40'
                                    )}
                                >
                                    {/* Date Number Header */}
                                    <div className="flex justify-between items-center mb-1">
                                        {day.is_today ? (
                                            <span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold font-mono shadow-xs">
                                                {day.day_number}
                                            </span>
                                        ) : (
                                            <span className="font-mono text-xs font-semibold text-muted-foreground">
                                                {day.day_number}
                                            </span>
                                        )}

                                        {day.tasks.length > 0 && (
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                {day.tasks.length} item
                                            </span>
                                        )}
                                    </div>

                                    {/* Sprint Span Banner */}
                                    {day.sprints.map((sp) => (
                                        <div
                                            key={sp.id}
                                            className={cn(
                                                'h-5 bg-purple-500/20 text-purple-400 text-[10px] font-bold font-mono px-1.5 flex items-center truncate shadow-xs',
                                                sp.is_start && 'rounded-l-md border-l-2 border-purple-500',
                                                sp.is_end && 'rounded-r-md'
                                            )}
                                            title={`Sprint: ${sp.name} (${sp.project_name})`}
                                        >
                                            <Zap className="size-2.5 mr-1 shrink-0" />
                                            <span className="truncate">{sp.name}</span>
                                        </div>
                                    ))}

                                    {/* Task Chips */}
                                    <div className="space-y-1 mt-0.5 overflow-y-auto max-h-[110px]">
                                        {day.tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                onClick={(e) => openRescheduleModal(task, e)}
                                                className={cn(
                                                    'px-2 py-1 rounded text-[11px] font-medium flex items-center justify-between gap-1 shadow-2xs cursor-pointer transition-all hover:scale-[1.02]',
                                                    task.is_completed
                                                        ? 'bg-emerald-500/10 text-emerald-500 line-through border border-emerald-500/20'
                                                        : task.is_past_due
                                                        ? 'bg-red-500/15 text-red-500 border border-red-500/30 font-semibold'
                                                        : task.priority === 'urgent' || task.priority === 'high'
                                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        : task.priority === 'medium'
                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        : 'bg-muted text-foreground border border-border'
                                                )}
                                                title={`[${task.key}] ${task.title} - Status: ${task.status_name}`}
                                            >
                                                <div className="flex items-center gap-1 min-w-0 truncate">
                                                    {task.is_milestone ? (
                                                        <Diamond className="size-3 text-amber-500 shrink-0 fill-current" />
                                                    ) : (
                                                        <Flag className="size-2.5 shrink-0 opacity-70" />
                                                    )}
                                                    <span className="truncate">
                                                        <strong className="font-mono mr-0.5">[{task.key}]</strong>
                                                        {task.title}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agenda List View */}
                {viewMode === 'agenda' && (
                    <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <h3 className="font-bold text-sm text-foreground">Agenda Jadwal Tugas</h3>
                            <span className="text-xs text-muted-foreground font-mono">Bulan {calendar.month_name}</span>
                        </div>

                        <div className="divide-y divide-border/60">
                            {calendar.days.filter((d) => d.tasks.length > 0).length > 0 ? (
                                calendar.days
                                    .filter((d) => d.tasks.length > 0)
                                    .map((day) => (
                                        <div key={day.date} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-muted/10 transition-colors">
                                            <div className="sm:w-36 shrink-0 font-mono">
                                                <span className="font-bold text-sm text-foreground block">{day.date}</span>
                                                <span className="text-xs text-muted-foreground uppercase">{day.day_name}</span>
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                {day.tasks.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        onClick={(e) => openRescheduleModal(t, e)}
                                                        className="p-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex items-center justify-between gap-3 cursor-pointer"
                                                    >
                                                        <div className="space-y-0.5 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs text-primary font-bold">[{t.key}]</span>
                                                                <span className="text-xs font-semibold text-foreground truncate">{t.title}</span>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground">Proyek: {t.project_name} • Status: {t.status_name}</p>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {t.is_milestone && (
                                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                                                                    Milestone
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline" className="text-[10px] capitalize">
                                                                {t.priority}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="py-12 text-center text-xs text-muted-foreground">
                                    Tidak ada tugas dengan tenggat waktu pada bulan ini.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Reschedule Due Date Modal */}
            <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <CalendarIcon className="size-4 text-primary" /> Atur Tenggat Waktu Tugas
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTask && (
                        <form onSubmit={handleSaveDueDate} className="space-y-4">
                            <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1 font-mono">
                                <p className="font-bold text-foreground">[{selectedTask.key}] {selectedTask.title}</p>
                                <p className="text-muted-foreground">Proyek: {selectedTask.project_name} • Prioritas: {selectedTask.priority}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Tanggal Tenggat (Due Date)</label>
                                <Input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedTask(null)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSavingDate}
                                    className="text-xs font-semibold"
                                >
                                    {isSavingDate ? 'Menyimpan...' : 'Perbarui Tenggat'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
