import React, { useState, useMemo, useRef } from 'react';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    GitFork,
    Workflow,
    Flame,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Trash2,
    Search,
    ZoomIn,
    ZoomOut,
    Maximize2,
    RefreshCw,
    Sliders,
    Layers,
    LayoutDashboard,
    Columns3,
    ListTodo,
    Settings,
    ArrowRight,
    Zap,
    ShieldAlert,
    User,
    Calendar,
    Sparkles,
    CheckSquare,
    Bug,
    Bookmark,
} from 'lucide-react';

interface Member {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
}

interface WorkflowStatus {
    id: string;
    name: string;
    color: string;
    category: string;
    is_completed?: boolean;
}

interface Sprint {
    id: string;
    name: string;
    status: string;
}

interface TaskItem {
    id: string;
    key: string;
    title: string;
    type: string;
    status_id: string;
}

interface GraphNode {
    id: string;
    key: string;
    title: string;
    type: string;
    priority: string;
    estimate_points: number | null;
    start_date: string | null;
    due_date: string | null;
    is_milestone: boolean;
    status: {
        id: string;
        name: string;
        color: string;
        category: string;
        is_completed: boolean;
    };
    assignees: Member[];
    is_blocked: boolean;
    blocking_count: number;
    blocked_by_count: number;
    bottleneck_score: number;
    cpm: {
        duration: number;
        early_start: number;
        early_finish: number;
        late_start: number;
        late_finish: number;
        total_float: number;
        is_critical: boolean;
    };
    layout: {
        level: number;
        row: number;
        x: number;
        y: number;
    };
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    source_key?: string;
    target_key?: string;
    type: string;
    lag_days: number;
    is_critical: boolean;
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
        slug: string;
        type: string;
        color: string;
        icon: string;
    };
    graph: {
        nodes: GraphNode[];
        edges: GraphEdge[];
        metrics: {
            total_tasks: number;
            total_dependencies: number;
            critical_path_length_days: number;
            critical_tasks_count: number;
            blocked_tasks_count: number;
            project_makespan_days: number;
            has_cycles: boolean;
        };
        bottlenecks: GraphNode[];
    };
    filters: {
        status_id: string;
        sprint_id: string;
        priority: string;
        assignee_id: string;
    };
    statuses: WorkflowStatus[];
    sprints: Sprint[];
    members: Member[];
    all_tasks: TaskItem[];
}

export default function TaskDependencyPage({
    organization,
    project,
    graph,
    filters,
    statuses,
    sprints,
    members,
    all_tasks,
}: Props) {
    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(filters.status_id || 'all');
    const [selectedSprint, setSelectedSprint] = useState(filters.sprint_id || 'all');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(filters.assignee_id || 'all');
    const [onlyCriticalPath, setOnlyCriticalPath] = useState(false);

    // Canvas Zoom & Pan
    const [zoomScale, setZoomScale] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Add Dependency Modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [predecessorId, setPredecessorId] = useState('');
    const [successorId, setSuccessorId] = useState('');
    const [depType, setDepType] = useState('finish_to_start');
    const [lagDays, setLagDays] = useState(0);
    const [submittingDep, setSubmittingDep] = useState(false);
    const [depError, setDepError] = useState<string | null>(null);

    // Simulation Drawer State
    const [simulateDrawerOpen, setSimulateDrawerOpen] = useState(false);
    const [simulateTaskId, setSimulateTaskId] = useState('');
    const [simulateDelayDays, setSimulateDelayDays] = useState(5);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [simulating, setSimulating] = useState(false);

    // Selected Task Details Modal
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    // Handle filter reload
    const applyFilters = (key: string, value: string) => {
        const newFilters = {
            status_id: key === 'status_id' ? value : selectedStatus,
            sprint_id: key === 'sprint_id' ? value : selectedSprint,
            priority: key === 'priority' ? value : selectedPriority,
            assignee_id: key === 'assignee_id' ? value : selectedAssignee,
        };

        router.get(`/projects/${project.id}/dependencies`, newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Calculate node coordinates dynamically based on levels
    const { nodesByLevel, maxLevel, nodesMap } = useMemo(() => {
        const map = new Map<string, GraphNode>();
        const byLevel: Record<number, GraphNode[]> = {};
        let highestLevel = 0;

        graph.nodes.forEach((node) => {
            map.set(node.id, node);
            const lvl = node.layout.level || 0;
            if (lvl > highestLevel) highestLevel = lvl;
            if (!byLevel[lvl]) byLevel[lvl] = [];
            byLevel[lvl].push(node);
        });

        return { nodesByLevel: byLevel, maxLevel: highestLevel, nodesMap: map };
    }, [graph.nodes]);

    // Filtered visible nodes
    const visibleNodes = useMemo(() => {
        return graph.nodes.filter((node) => {
            if (onlyCriticalPath && !node.cpm.is_critical) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match = node.title.toLowerCase().includes(q) || node.key.toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [graph.nodes, onlyCriticalPath, searchQuery]);

    // Handle Create Dependency
    const handleCreateDependency = async (e: React.FormEvent) => {
        e.preventDefault();
        setDepError(null);

        if (!predecessorId || !successorId) {
            setDepError('Silakan pilih tugas prasyarat dan tugas penerus.');
            return;
        }

        if (predecessorId === successorId) {
            setDepError('Tugas tidak dapat bergantung pada dirinya sendiri.');
            return;
        }

        setSubmittingDep(true);

        try {
            const response = await fetch(`/projects/${project.id}/dependencies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    predecessor_id: predecessorId,
                    successor_id: successorId,
                    type: depType,
                    lag_days: Number(lagDays) || 0,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setDepError(data.message || 'Gagal menambahkan dependensi.');
            } else {
                setAddModalOpen(false);
                setPredecessorId('');
                setSuccessorId('');
                setLagDays(0);
                router.reload({ only: ['graph'] });
            }
        } catch (err: any) {
            setDepError(err?.message || 'Terjadi kesalahan jaringan.');
        } finally {
            setSubmittingDep(false);
        }
    };

    // Handle Delete Dependency
    const handleDeleteDependency = (edgeId: string) => {
        if (!confirm('Hapus hubungan dependensi ini?')) return;

        router.delete(`/projects/${project.id}/dependencies/${edgeId}`, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['graph'] });
            },
        });
    };

    // Handle Run Simulation
    const handleRunSimulation = async () => {
        if (!simulateTaskId) return;
        setSimulating(true);

        try {
            const response = await fetch(`/projects/${project.id}/dependencies/simulate-cascade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    task_id: simulateTaskId,
                    delay_days: Number(simulateDelayDays) || 1,
                }),
            });

            const data = await response.json();
            setSimulationResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSimulating(false);
        }
    };

    // Helper: getTypeIcon
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug':
                return <Bug className="h-3.5 w-3.5 text-red-500" />;
            case 'milestone':
                return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
            case 'epic':
                return <Bookmark className="h-3.5 w-3.5 text-amber-500" />;
            default:
                return <CheckSquare className="h-3.5 w-3.5 text-blue-500" />;
        }
    };

    return (
        <AppLayout>
            <Head title={`Graf Dependensi & CPM - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Header Card with Tabs */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm"
                                style={{ backgroundColor: `${project.color || '#6366f1'}20`, color: project.color || '#6366f1' }}
                            >
                                <Workflow className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                                        Graf Dependensi & CPM
                                    </h1>
                                    <Badge variant="outline" className="text-[11px] font-mono uppercase font-semibold">
                                        {project.key}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pemetaan jaringan alur dependensi tugas, identifikasi jalur kritis (Critical Path Method), dan simulasi cascading bottleneck.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSimulateDrawerOpen(true);
                                    if (graph.nodes[0]) setSimulateTaskId(graph.nodes[0].id);
                                }}
                                className="text-xs gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                <span>Simulasi Cascading Delay</span>
                            </Button>

                            <Button
                                onClick={() => {
                                    setDepError(null);
                                    setAddModalOpen(true);
                                }}
                                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-md"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Hubungkan Tugas</span>
                            </Button>
                        </div>
                    </div>

                    {/* Project Navigation Tabs */}
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
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary transition-colors"
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            <span>Graf Dependensi & CPM</span>
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

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Hubungan Dependensi</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <GitFork className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {graph.metrics.total_dependencies}
                            </span>
                            <span className="text-xs text-muted-foreground">relasi aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tersebar di {graph.metrics.total_tasks} total tugas proyek
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Panjang Jalur Kritis (CPM)</span>
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {graph.metrics.critical_path_length_days}
                            </span>
                            <span className="text-xs text-muted-foreground">hari kerja</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                            <span className="font-semibold text-red-500">{graph.metrics.critical_tasks_count} tugas</span> menentukan durasi rilis
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tugas Terblokir (Blocked)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {graph.metrics.blocked_tasks_count}
                            </span>
                            <span className="text-xs text-muted-foreground">tugas menunggu</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Membutuhkan prasyarat pendahulu selesai
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Peluang Bottleneck</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {graph.bottlenecks.length}
                            </span>
                            <span className="text-xs text-muted-foreground">tugas simpul utama</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tugas yang memblokir banyak item hilir
                        </div>
                    </div>
                </div>

                {/* Filter & Canvas Controls Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                        <div className="relative min-w-[200px] flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Cari task key atau judul..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        <Select
                            value={selectedStatus}
                            onValueChange={(val) => {
                                setSelectedStatus(val);
                                applyFilters('status_id', val);
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs w-[140px]">
                                <SelectValue placeholder="Semua Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                {statuses.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {sprints.length > 0 && (
                            <Select
                                value={selectedSprint}
                                onValueChange={(val) => {
                                    setSelectedSprint(val);
                                    applyFilters('sprint_id', val);
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs w-[140px]">
                                    <SelectValue placeholder="Semua Sprint" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Sprint</SelectItem>
                                    {sprints.map((sp) => (
                                        <SelectItem key={sp.id} value={sp.id}>
                                            {sp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            variant={onlyCriticalPath ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setOnlyCriticalPath(!onlyCriticalPath)}
                            className={`h-9 text-xs gap-1.5 ${
                                onlyCriticalPath
                                    ? 'bg-red-600 hover:bg-red-700 text-white font-semibold'
                                    : 'border-border text-foreground hover:bg-muted'
                            }`}
                        >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Sorot Jalur Kritis (CPM)</span>
                        </Button>
                    </div>

                    <div className="flex items-center gap-1.5 self-end md:self-auto border-l border-border pl-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.1))}
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-[11px] font-mono font-medium px-1 text-muted-foreground">
                            {Math.round(zoomScale * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setZoomScale(Math.min(1.4, zoomScale + 0.1))}
                            title="Zoom In"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setZoomScale(1)}
                            title="Reset Zoom"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Topological Network Diagram Canvas */}
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-border/80 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">Diagram Alur Jaringan Kerja (DAG Layout)</span>
                            <span className="text-[11px] text-muted-foreground">
                                • Disusun otomatis dari prasyarat hulu ke deliverable hilir
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                                <span>Jalur Kritis (Float = 0)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                <span>Terblokir</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                                <span>Alur Reguler</span>
                            </div>
                        </div>
                    </div>

                    <div
                        ref={canvasRef}
                        className="relative p-8 overflow-x-auto overflow-y-auto min-h-[540px] bg-dot-pattern"
                    >
                        {graph.nodes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 text-center">
                                <div className="p-4 rounded-2xl bg-muted text-muted-foreground mb-3">
                                    <Workflow className="h-8 w-8" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">Belum ada tugas atau dependensi</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    Mulai buat tugas baru atau hubungkan tugas yang sudah ada untuk membentuk graf alur kerja.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="transition-transform duration-200 origin-top-left"
                                style={{ transform: `scale(${zoomScale})` }}
                            >
                                {/* Multi-column topological levels grid */}
                                <div className="flex gap-16 items-start pb-8">
                                    {Array.from({ length: maxLevel + 1 }).map((_, levelIndex) => {
                                        const nodesInCol = (nodesByLevel[levelIndex] || []).filter((node) => {
                                            if (onlyCriticalPath && !node.cpm.is_critical) return false;
                                            if (searchQuery) {
                                                const q = searchQuery.toLowerCase();
                                                return node.title.toLowerCase().includes(q) || node.key.toLowerCase().includes(q);
                                            }
                                            return true;
                                        });

                                        return (
                                            <div
                                                key={levelIndex}
                                                className="w-72 shrink-0 flex flex-col gap-4 relative"
                                            >
                                                {/* Level Header Pill */}
                                                <div className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                                    <span>
                                                        {levelIndex === 0
                                                            ? 'Level 0: Prasyarat Hulu'
                                                            : `Level ${levelIndex}: Dependensi`}
                                                    </span>
                                                    <span className="font-mono bg-background/80 px-1.5 py-0.5 rounded-md text-[10px]">
                                                        {nodesInCol.length} node
                                                    </span>
                                                </div>

                                                {/* Node Cards */}
                                                <div className="flex flex-col gap-4">
                                                    {nodesInCol.map((node) => {
                                                        const isCritical = node.cpm.is_critical;
                                                        const isBlocked = node.is_blocked;

                                                        return (
                                                            <div
                                                                key={node.id}
                                                                onClick={() => setSelectedNode(node)}
                                                                className={`group rounded-2xl border p-4 shadow-sm bg-card hover:shadow-md transition-all cursor-pointer relative ${
                                                                    isCritical
                                                                        ? 'border-red-500/70 dark:border-red-500/80 shadow-red-500/10 ring-1 ring-red-500/20'
                                                                        : isBlocked
                                                                        ? 'border-amber-500/60 dark:border-amber-500/70 shadow-amber-500/10'
                                                                        : 'border-border hover:border-primary/50'
                                                                }`}
                                                            >
                                                                {/* Critical or Blocked Tag */}
                                                                {isCritical && (
                                                                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                                                                        <Flame className="h-2.5 w-2.5" />
                                                                        <span>CRITICAL PATH</span>
                                                                    </div>
                                                                )}
                                                                {!isCritical && isBlocked && (
                                                                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-bold tracking-wider flex items-center gap-1 shadow-xs">
                                                                        <ShieldAlert className="h-2.5 w-2.5" />
                                                                        <span>TERBLOKIR</span>
                                                                    </div>
                                                                )}

                                                                {/* Task Header */}
                                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        {getTypeIcon(node.type)}
                                                                        <span className="font-mono text-xs font-bold text-foreground">
                                                                            {node.key}
                                                                        </span>
                                                                    </div>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] px-1.5 py-0 rounded-md font-medium"
                                                                        style={{
                                                                            backgroundColor: `${node.status.color}15`,
                                                                            color: node.status.color,
                                                                        }}
                                                                    >
                                                                        {node.status.name}
                                                                    </Badge>
                                                                </div>

                                                                {/* Title */}
                                                                <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed mb-3">
                                                                    {node.title}
                                                                </h4>

                                                                {/* CPM Metrics Strip */}
                                                                <div className="grid grid-cols-3 gap-1 p-2 rounded-xl bg-muted/40 border border-border/50 text-[10px] mb-3">
                                                                    <div>
                                                                        <span className="text-muted-foreground block">Durasi</span>
                                                                        <span className="font-semibold text-foreground">{node.cpm.duration}h</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-muted-foreground block">ES / EF</span>
                                                                        <span className="font-semibold text-foreground">+{node.cpm.early_start} / +{node.cpm.early_finish}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-muted-foreground block">Float</span>
                                                                        <span className={`font-semibold ${node.cpm.total_float === 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                                            {node.cpm.total_float}h
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Footer: Assignees & Connection Count */}
                                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                                                    <div className="flex items-center gap-1">
                                                                        {node.assignees.length > 0 ? (
                                                                            <span className="text-foreground font-medium truncate max-w-[120px]">
                                                                                {node.assignees[0].name}
                                                                                {node.assignees.length > 1 && ` +${node.assignees.length - 1}`}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground italic">Belum ditugaskan</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-2 font-mono text-[10px]">
                                                                        {node.blocked_by_count > 0 && (
                                                                            <span title="Dibutuhkan oleh tugas ini" className="text-blue-500">
                                                                                ←{node.blocked_by_count}
                                                                            </span>
                                                                        )}
                                                                        {node.blocking_count > 0 && (
                                                                            <span title="Memblokir tugas lain" className="text-purple-500 font-bold">
                                                                                →{node.blocking_count}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Dependency Relations Table */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Daftar Relasi Dependensi Aktif</h3>
                            <p className="text-xs text-muted-foreground">
                                Rincian tautan prasyarat antar tugas dalam proyek {project.name}.
                            </p>
                        </div>
                        <Badge variant="outline" className="text-xs font-semibold">
                            {graph.edges.length} Tautan
                        </Badge>
                    </div>

                    {graph.edges.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            Belum ada hubungan dependensi yang dibuat.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">Tugas Prasyarat (Predecessor)</th>
                                        <th className="py-3 px-4">Tipe Hubungan</th>
                                        <th className="py-3 px-4">Tugas Penerus (Successor)</th>
                                        <th className="py-3 px-4">Lag (Jeda Waktu)</th>
                                        <th className="py-3 px-4">Status Jalur Kritis</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {graph.edges.map((edge) => {
                                        const predNode = nodesMap.get(edge.source);
                                        const succNode = nodesMap.get(edge.target);

                                        return (
                                            <tr key={edge.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-primary">{edge.source_key}</span>
                                                        <span className="text-muted-foreground truncate max-w-[200px]">
                                                            {predNode?.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                        {edge.type}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-foreground">{edge.target_key}</span>
                                                        <span className="text-muted-foreground truncate max-w-[200px]">
                                                            {succNode?.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">
                                                    {edge.lag_days > 0 ? `+${edge.lag_days} hari` : '0 hari'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {edge.is_critical ? (
                                                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-semibold">
                                                            Critical Path Link
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px]">Normal</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteDependency(edge.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Tambah Dependensi */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GitFork className="h-5 w-5 text-primary" />
                            <span>Hubungkan Dependensi Tugas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan tugas prasyarat yang harus diselesaikan sebelum tugas penerus dapat dimulai.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDependency} className="space-y-4 pt-2">
                        {depError && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{depError}</span>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                1. Tugas Prasyarat (Predecessor / Blocker)
                            </label>
                            <Select value={predecessorId} onValueChange={setPredecessorId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih tugas prasyarat..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {all_tasks.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>
                                            [{task.key}] {task.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                                Tugas ini harus selesai terlebih dahulu.
                            </span>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                2. Tugas Penerus (Successor / Dependent)
                            </label>
                            <Select value={successorId} onValueChange={setSuccessorId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih tugas penerus..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {all_tasks.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>
                                            [{task.key}] {task.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                                Tugas ini akan menunggu tugas prasyarat di atas.
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tipe Relasi
                                </label>
                                <Select value={depType} onValueChange={setDepType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="finish_to_start">Finish to Start (Blokir)</SelectItem>
                                        <SelectItem value="start_to_start">Start to Start</SelectItem>
                                        <SelectItem value="finish_to_finish">Finish to Finish</SelectItem>
                                        <SelectItem value="start_to_finish">Start to Finish</SelectItem>
                                        <SelectItem value="relates_to">Relates To</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Lag Time (Hari)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={lagDays}
                                    onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                                    className="h-9 text-xs"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingDep}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingDep ? 'Menyimpan...' : 'Simpan Hubungan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Node Detail Quick View */}
            {selectedNode && (
                <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                    {selectedNode.key}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                    style={{
                                        backgroundColor: `${selectedNode.status.color}20`,
                                        color: selectedNode.status.color,
                                    }}
                                >
                                    {selectedNode.status.name}
                                </Badge>
                            </div>
                            <DialogTitle className="text-base font-bold text-foreground mt-2">
                                {selectedNode.title}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Durasi Estimasi:</span>
                                    <span className="font-semibold text-foreground">{selectedNode.cpm.duration} hari</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Total Float (Slack):</span>
                                    <span className={`font-semibold ${selectedNode.cpm.total_float === 0 ? 'text-red-500 font-bold' : 'text-foreground'}`}>
                                        {selectedNode.cpm.total_float} hari {selectedNode.cpm.total_float === 0 && '(Kritis!)'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Early Start / Finish:</span>
                                    <span className="font-mono text-foreground">+{selectedNode.cpm.early_start}d / +{selectedNode.cpm.early_finish}d</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Late Start / Finish:</span>
                                    <span className="font-mono text-foreground">+{selectedNode.cpm.late_start}d / +{selectedNode.cpm.late_finish}d</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-muted-foreground pt-1">
                                <span>Status Pemblokiran:</span>
                                <span className="font-semibold text-foreground">
                                    Memblokir {selectedNode.blocking_count} tugas hilir
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedNode(null)}
                                className="text-xs"
                            >
                                Tutup
                            </Button>
                            <Button
                                onClick={() => {
                                    setSimulateTaskId(selectedNode.id);
                                    setSelectedNode(null);
                                    setSimulateDrawerOpen(true);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                <span>Simulasi Keterlambatan</span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal: Simulasi Cascading Delay */}
            <Dialog open={simulateDrawerOpen} onOpenChange={setSimulateDrawerOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            <span>Simulasi Keterlambatan (Cascading Delay)</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Hitung efek domino apabila suatu tugas prasyarat mengalami keterlambatan durasi terhadap seluruh milestone proyek.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tugas Penyebab Keterlambatan (Root Task)
                            </label>
                            <Select value={simulateTaskId} onValueChange={setSimulateTaskId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih tugas..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {all_tasks.map((task) => (
                                        <SelectItem key={task.id} value={task.id}>
                                            [{task.key}] {task.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Durasi Keterlambatan:
                                </label>
                                <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                                    +{simulateDelayDays} hari
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={30}
                                value={simulateDelayDays}
                                onChange={(e) => setSimulateDelayDays(Number(e.target.value))}
                                className="w-full accent-amber-500 cursor-pointer"
                            />
                        </div>

                        <Button
                            onClick={handleRunSimulation}
                            disabled={simulating || !simulateTaskId}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
                        >
                            {simulating ? 'Menghitung Dampak...' : 'Jalankan Simulasi Dampak'}
                        </Button>

                        {/* Simulation Results */}
                        {simulationResult && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>{simulationResult.message}</span>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {simulationResult.affected_tasks.map((task: any) => (
                                        <div
                                            key={task.id}
                                            className="p-2.5 rounded-lg bg-card/80 border border-border/60 text-xs flex items-center justify-between"
                                        >
                                            <div>
                                                <span className="font-mono font-bold text-foreground mr-1.5">
                                                    {task.key}
                                                </span>
                                                <span className="text-muted-foreground truncate inline-block max-w-[180px] align-bottom">
                                                    {task.title}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-muted-foreground line-through mr-1.5">
                                                    {task.original_due_date}
                                                </span>
                                                <span className="font-mono font-bold text-red-500 text-xs">
                                                    → {task.projected_due_date}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSimulateDrawerOpen(false);
                                setSimulationResult(null);
                            }}
                            className="text-xs"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
