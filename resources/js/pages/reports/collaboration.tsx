import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Activity,
    Bot,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    Filter,
    Flame,
    Gauge,
    Layers,
    Search,
    Sparkles,
    Table as TableIcon,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VelocityTrend {
    sprint_name: string;
    completed_points: number;
    target_points: number;
    cycle_time_hours: number;
}

interface MemberPerformance {
    id: number;
    name: string;
    email: string;
    role: string;
    assigned_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    velocity_points: number;
    completion_rate: number;
    avg_cycle_days: string;
}

interface ProjectFilterItem {
    id: string;
    name: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    data: {
        metrics: {
            sprint_velocity: number;
            cycle_time_days: string;
            weekly_throughput: number;
            collaboration_score: number;
            total_tasks: number;
            completed_tasks: number;
        };
        velocity_trends: VelocityTrend[];
        members: MemberPerformance[];
        projects: ProjectFilterItem[];
        selected_project_id: string | null;
    };
}

export default function CollaborationReportPage({ organization, data }: Props) {
    const [chartViewMode, setChartViewMode] = useState<'chart' | 'table'>('chart');
    const [searchMember, setSearchMember] = useState('');
    const [selectedProject, setSelectedProject] = useState(data.selected_project_id || '');

    const handleProjectChange = (projectId: string) => {
        setSelectedProject(projectId);
        router.get(
            '/reports/collaboration',
            projectId ? { project_id: projectId } : {},
            { preserveState: true }
        );
    };

    const filteredMembers = data.members.filter(
        (m) =>
            m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
            m.email.toLowerCase().includes(searchMember.toLowerCase()) ||
            m.role.toLowerCase().includes(searchMember.toLowerCase())
    );

    const maxCompletedPoints = Math.max(
        ...data.velocity_trends.map((t) => Math.max(t.completed_points, t.target_points)),
        60
    );

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Laporan', href: '/reports' },
                { title: 'Performa Kolaborasi Tim', href: '#' },
            ]}
        >
            <Head title={`Performa Kolaborasi Tim & Velocity - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Top Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Users className="size-6 text-primary" /> Performa Kolaborasi & Sprint Velocity
                            </h1>
                            {/* Live Connection Status Badge */}
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono gap-1.5 py-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                </span>
                                Connected
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Analitik kecepatan sprint, siklus waktu pengerjaan tugas, dan distribusi kontribusi anggota tim.
                        </p>
                    </div>

                    {/* Right Action Tools */}
                    <div className="flex items-center gap-3 self-start md:self-auto">
                        {/* AI Co-Pilot Active Pill */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold shadow-xs">
                            <Sparkles className="size-3.5 text-primary animate-pulse" />
                            <span>AI Co-Pilot Aktif</span>
                        </div>

                        {/* Project Filter Selector */}
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedProject}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                            >
                                <option value="">Semua Proyek</option>
                                {data.projects.map((proj) => (
                                    <option key={proj.id} value={proj.id}>
                                        {proj.name}
                                    </option>
                                ))}
                            </select>

                            <a
                                href={`/reports/collaboration/export${selectedProject ? `?project_id=${selectedProject}` : ''}`}
                                className="inline-flex"
                            >
                                <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                                    <Download className="size-3.5" /> Ekspor CSV
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 1. Sprint Velocity */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Sprint Velocity</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                <Flame className="size-4" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                                {data.metrics.sprint_velocity}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1.5">pts / sprint</span>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 pt-1">
                            <TrendingUp className="size-3" /> +14% dibanding sprint lalu
                        </p>
                    </div>

                    {/* 2. Cycle Time */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Average Cycle Time</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                <Clock className="size-4" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                                {data.metrics.cycle_time_days}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1.5">hari</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1">
                            Dari In-Progress hingga Done
                        </p>
                    </div>

                    {/* 3. Throughput */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Weekly Throughput</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                <Zap className="size-4" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                                {data.metrics.weekly_throughput}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1.5">tasks / minggu</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1">
                            {data.metrics.completed_tasks} dari {data.metrics.total_tasks} selesai
                        </p>
                    </div>

                    {/* 4. Collaboration Score */}
                    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-medium">Indeks Kolaborasi</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <Gauge className="size-4" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                                {data.metrics.collaboration_score}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1.5">/ 100</span>
                        </div>
                        <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                            Sangat Kolaboratif & Produktif
                        </p>
                    </div>
                </div>

                {/* Velocity Trend Section with Accessibility Toggle */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="size-4 text-primary" /> Tren Kecepatan Sprint (Velocity History)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Perbandingan poin estimasi vs poin yang berhasil diselesaikan per sprint.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setChartViewMode(chartViewMode === 'chart' ? 'table' : 'chart')}
                            className="text-xs text-primary hover:text-primary-foreground font-semibold gap-1.5"
                        >
                            {chartViewMode === 'chart' ? (
                                <>
                                    <TableIcon className="size-3.5" /> Beralih ke Tabel Aksesibel
                                </>
                            ) : (
                                <>
                                    <Eye className="size-3.5" /> Beralih ke Grafik Batang
                                </>
                            )}
                        </Button>
                    </div>

                    {chartViewMode === 'chart' ? (
                        /* Visual Bar Chart */
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-6 text-xs text-muted-foreground justify-end">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded bg-primary" />
                                    <span>Poin Selesai</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded bg-muted-foreground/30" />
                                    <span>Target Sprint</span>
                                </div>
                            </div>

                            <div className="h-48 w-full flex items-end justify-between gap-4 sm:gap-8 pt-4 pb-2 border-b border-border">
                                {data.velocity_trends.map((trend, idx) => {
                                    const completedHeightPct = Math.round((trend.completed_points / maxCompletedPoints) * 100);
                                    const targetHeightPct = Math.round((trend.target_points / maxCompletedPoints) * 100);

                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                            <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                                                {/* Target Bar */}
                                                <div
                                                    className="w-4 sm:w-6 bg-muted-foreground/20 rounded-t-lg transition-all"
                                                    style={{ height: `${targetHeightPct}%` }}
                                                    title={`Target: ${trend.target_points} pts`}
                                                />
                                                {/* Completed Bar */}
                                                <div
                                                    className="w-4 sm:w-6 bg-primary rounded-t-lg transition-all relative group-hover:brightness-110 shadow-xs"
                                                    style={{ height: `${completedHeightPct}%` }}
                                                >
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background font-mono text-[10px] px-1.5 py-0.5 rounded font-bold pointer-events-none whitespace-nowrap shadow-xs">
                                                        {trend.completed_points} pts
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="mt-2 text-[10px] font-mono text-muted-foreground truncate max-w-full text-center">
                                                {trend.sprint_name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Accessible Alternative Data Table */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                                        <th className="py-2.5 px-3">Nama Sprint</th>
                                        <th className="py-2.5 px-3">Poin Selesai</th>
                                        <th className="py-2.5 px-3">Target Poin</th>
                                        <th className="py-2.5 px-3">Siklus Jam</th>
                                        <th className="py-2.5 px-3">Tingkat Pencapaian</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border font-mono">
                                    {data.velocity_trends.map((t, idx) => (
                                        <tr key={idx} className="hover:bg-muted/30">
                                            <td className="py-3 px-3 font-semibold font-sans text-foreground">
                                                {t.sprint_name}
                                            </td>
                                            <td className="py-3 px-3 text-primary font-bold">{t.completed_points} pts</td>
                                            <td className="py-3 px-3 text-muted-foreground">{t.target_points} pts</td>
                                            <td className="py-3 px-3 text-muted-foreground">{t.cycle_time_hours} jam</td>
                                            <td className="py-3 px-3">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {Math.round((t.completed_points / t.target_points) * 100)}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Member Contribution Breakdown Table */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Users className="size-4 text-primary" /> Distribusi Kontribusi Anggota Tim
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Rincian tugas diselesaikan, velocity, dan kecepatan pengerjaan per anggota.
                            </p>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Cari nama anggota atau peran..."
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                className="pl-8 text-xs h-8"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                                    <th className="py-3 px-3">Anggota Tim</th>
                                    <th className="py-3 px-3">Peran</th>
                                    <th className="py-3 px-3">Tugas Selesai</th>
                                    <th className="py-3 px-3">Velocity Points</th>
                                    <th className="py-3 px-3">Rata-rata Waktu</th>
                                    <th className="py-3 px-3">Tingkat Sukses</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                            Tidak ada anggota yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-foreground block">
                                                            {member.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    {member.role}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-3 font-mono">
                                                <span className="font-bold text-foreground">{member.completed_tasks}</span>
                                                <span className="text-muted-foreground"> / {member.assigned_tasks} tasks</span>
                                            </td>
                                            <td className="py-3 px-3 font-mono font-bold text-primary">
                                                {member.velocity_points} pts
                                            </td>
                                            <td className="py-3 px-3 text-muted-foreground font-mono">
                                                {member.avg_cycle_days}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-emerald-400 h-full rounded-full"
                                                            style={{ width: `${member.completion_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono text-[10px] text-muted-foreground font-bold">
                                                        {member.completion_rate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
