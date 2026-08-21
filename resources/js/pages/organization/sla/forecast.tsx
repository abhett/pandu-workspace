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
    Clock,
    AlertTriangle,
    ShieldAlert,
    ShieldCheck,
    Flame,
    Zap,
    TrendingUp,
    Shield,
    Users,
    Search,
    ChevronRight,
    ArrowUpRight,
    Send,
    CheckCircle2,
    Check,
    Award,
    Activity,
    Sliders,
    AlertCircle,
    UserCheck,
} from 'lucide-react';

interface TicketItem {
    task_id: string;
    task_key: string;
    title: string;
    priority: string;
    status: string;
    project_name: string;
    assignee: {
        id: number;
        name: string;
        email: string;
    } | null;
    tracker_id: string;
    policy_name: string;
    resolution_due_at_formatted: string;
    is_resolved: boolean;
    escalation_level: number;
    risk_score: number;
    risk_level: 'breached' | 'imminent_breach' | 'high_risk' | 'moderate_risk' | 'on_track' | 'resolved';
    minutes_remaining: number;
    time_remaining_human: string;
    recommended_action: string;
}

interface EscalationLogItem {
    id: string;
    task_title: string;
    task_key: string;
    escalation_tier: number;
    previous_priority: string;
    new_priority: string;
    triggered_by_name: string;
    previous_assignee_name: string;
    new_assignee_name: string;
    breach_risk_score: number;
    reason: string;
    created_at_formatted: string;
}

interface Metrics {
    total_active_tracked: number;
    projected_compliance_pct: number;
    imminent_breach_count: number;
    high_risk_count: number;
    moderate_risk_count: number;
    escalations_this_month: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    tickets: TicketItem[];
    escalationLogs: EscalationLogItem[];
    leads: Array<{ id: number; name: string; email: string }>;
    projects: Array<{ id: string; name: string; key: string }>;
    selectedProjectId: string | null;
}

export default function SlaBreachForecastPage({
    organization,
    metrics,
    tickets,
    escalationLogs,
    leads,
    projects,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');

    // Escalation Modal
    const [escalationModalOpen, setEscalationModalOpen] = useState(false);
    const [selectedTicketForEscalation, setSelectedTicketForEscalation] = useState<TicketItem | null>(null);
    const [escalationTier, setEscalationTier] = useState<string>('2');
    const [newAssigneeId, setNewAssigneeId] = useState<string>('none');
    const [escalationReason, setEscalationReason] = useState('');
    const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);

    // Mitigation Modal
    const [mitigationModalOpen, setMitigationModalOpen] = useState(false);
    const [selectedTicketForMitigation, setSelectedTicketForMitigation] = useState<TicketItem | null>(null);
    const [mitigationNote, setMitigationNote] = useState('');
    const [isSubmittingMitigation, setIsSubmittingMitigation] = useState(false);

    const handleSelectProject = (projId: string) => {
        const params = new URLSearchParams();
        if (projId !== 'all') params.append('project_id', projId);
        router.get(`/organization/sla/forecast?${params.toString()}`);
    };

    const openEscalationModal = (ticket: TicketItem) => {
        setSelectedTicketForEscalation(ticket);
        setEscalationTier(ticket.risk_score >= 80 ? '2' : '1');
        setNewAssigneeId(ticket.assignee?.id ? ticket.assignee.id.toString() : 'none');
        setEscalationReason(
            `Risiko pelanggaran SLA terdeteksi (${ticket.risk_score}%). Memerlukan penanganan segera untuk sisa waktu ${ticket.time_remaining_human}.`
        );
        setEscalationModalOpen(true);
    };

    const handleExecuteEscalation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketForEscalation) return;
        setIsSubmittingEscalation(true);

        fetch(`/organization/sla/forecast/tasks/${selectedTicketForEscalation.task_id}/escalate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                tier: Number(escalationTier),
                new_assignee_id: newAssigneeId === 'none' ? null : Number(newAssigneeId),
                reason: escalationReason,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingEscalation(false);
                setEscalationModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmittingEscalation(false));
    };

    const openMitigationModal = (ticket: TicketItem) => {
        setSelectedTicketForMitigation(ticket);
        setMitigationNote('Investigasi kendala sedang berlangsung, estimasi selesai dalam 1 jam.');
        setMitigationModalOpen(true);
    };

    const handleSaveMitigation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketForMitigation) return;
        setIsSubmittingMitigation(true);

        fetch(`/organization/sla/forecast/tasks/${selectedTicketForMitigation.task_id}/mitigate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                note: mitigationNote,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingMitigation(false);
                setMitigationModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmittingMitigation(false));
    };

    const renderRiskBadge = (level: string, score: number) => {
        switch (level) {
            case 'breached':
                return (
                    <Badge className="bg-rose-700 text-white text-[10px] gap-1 font-mono uppercase">
                        <Flame className="h-3 w-3" />
                        <span>Breached (100%)</span>
                    </Badge>
                );
            case 'imminent_breach':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Kritis ({score}%)</span>
                    </Badge>
                );
            case 'high_risk':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>Tinggi ({score}%)</span>
                    </Badge>
                );
            case 'moderate_risk':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono uppercase font-semibold">
                        <span>Sedang ({score}%)</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono uppercase">
                        <Check className="h-3 w-3" />
                        <span>Aman ({score}%)</span>
                    </Badge>
                );
        }
    };

    const filteredTickets = tickets.filter((t) => {
        const matchesSearch =
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.task_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.assignee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesRisk = riskFilter === 'all' || t.risk_level === riskFilter;
        return matchesSearch && matchesRisk;
    });

    return (
        <AppLayout>
            <Head title="Automated SLA Breach Forecast & Escalation Engine" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Predictive SLA Breach Forecasting & Support Escalation
                                </h1>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs font-mono">
                                    AI Early-Warning
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Prediksi pelanggaran target resolusi SLA, deteksi tiket berisiko tinggi (&lt;4 jam), dan matriks eskalasi berjenjang
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Scope Project Filter */}
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
                    </div>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Projected Compliance */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Prediksi Kepatuhan SLA</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.projected_compliance_pct}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Projected
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Target kepatuhan SLA 30 hari ke depan
                        </div>
                    </div>

                    {/* Imminent Breach (<4h) */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Risiko Kritis (&lt;4 Jam)</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.imminent_breach_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Tiket Kritis</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Perlu eskalasi dan intervensi cepat
                        </div>
                    </div>

                    {/* High Risk */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tiket Risiko Tinggi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.high_risk_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Dalam Pengawasan</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Sisa waktu resolusi 4-12 jam
                        </div>
                    </div>

                    {/* Escalations Month */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Eskalasi Ditangani</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.escalations_this_month}
                            </span>
                            <span className="text-xs text-muted-foreground">Bulan Ini</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Prosedur eskalasi berjenjang aktif
                        </div>
                    </div>
                </div>

                {/* Main Predictive Breach Table & Escalation Feed Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Predictive Tickets Table (8 cols) */}
                    <div className="lg:col-span-8 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Cari tiket, kunci atau assignee..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>

                            <Select value={riskFilter} onValueChange={setRiskFilter}>
                                <SelectTrigger className="h-8 text-xs w-44 font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tingkat Risiko</SelectItem>
                                    <SelectItem value="imminent_breach">🔴 Kritis (&lt;4j)</SelectItem>
                                    <SelectItem value="high_risk">🟠 Risiko Tinggi</SelectItem>
                                    <SelectItem value="moderate_risk">🔵 Risiko Sedang</SelectItem>
                                    <SelectItem value="on_track">🟢 Aman Sesuai Target</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                                            <th className="py-3 px-4">Tiket & Tugas</th>
                                            <th className="py-3 px-3">Assignee</th>
                                            <th className="py-3 px-3">Sisa Waktu</th>
                                            <th className="py-3 px-3">Probabilitas Breach</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredTickets.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                    Tidak ada tiket aktif yang memerlukan eskalasi.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTickets.map((t) => (
                                                <tr key={t.task_id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                                {t.task_key}
                                                            </Badge>
                                                            <span className="font-semibold text-foreground truncate max-w-[200px]">
                                                                {t.title}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                                            {t.project_name} | Prioritas:{' '}
                                                            <span className="capitalize font-semibold text-foreground">
                                                                {t.priority}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3">
                                                        <div className="font-semibold text-foreground">
                                                            {t.assignee?.name ?? 'Belum Ditugaskan'}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {t.policy_name}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3 font-mono">
                                                        <div
                                                            className={`font-bold ${
                                                                t.minutes_remaining <= 240
                                                                    ? 'text-rose-600'
                                                                    : t.minutes_remaining <= 720
                                                                    ? 'text-amber-600'
                                                                    : 'text-foreground'
                                                            }`}
                                                        >
                                                            {t.time_remaining_human}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            Tenggat: {t.resolution_due_at_formatted}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-3">
                                                        {renderRiskBadge(t.risk_level, t.risk_score)}
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openEscalationModal(t)}
                                                                className="h-6 text-[10px] px-2 gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                                                                title="Eskalasi tiket ini ke tingkatan berikutnya"
                                                            >
                                                                <Zap className="h-3 w-3" />
                                                                <span>Eskalasi</span>
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openMitigationModal(t)}
                                                                className="h-6 text-[10px] px-1.5"
                                                                title="Catat tindakan mitigasi"
                                                            >
                                                                <span>Mitigasi</span>
                                                            </Button>
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

                    {/* Right: Escalation Timeline Feed (4 cols) */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-600" />
                            <h3 className="font-bold text-sm text-foreground">
                                Riwayat Log Eskalasi ({escalationLogs.length})
                            </h3>
                        </div>

                        <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                            {escalationLogs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-card">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                    <h4 className="text-xs font-bold text-foreground">Belum Ada Eskalasi</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Seluruh tiket SLA diselesaikan tepat waktu oleh tim teknis.
                                    </p>
                                </div>
                            ) : (
                                escalationLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                className={`text-[10px] font-mono ${
                                                    log.escalation_tier === 3
                                                        ? 'bg-purple-700 text-white'
                                                        : log.escalation_tier === 2
                                                        ? 'bg-rose-600 text-white'
                                                        : 'bg-amber-600 text-white'
                                                }`}
                                            >
                                                Tier {log.escalation_tier} Escalation
                                            </Badge>
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                {log.created_at_formatted}
                                            </span>
                                        </div>

                                        <div className="font-bold text-xs text-foreground truncate">
                                            {log.task_key}: {log.task_title}
                                        </div>

                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {log.reason}
                                        </p>

                                        <div className="pt-1 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                                            <span>Oleh: {log.triggered_by_name}</span>
                                            <span>Assignee: {log.new_assignee_name}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Eksekusi Eskalasi Berjenjang */}
            <Dialog open={escalationModalOpen} onOpenChange={setEscalationModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Zap className="h-5 w-5" />
                            <span>Prosedur Eskalasi SLA Berjenjang</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Eskalasikan tiket {selectedTicketForEscalation?.task_key} untuk mencegah keterlambatan SLA.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteEscalation} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tingkatan Eskalasi (Escalation Tier) *
                            </label>
                            <Select value={escalationTier} onValueChange={setEscalationTier}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">
                                        🟡 Tier 1: Support Lead Alert & Priority Upgrade (High)
                                    </SelectItem>
                                    <SelectItem value="2">
                                        🟠 Tier 2: Engineering Manager Takeover (Urgent)
                                    </SelectItem>
                                    <SelectItem value="3">
                                        🔴 Tier 3: Executive War Room (VIP Client Breach Risk)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Alihkan Penugasan ke PIC Senior On-Call
                            </label>
                            <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Tetap pada PIC Saat Ini --</SelectItem>
                                    {leads.map((l) => (
                                        <SelectItem key={l.id} value={l.id.toString()}>
                                            {l.name} ({l.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Alasan & Catatan Tindakan Eskalasi *
                            </label>
                            <Textarea
                                value={escalationReason}
                                onChange={(e) => setEscalationReason(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEscalationModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingEscalation}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isSubmittingEscalation ? 'Mengeksekusi...' : 'Eksekusi Eskalasi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Catatan Mitigasi Risiko */}
            <Dialog open={mitigationModalOpen} onOpenChange={setMitigationModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-indigo-600" />
                            <span>Catat Mitigasi Risiko SLA</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Dokumentasikan langkah mitigasi teknis untuk {selectedTicketForMitigation?.task_key}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveMitigation} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Catatan Tindakan Mitigasi *
                            </label>
                            <Textarea
                                value={mitigationNote}
                                onChange={(e) => setMitigationNote(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMitigationModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingMitigation}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSubmittingMitigation ? 'Menyimpan...' : 'Simpan Mitigasi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
