import React, { useState, useEffect, useRef } from 'react';
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
    ShieldCheck,
    ShieldAlert,
    Radio,
    Terminal,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Flame,
    Play,
    Pause,
    RefreshCw,
    Download,
    Award,
    FileText,
    Search,
    ChevronDown,
    ChevronRight,
    Lock,
    Key,
    UserCheck,
    UserX,
    Activity,
    Plus,
    Trash2,
    Edit3,
    Check,
    Eye,
} from 'lucide-react';

interface AuditLogEntry {
    id: string;
    event_category: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    ip_address: string;
    user_agent: string | null;
    status: string;
    changes: Record<string, any> | null;
    error_message: string | null;
    created_at_formatted: string;
    timestamp_iso: string;
}

interface IncidentItem {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    framework: string;
    status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'false_positive';
    summary: string;
    mitigation_notes: string | null;
    reporter_name: string;
    assignee_name: string;
    audit_log: AuditLogEntry | null;
    resolved_at_formatted: string | null;
    created_at_formatted: string;
}

interface FrameworkItem {
    name: string;
    score: number;
    status: 'compliant' | 'at_risk' | 'non_compliant';
    controls_passed: number;
    total_controls: number;
}

interface Metrics {
    total_events_count: number;
    compliance_health_score: number;
    open_incidents_count: number;
    critical_incidents_count: number;
    resolved_incidents_count: number;
    failed_logs_24h: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    logs: AuditLogEntry[];
    incidents: IncidentItem[];
    frameworks: Record<string, FrameworkItem>;
    members: Array<{ id: number; name: string; email: string }>;
    filters: {
        category: string;
        status: string;
    };
}

export default function LiveAuditStreamPage({
    organization,
    metrics,
    logs: initialLogs,
    incidents,
    frameworks,
    members,
    filters,
}: Props) {
    const [streamLogs, setStreamLogs] = useState<AuditLogEntry[]>(initialLogs);
    const [isStreaming, setIsStreaming] = useState(true);
    const [pollInterval, setPollInterval] = useState<number>(3000); // 3 seconds
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Incident Modal state
    const [incidentModalOpen, setIncidentModalOpen] = useState(false);
    const [selectedLogForIncident, setSelectedLogForIncident] = useState<AuditLogEntry | null>(null);
    const [incidentTitle, setIncidentTitle] = useState('');
    const [incidentSeverity, setIncidentSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'info'>('high');
    const [incidentFramework, setIncidentFramework] = useState('SOC2_TYPE_II');
    const [incidentSummary, setIncidentSummary] = useState('');
    const [incidentMitigation, setIncidentMitigation] = useState('');
    const [incidentAssigneeId, setIncidentAssigneeId] = useState('none');
    const [isSavingIncident, setIsSavingIncident] = useState(false);

    // Certification Report Modal
    const [certModalOpen, setCertModalOpen] = useState(false);
    const [certFramework, setCertFramework] = useState('SOC2_TYPE_II');
    const [certData, setCertData] = useState<any>(null);
    const [loadingCert, setLoadingCert] = useState(false);

    const latestLogIdRef = useRef<string | null>(initialLogs[0]?.id || null);

    // Polling effect for real-time live streamer
    useEffect(() => {
        if (!isStreaming || pollInterval === 0) return;

        const interval = setInterval(() => {
            const afterId = latestLogIdRef.current;
            const params = new URLSearchParams();
            if (afterId) params.append('after_id', afterId);
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (selectedStatus !== 'all') params.append('status', selectedStatus);

            fetch(`/organization/compliance/live-stream/feed?${params.toString()}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.logs && data.logs.length > 0) {
                        setStreamLogs((prev) => {
                            const newIds = new Set(data.logs.map((l: AuditLogEntry) => l.id));
                            const filteredOld = prev.filter((l) => !newIds.has(l.id));
                            return [...data.logs, ...filteredOld].slice(0, 100);
                        });
                        latestLogIdRef.current = data.logs[0].id;
                    }
                })
                .catch(() => {});
        }, pollInterval);

        return () => clearInterval(interval);
    }, [isStreaming, pollInterval, selectedCategory, selectedStatus]);

    const openReportIncidentModal = (log?: AuditLogEntry) => {
        setSelectedLogForIncident(log || null);
        setIncidentTitle(
            log ? `Suspicious Activity in ${log.event_category}: ${log.action}` : 'Manual Compliance Security Incident'
        );
        setIncidentSeverity(log?.status === 'failed' ? 'critical' : 'high');
        setIncidentFramework('SOC2_TYPE_II');
        setIncidentSummary(
            log
                ? `Anomalous activity detected from IP ${log.ip_address} executing ${log.action} on ${log.resource_type}.`
                : ''
        );
        setIncidentMitigation('');
        setIncidentAssigneeId(members[0]?.id ? members[0].id.toString() : 'none');
        setIncidentModalOpen(true);
    };

    const handleSaveIncident = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingIncident(true);

        const payload = {
            audit_log_id: selectedLogForIncident?.id || null,
            assigned_to: incidentAssigneeId === 'none' ? null : Number(incidentAssigneeId),
            title: incidentTitle,
            severity: incidentSeverity,
            framework: incidentFramework,
            status: 'open',
            summary: incidentSummary,
            mitigation_notes: incidentMitigation,
        };

        fetch('/organization/compliance/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingIncident(false);
                setIncidentModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingIncident(false));
    };

    const handleUpdateIncidentStatus = (incId: string, newStatus: string) => {
        fetch(`/organization/compliance/incidents/${incId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ status: newStatus }),
        }).then(() => router.reload());
    };

    const handleDeleteIncident = (incId: string) => {
        fetch(`/organization/compliance/incidents/${incId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const openCertificationModal = (fw = 'SOC2_TYPE_II') => {
        setCertFramework(fw);
        setLoadingCert(true);
        setCertModalOpen(true);

        fetch(`/organization/compliance/certification-export?framework=${fw}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((res) => res.json())
            .then((data) => {
                setLoadingCert(false);
                if (data.certificate) {
                    setCertData(data.certificate);
                }
            })
            .catch(() => setLoadingCert(false));
    };

    const renderSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Flame className="h-3 w-3" />
                        <span>Critical</span>
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>High</span>
                    </Badge>
                );
            case 'medium':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono uppercase font-semibold">
                        <span>Medium</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        <span>{severity}</span>
                    </Badge>
                );
        }
    };

    const filteredLogs = streamLogs.filter((l) => {
        const matchesSearch =
            l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.event_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.ip_address.includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || l.event_category === selectedCategory;
        const matchesStatus = selectedStatus === 'all' || l.status === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <AppLayout>
            <Head title="Live Audit Log Stream & Enterprise Compliance" />

            <div className="space-y-6 pb-16">
                {/* Header Banner with Live Pulse */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-emerald-400 shadow-md border border-indigo-500/30">
                            <Radio className={`h-6 w-6 ${isStreaming ? 'animate-pulse text-emerald-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Enterprise Compliance Audit Trail Streamer
                                </h1>
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-mono font-semibold">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span>LIVE STREAM</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pemantauan log aktivitas keamanan real-time, deteksi anomali akses, dan kepatuhan standar SOC2 Type II / ISO 27001
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Live Polling Controls */}
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
                            <Button
                                size="sm"
                                variant={isStreaming ? 'default' : 'ghost'}
                                onClick={() => setIsStreaming(!isStreaming)}
                                className="h-7 text-xs px-2.5 gap-1.5 font-semibold"
                            >
                                {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                <span>{isStreaming ? 'Live' : 'Jeda'}</span>
                            </Button>

                            <Select
                                value={pollInterval.toString()}
                                onValueChange={(val) => setPollInterval(Number(val))}
                            >
                                <SelectTrigger className="h-7 text-[11px] font-mono border-0 bg-transparent w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2000">2 detik</SelectItem>
                                    <SelectItem value="3000">3 detik</SelectItem>
                                    <SelectItem value="5000">5 detik</SelectItem>
                                    <SelectItem value="10000">10 detik</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={() => openCertificationModal('SOC2_TYPE_II')}
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <Award className="h-4 w-4" />
                            <span>Sertifikasi Audit SOC2</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Compliance Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Kepatuhan Keamanan</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.compliance_health_score}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                SOC2 / ISO Compliant
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Evaluasi real-time dari kontrol akses & audit
                        </div>
                    </div>

                    {/* Open Incidents */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Insiden Kepatuhan Aktif</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.open_incidents_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Tiket Terbuka</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.critical_incidents_count} insiden berisiko kritikal
                        </div>
                    </div>

                    {/* Total Events */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Log Audit Tercatat</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Terminal className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_events_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Events</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Immutable audit trail aktif
                        </div>
                    </div>

                    {/* Failed Access 24h */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Akses Gagal / Error (24j)</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.failed_logs_24h}
                            </span>
                            <span className="text-xs text-muted-foreground">Anomali</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Brute-force & unauthorized attempts
                        </div>
                    </div>
                </div>

                {/* Framework Readiness Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(frameworks).map(([key, fw]) => (
                        <div key={key} className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground truncate">{fw.name}</span>
                                <Badge
                                    className={`text-[10px] font-mono ${
                                        fw.status === 'compliant'
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    }`}
                                >
                                    {fw.status === 'compliant' ? 'COMPLIANT' : 'AT RISK'}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-muted-foreground">Kontrol Terpenuhi:</span>
                                <span className="font-bold text-foreground">
                                    {fw.controls_passed} / {fw.total_controls} ({fw.score}%)
                                </span>
                            </div>

                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        fw.score >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${fw.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live Console & Incident Triage Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Terminal Style Live Event Stream Feed (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-emerald-500" />
                                <h3 className="font-bold text-sm text-foreground">Live Security Activity Console</h3>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1">
                                {['all', 'auth', 'member', 'security'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                                            selectedCategory === cat
                                                ? 'bg-primary text-primary-foreground font-bold'
                                                : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stream Feed Container */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-inner font-mono text-xs text-slate-300 space-y-2 max-h-[550px] overflow-y-auto">
                            {filteredLogs.length === 0 ? (
                                <div className="py-12 text-center text-slate-500">
                                    Menunggu stream log keamanan baru...
                                </div>
                            ) : (
                                filteredLogs.map((log) => {
                                    const isExpanded = expandedLogId === log.id;
                                    const isFailed = log.status === 'failed';

                                    return (
                                        <div
                                            key={log.id}
                                            className={`rounded-xl border p-2.5 transition-colors ${
                                                isFailed
                                                    ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
                                                    : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    <button
                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        className="mt-0.5 text-slate-500 hover:text-slate-300"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-400">
                                                                {log.created_at_formatted}
                                                            </span>
                                                            <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-400 font-bold uppercase">
                                                                {log.event_category}
                                                            </span>
                                                            <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-indigo-300">
                                                                {log.action}
                                                            </span>
                                                            {isFailed ? (
                                                                <span className="px-1 py-0.2 rounded bg-rose-900/80 text-[10px] text-rose-200 font-bold">
                                                                    FAILED
                                                                </span>
                                                            ) : (
                                                                <span className="text-emerald-500 text-[10px]">
                                                                    ● SUCCESS
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-[11px] text-slate-400 mt-1 truncate">
                                                            IP: <span className="text-slate-200">{log.ip_address}</span>{' '}
                                                            | Target: {log.resource_type}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openReportIncidentModal(log)}
                                                    className="h-6 text-[10px] px-1.5 gap-1 text-rose-400 hover:bg-rose-950 hover:text-rose-300 border border-rose-900/40"
                                                    title="Tandai sebagai Insiden Kepatuhan Keamanan"
                                                >
                                                    <Flame className="h-3 w-3" />
                                                    <span>Tandai Insiden</span>
                                                </Button>
                                            </div>

                                            {/* Expandable JSON Changes & Details */}
                                            {isExpanded && (
                                                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] space-y-1.5">
                                                    {log.error_message && (
                                                        <div className="p-1.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900">
                                                            Error: {log.error_message}
                                                        </div>
                                                    )}
                                                    {log.user_agent && (
                                                        <div className="text-slate-500 truncate">
                                                            UA: {log.user_agent}
                                                        </div>
                                                    )}
                                                    {log.changes && (
                                                        <pre className="p-2 rounded bg-slate-950 overflow-x-auto text-[10px] text-indigo-300">
                                                            {JSON.stringify(log.changes, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Compliance Incidents Triage Board (5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Tiket Insiden Kepatuhan ({incidents.length})
                                </h3>
                            </div>

                            <Button
                                size="sm"
                                onClick={() => openReportIncidentModal()}
                                className="h-7 text-xs px-2 gap-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Lapor Insiden</span>
                            </Button>
                        </div>

                        <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                            {incidents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
                                    <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                    <h4 className="text-xs font-bold text-foreground">Tidak Ada Insiden Kepatuhan</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Seluruh kontrol audit SOC2 dan keamanan dalam kondisi optimal.
                                    </p>
                                </div>
                            ) : (
                                incidents.map((inc) => (
                                    <div
                                        key={inc.id}
                                        className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {renderSeverityBadge(inc.severity)}
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        {inc.framework}
                                                    </Badge>
                                                </div>
                                                <h4 className="font-bold text-xs text-foreground mt-1">{inc.title}</h4>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteIncident(inc.id)}
                                                className="text-muted-foreground hover:text-destructive p-1"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <p className="text-xs text-muted-foreground leading-relaxed">{inc.summary}</p>

                                        {inc.mitigation_notes && (
                                            <div className="p-2 rounded-xl bg-muted/40 text-[11px] text-muted-foreground border border-border/40">
                                                <span className="font-semibold text-foreground">Mitigasi: </span>
                                                {inc.mitigation_notes}
                                            </div>
                                        )}

                                        {/* Status & PIC Controls */}
                                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap text-[10px]">
                                            <span className="text-muted-foreground font-mono">
                                                PIC: <span className="text-foreground">{inc.assignee_name}</span>
                                            </span>

                                            <Select
                                                value={inc.status}
                                                onValueChange={(val) => handleUpdateIncidentStatus(inc.id, val)}
                                            >
                                                <SelectTrigger className="h-6 text-[10px] font-mono w-28">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">🔴 Open</SelectItem>
                                                    <SelectItem value="investigating">🟡 Investigating</SelectItem>
                                                    <SelectItem value="mitigated">🟢 Mitigated</SelectItem>
                                                    <SelectItem value="resolved">✅ Resolved</SelectItem>
                                                    <SelectItem value="false_positive">⚪ False Positive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Catat Insiden Kepatuhan */}
            <Dialog open={incidentModalOpen} onOpenChange={setIncidentModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-rose-600" />
                            <span>Catat Insiden Kepatuhan Keamanan</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Dokumentasikan temuan anomali atau pelanggaran kebijakan kepatuhan untuk audit SOC2.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveIncident} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Insiden *
                            </label>
                            <Input
                                value={incidentTitle}
                                onChange={(e) => setIncidentTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tingkat Keparahan (Severity)
                                </label>
                                <Select
                                    value={incidentSeverity}
                                    onValueChange={(val: any) => setIncidentSeverity(val)}
                                >
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="critical">🔴 Critical</SelectItem>
                                        <SelectItem value="high">🟠 High</SelectItem>
                                        <SelectItem value="medium">🔵 Medium</SelectItem>
                                        <SelectItem value="low">🟢 Low</SelectItem>
                                        <SelectItem value="info">⚪ Info</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Standar Kepatuhan
                                </label>
                                <Select value={incidentFramework} onValueChange={setIncidentFramework}>
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SOC2_TYPE_II">SOC2 Type II</SelectItem>
                                        <SelectItem value="ISO_27001">ISO 27001</SelectItem>
                                        <SelectItem value="GDPR_PRIVACY">GDPR Privacy</SelectItem>
                                        <SelectItem value="HIPAA">HIPAA</SelectItem>
                                        <SelectItem value="INTERNAL_SECURITY">Internal Security</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Ringkasan Temuan & Bukti Audit *
                            </label>
                            <Textarea
                                value={incidentSummary}
                                onChange={(e) => setIncidentSummary(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                PIC Petugas Investigasi
                            </label>
                            <Select value={incidentAssigneeId} onValueChange={setIncidentAssigneeId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Belum Ditugaskan --</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Catatan Mitigasi / Perbaikan
                            </label>
                            <Textarea
                                placeholder="Langkah perbaikan yang dilakukan..."
                                value={incidentMitigation}
                                onChange={(e) => setIncidentMitigation(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIncidentModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingIncident}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isSavingIncident ? 'Menyimpan...' : 'Simpan Insiden'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Sertifikat Audit Kepatuhan Instan */}
            <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-purple-600" />
                            <span>Sertifikat Audit Kepatuhan Terverifikasi</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Laporan resmi verifikasi kontrol keamanan sistem untuk auditor eksternal.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingCert || !certData ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                            Memverifikasi tanda tangan digital audit...
                        </div>
                    ) : (
                        <div className="space-y-3.5 pt-2 text-xs">
                            <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-foreground">
                                        {certData.organization_name}
                                    </span>
                                    <Badge className="bg-emerald-600 text-white text-[10px]">
                                        {certData.certification_status}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Standar: <span className="font-mono font-bold text-foreground">{certData.framework}</span> | Tanggal: {certData.issued_at}
                                </p>
                                <div className="p-2 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground break-all">
                                    Signature Hash: {certData.digital_signature}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="font-bold text-muted-foreground text-[11px]">
                                    Kontrol Keamanan Terverifikasi:
                                </span>
                                <div className="space-y-1">
                                    {certData.assessed_controls.map((c: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="p-2 rounded-xl border border-border bg-card flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="font-semibold text-foreground">{c.control}</div>
                                                <div className="text-[10px] text-muted-foreground">{c.evidence}</div>
                                            </div>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                                {c.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCertModalOpen(false)}
                                    className="text-xs"
                                >
                                    Tutup
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(certData, null, 2)], {
                                            type: 'application/json',
                                        });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `compliance-${certData.framework}-${Date.now()}.json`;
                                        a.click();
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Unduh Sertifikat JSON</span>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
