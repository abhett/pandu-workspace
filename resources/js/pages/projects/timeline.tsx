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
    Calendar,
    ChevronRight,
    Circle,
    CheckCircle2,
    Clock,
    Diamond,
    Filter,
    Flame,
    Layers,
    Link2,
    Plus,
    Radio,
    Sparkles,
    Trash2,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
    type: string;
}

interface TimelineItem {
    id: string;
    parent_id: string | null;
    key: string;
    title: string;
    type: string;
    is_milestone: boolean;
    status_name: string;
    status_category: string;
    progress: number;
    start_date: string;
    due_date: string;
    assignee?: string;
    assignee_avatar?: string;
}

interface TaskDependencyItem {
    id: string;
    predecessor_id: string;
    successor_id: string;
    type: string;
    lag_days: number;
}

interface TimelineData {
    project_id: string;
    zoom_level: string;
    timeline_start: string;
    timeline_end: string;
    total_days: number;
    today: string;
    weeks: Array<{
        week_number: number;
        label: string;
        start_date: string;
        days: Array<{ day: string; date: string }>;
    }>;
    items: TimelineItem[];
    dependencies: TaskDependencyItem[];
    critical_path_ids: string[];
}

interface Props {
    project: Project | null;
    availableProjects: Project[];
    timeline: TimelineData | null;
}

export default function TimelineGantt({
    project,
    availableProjects,
    timeline,
}: Props) {
    const [zoom, setZoom] = useState<string>(timeline?.zoom_level || 'month');
    const [showCriticalPath, setShowCriticalPath] = useState(true);

    // Dependency Modal State
    const [dependencyModalOpen, setDependencyModalOpen] = useState(false);
    const [predecessorId, setPredecessorId] = useState('');
    const [successorId, setSuccessorId] = useState('');
    const [dependencyType, setDependencyType] = useState('finish_to_start');
    const [isSubmittingDep, setIsSubmittingDep] = useState(false);
    const [depError, setDepError] = useState<string | null>(null);

    // Schedule Edit Modal State
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editIsMilestone, setEditIsMilestone] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    const handleProjectChange = (projectId: string) => {
        router.get(`/projects/${projectId}/timeline`);
    };

    const handleZoomChange = (newZoom: string) => {
        setZoom(newZoom);
        if (project) {
            router.get(`/projects/${project.id}/timeline`, { zoom: newZoom }, { preserveState: true });
        }
    };

    const handleCreateDependency = (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !predecessorId || !successorId) return;

        setIsSubmittingDep(true);
        setDepError(null);

        fetch(`/projects/${project.id}/dependencies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                predecessor_id: predecessorId,
                successor_id: successorId,
                type: dependencyType,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSubmittingDep(false);
                if (!data.success) {
                    setDepError(data.message || 'Gagal menambahkan dependensi.');
                } else {
                    setDependencyModalOpen(false);
                    setPredecessorId('');
                    setSuccessorId('');
                    router.reload();
                }
            })
            .catch(() => {
                setIsSubmittingDep(false);
                setDepError('Terjadi kesalahan jaringan.');
            });
    };

    const handleDeleteDependency = (depId: string) => {
        if (!project) return;

        fetch(`/projects/${project.id}/dependencies/${depId}`, {
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

    const handleSaveSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !editingItem) return;

        setIsSavingSchedule(true);

        fetch(`/projects/${project.id}/tasks/${editingItem.id}/schedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                start_date: editStartDate || null,
                due_date: editDueDate || null,
                is_milestone: editIsMilestone,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingSchedule(false);
                setScheduleModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingSchedule(false));
    };

    const openScheduleModal = (item: TimelineItem) => {
        setEditingItem(item);
        setEditStartDate(item.start_date);
        setEditDueDate(item.due_date);
        setEditIsMilestone(item.is_milestone);
        setScheduleModalOpen(true);
    };

    // Helper to calculate pixel position for Gantt bars
    const calculateBarMetrics = (startDateStr: string, dueDateStr: string) => {
        if (!timeline) return { left: 0, width: 80 };

        const tStart = new Date(timeline.timeline_start).getTime();
        const tEnd = new Date(timeline.timeline_end).getTime();
        const totalDuration = Math.max(1, tEnd - tStart);

        const itemStart = new Date(startDateStr).getTime();
        const itemEnd = new Date(dueDateStr).getTime();

        const offsetMs = Math.max(0, itemStart - tStart);
        const durationMs = Math.max(86400000, itemEnd - itemStart); // Min 1 day

        const leftPercent = Math.min(100, Math.max(0, (offsetMs / totalDuration) * 100));
        const widthPercent = Math.min(100 - leftPercent, Math.max(2, (durationMs / totalDuration) * 100));

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
        };
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Proyek', href: '/projects' },
                { title: project?.name || 'Timeline', href: project ? `/projects/${project.id}` : '#' },
                { title: 'Timeline & Gantt Chart', href: '#' },
            ]}
        >
            <Head title={`Timeline & Roadmap - ${project?.name || 'Pandu'}`} />

            <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-background">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3 border-b border-border bg-card/60 gap-3 shrink-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Project selector */}
                        {availableProjects.length > 1 && (
                            <select
                                value={project?.id || ''}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                {availableProjects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.key})
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Zoom Controls */}
                        <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border">
                            {['day', 'week', 'month', 'quarter'].map((z) => (
                                <button
                                    key={z}
                                    onClick={() => handleZoomChange(z)}
                                    className={cn(
                                        'px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors',
                                        zoom === z ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {z}
                                </button>
                            ))}
                        </div>

                        {/* Critical Path Toggle */}
                        <Button
                            variant={showCriticalPath ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowCriticalPath(!showCriticalPath)}
                            className="h-8 text-xs gap-1.5"
                        >
                            <Zap className="size-3.5" />
                            <span>Jalur Kritis (Critical Path)</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDependencyModalOpen(true)}
                            className="h-8 text-xs gap-1.5"
                        >
                            <Link2 className="size-3.5" />
                            <span>Hubungkan Dependensi</span>
                        </Button>
                    </div>
                </div>

                {/* Main Gantt Split View */}
                {timeline ? (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Column: Work Items Hierarchy Tree (Width ~340px) */}
                        <div className="w-80 md:w-96 shrink-0 border-r border-border bg-card/40 flex flex-col z-10 shadow-sm overflow-hidden">
                            <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                                <span>Item Kerja & Tugas</span>
                                <span>Progres</span>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                                {timeline.items.map((item) => {
                                    const isCritical = showCriticalPath && timeline.critical_path_ids.includes(item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openScheduleModal(item)}
                                            className={cn(
                                                'group px-4 py-3 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors text-xs',
                                                isCritical && 'border-l-4 border-l-red-500 bg-red-500/5'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                                {item.is_milestone ? (
                                                    <Diamond className="size-4 text-amber-500 shrink-0 fill-current" />
                                                ) : item.status_category === 'done' ? (
                                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <Circle className="size-4 text-blue-500 shrink-0" />
                                                )}

                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground truncate group-hover:text-primary">
                                                        <span className="font-mono text-muted-foreground mr-1">[{item.key}]</span>
                                                        {item.title}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">
                                                        {item.start_date} → {item.due_date}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="w-12 bg-muted h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full',
                                                            item.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                                                        )}
                                                        style={{ width: `${item.progress}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">
                                                    {item.progress}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Area: Gantt Schedule Canvas (Scrollable) */}
                        <div className="flex-1 flex flex-col overflow-auto bg-background/50 relative" id="gantt-scroll-container">
                            {/* Calendar Header Weeks Bar */}
                            <div className="h-10 bg-muted/40 border-b border-border sticky top-0 z-20 flex min-w-max">
                                {timeline.weeks.map((w) => (
                                    <div
                                        key={w.week_number}
                                        className="w-48 shrink-0 flex flex-col justify-center items-center border-r border-border/80 text-[11px] font-mono text-muted-foreground uppercase font-semibold relative"
                                    >
                                        <span>{w.label} ({w.start_date})</span>
                                        <div className="flex w-full text-[9px] text-muted-foreground/60 border-t border-border/40 justify-around">
                                            {w.days.map((d, i) => (
                                                <span key={i}>{d.day}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Gantt Bars Body */}
                            <div className="divide-y divide-border/40 min-w-max relative flex-1">
                                {timeline.items.map((item) => {
                                    const { left, width } = calculateBarMetrics(item.start_date, item.due_date);
                                    const isCritical = showCriticalPath && timeline.critical_path_ids.includes(item.id);

                                    return (
                                        <div key={item.id} className="h-[49px] relative flex items-center hover:bg-muted/10">
                                            {/* Bar container */}
                                            <div
                                                onClick={() => openScheduleModal(item)}
                                                className={cn(
                                                    'absolute h-6 rounded-lg flex items-center px-2 cursor-pointer shadow-xs transition-all text-xs font-semibold font-mono truncate',
                                                    item.is_milestone
                                                        ? 'bg-amber-500 text-black w-6 rotate-45 flex items-center justify-center p-0 shadow-md'
                                                        : item.status_category === 'done'
                                                        ? 'bg-emerald-600/80 text-white hover:bg-emerald-600'
                                                        : isCritical
                                                        ? 'bg-red-500/90 text-white border-2 border-red-400 hover:bg-red-500 shadow-md'
                                                        : 'bg-primary/80 text-primary-foreground hover:bg-primary'
                                                )}
                                                style={{ left, width: item.is_milestone ? '20px' : width }}
                                                title={`[${item.key}] ${item.title} (${item.start_date} - ${item.due_date})`}
                                            >
                                                {!item.is_milestone && (
                                                    <span className="truncate text-[11px]">
                                                        {item.key}: {item.title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                        Belum ada tugas atau roadmap yang dapat ditampilkan pada proyek ini.
                    </div>
                )}
            </div>

            {/* Dependency Connect Modal */}
            <Dialog open={dependencyModalOpen} onOpenChange={setDependencyModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Link2 className="size-4 text-primary" /> Hubungkan Dependensi Tugas
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateDependency} className="space-y-4">
                        {depError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
                                {depError}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Tugas Prasyarat (Predecessor - Dikerjakan Dahulu)
                            </label>
                            <select
                                value={predecessorId}
                                onChange={(e) => setPredecessorId(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground"
                                required
                            >
                                <option value="">Pilih Tugas Prasyarat...</option>
                                {timeline?.items.map((it) => (
                                    <option key={it.id} value={it.id}>
                                        [{it.key}] {it.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Tugas Penerus (Successor - Bergantung pada Prasyarat)
                            </label>
                            <select
                                value={successorId}
                                onChange={(e) => setSuccessorId(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground"
                                required
                            >
                                <option value="">Pilih Tugas Penerus...</option>
                                {timeline?.items.map((it) => (
                                    <option key={it.id} value={it.id}>
                                        [{it.key}] {it.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                Jenis Hubungan Dependensi
                            </label>
                            <select
                                value={dependencyType}
                                onChange={(e) => setDependencyType(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-mono"
                            >
                                <option value="finish_to_start">Finish to Start (FS - Standar)</option>
                                <option value="start_to_start">Start to Start (SS - Bersamaan Mulai)</option>
                                <option value="finish_to_finish">Finish to Finish (FF - Bersamaan Selesai)</option>
                                <option value="start_to_finish">Start to Finish (SF)</option>
                            </select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDependencyModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingDep}
                                className="text-xs font-semibold"
                            >
                                {isSubmittingDep ? 'Menyimpan...' : 'Hubungkan Dependensi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Task Schedule Edit Modal */}
            <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Calendar className="size-4 text-primary" /> Atur Jadwal & Milestone
                        </DialogTitle>
                    </DialogHeader>

                    {editingItem && (
                        <form onSubmit={handleSaveSchedule} className="space-y-4">
                            <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-0.5 font-mono">
                                <p className="font-bold text-foreground">[{editingItem.key}] {editingItem.title}</p>
                                <p className="text-muted-foreground">Status: {editingItem.status_name} ({editingItem.progress}%)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Tanggal Mulai</label>
                                    <Input
                                        type="date"
                                        value={editStartDate}
                                        onChange={(e) => setEditStartDate(e.target.value)}
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Tanggal Tenggat / Target</label>
                                    <Input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="is_milestone_chk"
                                    checked={editIsMilestone}
                                    onChange={(e) => setEditIsMilestone(e.target.checked)}
                                    className="rounded border-border size-4 text-primary focus:ring-primary"
                                />
                                <label htmlFor="is_milestone_chk" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                    <Diamond className="size-3.5 text-amber-500" />
                                    <span>Tandai sebagai Target Milestone Utama Proyek</span>
                                </label>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setScheduleModalOpen(false)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSavingSchedule}
                                    className="text-xs font-semibold"
                                >
                                    {isSavingSchedule ? 'Menyimpan...' : 'Simpan Jadwal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
