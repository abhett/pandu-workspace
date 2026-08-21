import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
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
    Target,
    GitCommit,
    CheckCircle2,
    Clock,
    Plus,
    Flame,
    TrendingUp,
    Sparkles,
    Users,
    Activity,
    Layers,
    ArrowRight,
    HelpCircle,
    Info,
    Trash2,
    Edit3,
    Check,
    ChevronDown,
    ChevronRight,
    Link2,
    Unlink,
    Sliders,
    Building2,
    FolderKanban,
    Award,
    Shield,
} from 'lucide-react';

interface ProjectInfo {
    id: string;
    key: string;
    name: string;
}

interface MemberInfo {
    id: number;
    name: string;
    email: string;
}

interface LinkedTask {
    id: string;
    key: string;
    title: string;
    priority: string;
    is_completed: boolean;
    status_name: string;
    status_color: string;
    project_key?: string;
}

interface KeyResultItem {
    id: string;
    objective_id: string;
    title: string;
    metric_type: 'percentage' | 'numeric' | 'currency' | 'boolean';
    initial_value: number;
    current_value: number;
    target_value: number;
    unit: string | null;
    weight: number;
    status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
    progress_pct: number;
    owner: { id: number; name: string } | null;
    linked_tasks: LinkedTask[];
    linked_tasks_count: number;
    tasks_completion_pct: number;
}

interface ObjectiveNode {
    id: string;
    parent_id: string | null;
    project_id: string | null;
    title: string;
    description: string | null;
    level: 'company' | 'department' | 'team' | 'project';
    period: string;
    status: 'on_track' | 'at_risk' | 'behind' | 'achieved' | 'draft';
    confidence_score: number;
    progress_pct: number;
    owner: { id: number; name: string } | null;
    project: { id: string; key: string; name: string } | null;
    key_results: KeyResultItem[];
    children: ObjectiveNode[];
}

interface Metrics {
    total_objectives: number;
    avg_progress_pct: number;
    on_track_count: number;
    at_risk_count: number;
    behind_count: number;
    achieved_count: number;
    total_key_results: number;
    alignment_score: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    tree: ObjectiveNode[];
    flat_objectives: ObjectiveNode[];
    periods: string[];
    current_period: string;
    projects: ProjectInfo[];
    members: MemberInfo[];
}

export default function OkrAlignmentTreePage({
    organization,
    metrics,
    tree,
    flat_objectives,
    periods,
    current_period,
    projects,
    members,
}: Props) {
    const [selectedPeriod, setSelectedPeriod] = useState(current_period);
    const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

    // Objective Modal state
    const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
    const [editingObjective, setEditingObjective] = useState<ObjectiveNode | null>(null);
    const [objTitle, setObjTitle] = useState('');
    const [objDescription, setObjDescription] = useState('');
    const [objLevel, setObjLevel] = useState<'company' | 'department' | 'team' | 'project'>('company');
    const [objPeriod, setObjPeriod] = useState(selectedPeriod);
    const [objParentId, setObjParentId] = useState<string>('none');
    const [objProjectId, setObjProjectId] = useState<string>('none');
    const [objOwnerId, setObjOwnerId] = useState<string>('none');
    const [objConfidence, setObjConfidence] = useState('0.8');
    const [isSavingObjective, setIsSavingObjective] = useState(false);

    // Key Result Modal state
    const [krModalOpen, setKrModalOpen] = useState(false);
    const [parentObjectiveForKr, setParentObjectiveForKr] = useState<ObjectiveNode | null>(null);
    const [editingKr, setEditingKr] = useState<KeyResultItem | null>(null);
    const [krTitle, setKrTitle] = useState('');
    const [krMetricType, setKrMetricType] = useState<'percentage' | 'numeric' | 'currency' | 'boolean'>('percentage');
    const [krInitialValue, setKrInitialValue] = useState('0');
    const [krCurrentValue, setKrCurrentValue] = useState('0');
    const [krTargetValue, setKrTargetValue] = useState('100');
    const [krUnit, setKrUnit] = useState('%');
    const [krWeight, setKrWeight] = useState('1.0');
    const [krOwnerId, setKrOwnerId] = useState('none');
    const [isSavingKr, setIsSavingKr] = useState(false);

    // Link Task Modal state
    const [linkTaskModalOpen, setLinkTaskModalOpen] = useState(false);
    const [selectedKrForLinking, setSelectedKrForLinking] = useState<KeyResultItem | null>(null);
    const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<string>('none');
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [projectTasksList, setProjectTasksList] = useState<Array<{ id: string; key: string; title: string }>>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [isLinkingTask, setIsLinkingTask] = useState(false);

    const toggleCollapse = (id: string) => {
        setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePeriodChange = (val: string) => {
        setSelectedPeriod(val);
        router.get('/organization/okrs/tree', { period: val }, { preserveState: true });
    };

    const openCreateObjective = (parentId?: string, level?: 'company' | 'department' | 'team' | 'project') => {
        setEditingObjective(null);
        setObjTitle('');
        setObjDescription('');
        setObjLevel(level || (parentId ? 'department' : 'company'));
        setObjPeriod(selectedPeriod === 'all' ? '2026-Q1' : selectedPeriod);
        setObjParentId(parentId || 'none');
        setObjProjectId('none');
        setObjOwnerId(members[0]?.id ? members[0].id.toString() : 'none');
        setObjConfidence('0.8');
        setObjectiveModalOpen(true);
    };

    const openEditObjective = (obj: ObjectiveNode) => {
        setEditingObjective(obj);
        setObjTitle(obj.title);
        setObjDescription(obj.description || '');
        setObjLevel(obj.level);
        setObjPeriod(obj.period);
        setObjParentId(obj.parent_id || 'none');
        setObjProjectId(obj.project_id || 'none');
        setObjOwnerId(obj.owner?.id ? obj.owner.id.toString() : 'none');
        setObjConfidence(obj.confidence_score.toString());
        setObjectiveModalOpen(true);
    };

    const handleSaveObjective = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingObjective(true);

        const payload = {
            title: objTitle,
            description: objDescription,
            level: objLevel,
            period: objPeriod,
            parent_id: objParentId === 'none' ? null : objParentId,
            project_id: objProjectId === 'none' ? null : objProjectId,
            owner_id: objOwnerId === 'none' ? null : Number(objOwnerId),
            confidence_score: Number(objConfidence),
        };

        const url = editingObjective
            ? `/organization/okrs/objectives/${editingObjective.id}`
            : '/organization/okrs/objectives';
        const method = editingObjective ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingObjective(false);
                setObjectiveModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingObjective(false));
    };

    const handleDeleteObjective = (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus sasaran strategis ini beserta seluruh Key Results di bawahnya?')) return;
        fetch(`/organization/okrs/objectives/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const openCreateKeyResult = (parentObj: ObjectiveNode) => {
        setParentObjectiveForKr(parentObj);
        setEditingKr(null);
        setKrTitle('');
        setKrMetricType('percentage');
        setKrInitialValue('0');
        setKrCurrentValue('0');
        setKrTargetValue('100');
        setKrUnit('%');
        setKrWeight('1.0');
        setKrOwnerId(members[0]?.id ? members[0].id.toString() : 'none');
        setKrModalOpen(true);
    };

    const openEditKeyResult = (kr: KeyResultItem, parentObj: ObjectiveNode) => {
        setParentObjectiveForKr(parentObj);
        setEditingKr(kr);
        setKrTitle(kr.title);
        setKrMetricType(kr.metric_type);
        setKrInitialValue(kr.initial_value.toString());
        setKrCurrentValue(kr.current_value.toString());
        setKrTargetValue(kr.target_value.toString());
        setKrUnit(kr.unit || '%');
        setKrWeight(kr.weight.toString());
        setKrOwnerId(kr.owner?.id ? kr.owner.id.toString() : 'none');
        setKrModalOpen(true);
    };

    const handleSaveKeyResult = (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentObjectiveForKr) return;
        setIsSavingKr(true);

        const payload = {
            title: krTitle,
            metric_type: krMetricType,
            initial_value: Number(krInitialValue),
            current_value: Number(krCurrentValue),
            target_value: Number(krTargetValue),
            unit: krUnit,
            weight: Number(krWeight),
            owner_id: krOwnerId === 'none' ? null : Number(krOwnerId),
        };

        const url = editingKr
            ? `/organization/okrs/key-results/${editingKr.id}`
            : `/organization/okrs/objectives/${parentObjectiveForKr.id}/key-results`;
        const method = editingKr ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingKr(false);
                setKrModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingKr(false));
    };

    const handleDeleteKeyResult = (krId: string) => {
        fetch(`/organization/okrs/key-results/${krId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const openLinkTaskModal = (kr: KeyResultItem) => {
        setSelectedKrForLinking(kr);
        setSelectedProjectForTasks(projects[0]?.id || 'none');
        setSelectedTaskId('');
        setProjectTasksList([]);
        setLinkTaskModalOpen(true);

        if (projects[0]?.id) {
            fetchProjectTasks(projects[0].id);
        }
    };

    const fetchProjectTasks = (projectId: string) => {
        setLoadingTasks(true);
        fetch(`/projects/${projectId}/tasks?format=json`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((res) => res.json())
            .then((data) => {
                setLoadingTasks(false);
                if (data.tasks) {
                    setProjectTasksList(data.tasks);
                    if (data.tasks.length > 0) {
                        setSelectedTaskId(data.tasks[0].id);
                    }
                }
            })
            .catch(() => setLoadingTasks(false));
    };

    const handleExecuteLinkTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKrForLinking || !selectedTaskId) return;

        setIsLinkingTask(true);
        fetch(`/organization/okrs/key-results/${selectedKrForLinking.id}/link-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ task_id: selectedTaskId }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsLinkingTask(false);
                setLinkTaskModalOpen(false);
                router.reload();
            })
            .catch(() => setIsLinkingTask(false));
    };

    const handleUnlinkTask = (krId: string, taskId: string) => {
        fetch(`/organization/okrs/key-results/${krId}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'achieved':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Tercapai (100%)</span>
                    </Badge>
                );
            case 'on_track':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>On Track</span>
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-semibold">
                        <Clock className="h-3 w-3" />
                        <span>At Risk</span>
                    </Badge>
                );
            case 'behind':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-semibold">
                        <Flame className="h-3 w-3" />
                        <span>Behind</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px]">
                        Draft
                    </Badge>
                );
        }
    };

    const renderLevelIcon = (level: string) => {
        switch (level) {
            case 'company':
                return <Building2 className="h-4 w-4 text-purple-600" />;
            case 'department':
                return <Layers className="h-4 w-4 text-indigo-600" />;
            case 'team':
                return <Users className="h-4 w-4 text-blue-600" />;
            case 'project':
                return <FolderKanban className="h-4 w-4 text-emerald-600" />;
            default:
                return <Target className="h-4 w-4 text-primary" />;
        }
    };

    const renderTreeNode = (node: ObjectiveNode, depth = 0) => {
        const isCollapsed = collapsedNodes[node.id];
        const hasChildren = node.children && node.children.length > 0;
        const hasKrs = node.key_results && node.key_results.length > 0;

        return (
            <div key={node.id} className="space-y-3">
                {/* Node Card */}
                <div
                    className={`rounded-2xl border p-4 shadow-xs transition-all ${
                        node.level === 'company'
                            ? 'border-purple-500/40 bg-gradient-to-br from-purple-500/5 via-card to-card ring-1 ring-purple-500/20'
                            : node.level === 'department'
                            ? 'border-indigo-500/40 bg-indigo-500/5'
                            : 'border-border bg-card'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-2.5">
                            {hasChildren && (
                                <button
                                    onClick={() => toggleCollapse(node.id)}
                                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-0.5"
                                >
                                    {isCollapsed ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>
                            )}

                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="p-1 rounded-lg bg-muted/60">{renderLevelIcon(node.level)}</div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                        {node.level}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {node.period}
                                    </Badge>
                                    {node.project && (
                                        <Badge className="bg-emerald-600 text-white text-[10px]">
                                            [{node.project.key}] {node.project.name}
                                        </Badge>
                                    )}
                                    {renderStatusBadge(node.status)}
                                </div>

                                <h3 className="font-bold text-sm text-foreground mt-1.5">{node.title}</h3>
                                {node.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        {node.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Progress Ring & Actions */}
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="font-mono font-bold text-lg text-foreground">
                                    {node.progress_pct}%
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-medium">
                                    Key Results Roll-up
                                </span>
                            </div>

                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        node.progress_pct >= 100
                                            ? 'bg-emerald-600'
                                            : node.progress_pct >= 70
                                            ? 'bg-emerald-500'
                                            : node.progress_pct >= 40
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${node.progress_pct}%` }}
                                />
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openCreateObjective(node.id)}
                                    className="h-7 text-xs px-2 gap-1 border-border"
                                    title="Tambah Sub-Objective di bawah sasaran ini"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>Sub-Goal</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openCreateKeyResult(node)}
                                    className="h-7 text-xs px-2 gap-1 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                    title="Tambah Key Result terukur"
                                >
                                    <Target className="h-3 w-3" />
                                    <span>+ KR</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditObjective(node)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteObjective(node.id)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Key Results Cards Grid */}
                    {hasKrs && !isCollapsed && (
                        <div className="mt-4 pt-3 border-t border-border/60 space-y-2.5">
                            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-primary" />
                                <span>Hasil Terukur (Key Results - {node.key_results.length})</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {node.key_results.map((kr) => (
                                    <div
                                        key={kr.id}
                                        className="p-3 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between text-xs space-y-2"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-1.5">
                                                <span className="font-semibold text-foreground">{kr.title}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditKeyResult(kr, node)}
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteKeyResult(kr.id)}
                                                        className="p-1 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Values & Progress */}
                                            <div className="mt-2 flex items-center justify-between text-[11px]">
                                                <span className="font-mono text-muted-foreground">
                                                    {kr.current_value} / {kr.target_value} {kr.unit}
                                                </span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {kr.progress_pct}%
                                                </span>
                                            </div>

                                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{ width: `${kr.progress_pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Linked Tasks Section */}
                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap text-[10px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-muted-foreground font-semibold">Tugas:</span>
                                                {kr.linked_tasks.length === 0 ? (
                                                    <span className="text-muted-foreground">Belum ditautkan</span>
                                                ) : (
                                                    kr.linked_tasks.map((lt) => (
                                                        <span
                                                            key={lt.id}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-primary"
                                                        >
                                                            [{lt.project_key}] {lt.key}
                                                            <button
                                                                onClick={() => handleUnlinkTask(kr.id, lt.id)}
                                                                className="text-muted-foreground hover:text-destructive"
                                                                title="Lepaskan tautan tugas"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openLinkTaskModal(kr)}
                                                className="h-6 text-[10px] px-1.5 gap-1 text-primary hover:bg-primary/10"
                                            >
                                                <Link2 className="h-3 w-3" />
                                                <span>Tautkan Tugas</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Render Child Branches */}
                {hasChildren && !isCollapsed && (
                    <div className="pl-6 border-l-2 border-primary/20 space-y-3 mt-3 ml-4">
                        {node.children.map((child) => renderTreeNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="Pohon Keselarasan Sasaran Strategis & OKR Organisasi" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                            <Target className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Pohon Keselarasan Sasaran Strategis & OKR Organisasi
                                </h1>
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-mono">
                                    Strategic Goal Alignment Tree
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Penyelarasan sasaran perusahaan multi-tingkat (*Objectives*), hasil terukur (*Key Results*), dan penautan backlog tugas proyek
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Period Selector */}
                        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="h-9 text-xs font-mono w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Periode</SelectItem>
                                {periods.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={() => openCreateObjective()}
                            className="bg-primary text-primary-foreground gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Tambah Sasaran Utama</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Objectives */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Sasaran Strategis</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_objectives}
                            </span>
                            <span className="text-xs text-muted-foreground">Objectives</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.total_key_results} Key Results terukur
                        </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Progres OKR</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_progress_pct}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Roll-up Score
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.achieved_count} sasaran telah 100% tercapai
                        </div>
                    </div>

                    {/* On Track */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Sasaran On Track</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.on_track_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Sasaran Sehat</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Progres &gt;= 70% sesuai target
                        </div>
                    </div>

                    {/* At Risk & Behind */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Sasaran Berisiko / Terlambat</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.at_risk_count + metrics.behind_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Perlu Intervensi</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.behind_count} sasaran dalam kondisi kritis
                        </div>
                    </div>
                </div>

                {/* Tree Visualizer Container */}
                <div className="space-y-4">
                    {tree.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
                            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                            <h4 className="text-sm font-bold text-foreground">Belum Ada Sasaran Strategis (OKR)</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                Mulai buat sasaran utama perusahaan (Company Objective) untuk menyelaraskan roadmap proyek dan deliverable tim.
                            </p>
                            <Button
                                onClick={() => openCreateObjective()}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                + Buat Sasaran Pertama
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">{tree.map((rootNode) => renderTreeNode(rootNode))}</div>
                    )}
                </div>
            </div>

            {/* Modal: Tambah / Edit Objective */}
            <Dialog open={objectiveModalOpen} onOpenChange={setObjectiveModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-600" />
                            <span>{editingObjective ? 'Edit Sasaran Strategis' : 'Tambah Sasaran Strategis Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan sasaran tujuan strategis tingkat perusahaan, departemen, tim, atau proyek.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveObjective} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Sasaran (Objective) *
                            </label>
                            <Input
                                placeholder="Contoh: Meningkatkan Skalabilitas Sistem Pembayaran 99.99%"
                                value={objTitle}
                                onChange={(e) => setObjTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tingkat Sasaran (Level)
                                </label>
                                <Select value={objLevel} onValueChange={(val: any) => setObjLevel(val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="company">🏢 Company (Perusahaan)</SelectItem>
                                        <SelectItem value="department">🏛️ Department (Departemen)</SelectItem>
                                        <SelectItem value="team">👥 Team (Tim)</SelectItem>
                                        <SelectItem value="project">🚀 Project (Proyek)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Periode Kuartal
                                </label>
                                <Input
                                    value={objPeriod}
                                    onChange={(e) => setObjPeriod(e.target.value)}
                                    placeholder="2026-Q1"
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Sasaran Induk (Parent Objective - Opsional)
                            </label>
                            <Select value={objParentId} onValueChange={setObjParentId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Sasaran Utama Tingkat Tertinggi (Top-Level) --</SelectItem>
                                    {flat_objectives
                                        .filter((o) => !editingObjective || o.id !== editingObjective.id)
                                        .map((o) => (
                                            <SelectItem key={o.id} value={o.id}>
                                                [{o.level.toUpperCase()}] {o.title}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Proyek Terkait (Opsional)
                                </label>
                                <Select value={objProjectId} onValueChange={setObjProjectId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Tanpa Proyek Khusus --</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                [{p.key}] {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    PIC Penanggung Jawab
                                </label>
                                <Select value={objOwnerId} onValueChange={setObjOwnerId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Belum Ditentukan --</SelectItem>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Deskripsi Sasaran
                            </label>
                            <Textarea
                                placeholder="Jelaskan rasional strategis sasaran ini..."
                                value={objDescription}
                                onChange={(e) => setObjDescription(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setObjectiveModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingObjective}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                            >
                                {isSavingObjective ? 'Menyimpan...' : 'Simpan Sasaran'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tambah / Edit Key Result */}
            <Dialog open={krModalOpen} onOpenChange={setKrModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-indigo-600" />
                            <span>{editingKr ? 'Edit Key Result' : 'Tambah Key Result Terukur'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Sasaran: {parentObjectiveForKr?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveKeyResult} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Key Result *
                            </label>
                            <Input
                                placeholder="Contoh: Turunkan latensi API dari 800ms ke < 150ms"
                                value={krTitle}
                                onChange={(e) => setKrTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Nilai Awal
                                </label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={krInitialValue}
                                    onChange={(e) => setKrInitialValue(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Nilai Saat Ini
                                </label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={krCurrentValue}
                                    onChange={(e) => setKrCurrentValue(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Target Akhir
                                </label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={krTargetValue}
                                    onChange={(e) => setKrTargetValue(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Satuan Unit
                                </label>
                                <Input
                                    placeholder="Contoh: %, ms, users, USD"
                                    value={krUnit}
                                    onChange={(e) => setKrUnit(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Bobot Pengaruh (Weight)
                                </label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="5.0"
                                    value={krWeight}
                                    onChange={(e) => setKrWeight(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                PIC Penanggung Jawab
                            </label>
                            <Select value={krOwnerId} onValueChange={setKrOwnerId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Belum Ditugaskan --</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
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
                                onClick={() => setKrModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingKr}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSavingKr ? 'Menyimpan...' : 'Simpan Key Result'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tautkan Tugas Proyek ke Key Result */}
            <Dialog open={linkTaskModalOpen} onOpenChange={setLinkTaskModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-primary" />
                            <span>Tautkan Tugas Proyek ke Key Result</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Hubungkan deliverable tugas backlog sprint yang berkontribusi pada pencapaian hasil terukur ini.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteLinkTask} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pilih Proyek
                            </label>
                            <Select
                                value={selectedProjectForTasks}
                                onValueChange={(val) => {
                                    setSelectedProjectForTasks(val);
                                    fetchProjectTasks(val);
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            [{p.key}] {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pilih Tiket Tugas
                            </label>
                            {loadingTasks ? (
                                <div className="text-xs text-muted-foreground p-3 text-center">Memuat tugas...</div>
                            ) : projectTasksList.length === 0 ? (
                                <div className="text-xs text-muted-foreground p-3 text-center border border-dashed rounded-xl">
                                    Tidak ada tugas aktif dalam proyek ini.
                                </div>
                            ) : (
                                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectTasksList.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                [{t.key}] {t.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setLinkTaskModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLinkingTask || !selectedTaskId}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isLinkingTask ? 'Menautkan...' : 'Tautkan Tugas'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
