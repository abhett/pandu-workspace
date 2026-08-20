import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckCircle2,
    Bug,
    Bookmark,
    Layers,
    Plus,
    Search,
    Columns3,
    ListTodo,
    LayoutDashboard,
    Settings,
    Calendar,
    AlertTriangle,
    AlertCircle,
    Hash,
    Sparkles,
    CheckSquare,
    Workflow,
} from 'lucide-react';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { TaskDetailDrawer, TaskDetailData } from '@/components/tasks/task-detail-drawer';

interface Member {
    id: number;
    name: string;
    email: string;
}

interface WorkflowStatus {
    id: string;
    name: string;
    slug: string;
    category: string;
    color: string;
    position: number;
    is_initial?: boolean;
    is_completed?: boolean;
    wip_limit?: number | null;
}

interface BoardTask {
    id: string;
    key: string;
    title: string;
    description: string | null;
    type: string;
    priority: string;
    status_id: string;
    estimate_points: number | null;
    due_date: string | null;
    due_date_formatted?: string | null;
    completed_at?: string | null;
    rank: string;
    version: number;
    subtasks_count: number;
    assignees: Member[];
    labels: { id: string; name: string; color: string }[];
}

interface Props {
    project: {
        id: string;
        name: string;
        key: string;
        slug: string;
        type: string;
        color: string;
        icon: string;
    };
    statuses: WorkflowStatus[];
    tasks: BoardTask[];
    members: Member[];
    labels: { id: string; name: string; color: string }[];
}

export default function KanbanBoardPage({
    project,
    statuses,
    tasks: initialTasks,
    members,
    labels,
}: Props) {
    const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createModalDefaultStatusId, setCreateModalDefaultStatusId] = useState<string | undefined>(undefined);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [selectedType, setSelectedType] = useState('all');

    // Drag and Drop state
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);
    const [dragOverTargetTaskId, setDragOverTargetTaskId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filter tasks
    const filteredTasks = tasks.filter((task) => {
        if (search) {
            const query = search.toLowerCase();
            const matchesSearch =
                task.title.toLowerCase().includes(query) ||
                task.key.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        if (selectedAssignee !== 'all') {
            const hasAssignee = task.assignees.some((a) => a.id === Number(selectedAssignee));
            if (!hasAssignee) return false;
        }
        if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
            return false;
        }
        if (selectedType !== 'all' && task.type !== selectedType) {
            return false;
        }
        return true;
    });

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, statusId: string, targetTaskId?: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverStatusId !== statusId) {
            setDragOverStatusId(statusId);
        }
        if (targetTaskId !== undefined) {
            setDragOverTargetTaskId(targetTaskId);
        }
    };

    const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
        e.preventDefault();
        const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
        if (!taskId) return;

        const currentTask = tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        // Tasks in target status column
        const columnTasks = tasks.filter((t) => t.status_id === targetStatusId && t.id !== taskId);

        // Find insertion index
        let insertIndex = columnTasks.length;
        if (dragOverTargetTaskId) {
            const foundIdx = columnTasks.findIndex((t) => t.id === dragOverTargetTaskId);
            if (foundIdx !== -1) {
                insertIndex = foundIdx;
            }
        }

        const prevCard = insertIndex > 0 ? columnTasks[insertIndex - 1] : null;
        const nextCard = insertIndex < columnTasks.length ? columnTasks[insertIndex] : null;

        const prevRank = prevCard ? prevCard.rank : null;
        const nextRank = nextCard ? nextCard.rank : null;

        // Backup state for rollback
        const backupTasks = [...tasks];

        // Optimistic state update
        const updatedTasks = tasks.map((t) => {
            if (t.id === taskId) {
                return {
                    ...t,
                    status_id: targetStatusId,
                    version: t.version + 1,
                };
            }
            return t;
        });
        setTasks(updatedTasks);
        setDraggedTaskId(null);
        setDragOverStatusId(null);
        setDragOverTargetTaskId(null);

        // Send move request with expected_version
        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(`/projects/${project.id}/tasks/${taskId}/move`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    target_status_id: targetStatusId,
                    prev_rank: prevRank,
                    next_rank: nextRank,
                    expected_version: currentTask.version,
                }),
            });

            if (res.status === 409) {
                // 409 Conflict: Rollback and notify
                const errorData = await res.json();
                setTasks(backupTasks);
                setErrorMessage(
                    errorData?.error?.message ||
                        'Konflik versi: Tugas telah diperbarui oleh pengguna lain. Memuat ulang papan...'
                );
                setTimeout(() => {
                    router.reload();
                }, 1500);
            } else if (!res.ok) {
                setTasks(backupTasks);
                setErrorMessage('Gagal memindahkan tugas.');
            } else {
                const data = await res.json();
                // Update with server verified rank and version
                setTasks((prev) =>
                    prev.map((t) => (t.id === taskId ? { ...t, rank: data.task.rank, version: data.task.version } : t))
                );
            }
        } catch {
            setTasks(backupTasks);
            setErrorMessage('Terjadi gangguan jaringan saat memindahkan tugas.');
        }
    };

    const handleTaskClick = async (task: BoardTask) => {
        try {
            const res = await fetch(`/projects/${project.id}/tasks/${task.id}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedTask(data.task);
                setDetailDrawerOpen(true);
            }
        } catch {
            setSelectedTask(task as unknown as TaskDetailData);
            setDetailDrawerOpen(true);
        }
    };

    const openCreateWithStatus = (statusId: string) => {
        setCreateModalDefaultStatusId(statusId);
        setCreateModalOpen(true);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug': return <Bug className="h-3.5 w-3.5 text-red-500" />;
            case 'story': return <Bookmark className="h-3.5 w-3.5 text-emerald-500" />;
            case 'epic': return <Layers className="h-3.5 w-3.5 text-purple-500" />;
            default: return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />;
        }
    };

    const getPriorityBorder = (p: string) => {
        switch (p) {
            case 'highest': return 'border-l-4 border-l-red-500';
            case 'high': return 'border-l-4 border-l-orange-500';
            case 'medium': return 'border-l-4 border-l-amber-500';
            case 'low': return 'border-l-4 border-l-blue-500';
            default: return 'border-l-4 border-l-slate-400';
        }
    };

    return (
        <AppLayout>
            <Head title={`Papan Kanban - ${project.name}`} />

            <div className="space-y-6 pb-12">
                {/* Header & Tabs */}
                <div className="border-b border-border pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: project.color }} />
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {project.name}
                                </h1>
                                <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                                    {project.key}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Papan alur kerja visual interaktif dengan kendali batas WIP dan pembaruan ranking real-time.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => openCreateWithStatus(statuses[0]?.id)}
                                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-md"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Buat Task</span>
                            </Button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-6 overflow-x-auto border-t border-border/60 pt-3">
                        <Link
                            href={`/projects/${project.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            <span>Ringkasan</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/board`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary transition-colors"
                        >
                            <Columns3 className="h-3.5 w-3.5" />
                            <span>Papan Kanban</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/backlog`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Backlog & Sprints</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/tasks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>Daftar Tugas</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/dependencies`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            <span>Graf Dependensi</span>
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

                {/* Error Banner if Concurrency Conflict */}
                {errorMessage && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">{errorMessage}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setErrorMessage(null)}
                            className="h-7 text-xs"
                        >
                            Tutup
                        </Button>
                    </div>
                )}

                {/* Filter Toolbar */}
                <div className="p-3 rounded-xl bg-card border border-border flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari tugas di papan..."
                            className="pl-8 text-xs h-8 bg-background"
                        />
                    </div>

                    <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                        <SelectTrigger className="w-[150px] text-xs h-8 bg-background">
                            <SelectValue placeholder="Semua Anggota" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Semua Anggota</SelectItem>
                            {members.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)} className="text-xs">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger className="w-[140px] text-xs h-8 bg-background">
                            <SelectValue placeholder="Prioritas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Semua Prioritas</SelectItem>
                            <SelectItem value="highest" className="text-xs text-red-500">🔴 Highest</SelectItem>
                            <SelectItem value="high" className="text-xs text-orange-500">🟠 High</SelectItem>
                            <SelectItem value="medium" className="text-xs text-amber-500">🟡 Medium</SelectItem>
                            <SelectItem value="low" className="text-xs text-blue-500">🔵 Low</SelectItem>
                            <SelectItem value="lowest" className="text-xs text-slate-400">⚪ Lowest</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-[130px] text-xs h-8 bg-background">
                            <SelectValue placeholder="Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">Semua Tipe</SelectItem>
                            <SelectItem value="task" className="text-xs">Task</SelectItem>
                            <SelectItem value="bug" className="text-xs">Bug</SelectItem>
                            <SelectItem value="story" className="text-xs">Story</SelectItem>
                            <SelectItem value="epic" className="text-xs">Epic</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Multi-Column Kanban Board */}
                <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[calc(100vh-320px)]">
                    {statuses.map((status) => {
                        const columnTasks = filteredTasks.filter((t) => t.status_id === status.id);
                        const isOverWip = status.wip_limit ? columnTasks.length > status.wip_limit : false;
                        const isAtWip = status.wip_limit ? columnTasks.length === status.wip_limit : false;
                        const isDragTarget = dragOverStatusId === status.id;

                        return (
                            <div
                                key={status.id}
                                onDragOver={(e) => handleDragOver(e, status.id)}
                                onDrop={(e) => handleDrop(e, status.id)}
                                className={`w-80 shrink-0 rounded-xl border flex flex-col max-h-[calc(100vh-260px)] transition-all ${
                                    isDragTarget
                                        ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
                                        : 'bg-muted/40 border-border/80'
                                }`}
                            >
                                {/* Column Header */}
                                <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-card/60 rounded-t-xl backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: status.color }}
                                        />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground truncate max-w-[140px]">
                                            {status.name}
                                        </h3>
                                        <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1.5 font-bold">
                                            {columnTasks.length}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {/* WIP limit warning pill */}
                                        {status.wip_limit && (
                                            <span
                                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                                    isOverWip
                                                        ? 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse'
                                                        : isAtWip
                                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                                        : 'bg-muted text-muted-foreground border border-border/60'
                                                }`}
                                            >
                                                {isOverWip && <AlertTriangle className="h-3 w-3" />}
                                                WIP: {columnTasks.length}/{status.wip_limit}
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => openCreateWithStatus(status.id)}
                                            className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                            title="Tambah Tugas di kolom ini"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Column Task List */}
                                <div className="p-2.5 overflow-y-auto flex-1 space-y-2.5 min-h-[120px]">
                                    {columnTasks.length === 0 ? (
                                        <div className="h-24 flex items-center justify-center border border-dashed border-border/60 rounded-lg text-center p-3">
                                            <p className="text-[11px] text-muted-foreground/60 italic">
                                                Tarik kartu ke sini
                                            </p>
                                        </div>
                                    ) : (
                                        columnTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                onDragOver={(e) => handleDragOver(e, status.id, task.id)}
                                                onClick={() => handleTaskClick(task)}
                                                className={`p-3 rounded-lg bg-card border border-border/80 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 group ${getPriorityBorder(
                                                    task.priority
                                                )} ${
                                                    draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100'
                                                }`}
                                            >
                                                {/* Card Header: Type, Key, Points */}
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {getTypeIcon(task.type)}
                                                        <span className="font-mono text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                                            {task.key}
                                                        </span>
                                                    </div>

                                                    {task.estimate_points !== null && (
                                                        <Badge variant="outline" className="font-mono text-[9px] py-0 px-1 text-muted-foreground">
                                                            {task.estimate_points} pts
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Card Title */}
                                                <p className="text-xs font-semibold text-foreground line-clamp-2 mb-2.5 leading-snug">
                                                    {task.title}
                                                </p>

                                                {/* Card Footer: Due Date & Assignees */}
                                                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                                                    <div className="flex items-center gap-2">
                                                        {task.subtasks_count > 0 && (
                                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                                                <CheckSquare className="h-3 w-3" />
                                                                {task.subtasks_count}
                                                            </span>
                                                        )}

                                                        {task.due_date_formatted && (
                                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                {task.due_date_formatted}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Assignees */}
                                                    <div className="flex items-center -space-x-1">
                                                        {task.assignees.slice(0, 3).map((a) => (
                                                            <span
                                                                key={a.id}
                                                                title={a.name}
                                                                className="h-5 w-5 rounded-full bg-primary/20 text-primary border border-card flex items-center justify-center text-[9px] font-bold"
                                                            >
                                                                {a.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        ))}
                                                        {task.assignees.length > 3 && (
                                                            <span className="h-5 w-5 rounded-full bg-muted text-muted-foreground border border-card flex items-center justify-center text-[8px] font-bold">
                                                                +{task.assignees.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Column Footer: Quick Add Button */}
                                <div className="p-2 border-t border-border/60 bg-card/40 rounded-b-xl">
                                    <button
                                        type="button"
                                        onClick={() => openCreateWithStatus(status.id)}
                                        className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Tugas</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Task Modal */}
            <CreateTaskModal
                open={createModalOpen}
                onOpenChange={setCreateModalOpen}
                projectId={project.id}
                projectKey={project.key}
                statuses={statuses}
                members={members}
                labels={labels}
                defaultStatusId={createModalDefaultStatusId}
                onSuccess={() => router.reload()}
            />

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                open={detailDrawerOpen}
                onOpenChange={setDetailDrawerOpen}
                projectId={project.id}
                task={selectedTask}
                statuses={statuses}
                members={members}
                onTaskUpdated={() => router.reload()}
                onTaskDeleted={() => router.reload()}
            />
        </AppLayout>
    );
}
