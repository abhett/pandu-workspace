import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Flame,
    Layers,
    LineChart,
    PieChart,
    Sparkles,
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

interface BurndownData {
    sprint_id: string;
    sprint_name: string;
    total_points: number;
    series: Array<{
        day_label: string;
        date: string;
        is_today: boolean;
        ideal_remaining: number;
        actual_remaining: number | null;
    }>;
}

interface VelocityData {
    project_id: string;
    average_velocity: number;
    sprints_analyzed: number;
    history: Array<{
        sprint_id: string;
        sprint_name: string;
        committed_points: number;
        completed_points: number;
        completion_rate: number;
    }>;
}

interface CumulativeFlowData {
    project_id: string;
    days: number;
    series: Array<{
        date: string;
        done: number;
        review: number;
        in_progress: number;
        todo: number;
        backlog: number;
    }>;
    current_distribution: {
        done: number;
        review: number;
        in_progress: number;
        todo: number;
        backlog: number;
    };
}

interface CycleTimeData {
    average_lead_time_days: number;
    average_cycle_time_days: number;
    sample_size: number;
}

interface Props {
    project: Project | null;
    availableProjects: Project[];
    activeSprint: {
        id: string;
        name: string;
        status: string;
    } | null;
    availableSprints: Array<{
        id: string;
        name: string;
        status: string;
    }>;
    burndown: BurndownData | null;
    velocity: VelocityData | null;
    cumulativeFlow: CumulativeFlowData | null;
    cycleTime: CycleTimeData | null;
}

export default function AgileReports({
    project,
    availableProjects,
    activeSprint,
    availableSprints,
    burndown,
    velocity,
    cumulativeFlow,
    cycleTime,
}: Props) {
    const [activeTab, setActiveTab] = useState<'burndown' | 'velocity' | 'cfd' | 'lead_time'>('burndown');

    const handleProjectChange = (projectId: string) => {
        router.get(`/projects/${projectId}/reports`);
    };

    const handleSprintChange = (sprintId: string) => {
        if (!project) return;
        router.get(`/projects/${project.id}/reports`, { sprint_id: sprintId }, { preserveState: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Proyek', href: '/projects' },
                { title: project?.name || 'Laporan', href: project ? `/projects/${project.id}` : '#' },
                { title: 'Laporan & Metrik Agile', href: '#' },
            ]}
        >
            <Head title={`Laporan & Metrik Agile - ${project?.name || 'Pandu'}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                            AGILE ANALYTICS & FLOW
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Pusat Laporan & Metrik
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Project selector */}
                        {availableProjects.length > 1 && (
                            <select
                                value={project?.id || ''}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                {availableProjects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.key})
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Sprint selector */}
                        {availableSprints.length > 0 && (
                            <select
                                value={activeSprint?.id || ''}
                                onChange={(e) => handleSprintChange(e.target.value)}
                                className="h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                {availableSprints.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.status})
                                    </option>
                                ))}
                            </select>
                        )}

                        {project && (
                            <Link href={`/projects/${project.id}/scrum-master`}>
                                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
                                    <Zap className="size-3.5" />
                                    <span>Scrum Workspace</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Quick KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-muted-foreground text-xs">
                            <span className="font-mono uppercase tracking-wider font-bold">Rata-rata Velocity</span>
                            <TrendingUp className="size-4 text-primary" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono text-foreground">
                                {velocity?.average_velocity || 0}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">pts / sprint</span>
                        </div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-muted-foreground text-xs">
                            <span className="font-mono uppercase tracking-wider font-bold">Rata-rata Cycle Time</span>
                            <Clock className="size-4 text-emerald-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono text-emerald-500">
                                {cycleTime?.average_cycle_time_days || 0}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">hari (In Progress → Done)</span>
                        </div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-muted-foreground text-xs">
                            <span className="font-mono uppercase tracking-wider font-bold">Rata-rata Lead Time</span>
                            <Activity className="size-4 text-blue-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono text-blue-500">
                                {cycleTime?.average_lead_time_days || 0}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">hari (Dibuat → Selesai)</span>
                        </div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                        <div className="flex justify-between items-center text-muted-foreground text-xs">
                            <span className="font-mono uppercase tracking-wider font-bold">Sprint Dianalisis</span>
                            <CheckCircle2 className="size-4 text-purple-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono text-purple-500">
                                {velocity?.sprints_analyzed || 0}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">sprint lampau</span>
                        </div>
                    </div>
                </div>

                {/* Report Tabs */}
                <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
                    <Button
                        variant={activeTab === 'burndown' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('burndown')}
                        className="text-xs gap-1.5 font-semibold"
                    >
                        <Flame className="size-3.5" />
                        <span>Sprint Burndown Chart</span>
                    </Button>

                    <Button
                        variant={activeTab === 'velocity' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('velocity')}
                        className="text-xs gap-1.5 font-semibold"
                    >
                        <BarChart3 className="size-3.5" />
                        <span>Velocity Chart</span>
                    </Button>

                    <Button
                        variant={activeTab === 'cfd' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('cfd')}
                        className="text-xs gap-1.5 font-semibold"
                    >
                        <Layers className="size-3.5" />
                        <span>Cumulative Flow (CFD)</span>
                    </Button>
                </div>

                {/* 1. Sprint Burndown Chart Section */}
                {activeTab === 'burndown' && (
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Sprint Burndown: {burndown?.sprint_name || activeSprint?.name || 'Sprint Aktif'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Membandingkan penurunan sisa beban kerja (Story Points) aktual terhadap garis proyeksi ideal.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground" />
                                    <span>Garis Ideal</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 bg-primary" />
                                    <span>Aktual Riil</span>
                                </span>
                            </div>
                        </div>

                        {burndown && burndown.series.length > 0 ? (
                            <div className="space-y-4">
                                <div className="h-[280px] w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-l border-border relative">
                                    {burndown.series.map((item, idx) => {
                                        const maxPts = Math.max(1, burndown.total_points);
                                        const idealHeight = Math.round(((item.ideal_remaining ?? 0) / maxPts) * 220);
                                        const actualHeight = item.actual_remaining !== null ? Math.round((item.actual_remaining / maxPts) * 220) : null;

                                        return (
                                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                                                {/* Ideal Marker */}
                                                <div
                                                    className="w-full border-t-2 border-dashed border-muted-foreground/40 absolute z-0"
                                                    style={{ bottom: `${idealHeight}px` }}
                                                />

                                                {/* Actual Bar */}
                                                {actualHeight !== null && (
                                                    <div
                                                        className={cn(
                                                            'w-3 sm:w-5 rounded-t-md transition-all z-10',
                                                            item.is_today ? 'bg-primary shadow-md' : 'bg-primary/70 group-hover:bg-primary'
                                                        )}
                                                        style={{ height: `${actualHeight}px` }}
                                                    />
                                                )}

                                                {/* Tooltip */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-popover text-popover-foreground text-[10px] p-2 rounded-lg shadow-lg border border-border pointer-events-none whitespace-nowrap z-20 font-mono">
                                                    <div>{item.day_label}</div>
                                                    <div>Aktual: {item.actual_remaining !== null ? `${item.actual_remaining} pts` : 'Belum tercatat'}</div>
                                                    <div>Ideal: {item.ideal_remaining} pts</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between text-[11px] font-mono text-muted-foreground px-2">
                                    <span>{burndown.series[0]?.day_label} (Awal Sprint)</span>
                                    <span>{burndown.series[burndown.series.length - 1]?.day_label} (Target Selesai)</span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-xs text-muted-foreground">
                                Data burndown chart belum tersedia untuk sprint ini.
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Velocity Chart Section */}
                {activeTab === 'velocity' && (
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-xs">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Riwayat Kecepatan Tim (Velocity Chart)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Perbandingan story points yang dikomitmenkan saat Sprint Planning vs yang berhasil diselesaikan (*Done*).
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded bg-muted-foreground/30" />
                                    <span>Committed</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded bg-status-done" />
                                    <span>Completed</span>
                                </span>
                            </div>
                        </div>

                        {velocity && velocity.history.length > 0 ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                                    {velocity.history.map((s) => (
                                        <div key={s.sprint_id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                                            <span className="font-bold text-xs text-foreground block truncate">{s.sprint_name}</span>
                                            <div className="flex items-baseline justify-between text-xs font-mono">
                                                <span className="text-muted-foreground">Committed:</span>
                                                <span className="font-semibold">{s.committed_points} pts</span>
                                            </div>
                                            <div className="flex items-baseline justify-between text-xs font-mono">
                                                <span className="text-emerald-500 font-bold">Completed:</span>
                                                <span className="font-bold text-emerald-500">{s.completed_points} pts</span>
                                            </div>
                                            <div className="pt-1 border-t border-border/60 flex justify-between items-center text-[10px] font-mono">
                                                <span>Penyelesaian:</span>
                                                <Badge variant="outline" className="text-[10px]">{s.completion_rate}%</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-xs text-muted-foreground">
                                Belum ada riwayat sprint yang telah diselesaikan (*completed*) pada proyek ini.
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Cumulative Flow Diagram Section */}
                {activeTab === 'cfd' && (
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-xs">
                        <div>
                            <h3 className="text-base font-bold text-foreground">
                                Cumulative Flow Diagram (CFD)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Memvisualisasikan stabilitas alur kerja tim dan mendeteksi penumpukan tugas (*bottlenecks*).
                            </p>
                        </div>

                        {cumulativeFlow && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
                                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Backlog</span>
                                    <p className="text-2xl font-bold font-mono text-foreground mt-1">{cumulativeFlow.current_distribution.backlog}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                    <span className="text-[10px] uppercase font-mono text-blue-500 font-bold">To Do</span>
                                    <p className="text-2xl font-bold font-mono text-blue-500 mt-1">{cumulativeFlow.current_distribution.todo}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                    <span className="text-[10px] uppercase font-mono text-purple-500 font-bold">In Progress</span>
                                    <p className="text-2xl font-bold font-mono text-purple-500 mt-1">{cumulativeFlow.current_distribution.in_progress}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                    <span className="text-[10px] uppercase font-mono text-amber-500 font-bold">Review</span>
                                    <p className="text-2xl font-bold font-mono text-amber-500 mt-1">{cumulativeFlow.current_distribution.review}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <span className="text-[10px] uppercase font-mono text-emerald-500 font-bold">Done</span>
                                    <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">{cumulativeFlow.current_distribution.done}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
