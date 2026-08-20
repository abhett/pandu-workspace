import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    CheckCircle2,
    Clock,
    Eye,
    Flame,
    Layers,
    LayoutDashboard,
    Maximize2,
    Minimize2,
    PieChart,
    Plus,
    RefreshCw,
    Rocket,
    Save,
    Settings2,
    Sliders,
    Sparkles,
    Trash2,
    TrendingUp,
    UserCheck,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetConfig {
    id: string;
    type: string;
    title: string;
    size: 'full' | 'half';
    enabled: boolean;
}

interface PageProps {
    config?: {
        id: string;
        name: string;
        is_default: boolean;
        layout: WidgetConfig[];
    } | null;
    metrics?: {
        kpis?: {
            total_tasks: number;
            completed_tasks: number;
            completion_rate: number;
            overdue_tasks: number;
            active_sprints: number;
            releases_count: number;
            standup_today: number;
        };
        status_distribution?: Array<{
            id: string;
            name: string;
            color: string;
            category: string;
            count: number;
        }>;
        team_workload?: Array<{
            id: number;
            name: string;
            avatar?: string;
            task_count: number;
        }>;
        velocity_trend?: Array<{
            sprint_name: string;
            committed_points: number;
            completed_points: number;
            velocity_rate: number;
        }>;
        recent_standups?: Array<{
            id: string;
            yesterday_work: string;
            today_work: string;
            mood: string;
            user?: { name: string };
        }>;
        recent_releases?: Array<{
            id: string;
            version: string;
            title: string;
            type: string;
        }>;
    };
    projects?: Array<{ id: string; name: string; key: string }>;
    selectedProjectId?: string | null;
    defaultWidgets?: WidgetConfig[];
}

export default function DashboardBuilderPage({
    config,
    metrics,
    projects = [],
    selectedProjectId = '',
    defaultWidgets = [],
}: PageProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const [widgets, setWidgets] = useState<WidgetConfig[]>(
        config?.layout || defaultWidgets
    );
    const [selectedProject, setSelectedProject] = useState(selectedProjectId || '');
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const kpis = metrics?.kpis || {
        total_tasks: 0,
        completed_tasks: 0,
        completion_rate: 0,
        overdue_tasks: 0,
        active_sprints: 0,
        releases_count: 0,
        standup_today: 0,
    };

    const handleFilterChange = (projId: string) => {
        setSelectedProject(projId);
        router.get(
            '/dashboard/builder',
            { project_id: projId || undefined },
            { preserveState: true, replace: true }
        );
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const newWidgets = [...widgets];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newWidgets.length) return;

        const temp = newWidgets[index];
        newWidgets[index] = newWidgets[targetIndex];
        newWidgets[targetIndex] = temp;
        setWidgets(newWidgets);
    };

    const toggleWidgetSize = (id: string) => {
        setWidgets((prev) =>
            prev.map((w) =>
                w.id === id ? { ...w, size: w.size === 'full' ? 'half' : 'full' } : w
            )
        );
    };

    const removeWidget = (id: string) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id));
    };

    const addWidget = (widget: WidgetConfig) => {
        if (!widgets.some((w) => w.id === widget.id)) {
            setWidgets((prev) => [...prev, { ...widget, enabled: true }]);
        }
        setIsCatalogOpen(false);
    };

    const saveLayout = () => {
        setIsSaving(true);
        router.post(
            '/dashboard/builder/save',
            { layout: widgets as any },
            {
                onFinish: () => setIsSaving(false),
            }
        );
    };

    const resetLayout = () => {
        if (confirm('Kembalikan tata letak dashboard ke template eksekutif standar?')) {
            router.post('/dashboard/builder/reset', {}, {
                onSuccess: () => setWidgets(defaultWidgets),
            });
        }
    };

    return (
        <AppLayout>
            <Head title="Custom Dashboard & Executive BI Builder - Pandu" />

            <div className={cn(
                'space-y-8 animate-fade-in pb-16 transition-all duration-300',
                isPresentationMode && 'fixed inset-0 z-50 bg-slate-950/95 text-slate-100 p-6 sm:p-10 overflow-y-auto backdrop-blur-xl'
            )}>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono py-0.5 border-primary/30 text-primary bg-primary/5">
                                Executive BI & Modular Dashboard Builder
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">Analytics Engine</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                            <LayoutDashboard className="size-7 text-primary" /> Executive BI & Widget Builder
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Kustomisasi widget analitik eksekutif secara modular, atur posisi layout, dan aktifkan mode presentasi pemangku kepentingan.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            size="sm"
                            variant={isPresentationMode ? 'destructive' : 'outline'}
                            onClick={() => setIsPresentationMode(!isPresentationMode)}
                            className="gap-1.5 text-xs font-semibold h-9 shadow-xs"
                        >
                            {isPresentationMode ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                            <span>{isPresentationMode ? 'Keluar Presentasi' : 'Mode Presentasi BI'}</span>
                        </Button>

                        {!isPresentationMode && (
                            <>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setIsCatalogOpen(true)}
                                    className="gap-1.5 text-xs font-semibold h-9"
                                >
                                    <Plus className="size-3.5" />
                                    <span>Katalog Widget</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={resetLayout}
                                    className="text-xs text-muted-foreground h-9"
                                    title="Reset ke Template Standar"
                                >
                                    <RefreshCw className="size-3.5" />
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={saveLayout}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground font-semibold gap-1.5 shadow-xs h-9"
                                >
                                    <Save className="size-3.5" />
                                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Layout'}</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Flash Success Notification */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                        <CheckCircle2 className="size-4" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Filter Bar */}
                <div className="flex items-center justify-between gap-4 pt-1 border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                        <Sliders className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">Filter Lingkup Proyek:</span>
                    </div>

                    <select
                        value={selectedProject}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-8"
                    >
                        <option value="">Seluruh Proyek Organisasi</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.key})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Dynamic Modular Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {widgets.map((widget, index) => {
                        const isFull = widget.size === 'full';
                        return (
                            <div
                                key={widget.id}
                                className={cn(
                                    'bg-card rounded-3xl border border-border p-6 sm:p-7 space-y-6 shadow-sm relative group hover:border-primary/50 transition-all',
                                    isFull ? 'md:col-span-2' : 'md:col-span-1'
                                )}
                            >
                                {/* Widget Control Bar */}
                                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <h3 className="text-sm font-bold text-foreground">{widget.title}</h3>
                                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                                            {widget.size}
                                        </Badge>
                                    </div>

                                    {!isPresentationMode && (
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => moveWidget(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                title="Pindah ke Atas"
                                            >
                                                <ArrowUp className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveWidget(index, 'down')}
                                                disabled={index === widgets.length - 1}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                title="Pindah ke Bawah"
                                            >
                                                <ArrowDown className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleWidgetSize(widget.id)}
                                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                                title="Ubah Ukuran Grid (Full/Half)"
                                            >
                                                <Settings2 className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeWidget(widget.id)}
                                                className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                                title="Hapus Widget"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Widget Contents */}
                                {widget.type === 'kpi_summary' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-1">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Total Tugas</span>
                                            <h4 className="text-2xl font-black text-foreground">{kpis.total_tasks}</h4>
                                            <span className="text-[10px] text-emerald-400 font-bold">✓ {kpis.completed_tasks} Selesai</span>
                                        </div>
                                        <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-1">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Tingkat Penyelesaian</span>
                                            <h4 className="text-2xl font-black text-primary">{kpis.completion_rate}%</h4>
                                            <div className="w-full bg-border rounded-full h-1.5 mt-1 overflow-hidden">
                                                <div className="bg-primary h-full rounded-full" style={{ width: `${kpis.completion_rate}%` }} />
                                            </div>
                                        </div>
                                        <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-1">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Overdue & Blocker</span>
                                            <h4 className="text-2xl font-black text-destructive">{kpis.overdue_tasks}</h4>
                                            <span className="text-[10px] text-destructive font-bold">Perlu Tindakan Cepat</span>
                                        </div>
                                        <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-1">
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase">Standup Hari Ini</span>
                                            <h4 className="text-2xl font-black text-emerald-400">{kpis.standup_today}</h4>
                                            <span className="text-[10px] text-muted-foreground font-mono">Check-in Tim</span>
                                        </div>
                                    </div>
                                )}

                                {widget.type === 'velocity_trend' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-muted-foreground">
                                            Perbandingan poin sprint yang dikomitmenkan vs yang berhasil diselesaikan per sprint.
                                        </p>
                                        <div className="space-y-3">
                                            {(metrics?.velocity_trend || []).length === 0 ? (
                                                <div className="p-6 text-center text-xs text-muted-foreground">Belum ada sprint selesai.</div>
                                            ) : (
                                                (metrics?.velocity_trend || []).map((vt, i) => (
                                                    <div key={i} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs font-mono">
                                                            <span className="font-bold text-foreground">{vt.sprint_name}</span>
                                                            <span className="text-primary">{vt.completed_points} / {vt.committed_points} pts ({vt.velocity_rate}%)</span>
                                                        </div>
                                                        <div className="w-full bg-border rounded-full h-2 overflow-hidden flex">
                                                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, vt.velocity_rate)}%` }} />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {widget.type === 'status_distribution' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {(metrics?.status_distribution || []).map((st) => (
                                                <div key={st.id} className="bg-muted/20 border border-border/60 rounded-xl p-3 space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                                                        <span className="text-xs font-bold text-foreground truncate">{st.name}</span>
                                                    </div>
                                                    <h5 className="text-lg font-black text-foreground font-mono">{st.count}</h5>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {widget.type === 'team_workload' && (
                                    <div className="space-y-3">
                                        {(metrics?.team_workload || []).map((member) => (
                                            <div key={member.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/60">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-foreground">{member.name}</span>
                                                </div>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {member.task_count} Tugas
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {widget.type === 'overdue_radar' && (
                                    <div className="space-y-3">
                                        <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-destructive">
                                                <AlertTriangle className="size-4" />
                                                <span className="font-bold">{kpis.overdue_tasks} Tugas Melewati Tenggat Waktu</span>
                                            </div>
                                            <Badge variant="destructive" className="text-[10px] font-mono">
                                                High Priority
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Tugas-tugas ini memerlukan delegasi ulang atau perpanjangan sprint agar tidak menghambat delivery roadmap.
                                        </p>
                                    </div>
                                )}

                                {widget.type === 'recent_feed' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <UserCheck className="size-3.5 text-primary" /> Daily Standup Hari Ini
                                            </span>
                                            <div className="space-y-2">
                                                {(metrics?.recent_standups || []).length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">Belum ada check-in hari ini.</p>
                                                ) : (
                                                    (metrics?.recent_standups || []).map((st) => (
                                                        <div key={st.id} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-foreground">{st.user?.name || 'Anggota Tim'}</span>
                                                                <Badge variant="outline" className="text-[9px] capitalize">{st.mood}</Badge>
                                                            </div>
                                                            <p className="text-muted-foreground line-clamp-1">Fokus: {st.today_work}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Rocket className="size-3.5 text-emerald-400" /> Rilis Versi Terkini
                                            </span>
                                            <div className="space-y-2">
                                                {(metrics?.recent_releases || []).length === 0 ? (
                                                    <p className="text-xs text-muted-foreground">Belum ada rilis versi terdaftar.</p>
                                                ) : (
                                                    (metrics?.recent_releases || []).map((rel) => (
                                                        <div key={rel.id} className="p-3 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between text-xs">
                                                            <div>
                                                                <span className="font-mono font-bold text-primary mr-2">{rel.version}</span>
                                                                <span className="text-foreground">{rel.title}</span>
                                                            </div>
                                                            <Badge className="text-[9px] uppercase">{rel.type}</Badge>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Widget Catalog Drawer / Modal */}
            {isCatalogOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Plus className="size-5 text-primary" /> Katalog Widget Analitik
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Pilih widget yang ingin ditambahkan ke dashboard BI Anda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCatalogOpen(false)}
                                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {defaultWidgets.map((w) => {
                                const isAlreadyAdded = widgets.some((existing) => existing.id === w.id);
                                return (
                                    <div
                                        key={w.id}
                                        className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/80"
                                    >
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground">{w.title}</h4>
                                            <span className="text-[10px] font-mono text-muted-foreground capitalize">
                                                Tipe: {w.type} • Ukuran: {w.size}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={isAlreadyAdded ? 'outline' : 'default'}
                                            disabled={isAlreadyAdded}
                                            onClick={() => addWidget(w)}
                                            className="text-xs h-8"
                                        >
                                            {isAlreadyAdded ? 'Sudah Ada' : 'Tambah'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
