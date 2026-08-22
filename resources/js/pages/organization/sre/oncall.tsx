import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    PhoneCall,
    CheckCircle2,
    Clock,
    AlertTriangle,
    BellRing,
    ChevronRight,
    Plus,
    UserCheck,
    Radio,
    Shield,
    Trash2,
    Calendar,
    Users,
    Activity,
    Layers,
    Send,
    Check,
} from 'lucide-react';

interface MemberItem {
    user_id?: number;
    name?: string;
    email?: string;
    order?: number;
}

interface EscalationStep {
    level: number;
    target: string;
    timeout_minutes: number;
}

interface UpcomingShift {
    cycle_index: number;
    user_id: number | null;
    user_name: string;
    is_current: boolean;
    start_formatted: string;
    end_formatted: string;
}

interface CurrentOncall {
    user_id: number | null;
    user_name: string;
    user_email: string;
    shift_ends_at: string | null;
    shift_ends_in_human: string;
    schedule_name: string;
}

interface ScheduleItem {
    id: string;
    name: string;
    rotation_type: string;
    status: string;
    members: MemberItem[];
    escalation_policy: EscalationStep[];
    started_at: string | null;
    current_oncall: CurrentOncall;
    upcoming_shifts: UpcomingShift[];
}

interface PagingLogItem {
    id: string;
    oncall_schedule_id: string;
    schedule_name: string;
    trigger_reason: string;
    escalation_level: number;
    status: string;
    triggered_by_name: string;
    responder_name: string;
    response_time_formatted: string;
    resolved_at_formatted: string | null;
    created_at_formatted: string;
}

interface Metrics {
    active_shifts: number;
    response_rate: number;
    avg_response_time: string;
    unresolved_pages: number;
}

interface OrgMember {
    id: number;
    name: string;
    email: string;
}

interface Props {
    organization: { id: string; name: string };
    metrics: Metrics;
    current_oncall: CurrentOncall | null;
    schedules: ScheduleItem[];
    paging_logs: PagingLogItem[];
    org_members: OrgMember[];
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
}

function fetchJson(url: string, method: string, body?: object): Promise<Response> {
    return fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

export default function OncallPage({
    organization,
    metrics,
    current_oncall,
    schedules,
    paging_logs,
    org_members,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [pageModalSchedule, setPageModalSchedule] = useState<ScheduleItem | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [rotationType, setRotationType] = useState('weekly');
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Paging Form states
    const [pageReason, setPageReason] = useState('');
    const [pageLevel, setPageLevel] = useState('1');
    const [isPaging, setIsPaging] = useState(false);

    const resetCreateForm = () => {
        setName('');
        setRotationType('weekly');
        setSelectedMembers(org_members.slice(0, 3).map(m => m.id));
    };

    const handleOpenCreate = () => {
        resetCreateForm();
        setCreateOpen(true);
    };

    const handleCreateSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const memberObjects = selectedMembers.map((userId, idx) => {
            const m = org_members.find(om => om.id === userId);
            return {
                user_id: userId,
                name: m?.name || 'Engineer',
                email: m?.email || '',
                order: idx + 1,
            };
        });

        fetchJson('/organization/sre/oncall', 'POST', {
            name,
            rotation_type: rotationType,
            members: memberObjects,
            escalation_policy: [
                { level: 1, target: 'Primary On-Call', timeout_minutes: 5 },
                { level: 2, target: 'Secondary / Backup', timeout_minutes: 15 },
                { level: 3, target: 'Incident Commander', timeout_minutes: 30 },
            ],
            status: 'active',
        })
            .then(() => {
                setIsSubmitting(false);
                setCreateOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleTriggerPage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pageModalSchedule) return;
        setIsPaging(true);

        fetchJson(`/organization/sre/oncall/${pageModalSchedule.id}/page`, 'POST', {
            trigger_reason: pageReason,
            escalation_level: parseInt(pageLevel, 10),
        })
            .then(() => {
                setIsPaging(false);
                setPageModalSchedule(null);
                setPageReason('');
                router.reload();
            })
            .catch(() => setIsPaging(false));
    };

    const handleAcknowledge = (logId: string) => {
        fetchJson(`/organization/sre/oncall/logs/${logId}/acknowledge`, 'POST').then(() => router.reload());
    };

    const handleResolve = (logId: string) => {
        fetchJson(`/organization/sre/oncall/logs/${logId}/resolve`, 'POST').then(() => router.reload());
    };

    const handleDeleteSchedule = (s: ScheduleItem) => {
        if (!confirm(`Hapus jadwal on-call "${s.name}"?`)) return;
        fetchJson(`/organization/sre/oncall/${s.id}`, 'DELETE').then(() => router.reload());
    };

    const toggleMemberSelection = (id: number) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(mId => mId !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                    </Badge>
                );
            case 'acknowledged':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono">
                        <UserCheck className="h-3 w-3" /> Acknowledged
                    </Badge>
                );
            case 'escalated':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-mono">
                        <AlertTriangle className="h-3 w-3" /> Escalated
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono animate-pulse">
                        <BellRing className="h-3 w-3" /> Pending
                    </Badge>
                );
        }
    };

    return (
        <AppLayout>
            <Head title="On-Call Rotation Manager & Escalation Policy Studio" />

            <div className="space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 flex items-center justify-center text-white shadow-md">
                            <Radio className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    On-Call Rotation & Escalation Studio
                                </h1>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs font-mono">
                                    24/7 Incident Escalation
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Manajemen rotasi engineer on-call otomatis, kebijakan eskalasi insiden berjenjang, dan audit paging real-time
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="h-9 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Jadwal On-Call Baru</span>
                    </Button>
                </div>

                {/* KPI Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Active Schedules</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600"><PhoneCall className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.active_shifts}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Jadwal rotasi aktif di {organization.name}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Ack / Resolution Rate</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">{metrics.response_rate}%</span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Optimal</Badge>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${metrics.response_rate}%` }} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Avg Response Time</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Clock className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.avg_response_time}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Waktu acknowledge rata-rata tim</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Unresolved Pages</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><BellRing className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">
                            {metrics.unresolved_pages}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {metrics.unresolved_pages === 0 ? 'Semua alert tertangani' : 'Memerlukan respons engineer'}
                        </div>
                    </div>
                </div>

                {/* Who is On-Call Now Card */}
                {current_oncall && (
                    <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-r from-rose-500/5 via-card to-card p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
                                    {current_oncall.user_name.charAt(0)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="bg-rose-500 text-white font-mono text-[10px] uppercase gap-1 animate-pulse">
                                            <Radio className="h-3 w-3" /> Primary On-Duty
                                        </Badge>
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {current_oncall.schedule_name}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground">{current_oncall.user_name}</h2>
                                    <p className="text-xs text-muted-foreground">{current_oncall.user_email || 'Aktif merespons insiden tier-1'}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border">
                                <div>
                                    <div className="text-[11px] text-muted-foreground">Pergantian Shift Dalam</div>
                                    <div className="text-sm font-bold text-foreground font-mono mt-0.5">
                                        {current_oncall.shift_ends_in_human}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {current_oncall.shift_ends_at}
                                    </div>
                                </div>
                                {schedules.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => setPageModalSchedule(schedules[0])}
                                        className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
                                    >
                                        <BellRing className="h-3.5 w-3.5" />
                                        <span>Trigger Test Page</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedules & Escalation Policies Board */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-rose-600" />
                        <h3 className="font-bold text-sm text-foreground">Jadwal Rotasi & Kebijakan Eskalasi</h3>
                        <span className="text-xs text-muted-foreground">— Konfigurasi rotasi per tim & workflow berjenjang</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {schedules.map((s) => (
                            <div
                                key={s.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-rose-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] font-mono capitalize">
                                                {s.rotation_type} Rotation
                                            </Badge>
                                            <Badge className="bg-muted text-muted-foreground text-[10px] font-mono uppercase">
                                                {s.status}
                                            </Badge>
                                        </div>
                                        <h4 className="font-bold text-base text-foreground leading-snug">{s.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            onClick={() => setPageModalSchedule(s)}
                                            className="h-7 text-xs px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1"
                                        >
                                            <Send className="h-3 w-3" /> Page
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteSchedule(s)}
                                            className="h-7 w-7 p-0 text-rose-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Escalation Policy Visual Tree */}
                                <div className="rounded-xl bg-muted/40 p-3 border border-border/60 space-y-2">
                                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5 text-rose-500" />
                                        <span>Multi-Level Escalation Policy</span>
                                    </div>
                                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                                        {s.escalation_policy.map((step, idx) => (
                                            <React.Fragment key={step.level}>
                                                <div className="flex-1 min-w-[130px] rounded-lg bg-card p-2 border border-border shadow-2xs space-y-1">
                                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                                        <span className="font-bold text-rose-600">L{step.level}</span>
                                                        <span className="text-muted-foreground">{step.timeout_minutes}m timeout</span>
                                                    </div>
                                                    <div className="font-medium text-xs text-foreground truncate">{step.target}</div>
                                                </div>
                                                {idx < s.escalation_policy.length - 1 && (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                {/* Upcoming 4-Shift Timeline */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-rose-500" />
                                        <span>Jadwal Rotasi Shift Mendatang</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {s.upcoming_shifts.map((shift, i) => (
                                            <div
                                                key={i}
                                                className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                                    shift.is_current
                                                        ? 'bg-rose-500/10 border-rose-500/40 text-foreground font-semibold'
                                                        : 'bg-muted/30 border-border text-muted-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between text-[10px] font-mono">
                                                    <span>{shift.is_current ? '🟢 SEKARANG' : `Shift #${shift.cycle_index + 1}`}</span>
                                                </div>
                                                <div className="font-bold truncate text-foreground">{shift.user_name}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {shift.start_formatted} - {shift.end_formatted}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Paging Event Logs */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-rose-600" />
                        <h3 className="font-bold text-sm text-foreground">Riwayat Paging & Insiden</h3>
                        <span className="text-xs text-muted-foreground">— Log eskalasi alert dan respons engineer</span>
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
                                    <tr>
                                        <th className="py-3 px-4">Alasan Alert</th>
                                        <th className="py-3 px-4">Jadwal On-Call</th>
                                        <th className="py-3 px-4">Level</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Responder</th>
                                        <th className="py-3 px-4">Respons Time</th>
                                        <th className="py-3 px-4">Waktu</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paging_logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                                Belum ada riwayat paging alert.
                                            </td>
                                        </tr>
                                    ) : (
                                        paging_logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground max-w-xs truncate">
                                                    {log.trigger_reason}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">{log.schedule_name}</td>
                                                <td className="py-3 px-4 font-mono font-bold text-rose-600">
                                                    L{log.escalation_level}
                                                </td>
                                                <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                                                <td className="py-3 px-4 text-foreground">{log.responder_name}</td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">{log.response_time_formatted}</td>
                                                <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                                                    {log.created_at_formatted}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {log.status === 'pending' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAcknowledge(log.id)}
                                                                className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1"
                                                            >
                                                                <Check className="h-3 w-3" /> Ack
                                                            </Button>
                                                        )}
                                                        {(log.status === 'pending' || log.status === 'acknowledged') && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleResolve(log.id)}
                                                                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                                                            >
                                                                <CheckCircle2 className="h-3 w-3" /> Resolve
                                                            </Button>
                                                        )}
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
            </div>

            {/* Modal: Create On-Call Schedule */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Radio className="h-5 w-5" />
                            <span>Buat Jadwal Rotasi On-Call Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan nama jadwal, siklus rotasi, dan pilih engineer dalam daftar giliran shift.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSchedule} className="space-y-4 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">Nama Jadwal On-Call *</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Database Tier-1 On-Call Rotation"
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">Siklus Rotasi Shift *</label>
                            <select
                                value={rotationType}
                                onChange={(e) => setRotationType(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                                <option value="weekly">Weekly (Setiap 7 Hari)</option>
                                <option value="biweekly">Bi-Weekly (Setiap 14 Hari)</option>
                                <option value="monthly">Monthly (Setiap 30 Hari)</option>
                            </select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Pilih Anggota Rotasi ({selectedMembers.length} dipilih)
                            </label>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-muted/20">
                                {org_members.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={() => toggleMemberSelection(m.id)}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                            selectedMembers.includes(m.id)
                                                ? 'bg-rose-500/10 border border-rose-500/40 text-foreground font-semibold'
                                                : 'hover:bg-muted/50 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3.5 w-3.5 text-rose-500" />
                                            <span>{m.name}</span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground font-mono">{m.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs flex items-start gap-2">
                            <Shield className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-rose-600 block">Default 3-Tier Escalation Policy</span>
                                <span className="text-muted-foreground">
                                    L1 (Primary: 5m) → L2 (Backup: 15m) → L3 (Incident Commander: 30m).
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Trigger Paging Alert */}
            <Dialog open={!!pageModalSchedule} onOpenChange={() => setPageModalSchedule(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <BellRing className="h-5 w-5 animate-pulse" />
                            <span>Kirim Paging Alert ke On-Call Engineer</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Kirimkan notifikasi insiden berprioritas tinggi ke engineer yang sedang bertugas di{' '}
                            <strong>{pageModalSchedule?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {pageModalSchedule && (
                        <form onSubmit={handleTriggerPage} className="space-y-3 pt-2 text-xs">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Alasan Insiden / Alert *</label>
                                <Input
                                    value={pageReason}
                                    onChange={(e) => setPageReason(e.target.value)}
                                    placeholder="Contoh: Redis Cluster Memory Saturation > 95%"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-foreground block mb-1">Level Eskalasi Awal</label>
                                <select
                                    value={pageLevel}
                                    onChange={(e) => setPageLevel(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                                >
                                    <option value="1">Level 1 — Primary On-Call Engineer</option>
                                    <option value="2">Level 2 — Secondary / Backup SRE</option>
                                    <option value="3">Level 3 — Incident Commander</option>
                                </select>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPageModalSchedule(null)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isPaging}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {isPaging ? 'Mengirim...' : 'Kirim Paging Sekarang'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
