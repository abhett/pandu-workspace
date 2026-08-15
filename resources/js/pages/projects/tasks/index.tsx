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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    CheckCircle2,
    Bug,
    Bookmark,
    Layers,
    Plus,
    Search,
    Filter,
    LayoutDashboard,
    Columns3,
    ListTodo,
    Settings,
    MoreVertical,
    Calendar,
    Hash,
    ArrowUpDown,
    CheckSquare,
    AlertCircle,
    RotateCcw,
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
    is_initial?: boolean;
    is_completed?: boolean;
    wip_limit?: number | null;
}

interface TaskItem {
    id: string;
    key: string;
    title: string;
    description: string | null;
    type: string;
    priority: string;
    estimate_points: number | null;
    due_date: string | null;
    due_date_formatted?: string | null;
    completed_at?: string | null;
    rank: string;
    version: number;
    subtasks_count: number;
    created_at: string;
    status: WorkflowStatus;
    assignees: Member[];
    labels: { id: string; name: string; color: string }[];
    creator: { id: number; name: string } | null;
}

interface PaginatedTasks {
    data: TaskItem[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
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
    tasks: PaginatedTasks;
    statuses: WorkflowStatus[];
    members: Member[];
    labels: { id: string; name: string; color: string }[];
    filters: {
        search: string | null;
        type: string | null;
        priority: string | null;
        status_id: string | null;
        assignee_id: number | null;
        sort: string;
        dir: string;
    };
    stats: {
        total: number;
        in_progress: number;
        completed: number;
        high_priority: number;
    };
}

export default function TaskIndexPage({
    project,
    tasks,
    statuses,
    members,
    labels,
    filters,
    stats,
}: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<TaskDetailData | null>(null);

    const [search, setSearch] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(
        filters.assignee_id ? String(filters.assignee_id) : 'all'
    );

    const applyFilters = (overrides: Record<string, any> = {}) => {
        const query: Record<string, any> = {
            search: search || undefined,
            type: selectedType !== 'all' ? selectedType : undefined,
            priority: selectedPriority !== 'all' ? selectedPriority : undefined,
            status_id: selectedStatus !== 'all' ? selectedStatus : undefined,
            assignee_id: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            ...overrides,
        };

        router.get(`/projects/${project.id}/tasks`, query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const resetFilters = () => {
        setSearch('');
        setSelectedType('all');
        setSelectedPriority('all');
        setSelectedStatus('all');
        setSelectedAssignee('all');
        router.get(`/projects/${project.id}/tasks`, {}, { preserveState: true });
    };

    const handleTaskClick = async (task: TaskItem) => {
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug': return <Bug className="h-4 w-4 text-red-500" />;
            case 'story': return <Bookmark className="h-4 w-4 text-emerald-500" />;
            case 'epic': return <Layers className="h-4 w-4 text-purple-500" />;
            default: return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'highest': return <span className="text-xs font-semibold text-red-500">🔴 Highest</span>;
            case 'high': return <span className="text-xs font-semibold text-orange-500">🟠 High</span>;
            case 'medium': return <span className="text-xs font-medium text-amber-500">🟡 Medium</span>;
            case 'low': return <span className="text-xs font-medium text-blue-500">🔵 Low</span>;
            default: return <span className="text-xs font-normal text-slate-400">⚪ Lowest</span>;
        }
    };

    return (
        <AppLayout>
            <Head title={`Daftar Tugas - ${project.name}`} />

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
                                Kelola daftar pekerjaan, backlog, prioritas, dan penugasan tim.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setCreateModalOpen(true)}
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Columns3 className="h-3.5 w-3.5" />
                            <span>Papan Kanban</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/tasks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary transition-colors"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>Daftar Tugas</span>
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

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Tugas</p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{stats.total}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <ListTodo className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Dalam Pengerjaan</p>
                            <p className="text-2xl font-bold text-amber-500 mt-0.5">{stats.in_progress}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <ArrowUpDown className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Selesai</p>
                            <p className="text-2xl font-bold text-emerald-500 mt-0.5">{stats.completed}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Prioritas Tinggi</p>
                            <p className="text-2xl font-bold text-red-500 mt-0.5">{stats.high_priority}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        {/* Search */}
                        <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari judul, key, deskripsi..."
                                className="pl-9 text-xs bg-background"
                            />
                        </form>

                        {/* Status Filter */}
                        <Select
                            value={selectedStatus}
                            onValueChange={(val) => {
                                setSelectedStatus(val);
                                applyFilters({ status_id: val !== 'all' ? val : undefined });
                            }}
                        >
                            <SelectTrigger className="text-xs bg-background">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                                {statuses.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            <span>{s.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Priority Filter */}
                        <Select
                            value={selectedPriority}
                            onValueChange={(val) => {
                                setSelectedPriority(val);
                                applyFilters({ priority: val !== 'all' ? val : undefined });
                            }}
                        >
                            <SelectTrigger className="text-xs bg-background">
                                <SelectValue placeholder="Semua Prioritas" />
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

                        {/* Type Filter */}
                        <Select
                            value={selectedType}
                            onValueChange={(val) => {
                                setSelectedType(val);
                                applyFilters({ type: val !== 'all' ? val : undefined });
                            }}
                        >
                            <SelectTrigger className="text-xs bg-background">
                                <SelectValue placeholder="Semua Tipe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">Semua Tipe</SelectItem>
                                <SelectItem value="task" className="text-xs">Task</SelectItem>
                                <SelectItem value="bug" className="text-xs">Bug</SelectItem>
                                <SelectItem value="story" className="text-xs">Story</SelectItem>
                                <SelectItem value="epic" className="text-xs">Epic</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset Filter Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Reset Filter</span>
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                                <tr>
                                    <th className="py-3 px-4 w-12">Tipe</th>
                                    <th className="py-3 px-4 w-28">Key</th>
                                    <th className="py-3 px-4">Judul Tugas</th>
                                    <th className="py-3 px-4 w-36">Status</th>
                                    <th className="py-3 px-4 w-28">Prioritas</th>
                                    <th className="py-3 px-4 w-24 text-center">Poin</th>
                                    <th className="py-3 px-4 w-32">Tenggat</th>
                                    <th className="py-3 px-4 w-36">Assignee</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {tasks.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                                            Tidak ada tugas yang sesuai dengan filter pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.data.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => handleTaskClick(t)}
                                            className="hover:bg-muted/40 cursor-pointer transition-colors group"
                                        >
                                            {/* Type */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center">
                                                    {getTypeIcon(t.type)}
                                                </div>
                                            </td>

                                            {/* Key */}
                                            <td className="py-3 px-4 font-mono font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                                {t.key}
                                            </td>

                                            {/* Title & Subtasks pill */}
                                            <td className="py-3 px-4 font-medium text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span>{t.title}</span>
                                                    {t.subtasks_count > 0 && (
                                                        <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 gap-1">
                                                            <CheckSquare className="h-2.5 w-2.5" />
                                                            <span>{t.subtasks_count}</span>
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.status.color }} />
                                                    <span className="font-medium text-foreground">{t.status.name}</span>
                                                </div>
                                            </td>

                                            {/* Priority */}
                                            <td className="py-3 px-4">
                                                {getPriorityBadge(t.priority)}
                                            </td>

                                            {/* Estimate Points */}
                                            <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                                                {t.estimate_points !== null ? t.estimate_points : '-'}
                                            </td>

                                            {/* Due Date */}
                                            <td className="py-3 px-4 text-muted-foreground">
                                                {t.due_date_formatted ? (
                                                    <div className="flex items-center gap-1 text-[11px]">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{t.due_date_formatted}</span>
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Assignees Avatars */}
                                            <td className="py-3 px-4">
                                                {t.assignees.length > 0 ? (
                                                    <div className="flex items-center -space-x-1.5">
                                                        {t.assignees.slice(0, 3).map((a) => (
                                                            <span
                                                                key={a.id}
                                                                title={a.name}
                                                                className="h-6 w-6 rounded-full bg-primary/20 text-primary border-2 border-card flex items-center justify-center text-[10px] font-bold"
                                                            >
                                                                {a.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        ))}
                                                        {t.assignees.length > 3 && (
                                                            <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground border-2 border-card flex items-center justify-center text-[9px] font-semibold">
                                                                +{t.assignees.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic text-[11px]">Unassigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tasks.last_page > 1 && (
                        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                Menampilkan {tasks.from} - {tasks.to} dari {tasks.total} tugas
                            </span>
                            <div className="flex gap-1">
                                {Array.from({ length: tasks.last_page }).map((_, i) => (
                                    <Button
                                        key={i}
                                        variant={tasks.current_page === i + 1 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => applyFilters({ page: i + 1 })}
                                        className="h-7 w-7 p-0 text-xs"
                                    >
                                        {i + 1}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
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
                onSuccess={() => applyFilters()}
            />

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                open={detailDrawerOpen}
                onOpenChange={setDetailDrawerOpen}
                projectId={project.id}
                task={selectedTask}
                statuses={statuses}
                members={members}
                onTaskUpdated={() => applyFilters()}
                onTaskDeleted={() => applyFilters()}
            />
        </AppLayout>
    );
}
