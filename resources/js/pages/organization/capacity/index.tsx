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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Gauge,
    Plus,
    Users,
    Clock,
    Calendar,
    ArrowRightLeft,
    AlertCircle,
    CheckCircle2,
    Search,
    Edit3,
    Trash2,
    SlidersHorizontal,
    TrendingUp,
    ShieldAlert,
    Sun,
    Coffee,
    Briefcase,
    Sparkles,
    Scale,
    Check,
    X,
    Filter,
    Layers,
} from 'lucide-react';

interface ActiveTaskItem {
    id: string;
    key: string;
    title: string;
    priority: string;
    estimate_points: number;
    project_id: string;
    project_name?: string;
    project_key?: string;
}

interface MemberCapacityProfile {
    user_id: number;
    user_name: string;
    user_email: string;
    weekly_capacity_hours: number;
    fte_ratio: number;
    max_story_points: number;
    hours_deducted: number;
    effective_capacity_hours: number;
    allocated_hours: number;
    allocated_points: number;
    active_tasks_count: number;
    utilization_rate: number;
    status: 'optimal' | 'over_allocated' | 'under_allocated' | 'on_leave';
    active_tasks: ActiveTaskItem[];
}

interface TimeOffScheduleItem {
    id: string;
    user_id: number;
    user_name?: string;
    user_email?: string;
    type: string;
    title: string;
    start_date: string;
    end_date: string;
    start_date_formatted: string;
    end_date_formatted: string;
    hours_deducted: number;
    notes?: string | null;
}

interface CapacityMetrics {
    total_org_capacity_hours: number;
    total_allocated_hours: number;
    overall_utilization_rate: number;
    overburdened_members_count: number;
    members_on_leave_count: number;
    total_members_count: number;
}

interface MemberOption {
    id: number;
    name: string;
    email: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: CapacityMetrics;
    memberProfiles: MemberCapacityProfile[];
    timeOffSchedules: TimeOffScheduleItem[];
    members: MemberOption[];
}

export default function ResourceCapacityPage({
    organization,
    metrics,
    memberProfiles,
    timeOffSchedules,
    members,
}: Props) {
    const [activeTab, setActiveTab] = useState<'workload' | 'timeoff' | 'settings'>('workload');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal Capacity Setting
    const [settingModalOpen, setSettingModalOpen] = useState(false);
    const [selectedUserIdForSetting, setSelectedUserIdForSetting] = useState<string>(members[0]?.id?.toString() || '');
    const [weeklyHours, setWeeklyHours] = useState<number | string>(40);
    const [maxPoints, setMaxPoints] = useState<number | string>(20);
    const [fteRatio, setFteRatio] = useState<number | string>(1.0);
    const [submittingSetting, setSubmittingSetting] = useState(false);

    // Modal Time Off Schedule
    const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);
    const [selectedUserIdForTimeOff, setSelectedUserIdForTimeOff] = useState<string>(members[0]?.id?.toString() || '');
    const [timeOffType, setTimeOffType] = useState<string>('vacation');
    const [timeOffTitle, setTimeOffTitle] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [hoursDeducted, setHoursDeducted] = useState<number | string>(8);
    const [timeOffNotes, setTimeOffNotes] = useState('');
    const [submittingTimeOff, setSubmittingTimeOff] = useState(false);

    // Modal Rebalance Task
    const [rebalanceModalOpen, setRebalanceModalOpen] = useState(false);
    const [taskToRebalance, setTaskToRebalance] = useState<ActiveTaskItem | null>(null);
    const [currentAssigneeName, setCurrentAssigneeName] = useState('');
    const [newAssigneeId, setNewAssigneeId] = useState<string>('');
    const [submittingRebalance, setSubmittingRebalance] = useState(false);

    // Status Badge Formatter
    const renderStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            over_allocated: { label: 'Over-Allocated (>100%)', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
            optimal: { label: 'Beban Optimal (60-100%)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
            under_allocated: { label: 'Under-Allocated (<60%)', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
            on_leave: { label: 'Sedang Cuti / Libur', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
        };

        const cfg = configs[status] || configs.optimal;

        return (
            <Badge className={`text-[10px] font-semibold ${cfg.color}`}>
                {cfg.label}
            </Badge>
        );
    };

    // Handle Save Capacity Setting
    const handleSaveSetting = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingSetting(true);

        router.post('/organization/capacity/member-settings', {
            user_id: Number(selectedUserIdForSetting),
            weekly_capacity_hours: Number(weeklyHours),
            max_story_points_per_sprint: Number(maxPoints),
            fte_ratio: Number(fteRatio),
        }, {
            onSuccess: () => setSettingModalOpen(false),
            onFinish: () => setSubmittingSetting(false),
        });
    };

    // Handle Save Time Off
    const handleSaveTimeOff = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingTimeOff(true);

        router.post('/organization/capacity/time-off', {
            user_id: Number(selectedUserIdForTimeOff),
            type: timeOffType,
            title: timeOffTitle,
            start_date: startDate,
            end_date: endDate,
            hours_deducted: Number(hoursDeducted),
            notes: timeOffNotes,
        }, {
            onSuccess: () => {
                setTimeOffModalOpen(false);
                setTimeOffTitle('');
                setTimeOffNotes('');
            },
            onFinish: () => setSubmittingTimeOff(false),
        });
    };

    // Handle Delete Time Off
    const handleDeleteTimeOff = (timeOffId: string) => {
        if (!confirm('Hapus jadwal cuti ini?')) return;

        router.delete(`/organization/capacity/time-off/${timeOffId}`);
    };

    // Handle Rebalance Task Submit
    const handleRebalanceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskToRebalance) return;
        setSubmittingRebalance(true);

        router.post('/organization/capacity/reassign-task', {
            task_id: taskToRebalance.id,
            new_assignee_id: newAssigneeId ? Number(newAssigneeId) : null,
        }, {
            onSuccess: () => {
                setRebalanceModalOpen(false);
                setTaskToRebalance(null);
            },
            onFinish: () => setSubmittingRebalance(false),
        });
    };

    // Filtered Profiles
    const filteredProfiles = memberProfiles.filter((p) => {
        const matchQuery = p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.user_email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchQuery && matchStatus;
    });

    return (
        <AppLayout>
            <Head title={`Kapasitas & Beban Kerja - ${organization.name}`} />

            <div className="space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
                            <Gauge className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-foreground">Perencanaan Kapasitas & Beban Kerja</h1>
                                <Badge variant="outline" className="text-xs font-mono">
                                    Capacity AI
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Monitoring utilisasi kapasitas jam kerja tim mingguan, rasio FTE, cuti, dan penyeimbangan tugas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/organization/capacity/balancer"
                            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-90 transition-opacity"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Matriks Lintas Proyek</span>
                        </Link>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSettingModalOpen(true)}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Atur Kapasitas Anggota</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setTimeOffModalOpen(true)}
                            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>+ Jadwalkan Cuti / Libur</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kapasitas Bersih Mingguan</span>
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
                            Dari {metrics.total_members_count} anggota aktif
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Beban Terdistribusi</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Briefcase className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_allocated_hours}
                            </span>
                            <span className="text-xs text-muted-foreground">Jam Terestimasi</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Berdasarkan tiket tugas aktif in-progress
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Utilisasi Kapasitas</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.overall_utilization_rate}%
                            </span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    metrics.overall_utilization_rate > 100
                                        ? 'bg-red-500'
                                        : metrics.overall_utilization_rate >= 70
                                        ? 'bg-emerald-500'
                                        : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(metrics.overall_utilization_rate, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Anggota Over-Allocated</span>
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 font-mono">
                                {metrics.overburdened_members_count}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({metrics.members_on_leave_count} Sedang Cuti)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Disarankan untuk penyeimbangan tugas
                        </div>
                    </div>
                </div>

                {/* Tab Controls & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('workload')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'workload'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Scale className="h-4 w-4" />
                            <span>Papan Penyeimbangan Beban Kerja ({memberProfiles.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('timeoff')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'timeoff'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Calendar className="h-4 w-4" />
                            <span>Kalender Cuti & Libur ({timeOffSchedules.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'settings'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span>Matriks Kapasitas & FTE</span>
                        </button>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 text-xs w-36 bg-card">
                                <SelectValue placeholder="Status..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="over_allocated">Over-Allocated</SelectItem>
                                <SelectItem value="optimal">Optimal Load</SelectItem>
                                <SelectItem value="under_allocated">Under-Allocated</SelectItem>
                                <SelectItem value="on_leave">Sedang Cuti</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari anggota tim..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-9 text-xs"
                        />
                    </div>
                </div>

                {/* TAB 1: Live Workload Balancing Board */}
                {activeTab === 'workload' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProfiles.map((profile) => (
                            <div
                                key={profile.user_id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
                            >
                                <div>
                                    {/* Member Header */}
                                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                                {profile.user_name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-foreground">
                                                    {profile.user_name}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {profile.user_email} • {profile.fte_ratio} FTE
                                                </div>
                                            </div>
                                        </div>

                                        {renderStatusBadge(profile.status)}
                                    </div>

                                    {/* Capacity Gauge Metrics */}
                                    <div className="pt-3 pb-2 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Beban: <strong>{profile.allocated_hours} Jam</strong> ({profile.allocated_points} Poin)
                                            </span>
                                            <span className="font-mono font-bold text-foreground">
                                                {profile.utilization_rate}% dari {profile.effective_capacity_hours} Jam
                                            </span>
                                        </div>

                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    profile.utilization_rate > 100
                                                        ? 'bg-red-500'
                                                        : profile.utilization_rate >= 60
                                                        ? 'bg-emerald-500'
                                                        : 'bg-blue-500'
                                                }`}
                                                style={{ width: `${Math.min(profile.utilization_rate, 100)}%` }}
                                            />
                                        </div>

                                        {profile.hours_deducted > 0 && (
                                            <div className="text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                <Coffee className="h-3 w-3" />
                                                <span>{profile.hours_deducted} Jam terpotong karena cuti/libur minggu ini</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Active Assigned Tasks List */}
                                    <div className="mt-2 space-y-2">
                                        <span className="text-[11px] font-bold text-muted-foreground block uppercase tracking-wider">
                                            Tugas Aktif Sedang Dikerjakan ({profile.active_tasks.length})
                                        </span>

                                        {profile.active_tasks.length === 0 ? (
                                            <div className="p-3 rounded-xl bg-muted/20 text-center text-xs text-muted-foreground">
                                                Tidak ada tugas aktif saat ini.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {profile.active_tasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between gap-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[9px] font-mono">
                                                                {task.key}
                                                            </Badge>
                                                            <span className="text-xs font-bold text-foreground line-clamp-1">
                                                                {task.title}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                                {task.estimate_points} pts
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-6 text-[10px] gap-1 px-2"
                                                                onClick={() => {
                                                                    setTaskToRebalance(task);
                                                                    setCurrentAssigneeName(profile.user_name);
                                                                    setNewAssigneeId('');
                                                                    setRebalanceModalOpen(true);
                                                                }}
                                                                title="Pindahkan Tugas ke Anggota Lain"
                                                            >
                                                                <ArrowRightLeft className="h-3 w-3 text-primary" />
                                                                <span>Pindahkan</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 2: Time-Off Schedules */}
                {activeTab === 'timeoff' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        {timeOffSchedules.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Belum ada jadwal cuti atau libur tim yang terdaftar. Klik "+ Jadwalkan Cuti / Libur" untuk menambahkan.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Nama Anggota</th>
                                            <th className="py-3 px-4">Jenis Cuti</th>
                                            <th className="py-3 px-4">Keterangan / Judul</th>
                                            <th className="py-3 px-4">Periode Tanggal</th>
                                            <th className="py-3 px-4">Jam Terpotong</th>
                                            <th className="py-3 px-4">Catatan</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {timeOffSchedules.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4 font-bold text-foreground">
                                                    {item.user_name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                                        {item.type.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-foreground">
                                                    {item.title}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">
                                                    {item.start_date_formatted} s/d {item.end_date_formatted}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-foreground">
                                                    {item.hours_deducted} Jam
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {item.notes || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteTimeOff(item.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: Capacity & FTE Settings Matrix */}
                {activeTab === 'settings' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                    <tr>
                                        <th className="py-3 px-4">Anggota Tim</th>
                                        <th className="py-3 px-4">Rasio FTE</th>
                                        <th className="py-3 px-4">Kapasitas Mingguan</th>
                                        <th className="py-3 px-4">Batas Poin per Sprint</th>
                                        <th className="py-3 px-4">Kapasitas Efektif</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {memberProfiles.map((p) => (
                                        <tr key={p.user_id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-foreground">{p.user_name}</div>
                                                <div className="text-[11px] text-muted-foreground">{p.user_email}</div>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                                                {p.fte_ratio} FTE
                                            </td>
                                            <td className="py-3 px-4 font-mono text-foreground">
                                                {p.weekly_capacity_hours} Jam
                                            </td>
                                            <td className="py-3 px-4 font-mono text-foreground">
                                                {p.max_story_points} Pts
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-primary">
                                                {p.effective_capacity_hours} Jam
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        setSelectedUserIdForSetting(p.user_id.toString());
                                                        setWeeklyHours(p.weekly_capacity_hours);
                                                        setMaxPoints(p.max_story_points);
                                                        setFteRatio(p.fte_ratio);
                                                        setSettingModalOpen(true);
                                                    }}
                                                >
                                                    <Edit3 className="h-3 w-3 mr-1" />
                                                    <span>Ubah</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Atur Kapasitas Anggota */}
            <Dialog open={settingModalOpen} onOpenChange={setSettingModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-primary" />
                            <span>Pengaturan Kapasitas Anggota</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Atur jam kerja mingguan dasar dan rasio FTE untuk perhitungan beban kerja.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveSetting} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Anggota Tim
                            </label>
                            <Select value={selectedUserIdForSetting} onValueChange={setSelectedUserIdForSetting}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jam Kerja / Minggu
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={80}
                                    value={weeklyHours}
                                    onChange={(e) => setWeeklyHours(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Rasio FTE (1.0 = Full-time)
                                </label>
                                <Input
                                    type="number"
                                    step={0.1}
                                    min={0.1}
                                    max={2.0}
                                    value={fteRatio}
                                    onChange={(e) => setFteRatio(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Batas Maks Poin per Sprint
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={maxPoints}
                                onChange={(e) => setMaxPoints(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSettingModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingSetting}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingSetting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Jadwalkan Cuti / Libur */}
            <Dialog open={timeOffModalOpen} onOpenChange={setTimeOffModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <span>Jadwalkan Cuti / Libur Anggota</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Cuti akan otomatis memotong kapasitas jam kerja bersih anggota pada periode terkait.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveTimeOff} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Anggota
                            </label>
                            <Select value={selectedUserIdForTimeOff} onValueChange={setSelectedUserIdForTimeOff}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jenis Cuti
                                </label>
                                <Select value={timeOffType} onValueChange={setTimeOffType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vacation">Cuti Tahunan (Vacation)</SelectItem>
                                        <SelectItem value="sick_leave">Sakit (Sick Leave)</SelectItem>
                                        <SelectItem value="training">Pelatihan / Workshop</SelectItem>
                                        <SelectItem value="public_holiday">Libur Nasional</SelectItem>
                                        <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jam Terpotong
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={hoursDeducted}
                                    onChange={(e) => setHoursDeducted(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Keterangan / Judul Cuti
                            </label>
                            <Input
                                placeholder="misal: Cuti Liburan Akhir Tahun"
                                value={timeOffTitle}
                                onChange={(e) => setTimeOffTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Mulai
                                </label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Selesai
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTimeOffModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingTimeOff}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingTimeOff ? 'Menyimpan...' : 'Simpan Cuti'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Pindahkan Tugas (Rebalance Task) */}
            <Dialog open={rebalanceModalOpen} onOpenChange={setRebalanceModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-primary" />
                            <span>Pindahkan Penugasan Tugas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pindahkan tugas <strong>{taskToRebalance?.key}: {taskToRebalance?.title}</strong> untuk menyeimbangkan beban kerja tim.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRebalanceSubmit} className="space-y-4 pt-2">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                            <div>
                                Penugasan Saat Ini: <strong>{currentAssigneeName}</strong>
                            </div>
                            <div>
                                Bobot Estimasi: <strong>{taskToRebalance?.estimate_points} Story Points</strong>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Penerima Tugas Baru
                            </label>
                            <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pilih anggota..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Tanpa Penugasan (Unassigned)</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                disabled={submittingRebalance}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingRebalance ? 'Memindahkan...' : 'Pindahkan Tugas'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
