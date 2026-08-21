import React, { useState, useEffect } from 'react';
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
    LayoutDashboard,
    Plus,
    Sliders,
    Star,
    Share2,
    Copy,
    Trash2,
    Save,
    RefreshCw,
    TrendingUp,
    DollarSign,
    Target,
    ShieldCheck,
    Users,
    AlertTriangle,
    Clock,
    PieChart,
    Terminal,
    Rocket,
    Smile,
    Activity,
    MoveUp,
    MoveDown,
    Maximize2,
    Minimize2,
    X,
    Check,
    Sparkles,
    CheckCircle2,
    Zap,
    FolderKanban,
    Settings,
} from 'lucide-react';

interface WidgetItem {
    id: string;
    type: string;
    title: string;
    size: 'full' | 'half';
}

interface DashboardItem {
    id: string;
    title: string;
    description: string | null;
    category: string;
    icon: string;
    is_starred: boolean;
    is_shared: boolean;
    layout: WidgetItem[];
    widgets_count: number;
    created_by_name: string;
    is_owner: boolean;
    updated_at_formatted: string;
}

interface ActiveDashboard extends DashboardItem {
    refresh_interval_seconds: number;
}

interface TemplateItem {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    layout: WidgetItem[];
}

interface WidgetCatalogItem {
    type: string;
    title: string;
    category: string;
    icon: string;
    default_size: 'full' | 'half';
    description: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    dashboards: DashboardItem[];
    activeDashboard: ActiveDashboard | null;
    templates: TemplateItem[];
    widgetCatalog: WidgetCatalogItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    selectedProjectId: string | null;
    metrics: any;
}

export default function CustomDashboardsPage({
    organization,
    dashboards,
    activeDashboard,
    templates,
    widgetCatalog,
    projects,
    selectedProjectId,
    metrics,
}: Props) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [currentLayout, setCurrentLayout] = useState<WidgetItem[]>(activeDashboard?.layout || []);
    const [isSavingLayout, setIsSavingLayout] = useState<boolean>(false);

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCategory, setNewCategory] = useState('executive');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('executive_bi');
    const [isCreating, setIsCreating] = useState(false);

    const [widgetCatalogModalOpen, setWidgetCatalogModalOpen] = useState<boolean>(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
    const [editTitle, setEditTitle] = useState(activeDashboard?.title || '');
    const [editDesc, setEditDesc] = useState(activeDashboard?.description || '');
    const [editCategory, setEditCategory] = useState(activeDashboard?.category || 'executive');
    const [editIsShared, setEditIsShared] = useState(activeDashboard?.is_shared ?? true);
    const [editRefreshInterval, setEditRefreshInterval] = useState(
        (activeDashboard?.refresh_interval_seconds ?? 0).toString()
    );

    useEffect(() => {
        if (activeDashboard) {
            setCurrentLayout(activeDashboard.layout || []);
            setEditTitle(activeDashboard.title);
            setEditDesc(activeDashboard.description || '');
            setEditCategory(activeDashboard.category);
            setEditIsShared(activeDashboard.is_shared);
            setEditRefreshInterval((activeDashboard.refresh_interval_seconds ?? 0).toString());
        }
    }, [activeDashboard?.id]);

    const handleSelectDashboard = (id: string) => {
        const params = new URLSearchParams();
        params.append('dashboard_id', id);
        if (selectedProjectId) params.append('project_id', selectedProjectId);
        router.get(`/organization/analytics/custom-dashboards?${params.toString()}`);
    };

    const handleSelectProject = (projId: string) => {
        const params = new URLSearchParams();
        if (activeDashboard) params.append('dashboard_id', activeDashboard.id);
        if (projId !== 'all') params.append('project_id', projId);
        router.get(`/organization/analytics/custom-dashboards?${params.toString()}`);
    };

    const handleToggleStar = (dashboardId: string) => {
        fetch(`/organization/analytics/custom-dashboards/${dashboardId}/toggle-star`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleDuplicateDashboard = (dashboardId: string) => {
        fetch(`/organization/analytics/custom-dashboards/${dashboardId}/duplicate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.dashboard) {
                    handleSelectDashboard(data.dashboard.id);
                }
            });
    };

    const handleDeleteDashboard = (dashboardId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus custom dashboard ini?')) return;

        fetch(`/organization/analytics/custom-dashboards/${dashboardId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => {
            router.get('/organization/analytics/custom-dashboards');
        });
    };

    // Layout customizer actions
    const handleAddWidget = (widget: WidgetCatalogItem) => {
        const newWidget: WidgetItem = {
            id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: widget.type,
            title: widget.title,
            size: widget.default_size,
        };
        setCurrentLayout((prev) => [...prev, newWidget]);
        setWidgetCatalogModalOpen(false);
    };

    const handleRemoveWidget = (widgetId: string) => {
        setCurrentLayout((prev) => prev.filter((w) => w.id !== widgetId));
    };

    const handleToggleWidgetSize = (widgetId: string) => {
        setCurrentLayout((prev) =>
            prev.map((w) => (w.id === widgetId ? { ...w, size: w.size === 'full' ? 'half' : 'full' } : w))
        );
    };

    const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
        const newLayout = [...currentLayout];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLayout.length) return;

        const temp = newLayout[index];
        newLayout[index] = newLayout[targetIndex];
        newLayout[targetIndex] = temp;
        setCurrentLayout(newLayout);
    };

    const handleSaveLayout = () => {
        if (!activeDashboard) return;
        setIsSavingLayout(true);

        fetch(`/organization/analytics/custom-dashboards/${activeDashboard.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                layout: currentLayout,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingLayout(false);
                setIsEditMode(false);
                router.reload();
            })
            .catch(() => setIsSavingLayout(false));
    };

    const handleSaveDashboardSettings = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDashboard) return;

        fetch(`/organization/analytics/custom-dashboards/${activeDashboard.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: editTitle,
                description: editDesc,
                category: editCategory,
                is_shared: editIsShared,
                refresh_interval_seconds: Number(editRefreshInterval),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setSettingsModalOpen(false);
                router.reload();
            });
    };

    const handleCreateDashboard = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        fetch('/organization/analytics/custom-dashboards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: newTitle,
                description: newDesc,
                category: newCategory,
                template_id: selectedTemplateId,
                is_shared: true,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsCreating(false);
                setCreateModalOpen(false);
                if (data.dashboard) {
                    handleSelectDashboard(data.dashboard.id);
                }
            })
            .catch(() => setIsCreating(false));
    };

    const filteredDashboards = dashboards.filter(
        (d) => selectedCategory === 'all' || d.category === selectedCategory
    );

    // Dynamic Live Widget Renderer Component
    const renderWidget = (widget: WidgetItem, index: number) => {
        const isFull = widget.size === 'full';

        return (
            <div
                key={widget.id}
                className={`${
                    isFull ? 'col-span-12' : 'col-span-12 lg:col-span-6'
                } rounded-2xl border border-border bg-card p-5 shadow-xs transition-all flex flex-col justify-between`}
            >
                {/* Widget Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground tracking-tight">{widget.title}</span>
                    </div>

                    {isEditMode && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleMoveWidget(index, 'up')}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Pindah ke atas"
                            >
                                <MoveUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => handleMoveWidget(index, 'down')}
                                disabled={index === currentLayout.length - 1}
                                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
                                title="Pindah ke bawah"
                            >
                                <MoveDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => handleToggleWidgetSize(widget.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                title={isFull ? 'Kecilkan ke 1/2 lebar' : 'Lebarkan ke Full'}
                            >
                                {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button
                                onClick={() => handleRemoveWidget(widget.id)}
                                className="p-1 rounded hover:bg-rose-500/10 text-rose-500"
                                title="Hapus Widget"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Widget Content Body */}
                <div className="py-3 flex-1">
                    {widget.type === 'kpi_summary' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-[11px] text-muted-foreground block">Total Tugas</span>
                                <span className="text-xl font-bold text-foreground font-mono">
                                    {metrics.kpis?.total_tasks ?? 0}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                                    Tingkat Selesai
                                </span>
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                    {metrics.kpis?.completion_rate ?? 0}%
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block">
                                    Sprint Aktif
                                </span>
                                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                    {metrics.kpis?.active_sprints ?? 0}
                                </span>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                                <span className="text-[11px] text-purple-600 dark:text-purple-400 block">
                                    Rilis Dipublikasi
                                </span>
                                <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                                    {metrics.kpis?.published_releases ?? 0}
                                </span>
                            </div>
                        </div>
                    )}

                    {widget.type === 'velocity_trend' && (
                        <div className="space-y-2.5">
                            {metrics.velocity_trend?.map((v: any, i: number) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="font-semibold text-foreground">{v.sprint_name}</span>
                                        <span className="text-muted-foreground">
                                            {v.completed_points} / {v.committed_points} SP ({v.velocity_rate}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, v.velocity_rate)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {widget.type === 'cost_profitability' && (
                        <div className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Margin Laba Kotor</span>
                                    <span className="text-xl font-bold text-emerald-600 font-mono">
                                        Rp {((metrics.financial?.gross_margin ?? 0) / 1000000).toFixed(1)} Jt
                                    </span>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                                    {metrics.financial?.gross_margin_pct ?? 0}% Margin
                                </Badge>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Realisasi Pengeluaran:</span>
                                <span className="font-bold text-foreground">
                                    Rp {((metrics.financial?.total_expenses ?? 0) / 1000000).toFixed(1)} Jt / Rp{' '}
                                    {((metrics.financial?.total_budget ?? 0) / 1000000).toFixed(1)} Jt
                                </span>
                            </div>
                        </div>
                    )}

                    {widget.type === 'okr_progress' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Pencapaian Rata-Rata OKR Kuartal</span>
                                <span className="text-lg font-bold text-indigo-600 font-mono">
                                    {metrics.okrs?.avg_progress ?? 0}%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                                    style={{ width: `${metrics.okrs?.avg_progress ?? 0}%` }}
                                />
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                                <span>Total: {metrics.okrs?.total_objectives ?? 0} Sasaran Strategis</span>
                                <span>{metrics.okrs?.achieved_count ?? 0} Target Tercapai</span>
                            </div>
                        </div>
                    )}

                    {widget.type === 'compliance_dial' && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div>
                                <span className="text-xs font-bold text-foreground block">
                                    SOC 2 Type II & ISO 27001
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {metrics.compliance?.open_incidents ?? 0} temuan insiden aktif
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-emerald-600 font-mono">
                                    {metrics.compliance?.health_score ?? 100}%
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold block">COMPLIANT</span>
                            </div>
                        </div>
                    )}

                    {widget.type === 'team_workload' && (
                        <div className="space-y-2">
                            {metrics.team_workload?.slice(0, 4).map((u: any) => (
                                <div key={u.id} className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground truncate max-w-[160px]">
                                        {u.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${u.is_overloaded ? 'border-rose-500 text-rose-500' : ''}`}
                                        >
                                            {u.active_tasks} Tugas Aktif
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {widget.type === 'status_distribution' && (
                        <div className="space-y-2">
                            {metrics.status_distribution?.slice(0, 4).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                        <span className="text-foreground">{s.name}</span>
                                    </div>
                                    <span className="font-bold text-muted-foreground">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {widget.type === 'recent_activity' && (
                        <div className="space-y-2 font-mono text-xs">
                            {metrics.recent_logs?.slice(0, 4).map((l: any) => (
                                <div
                                    key={l.id}
                                    className="p-2 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-400 font-bold uppercase">
                                            {l.category}
                                        </span>
                                        <span className="truncate">{l.action}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 shrink-0">{l.time_ago}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {widget.type === 'releases_countdown' && (
                        <div className="space-y-2">
                            {metrics.upcoming_releases?.map((r: any) => (
                                <div
                                    key={r.id}
                                    className="p-2.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                                                {r.version}
                                            </Badge>
                                            <span className="text-xs font-bold text-foreground">{r.title}</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                        {r.target_date_formatted}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {widget.type === 'risk_radar' && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                                <div>
                                    <div className="text-xs font-bold text-foreground">Risiko Kritis Terbuka</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Ketergantungan blocker dalam radar pemantauan
                                    </div>
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-amber-600 font-mono">
                                {metrics.risks_critical_count ?? 0}
                            </span>
                        </div>
                    )}

                    {widget.type === 'lead_cycle_time' && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-foreground">Rata-Rata Lead Time</div>
                                <div className="text-[10px] text-muted-foreground">
                                    Dari Backlog hingga Produksi
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-blue-600 font-mono">
                                {metrics.lead_cycle_time_days ?? 4.2} <span className="text-xs font-normal">Hari</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="Enterprise Custom Dashboard Studio & Executive Widget Builder" />

            <div className="space-y-6 pb-16">
                {/* Header Banner & Studio Controls */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center text-white shadow-md">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    {activeDashboard?.title || 'Custom Dashboard Studio'}
                                </h1>
                                {activeDashboard?.is_starred && (
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                )}
                                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                    {activeDashboard?.category || 'Executive'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {activeDashboard?.description ||
                                    'Penyusun tata letak dasbor kustom multi-metrik real-time'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Project Scope Filter */}
                        <Select
                            value={selectedProjectId || 'all'}
                            onValueChange={(val) => handleSelectProject(val)}
                        >
                            <SelectTrigger className="h-9 text-xs w-44">
                                <SelectValue placeholder="Semua Proyek" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">🌐 Semua Proyek</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        📁 {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Studio Edit Mode Toggles */}
                        {isEditMode ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => setWidgetCatalogModalOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 h-9"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Tambah Widget</span>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveLayout}
                                    disabled={isSavingLayout}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-9"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>{isSavingLayout ? 'Menyimpan...' : 'Simpan Layout'}</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditMode(false);
                                        setCurrentLayout(activeDashboard?.layout || []);
                                    }}
                                    className="text-xs h-9"
                                >
                                    Batal
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditMode(true)}
                                    className="text-xs font-semibold gap-1.5 h-9"
                                >
                                    <Sliders className="h-3.5 w-3.5" />
                                    <span>Atur Layout</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSettingsModalOpen(true)}
                                    className="text-xs h-9 px-2.5"
                                    title="Pengaturan Dashboard"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setCreateModalOpen(true)}
                                    className="bg-primary text-primary-foreground text-xs font-semibold gap-1.5 h-9"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Dashboard Baru</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Dashboard Switcher Tabs & Category Filters */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {['all', 'executive', 'engineering', 'financial', 'security', 'product'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-xl text-xs font-medium capitalize transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground font-bold'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {cat === 'all' ? 'Semua Kategori' : cat}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard List Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {filteredDashboards.map((d) => (
                            <div
                                key={d.id}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition-colors ${
                                    activeDashboard?.id === d.id
                                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 font-bold'
                                        : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                <button
                                    onClick={() => handleSelectDashboard(d.id)}
                                    className="flex items-center gap-1.5"
                                >
                                    <span>{d.title}</span>
                                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">
                                        {d.widgets_count}
                                    </Badge>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStar(d.id);
                                    }}
                                    className="p-0.5 text-muted-foreground hover:text-amber-500"
                                >
                                    <Star
                                        className={`h-3 w-3 ${d.is_starred ? 'text-amber-500 fill-amber-500' : ''}`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Dynamic Grid Canvas */}
                <div className="grid grid-cols-12 gap-5">
                    {currentLayout.length === 0 ? (
                        <div className="col-span-12 py-16 text-center bg-card rounded-3xl border border-dashed border-border p-8">
                            <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <h4 className="text-sm font-bold text-foreground">Dashboard Kosong</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                                Belum ada widget yang ditambahkan pada tata letak ini.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => setWidgetCatalogModalOpen(true)}
                                className="bg-indigo-600 text-white text-xs font-semibold gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Buka Katalog Widget</span>
                            </Button>
                        </div>
                    ) : (
                        currentLayout.map((widget, index) => renderWidget(widget, index))
                    )}
                </div>
            </div>

            {/* Modal: Katalog Widget Studio */}
            <Dialog open={widgetCatalogModalOpen} onOpenChange={setWidgetCatalogModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            <span>Pustaka Widget Analitik Enterprise</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pilih widget yang ingin ditambahkan ke canvas dashboard Anda.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {widgetCatalog.map((widget) => (
                            <div
                                key={widget.type}
                                className="p-3.5 rounded-2xl border border-border bg-card hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-2"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                            {widget.category}
                                        </Badge>
                                        <Badge className="bg-muted text-muted-foreground text-[10px] font-mono">
                                            {widget.default_size === 'full' ? 'Lebar Penuh' : '1/2 Grid'}
                                        </Badge>
                                    </div>
                                    <h4 className="font-bold text-xs text-foreground mt-1.5">{widget.title}</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                        {widget.description}
                                    </p>
                                </div>

                                <Button
                                    size="sm"
                                    onClick={() => handleAddWidget(widget)}
                                    className="w-full text-xs font-semibold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white h-7"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>Tambahkan ke Dashboard</span>
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Buat Dashboard Baru */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            <span>Buat Custom Dashboard Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Mulai dari kanvas kosong atau gunakan template kurasi siap pakai.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDashboard} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Dashboard *
                            </label>
                            <Input
                                placeholder="Contoh: Q3 Executive Growth Matrix"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Kategori
                                </label>
                                <Select value={newCategory} onValueChange={setNewCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="executive">Executive</SelectItem>
                                        <SelectItem value="engineering">Engineering</SelectItem>
                                        <SelectItem value="financial">Financial</SelectItem>
                                        <SelectItem value="security">Security</SelectItem>
                                        <SelectItem value="product">Product</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Pilih Starter Template
                                </label>
                                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Deskripsi Dashboard
                            </label>
                            <Textarea
                                placeholder="Keterangan tujuan dashboard..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isCreating}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isCreating ? 'Membuat...' : 'Buat Dashboard'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Pengaturan Dashboard Aktif */}
            <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                            <span>Pengaturan Dashboard</span>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSaveDashboardSettings} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Dashboard *
                            </label>
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Kategori
                            </label>
                            <Select value={editCategory} onValueChange={setEditCategory}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="executive">Executive</SelectItem>
                                    <SelectItem value="engineering">Engineering</SelectItem>
                                    <SelectItem value="financial">Financial</SelectItem>
                                    <SelectItem value="security">Security</SelectItem>
                                    <SelectItem value="product">Product</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Deskripsi
                            </label>
                            <Textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => activeDashboard && handleDuplicateDashboard(activeDashboard.id)}
                                className="text-xs gap-1"
                            >
                                <Copy className="h-3 w-3" />
                                <span>Duplikasi</span>
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => activeDashboard && handleDeleteDashboard(activeDashboard.id)}
                                className="text-xs gap-1"
                            >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                            </Button>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSettingsModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
