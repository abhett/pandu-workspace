import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    AlertTriangle,
    BatteryCharging,
    Calendar,
    CheckCircle2,
    Clock,
    Layers,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
    type: string;
}

interface MemberAllocation {
    user_id: number;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    tasks_count: number;
    story_points: number;
    assigned_hours: number;
    capacity_hours: number;
    allocation_percent: number;
    is_over_allocated: boolean;
}

interface WorkloadData {
    project_id: string;
    sprint_id?: string;
    summary: {
        total_capacity_hours: number;
        assigned_effort_hours: number;
        net_availability_hours: number;
        over_allocated_count: number;
    };
    members: MemberAllocation[];
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
    workload: WorkloadData | null;
}

export default function WorkloadCapacity({
    project,
    availableProjects,
    activeSprint,
    availableSprints,
    workload,
}: Props) {
    const handleProjectChange = (projectId: string) => {
        router.get(`/projects/${projectId}/workload`);
    };

    const handleSprintChange = (sprintId: string) => {
        if (!project) return;
        router.get(`/projects/${project.id}/workload`, { sprint_id: sprintId }, { preserveState: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Proyek', href: '/projects' },
                { title: project?.name || 'Kapasitas Tim', href: project ? `/projects/${project.id}` : '#' },
                { title: 'Workload & Kapasitas', href: '#' },
            ]}
        >
            <Head title={`Kapasitas & Beban Kerja - ${project?.name || 'Pandu'}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                            RESOURCE PLANNING & CAPACITY
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Beban Kerja & Kapasitas Tim
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
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
                            <Link href={`/projects/${project.id}/reports`}>
                                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
                                    <TrendingUp className="size-3.5" />
                                    <span>Laporan Agile</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Summary Stat Cards */}
                {workload && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Capacity */}
                        <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                            <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold">
                                <span>Total Kapasitas</span>
                                <BatteryCharging className="size-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold font-mono text-foreground">
                                    {workload.summary.total_capacity_hours}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">jam sprint</span>
                            </div>
                        </div>

                        {/* Assigned Effort */}
                        <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                            <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold">
                                <span>Beban Teralokasi</span>
                                <Clock className="size-4 text-blue-500" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold font-mono text-blue-500">
                                    {workload.summary.assigned_effort_hours}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">jam tugas</span>
                            </div>
                        </div>

                        {/* Net Availability */}
                        <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                            <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold">
                                <span>Sisa Ketersediaan</span>
                                <CheckCircle2 className="size-4 text-emerald-500" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold font-mono text-emerald-500">
                                    {workload.summary.net_availability_hours}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">jam lowong</span>
                            </div>
                        </div>

                        {/* Over-allocated */}
                        <div className="bg-card p-5 rounded-2xl border border-border space-y-1 shadow-xs">
                            <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider font-bold">
                                <span>Over-allocated</span>
                                <AlertTriangle className="size-4 text-amber-500" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span
                                    className={cn(
                                        'text-3xl font-bold font-mono',
                                        workload.summary.over_allocated_count > 0 ? 'text-amber-500' : 'text-foreground'
                                    )}
                                >
                                    {workload.summary.over_allocated_count}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">anggota (&gt;100%)</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Member Workload Allocation List */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 text-primary" />
                            <h3 className="font-bold text-sm text-foreground">
                                Distribusi Beban Kerja Anggota Tim
                            </h3>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            {workload?.members.length || 0} Anggota Terdaftar
                        </span>
                    </div>

                    {workload && workload.members.length > 0 ? (
                        <div className="divide-y divide-border/60">
                            {workload.members.map((m) => (
                                <div key={m.user_id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                                    {/* Member Info */}
                                    <div className="flex items-center gap-3 min-w-[220px]">
                                        <Avatar className="size-9 rounded-full">
                                            <AvatarImage src={m.avatar} alt={m.name} />
                                            <AvatarFallback className="text-xs font-bold bg-muted">
                                                {m.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-xs text-foreground leading-snug">{m.name}</p>
                                            <p className="text-[10px] text-muted-foreground capitalize">{m.role} • {m.email}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6 text-xs font-mono">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Tugas</span>
                                            <span className="font-bold text-foreground">{m.tasks_count}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Story Points</span>
                                            <span className="font-bold text-purple-500">{m.story_points} pts</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Alokasi Jam</span>
                                            <span className="font-bold text-foreground">{m.assigned_hours} / {m.capacity_hours} hrs</span>
                                        </div>
                                    </div>

                                    {/* Progress Meter */}
                                    <div className="w-full sm:w-56 space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-mono">
                                            <span className="text-muted-foreground">Kapasitas:</span>
                                            <span className={cn('font-bold', m.is_over_allocated ? 'text-red-500' : 'text-emerald-500')}>
                                                {m.allocation_percent}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    m.is_over_allocated
                                                        ? 'bg-red-500'
                                                        : m.allocation_percent > 75
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-500'
                                                )}
                                                style={{ width: `${Math.min(100, m.allocation_percent)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0 text-right sm:w-28">
                                        {m.is_over_allocated ? (
                                            <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px] font-bold">
                                                Over-allocated
                                            </Badge>
                                        ) : m.allocation_percent > 60 ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold">
                                                Optimal
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                Available
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            Belum ada anggota tim yang terdaftar pada proyek ini.
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
