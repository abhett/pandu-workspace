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
    AlertTriangle,
    Flame,
    Radio,
    Clock,
    Activity,
    CheckCircle2,
    Users,
    Calendar,
    Plus,
    Search,
    Edit,
    Trash2,
    MessageSquare,
    FileText,
    ShieldAlert,
    Zap,
    Send,
    Terminal,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from 'lucide-react';

interface IncidentUpdateItem {
    id: string;
    status_update: string;
    message: string;
    user_name: string;
    posted_at_formatted: string;
}

interface PostMortemItem {
    id: string;
    root_cause: string;
    trigger_event: string;
    lessons_learned: string | null;
    action_items: string[];
    status: 'draft' | 'published' | 'reviewed';
    author_name: string | null;
}

interface IncidentItem {
    id: string;
    incident_number: number;
    incident_code: string;
    title: string;
    severity: 'P1' | 'P2' | 'P3' | 'P4';
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    impact_summary: string;
    commander: {
        id: number;
        name: string;
        email: string;
    } | null;
    project_name: string | null;
    started_at_formatted: string;
    acknowledged_at_formatted: string | null;
    resolved_at_formatted: string | null;
    mtta_minutes: number | null;
    mttr_minutes: number | null;
    updates_count: number;
    latest_update: {
        status_update: string;
        message: string;
        user_name: string;
        posted_at_formatted: string;
    } | null;
    updates: IncidentUpdateItem[];
    has_post_mortem: boolean;
    post_mortem: PostMortemItem | null;
}

interface OnCallRotaData {
    id: string;
    shift_name: string;
    primary_user: { id: number; name: string; email: string } | null;
    secondary_user: { id: number; name: string; email: string } | null;
    shift_start_formatted: string;
    shift_end_formatted: string;
}

interface Metrics {
    total_incidents: number;
    active_incidents: number;
    mtta_minutes: number;
    mttr_minutes: number;
    p1_outages: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    onCallRota: OnCallRotaData | null;
    incidents: IncidentItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    members: Array<{ id: number; name: string; email: string }>;
    selectedSeverity: string | null;
    selectedStatus: string | null;
}

export default function IncidentWarRoomPage({
    organization,
    metrics,
    onCallRota,
    incidents,
    projects,
    members,
    selectedSeverity,
    selectedStatus,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIncidentIds, setExpandedIncidentIds] = useState<string[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal: Declare Incident
    const [declareModalOpen, setDeclareModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formSeverity, setFormSeverity] = useState<string>('P2');
    const [formImpact, setFormImpact] = useState('');
    const [formCommanderId, setFormCommanderId] = useState<string>('none');
    const [formProjectId, setFormProjectId] = useState<string>('none');
    const [isDeclaring, setIsDeclaring] = useState(false);

    // Modal: War Room Update
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updatingIncident, setUpdatingIncident] = useState<IncidentItem | null>(null);
    const [formStatusUpdate, setFormStatusUpdate] = useState<string>('investigating');
    const [formUpdateMessage, setFormUpdateMessage] = useState('');
    const [isPostingUpdate, setIsPostingUpdate] = useState(false);

    // Modal: Post-Mortem RCA
    const [rcaModalOpen, setRcaModalOpen] = useState(false);
    const [rcaIncident, setRcaIncident] = useState<IncidentItem | null>(null);
    const [formRootCause, setFormRootCause] = useState('');
    const [formTriggerEvent, setFormTriggerEvent] = useState('');
    const [formLessonsLearned, setFormLessonsLearned] = useState('');
    const [formActionItems, setFormActionItems] = useState('');
    const [formRcaStatus, setFormRcaStatus] = useState<string>('published');
    const [isSavingRca, setIsSavingRca] = useState(false);

    // Modal: On-Call Rota
    const [rotaModalOpen, setRotaModalOpen] = useState(false);
    const [formShiftName, setFormShiftName] = useState('24/7 Platform SRE Shift');
    const [formPrimaryUserId, setFormPrimaryUserId] = useState<string>(members[0]?.id ? members[0].id.toString() : 'none');
    const [formSecondaryUserId, setFormSecondaryUserId] = useState<string>('none');
    const [isSavingRota, setIsSavingRota] = useState(false);

    const handleFilterChange = (sev?: string, stat?: string) => {
        const params = new URLSearchParams();
        const curSev = sev !== undefined ? sev : selectedSeverity;
        const curStat = stat !== undefined ? stat : selectedStatus;

        if (curSev && curSev !== 'all') params.append('severity', curSev);
        if (curStat && curStat !== 'all') params.append('status', curStat);

        router.get(`/organization/ops/incidents?${params.toString()}`);
    };

    const toggleExpand = (id: string) => {
        if (expandedIncidentIds.includes(id)) {
            setExpandedIncidentIds(expandedIncidentIds.filter((item) => item !== id));
        } else {
            setExpandedIncidentIds([...expandedIncidentIds, id]);
        }
    };

    const openDeclareModal = () => {
        setFormTitle('');
        setFormSeverity('P2');
        setFormImpact('');
        setFormCommanderId(members[0]?.id ? members[0].id.toString() : 'none');
        setFormProjectId('none');
        setDeclareModalOpen(true);
    };

    const handleDeclareIncident = (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeclaring(true);

        fetch('/organization/ops/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: formTitle,
                severity: formSeverity,
                impact_summary: formImpact,
                commander_id: formCommanderId === 'none' ? null : Number(formCommanderId),
                project_id: formProjectId === 'none' ? null : formProjectId,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsDeclaring(false);
                setDeclareModalOpen(false);
                router.reload();
            })
            .catch(() => setIsDeclaring(false));
    };

    const openUpdateModal = (inc: IncidentItem) => {
        setUpdatingIncident(inc);
        setFormStatusUpdate(inc.status);
        setFormUpdateMessage('');
        setUpdateModalOpen(true);
    };

    const handlePostUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!updatingIncident) return;
        setIsPostingUpdate(true);

        fetch(`/organization/ops/incidents/${updatingIncident.id}/updates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                status_update: formStatusUpdate,
                message: formUpdateMessage,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsPostingUpdate(false);
                setUpdateModalOpen(false);
                router.reload();
            })
            .catch(() => setIsPostingUpdate(false));
    };

    const handleResolveIncident = (inc: IncidentItem) => {
        if (!confirm(`Tandai insiden "${inc.incident_code}: ${inc.title}" sebagai SELESAI (Resolved)?`)) return;

        setActionLoadingId(inc.id);
        fetch(`/organization/ops/incidents/${inc.id}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const openRcaModal = (inc: IncidentItem) => {
        setRcaIncident(inc);
        if (inc.post_mortem) {
            setFormRootCause(inc.post_mortem.root_cause);
            setFormTriggerEvent(inc.post_mortem.trigger_event);
            setFormLessonsLearned(inc.post_mortem.lessons_learned || '');
            setFormActionItems((inc.post_mortem.action_items || []).join('\n'));
            setFormRcaStatus(inc.post_mortem.status);
        } else {
            setFormRootCause('');
            setFormTriggerEvent('');
            setFormLessonsLearned('');
            setFormActionItems('');
            setFormRcaStatus('published');
        }
        setRcaModalOpen(true);
    };

    const handleSaveRca = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rcaIncident) return;
        setIsSavingRca(true);

        fetch(`/organization/ops/incidents/${rcaIncident.id}/post-mortem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                root_cause: formRootCause,
                trigger_event: formTriggerEvent,
                lessons_learned: formLessonsLearned,
                action_items: formActionItems,
                status: formRcaStatus,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingRca(false);
                setRcaModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingRca(false));
    };

    const openRotaModal = () => {
        if (onCallRota) {
            setFormShiftName(onCallRota.shift_name);
            setFormPrimaryUserId(onCallRota.primary_user?.id ? onCallRota.primary_user.id.toString() : 'none');
            setFormSecondaryUserId(onCallRota.secondary_user?.id ? onCallRota.secondary_user.id.toString() : 'none');
        }
        setRotaModalOpen(true);
    };

    const handleSaveRota = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRota(true);

        fetch('/organization/ops/incidents/on-call-rota', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                shift_name: formShiftName,
                primary_user_id: Number(formPrimaryUserId),
                secondary_user_id: formSecondaryUserId === 'none' ? null : Number(formSecondaryUserId),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingRota(false);
                setRotaModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingRota(false));
    };

    const handleDeleteIncident = (inc: IncidentItem) => {
        if (!confirm(`Hapus rekaman insiden "${inc.incident_code}"?`)) return;

        fetch(`/organization/ops/incidents/${inc.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                router.reload();
            });
    };

    const renderSeverityBadge = (sev: string) => {
        switch (sev) {
            case 'P1':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <Flame className="h-3 w-3" />
                        <span>P1 Critical</span>
                    </Badge>
                );
            case 'P2':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>P2 Major</span>
                    </Badge>
                );
            case 'P3':
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <span>P3 Minor</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-slate-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>P4 Notice</span>
                    </Badge>
                );
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Resolved</span>
                    </Badge>
                );
            case 'monitoring':
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Activity className="h-3 w-3" />
                        <span>Monitoring</span>
                    </Badge>
                );
            case 'identified':
                return (
                    <Badge className="bg-purple-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Zap className="h-3 w-3" />
                        <span>Identified</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase animate-pulse">
                        <Radio className="h-3 w-3" />
                        <span>Investigating</span>
                    </Badge>
                );
        }
    };

    const filteredIncidents = incidents.filter((i) => {
        return (
            i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.impact_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.incident_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Real-Time Incident War Room, On-Call Rota & Post-Mortem Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md">
                            <Flame className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Incident War Room & Post-Mortem Studio
                                </h1>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs font-mono">
                                    24/7 Ops Resilience
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Koordinasi respon darurat P1-P4, jadwal on-call rota, lini masa siaran langsung war room, dan analisis akar masalah RCA
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={openDeclareModal}
                            className="h-9 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                        >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Deklarasikan Insiden</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Incidents */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Insiden Aktif Berjalan</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Radio className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                                {metrics.active_incidents}
                            </span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                Live War Room
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.total_incidents} total insiden tercatat
                        </div>
                    </div>

                    {/* MTTA */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Mean Time to Acknowledge (MTTA)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.mtta_minutes}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">menit</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Waktu tanggap awal tim On-Call SRE
                        </div>
                    </div>

                    {/* MTTR */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Mean Time to Resolve (MTTR)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.mttr_minutes}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">menit</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Waktu rata-rata hingga sistem pulih
                        </div>
                    </div>

                    {/* P1 Outages */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">P1 Outages (30 Hari)</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.p1_outages}
                            </span>
                            <span className="text-xs text-muted-foreground">kejadian</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Kategori pemadaman kritis sistem
                        </div>
                    </div>
                </div>

                {/* On-Call Rota Banner Card */}
                {onCallRota && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-foreground">{onCallRota.shift_name}</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                        Active Shift
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                                    <span>Primary On-Call: <strong className="text-foreground">{onCallRota.primary_user?.name ?? 'SRE Lead'}</strong></span>
                                    <span>Secondary Escalation: <strong className="text-foreground">{onCallRota.secondary_user?.name ?? 'Tech Lead'}</strong></span>
                                    <span className="font-mono">({onCallRota.shift_start_formatted} - {onCallRota.shift_end_formatted})</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={openRotaModal}
                            className="h-8 text-xs font-semibold"
                        >
                            Atur Jadwal On-Call
                        </Button>
                    </div>
                )}

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari kode insiden (cth: INC-001), judul masalah, atau dampak..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedSeverity || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Severity</SelectItem>
                                <SelectItem value="P1">🔴 P1 Critical</SelectItem>
                                <SelectItem value="P2">🟠 P2 Major</SelectItem>
                                <SelectItem value="P3">🔵 P3 Minor</SelectItem>
                                <SelectItem value="P4">⚪ P4 Notice</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val)}
                        >
                            <SelectTrigger className="h-8 text-xs w-40 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="investigating">🚨 Investigating</SelectItem>
                                <SelectItem value="identified">🔍 Identified</SelectItem>
                                <SelectItem value="monitoring">📊 Monitoring</SelectItem>
                                <SelectItem value="resolved">✅ Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Incidents Feed */}
                <div className="space-y-4">
                    {filteredIncidents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                            <h3 className="font-bold text-sm text-foreground">Semua Sistem Beroperasi Normal</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Tidak ada rekaman insiden aktif yang sesuai dengan filter pencarian.
                            </p>
                        </div>
                    ) : (
                        filteredIncidents.map((inc) => {
                            const isExpanded = expandedIncidentIds.includes(inc.id);
                            return (
                                <div
                                    key={inc.id}
                                    className={`rounded-2xl border bg-card p-5 shadow-xs space-y-4 transition-all ${
                                        inc.status === 'investigating'
                                            ? 'border-rose-500/50 bg-rose-500/5'
                                            : inc.status === 'resolved'
                                            ? 'border-border opacity-90'
                                            : 'border-border hover:border-border/80'
                                    }`}
                                >
                                    {/* Incident Header */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-3">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="font-mono font-bold text-xs bg-muted px-2.5 py-1 rounded-lg border border-border">
                                                {inc.incident_code}
                                            </span>
                                            {renderSeverityBadge(inc.severity)}
                                            {renderStatusBadge(inc.status)}
                                            {inc.project_name && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    📁 {inc.project_name}
                                                </Badge>
                                            )}
                                            <h3 className="font-bold text-sm text-foreground">
                                                {inc.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {inc.status !== 'resolved' && (
                                                <Button
                                                    size="sm"
                                                    disabled={actionLoadingId === inc.id}
                                                    onClick={() => handleResolveIncident(inc)}
                                                    className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>Selesaikan</span>
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openUpdateModal(inc)}
                                                className="h-7 text-xs font-semibold gap-1"
                                            >
                                                <MessageSquare className="h-3 w-3" />
                                                <span>Update War Room</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openRcaModal(inc)}
                                                className={`h-7 text-xs font-semibold gap-1 ${inc.has_post_mortem ? 'text-purple-600 border-purple-500/30' : ''}`}
                                            >
                                                <FileText className="h-3 w-3" />
                                                <span>{inc.has_post_mortem ? 'Post-Mortem (Lihat)' : 'Buat RCA'}</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteIncident(inc)}
                                                className="h-7 w-7 p-0 text-rose-500"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Impact Summary & Metadata */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                        <div className="md:col-span-2 p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                                            <span className="font-semibold text-foreground block">
                                                Ringkasan Dampak Operasional:
                                            </span>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {inc.impact_summary}
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1 text-muted-foreground font-mono">
                                            <div>Komandan: <strong className="text-foreground">{inc.commander?.name ?? 'SRE On-Call'}</strong></div>
                                            <div>Mulai: {inc.started_at_formatted}</div>
                                            {inc.mtta_minutes && <div>MTTA: <strong className="text-amber-600">{inc.mtta_minutes} menit</strong></div>}
                                            {inc.mttr_minutes && <div>MTTR: <strong className="text-emerald-600">{inc.mttr_minutes} menit</strong></div>}
                                        </div>
                                    </div>

                                    {/* Latest War Room Update & Timeline Toggle */}
                                    {inc.latest_update && (
                                        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground flex items-center gap-1">
                                                        <Terminal className="h-3.5 w-3.5 text-rose-600" />
                                                        <span>Lini Masa War Room ({inc.updates_count} update):</span>
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                                                        {inc.latest_update.status_update}
                                                    </Badge>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleExpand(inc.id)}
                                                    className="h-6 text-[10px] px-1.5 gap-1 text-muted-foreground"
                                                >
                                                    <span>{isExpanded ? 'Sembunyikan' : 'Buka Semua'}</span>
                                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                </Button>
                                            </div>

                                            {/* If not expanded, show only latest */}
                                            {!isExpanded ? (
                                                <div className="text-xs text-foreground bg-background/50 p-2.5 rounded-lg border border-border/40 flex items-start justify-between gap-2">
                                                    <p className="leading-relaxed">{inc.latest_update.message}</p>
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                        {inc.latest_update.user_name} ({inc.latest_update.posted_at_formatted})
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 pt-1">
                                                    {inc.updates.map((u) => (
                                                        <div
                                                            key={u.id}
                                                            className="text-xs bg-background/50 p-2.5 rounded-lg border border-border/40 flex items-start justify-between gap-2"
                                                        >
                                                            <div className="space-y-0.5">
                                                                <Badge variant="outline" className="text-[9px] font-mono capitalize mb-1">
                                                                    {u.status_update}
                                                                </Badge>
                                                                <p className="text-foreground leading-relaxed">{u.message}</p>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                                {u.user_name} ({u.posted_at_formatted})
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Post-Mortem Preview if published */}
                                    {inc.post_mortem && (
                                        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs space-y-1.5">
                                            <div className="flex items-center justify-between font-semibold text-purple-700 dark:text-purple-400">
                                                <span>📄 Post-Mortem RCA: {inc.post_mortem.status.toUpperCase()}</span>
                                                <span className="font-mono text-[10px] text-muted-foreground">Penulis: {inc.post_mortem.author_name}</span>
                                            </div>
                                            <p className="text-muted-foreground">
                                                <strong>Root Cause:</strong> {inc.post_mortem.root_cause}
                                            </p>
                                            {inc.post_mortem.action_items && inc.post_mortem.action_items.length > 0 && (
                                                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-foreground">Action Items:</span>
                                                    {inc.post_mortem.action_items.map((ai, idx) => (
                                                        <Badge key={idx} variant="secondary" className="text-[10px]">
                                                            ✓ {ai}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal: Deklarasi Insiden Baru */}
            <Dialog open={declareModalOpen} onOpenChange={setDeclareModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Flame className="h-5 w-5" />
                            <span>Deklarasikan Insiden Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Buka War Room operasional dan beri notifikasi kepada tim On-Call SRE.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDeclareIncident} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Masalah Insiden *
                            </label>
                            <Input
                                placeholder="cth: PostgreSQL Aurora Primary Connection Pool Exhaustion"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tingkat Keparahan (Severity) *
                                </label>
                                <Select value={formSeverity} onValueChange={setFormSeverity}>
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="P1">🔴 P1 - Critical Outage</SelectItem>
                                        <SelectItem value="P2">🟠 P2 - Major Degradation</SelectItem>
                                        <SelectItem value="P3">🔵 P3 - Minor Incident</SelectItem>
                                        <SelectItem value="P4">⚪ P4 - Low Priority Notice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Komandan Insiden (Commander)
                                </label>
                                <Select value={formCommanderId} onValueChange={setFormCommanderId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">SRE On-Call Default</SelectItem>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                👤 {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Ringkasan Dampak (Impact Summary) *
                            </label>
                            <Textarea
                                placeholder="Jelaskan dampak degradasi terhadap pengguna atau downstream microservices..."
                                value={formImpact}
                                onChange={(e) => setFormImpact(e.target.value)}
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Proyek Terkait (Opsional)
                            </label>
                            <Select value={formProjectId} onValueChange={setFormProjectId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">🌐 Seluruh Infrastruktur</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            📁 {p.name} ({p.key})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeclareModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isDeclaring}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isDeclaring ? 'Mendeklarasikan...' : 'Deklarasikan Insiden'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: War Room Update */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <MessageSquare className="h-5 w-5 text-rose-600" />
                            <span>Kirim Update War Room</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {updatingIncident ? `${updatingIncident.incident_code}: ${updatingIncident.title}` : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePostUpdate} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Transisi Status Insiden *
                            </label>
                            <Select value={formStatusUpdate} onValueChange={setFormStatusUpdate}>
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="investigating">🚨 Investigating</SelectItem>
                                    <SelectItem value="identified">🔍 Identified (Penyebab Ditemukan)</SelectItem>
                                    <SelectItem value="monitoring">📊 Monitoring (Fix Diterapkan)</SelectItem>
                                    <SelectItem value="resolved">✅ Resolved (Selesai)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pesan Pembaruan Lini Masa *
                            </label>
                            <Textarea
                                placeholder="Jelaskan temuan investigasi, tindakan mitigasi, atau progres fix..."
                                value={formUpdateMessage}
                                onChange={(e) => setFormUpdateMessage(e.target.value)}
                                className="text-xs min-h-[90px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUpdateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPostingUpdate}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isPostingUpdate ? 'Mengirim...' : 'Kirim Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Post-Mortem Root Cause Analysis */}
            <Dialog open={rcaModalOpen} onOpenChange={setRcaModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600">
                            <FileText className="h-5 w-5" />
                            <span>Blameless Post-Mortem & Root Cause Analysis</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Dokumentasi analisis akar masalah untuk mencegah insiden berulang.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRca} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Akar Masalah (Root Cause) *
                            </label>
                            <Textarea
                                placeholder="Analisis mendalam mengapa masalah terjadi (Metodologi 5-Whys)..."
                                value={formRootCause}
                                onChange={(e) => setFormRootCause(e.target.value)}
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Peristiwa Pemicu (Trigger Event) *
                            </label>
                            <Textarea
                                placeholder="Aktivitas atau kondisi yang memicu terjadinya pemadaman..."
                                value={formTriggerEvent}
                                onChange={(e) => setFormTriggerEvent(e.target.value)}
                                className="text-xs min-h-[50px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pembelajaran yang Dipetik (Lessons Learned)
                            </label>
                            <Textarea
                                placeholder="Apa yang berjalan baik, apa yang kurang, dan celah observabilitas..."
                                value={formLessonsLearned}
                                onChange={(e) => setFormLessonsLearned(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Butir Aksi Pencegahan / Action Items (1 per baris)
                            </label>
                            <Textarea
                                placeholder="Tindakan pencegahan 1&#10;Tindakan pencegahan 2"
                                value={formActionItems}
                                onChange={(e) => setFormActionItems(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRcaModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingRca}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                            >
                                {isSavingRca ? 'Menyimpan...' : 'Simpan Post-Mortem'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Konfigurasi On-Call Rota */}
            <Dialog open={rotaModalOpen} onOpenChange={setRotaModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Users className="h-5 w-5" />
                            <span>Konfigurasi Jadwal On-Call Rota</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tetapkan petugas siaga utama dan jalur eskalasi sekunder.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRota} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Shift Rota *
                            </label>
                            <Input
                                placeholder="cth: 24/7 Platform SRE Primary"
                                value={formShiftName}
                                onChange={(e) => setFormShiftName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Petugas Siaga Utama (Primary On-Call) *
                            </label>
                            <Select value={formPrimaryUserId} onValueChange={setFormPrimaryUserId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            👤 {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Petugas Eskalasi Cadangan (Secondary)
                            </label>
                            <Select value={formSecondaryUserId} onValueChange={setFormSecondaryUserId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tidak Ada</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            👤 {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRotaModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingRota}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                            >
                                {isSavingRota ? 'Menyimpan...' : 'Simpan Jadwal'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
