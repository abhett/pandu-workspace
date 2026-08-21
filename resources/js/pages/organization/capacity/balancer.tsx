import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
    Layers,
    Clock,
    Flame,
    Users,
    TrendingUp,
    Search,
    ArrowRightLeft,
    CheckCircle2,
    AlertTriangle,
    SlidersHorizontal,
    Sparkles,
    Calendar,
    ArrowRight,
    Briefcase,
    Activity,
    UserCheck,
    History,
    ShieldAlert,
    Check,
} from 'lucide-react';

interface ProjectInfo {
    id: string;
    name: string;
    key: string;
    status: string;
}

interface ProjectAllocation {
    project_id: string;
    project_name: string;
    project_key: string;
    allocated_points: number;
    allocated_hours: number;
    tasks_count: number;
    share_pct: number;
}

interface ActiveTask {
    id: string;
    project_id: string;
    project_key: string;
    key: string;
    title: string;
    priority: string;
    estimate_points: number;
    allocated_hours: number;
}

interface MatrixRow {
    user_id: number;
    user_name: string;
    user_email: string;
    weekly_capacity_hours: number;
    effective_capacity_hours: number;
    allocated_hours: number;
    allocated_points: number;
    active_tasks_count: number;
    utilization_rate: number;
    burnout_risk: 'severe_overload' | 'high_workload' | 'optimal' | 'under_utilized' | 'on_leave';
    is_on_leave: boolean;
    project_allocations: ProjectAllocation[];
    active_tasks: ActiveTask[];
}

interface RunwayWeek {
    week_number: number;
    label: string;
    start_date: string;
    end_date: string;
    base_capacity_hours: number;
    leave_deducted_hours: number;
    net_bandwidth_hours: number;
}

interface AuditLogItem {
    id: string;
    task: { id: string; key: string; title: string } | null;
    previous_assignee: string;
    new_assignee: string;
    rebalanced_by: string;
    reason: string | null;
    points_moved: number;
    created_at: string;
}

interface Metrics {
    total_org_capacity_hours: number;
    total_allocated_hours: number;
    available_capacity_hours: number;
    overall_utilization_pct: number;
    total_members_count: number;
    overloaded_members_count: number;
    high_workload_count: number;
    on_leave_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    projects: ProjectInfo[];
    matrix_rows: MatrixRow[];
    runway_weeks: RunwayWeek[];
    audit_logs: AuditLogItem[];
}

export default function WorkloadBalancerPage({
    organization,
    metrics,
    projects,
    matrix_rows,
    runway_weeks,
    audit_logs,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'overload' | 'optimal' | 'available' | 'on_leave'>('all');

    // Smart Rebalance Modal
    const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MatrixRow | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [newAssigneeId, setNewAssigneeId] = useState<string>('none');
    const [rebalanceReason, setRebalanceReason] = useState('');
    const [isRebalancing, setIsRebalancing] = useState(false);

    // Smart Suggestions state
    const [suggestions, setSuggestions] = useState<{
        candidate_peers: MatrixRow[];
    } | null>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const openRebalanceModal = (member: MatrixRow, preselectedTask?: ActiveTask) => {
        setSelectedMember(member);
        setSelectedTaskId(preselectedTask ? preselectedTask.id : (member.active_tasks[0]?.id || ''));
        setNewAssigneeId('none');
        setRebalanceReason('');
        setRebalanceModalOpen(true);

        setLoadingSuggestions(true);
        fetch(`/organization/capacity/balancer/suggestions/${member.user_id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.suggestions) {
                    setSuggestions(data.suggestions);
                }
                setLoadingSuggestions(false);
            })
            .catch(() => setLoadingSuggestions(false));
    };

    const handleExecuteRebalance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaskId) return;

        setIsRebalancing(true);
        fetch('/organization/capacity/balancer/reassign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                task_id: selectedTaskId,
                new_assignee_id: newAssigneeId === 'none' ? null : Number(newAssigneeId),
                reason: rebalanceReason || 'Penyeimbangan beban kerja kapasitas lintas proyek.',
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsRebalancing(false);
                setRebalanceModalOpen(false);
                router.reload();
            })
            .catch(() => setIsRebalancing(false));
    };

    const filteredRows = matrix_rows.filter((row) => {
        const matchesSearch =
            row.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.user_email.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'all') return true;
        if (statusFilter === 'overload') return row.burnout_risk === 'severe_overload' || row.burnout_risk === 'high_workload';
        if (statusFilter === 'optimal') return row.burnout_risk === 'optimal';
        if (statusFilter === 'available') return row.burnout_risk === 'under_utilized';
        if (statusFilter === 'on_leave') return row.burnout_risk === 'on_leave';

        return true;
    });

    const renderBurnoutBadge = (risk: MatrixRow['burnout_risk']) => {
        switch (risk) {
            case 'severe_overload':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] gap-1 font-semibold">
                        <Flame className="h-3 w-3" />
                        <span>Kelebihan Beban (&gt;120%)</span>
                    </Badge>
                );
            case 'high_workload':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-semibold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Beban Tinggi (100-120%)</span>
                    </Badge>
                );
            case 'optimal':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Optimal (60-100%)</span>
                    </Badge>
                );
            case 'under_utilized':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] gap-1 font-semibold">
                        <Clock className="h-3 w-3" />
                        <span>Kapasitas Longgar (&lt;60%)</span>
                    </Badge>
                );
            case 'on_leave':
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] gap-1 font-semibold">
                        <Calendar className="h-3 w-3" />
                        <span>Sedang Cuti / Libur</span>
                    </Badge>
                );
        }
    };

    return (
        <AppLayout>
            <Head title="Matriks Penyeimbang Beban Kerja & Kapasitas Lintas Proyek" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Matriks Penyeimbang Beban Kerja & Kapasitas Lintas Proyek
                                </h1>
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-mono">
                                    Cross-Project Balancing Matrix
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Agregasi utilisasi multi-proyek, deteksi dini risiko beban berlebih (*burnout alert*), dan asisten perataan penugasan cerdas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/organization/capacity"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted transition-colors text-foreground"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Pengaturan Kapasitas & Jadwal Cuti</span>
                        </Link>
                    </div>
                </div>

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Capacity */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Kapasitas Tim Mingguan</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_org_capacity_hours}
                            </span>
                            <span className="text-xs text-muted-foreground">Jam / Minggu</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.total_members_count} Anggota Aktif Organisasi
                        </div>
                    </div>

                    {/* Overall Utilization */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Utilisasi Beban Kerja Total</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.overall_utilization_pct}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({metrics.total_allocated_hours} Jam Teralokasi)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Target ideal organisasi: 75% - 85%
                        </div>
                    </div>

                    {/* Overloaded Members */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Anggota Overload & Kritis</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.overloaded_members_count + metrics.high_workload_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Anggota</span>
                            {metrics.overloaded_members_count > 0 && (
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                    {metrics.overloaded_members_count} Kritis &gt;120%
                                </Badge>
                            )}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Perlu penyeimbangan tugas segera
                        </div>
                    </div>

                    {/* Available Bandwidth */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kapasitas Bersih Tersedia</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <UserCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.available_capacity_hours}
                            </span>
                            <span className="text-xs text-muted-foreground">Jam Siap Diambil</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.on_leave_count} anggota sedang cuti
                        </div>
                    </div>
                </div>

                {/* 4-Week Capacity Forward Runway Bar */}
                <div className="rounded-3xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                Proyeksi Runway Kapasitas 4 Pekan ke Depan
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Prakiraan ketersediaan bandwidth jam kerja tim mingguan setelah dikurangi jadwal cuti
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {runway_weeks.map((week) => (
                            <div
                                key={week.week_number}
                                className="rounded-2xl border border-border/80 bg-muted/20 p-4 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground">{week.label}</span>
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                            Pekan {week.week_number}
                                        </Badge>
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-lg font-bold font-mono text-primary">
                                            {week.net_bandwidth_hours} Jam
                                        </span>
                                        <span className="text-[11px] text-muted-foreground block">
                                            Bandwidth Tersedia
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>Kapasitas: {week.base_capacity_hours} jam</span>
                                    {week.leave_deducted_hours > 0 && (
                                        <span className="text-rose-600 font-semibold">
                                            -{week.leave_deducted_hours} jam cuti
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                statusFilter === 'all'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Semua Anggota ({matrix_rows.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('overload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                statusFilter === 'overload'
                                    ? 'bg-rose-600 text-white'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Overload & Tinggi ({metrics.overloaded_members_count + metrics.high_workload_count})
                        </button>
                        <button
                            onClick={() => setStatusFilter('optimal')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                statusFilter === 'optimal'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Optimal
                        </button>
                        <button
                            onClick={() => setStatusFilter('available')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                statusFilter === 'available'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Kapasitas Longgar
                        </button>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari anggota tim..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Multi-Project Cross-Allocation Matrix Table */}
                <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                                    <th className="text-left p-3.5 font-semibold">Anggota Tim</th>
                                    <th className="text-center p-3.5 font-semibold">Kapasitas Efektif</th>
                                    <th className="text-center p-3.5 font-semibold">Total Alokasi</th>
                                    <th className="text-center p-3.5 font-semibold">Utilisasi Beban</th>
                                    <th className="text-left p-3.5 font-semibold">Sebaran Alokasi Lintas Proyek</th>
                                    <th className="text-center p-3.5 font-semibold">Status Burnout</th>
                                    <th className="text-right p-3.5 font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            Tidak ada anggota tim yang sesuai dengan filter pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row) => (
                                        <tr key={row.user_id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3.5">
                                                <div className="font-bold text-foreground">{row.user_name}</div>
                                                <div className="text-[11px] text-muted-foreground">{row.user_email}</div>
                                            </td>
                                            <td className="p-3.5 text-center font-mono">
                                                <span className="font-bold text-foreground">
                                                    {row.effective_capacity_hours}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    ({row.weekly_capacity_hours}h/mgg)
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center font-mono">
                                                <span className="font-bold text-foreground">
                                                    {row.allocated_hours} Jam
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block">
                                                    {row.allocated_points} pts • {row.active_tasks_count} tugas
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center font-mono">
                                                <div className="font-bold text-foreground">{row.utilization_rate}%</div>
                                                <div className="w-20 mx-auto h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            row.utilization_rate > 120
                                                                ? 'bg-rose-600'
                                                                : row.utilization_rate > 100
                                                                ? 'bg-amber-500'
                                                                : row.utilization_rate < 60
                                                                ? 'bg-blue-500'
                                                                : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, row.utilization_rate)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3.5">
                                                {row.project_allocations.length === 0 ? (
                                                    <span className="text-muted-foreground text-[11px]">
                                                        Belum ada tugas teralokasi
                                                    </span>
                                                ) : (
                                                    <div className="space-y-1.5 max-w-sm">
                                                        {row.project_allocations.map((pa) => (
                                                            <div
                                                                key={pa.project_id}
                                                                className="flex items-center justify-between text-[11px] gap-2"
                                                            >
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <Badge variant="outline" className="text-[10px] px-1 font-mono">
                                                                        {pa.project_key}
                                                                    </Badge>
                                                                    <span className="text-foreground truncate">{pa.project_name}</span>
                                                                </div>
                                                                <span className="font-mono text-muted-foreground whitespace-nowrap">
                                                                    {pa.allocated_hours}h ({pa.share_pct}%)
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                {renderBurnoutBadge(row.burnout_risk)}
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openRebalanceModal(row)}
                                                    className="h-7 text-xs gap-1 border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                                                >
                                                    <ArrowRightLeft className="h-3 w-3" />
                                                    <span>Rebalance</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Riwayat Rebalance Audit Log Feed */}
                {audit_logs.length > 0 && (
                    <div className="rounded-3xl border border-border bg-card p-5 shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            <h3 className="font-bold text-sm text-foreground">
                                Riwayat Log Penyeimbangan Beban Kerja Terakhir
                            </h3>
                        </div>

                        <div className="divide-y divide-border">
                            {audit_logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="py-2.5 flex items-center justify-between gap-3 flex-wrap text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        {log.task && (
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {log.task.key}
                                            </Badge>
                                        )}
                                        <span className="font-bold text-foreground">
                                            {log.task?.title || 'Tugas Tanpa Judul'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                        <span className="text-rose-600 font-semibold">{log.previous_assignee}</span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span className="text-emerald-600 font-semibold">{log.new_assignee}</span>
                                        <span>• ({log.points_moved} pts)</span>
                                        <span>• oleh {log.rebalanced_by}</span>
                                        <span>• {log.created_at}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Smart Rebalance Assistant */}
            <Dialog open={rebalanceModalOpen} onOpenChange={setRebalanceModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <span>Asisten Penyeimbang Beban Kerja Cerdas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pindahkan tugas dari anggota yang kelebihan beban ke rekan tim yang memiliki kapasitas longgar.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMember && (
                        <form onSubmit={handleExecuteRebalance} className="space-y-4 pt-2">
                            {/* Current Member Info */}
                            <div className="p-3 rounded-2xl bg-muted/40 text-xs flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-foreground block">{selectedMember.user_name}</span>
                                    <span className="text-[11px] text-muted-foreground">
                                        Utilisasi Saat Ini: {selectedMember.utilization_rate}% ({selectedMember.allocated_hours} Jam Teralokasi)
                                    </span>
                                </div>
                                {renderBurnoutBadge(selectedMember.burnout_risk)}
                            </div>

                            {/* Select Task to Reassign */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Pilih Tugas yang Akan Dialihkan *
                                </label>
                                {selectedMember.active_tasks.length === 0 ? (
                                    <div className="text-xs text-muted-foreground p-3 rounded-xl border border-dashed text-center">
                                        Tidak ada tugas aktif yang sedang dikerjakan anggota ini.
                                    </div>
                                ) : (
                                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedMember.active_tasks.map((task) => (
                                                <SelectItem key={task.id} value={task.id}>
                                                    [{task.project_key}] {task.key} - {task.title} ({task.allocated_hours}h / {task.estimate_points} pts)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Select New Assignee with Smart Suggestions */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Alihkan Penugasan ke Rekan Tim *
                                </label>
                                <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Lepas Penugasan (Unassigned) --</SelectItem>
                                        {suggestions?.candidate_peers.map((peer) => (
                                            <SelectItem key={peer.user_id} value={peer.user_id.toString()}>
                                                ⭐ {peer.user_name} (Utilisasi: {peer.utilization_rate}%, Sisa: {peer.effective_capacity_hours - peer.allocated_hours}h)
                                            </SelectItem>
                                        ))}
                                        {matrix_rows
                                            .filter((m) => m.user_id !== selectedMember.user_id && !suggestions?.candidate_peers.some((p) => p.user_id === m.user_id))
                                            .map((m) => (
                                                <SelectItem key={m.user_id} value={m.user_id.toString()}>
                                                    {m.user_name} (Utilisasi: {m.utilization_rate}%)
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reason for Rebalance */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Alasan Penyeimbangan Beban Kerja
                                </label>
                                <Textarea
                                    placeholder="Contoh: Menyeimbangkan sprint backlog dan meratakan alokasi sprint antar developer..."
                                    value={rebalanceReason}
                                    onChange={(e) => setRebalanceReason(e.target.value)}
                                    className="text-xs min-h-[60px]"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRebalanceModalOpen(false)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isRebalancing || !selectedTaskId}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5"
                                >
                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                    <span>{isRebalancing ? 'Memindahkan...' : 'Eksekusi Rebalance'}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
