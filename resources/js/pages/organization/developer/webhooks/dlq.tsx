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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Webhook,
    RotateCcw,
    AlertOctagon,
    CheckCircle2,
    Clock,
    Activity,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Zap,
    ExternalLink,
    Server,
    ShieldAlert,
    Radio,
    Terminal,
    Copy,
    Check,
} from 'lucide-react';

interface DeliveryAttempt {
    id: string;
    endpoint_id: string;
    endpoint_name: string | null;
    target_url: string | null;
    event_type: string;
    payload: Record<string, any>;
    request_headers: Record<string, any>;
    response_status: number | null;
    response_body: string | null;
    response_latency_ms: number;
    attempt_number: number;
    status: 'pending' | 'success' | 'failed' | 'dead_letter' | 'replayed';
    error_reason: string | null;
    next_retry_at_formatted: string | null;
    delivered_at_formatted: string | null;
    replayed_at_formatted: string | null;
    created_at_formatted: string;
}

interface WebhookEndpointItem {
    id: string;
    name: string;
    target_url: string;
    event_subscriptions: string[];
    is_active: boolean;
    max_retries: number;
    backoff_strategy: string;
    total_deliveries: number;
}

interface TrendItem {
    hour: string;
    success: number;
    failed: number;
}

interface Metrics {
    total_deliveries_24h: number;
    successful_deliveries: number;
    dlq_pending_failed: number;
    replayed_events_count: number;
    success_rate_pct: number;
    avg_delivery_latency_ms: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    trafficTrend: TrendItem[];
    attempts: DeliveryAttempt[];
    endpoints: WebhookEndpointItem[];
    selectedEndpointId: string | null;
    selectedStatus: string | null;
    selectedEventType: string | null;
}

export default function WebhookDlqPage({
    organization,
    metrics,
    trafficTrend,
    attempts,
    endpoints,
    selectedEndpointId,
    selectedStatus,
    selectedEventType,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Inspector Modal state
    const [inspectAttempt, setInspectAttempt] = useState<DeliveryAttempt | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    // Endpoint Modal state
    const [endpointModalOpen, setEndpointModalOpen] = useState(false);
    const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpointItem | null>(null);
    const [formName, setFormName] = useState('');
    const [formUrl, setFormUrl] = useState('');
    const [formSubscriptions, setFormSubscriptions] = useState('');
    const [formMaxRetries, setFormMaxRetries] = useState<number>(5);
    const [formBackoff, setFormBackoff] = useState<string>('exponential');
    const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);

    const handleFilterChange = (endpointId?: string, status?: string, eventType?: string) => {
        const params = new URLSearchParams();
        const curEnd = endpointId !== undefined ? endpointId : selectedEndpointId;
        const curStat = status !== undefined ? status : selectedStatus;
        const curEvent = eventType !== undefined ? eventType : selectedEventType;

        if (curEnd && curEnd !== 'all') params.append('endpoint_id', curEnd);
        if (curStat && curStat !== 'all') params.append('status', curStat);
        if (curEvent && curEvent !== 'all') params.append('event_type', curEvent);

        router.get(`/organization/developer/webhooks/dlq?${params.toString()}`);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === attempts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(attempts.map((a) => a.id));
        }
    };

    const toggleSelectId = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((item) => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleReplaySingle = (att: DeliveryAttempt) => {
        setActionLoadingId(att.id);
        fetch(`/organization/developer/webhooks/dlq/${att.id}/replay`, {
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

    const handleBulkReplay = () => {
        if (selectedIds.length === 0) return;

        setActionLoadingId('bulk');
        fetch('/organization/developer/webhooks/dlq/bulk-replay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                attempt_ids: selectedIds,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                setSelectedIds([]);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleDeleteAttempt = (att: DeliveryAttempt) => {
        if (!confirm(`Hapus rekaman pengiriman event "${att.event_type}"?`)) return;

        fetch(`/organization/developer/webhooks/dlq/${att.id}`, {
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

    const openCreateEndpointModal = () => {
        setEditingEndpoint(null);
        setFormName('');
        setFormUrl('');
        setFormSubscriptions('task.created, task.updated, sprint.completed');
        setFormMaxRetries(5);
        setFormBackoff('exponential');
        setEndpointModalOpen(true);
    };

    const handleSaveEndpoint = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingEndpoint(true);

        const url = editingEndpoint
            ? `/organization/developer/webhooks/endpoints/${editingEndpoint.id}`
            : '/organization/developer/webhooks/endpoints';

        const method = editingEndpoint ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: formName,
                target_url: formUrl,
                event_subscriptions: formSubscriptions,
                max_retries: Number(formMaxRetries),
                backoff_strategy: formBackoff,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingEndpoint(false);
                setEndpointModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingEndpoint(false));
    };

    const copyPayloadToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'dead_letter':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertOctagon className="h-3 w-3" />
                        <span>Dead-Letter</span>
                    </Badge>
                );
            case 'replayed':
                return (
                    <Badge className="bg-cyan-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <RotateCcw className="h-3 w-3" />
                        <span>Replayed</span>
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>Retrying</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Delivered</span>
                    </Badge>
                );
        }
    };

    const renderResponseStatusBadge = (status: number | null) => {
        if (!status) {
            return <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">Timeout</Badge>;
        }
        if (status >= 200 && status < 300) {
            return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-mono">{status} OK</Badge>;
        }
        if (status === 429) {
            return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-mono">429 Throttled</Badge>;
        }
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] font-mono">{status} Error</Badge>;
    };

    const filteredAttempts = attempts.filter((a) => {
        return (
            a.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.endpoint_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.target_url || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Webhook Dead-Letter Queue (DLQ) & Event Replay Engine" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
                            <Webhook className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Webhook Dead-Letter Queue (DLQ) & Replay Engine
                                </h1>
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-mono">
                                    Event Resilience
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pengawasan pengiriman webhook gagal, inspeksi payload forensik, dan pemulihan event instan via single & bulk replay
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={openCreateEndpointModal}
                            className="h-9 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Daftarkan Endpoint</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Deliveries */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Pengiriman Webhook (24 Jam)</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_deliveries_24h.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">events</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tingkat sukses pengiriman: {metrics.success_rate_pct}%
                        </div>
                    </div>

                    {/* DLQ Pending Failed */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Antrean Dead-Letter (DLQ)</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <AlertOctagon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                                {metrics.dlq_pending_failed}
                            </span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                Perlu Tindakan
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Event gagal setelah batas max retries
                        </div>
                    </div>

                    {/* Replayed Recovered */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Event Berhasil Dipulihkan</span>
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                <RotateCcw className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                                {metrics.replayed_events_count}
                            </span>
                            <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px]">
                                Recovered
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dipulihkan manual maupun bulk replay
                        </div>
                    </div>

                    {/* Avg Latency */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Latensi Endpoint</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.avg_delivery_latency_ms}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">ms</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Waktu respon downstream listener
                        </div>
                    </div>
                </div>

                {/* 24-Hour Webhook Timeline */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                Pola Pengiriman Webhook 24 Jam Terakhir
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Perbandingan volume pengiriman sukses (Ungu) dan kegagalan/DLQ (Merah)
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                                <span>Terkirim Sukses</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                                <span>Gagal / DLQ</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-2 items-end h-32">
                        {trafficTrend.map((item, idx) => {
                            const barHeight = Math.min(100, Math.max(15, (item.success / 1200) * 100));
                            return (
                                <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                                    <div className="w-full flex items-end gap-0.5 h-24 justify-center">
                                        <div
                                            style={{ height: `${barHeight}%` }}
                                            className={`w-full rounded-t-sm transition-all ${
                                                item.failed > 0
                                                    ? 'bg-rose-500 hover:bg-rose-600'
                                                    : 'bg-purple-500 hover:bg-purple-600'
                                            }`}
                                            title={`${item.hour}: ${item.success} success (${item.failed} failed)`}
                                        />
                                    </div>
                                    <div className="text-[8px] font-mono text-muted-foreground truncate w-full text-center">
                                        {item.hour}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Filter Toolbar & Bulk Actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari event type (cth: task.created), endpoint name, atau url..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedEndpointId || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">🌐 Semua Endpoint ({endpoints.length})</SelectItem>
                                {endpoints.map((ep) => (
                                    <SelectItem key={ep.id} value={ep.id}>
                                        📡 {ep.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="dead_letter">🔴 Dead-Letter</SelectItem>
                                <SelectItem value="failed">🟡 Retrying</SelectItem>
                                <SelectItem value="replayed">🔵 Replayed</SelectItem>
                                <SelectItem value="success">🟢 Delivered</SelectItem>
                            </SelectContent>
                        </Select>

                        {selectedIds.length > 0 && (
                            <Button
                                size="sm"
                                disabled={actionLoadingId === 'bulk'}
                                onClick={handleBulkReplay}
                                className="h-8 text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold font-mono"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Replay ({selectedIds.length}) Event</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Delivery Attempts & DLQ Catalog Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3 w-8">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === filteredAttempts.length && filteredAttempts.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-border"
                                        />
                                    </th>
                                    <th className="p-3.5">Tipe Event</th>
                                    <th className="p-3.5">Endpoint Penerima</th>
                                    <th className="p-3.5">Status Pengiriman</th>
                                    <th className="p-3.5">Respon HTTP</th>
                                    <th className="p-3.5">Percobaan</th>
                                    <th className="p-3.5">Waktu</th>
                                    <th className="p-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredAttempts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-muted-foreground">
                                            <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            Tidak ada riwayat pengiriman yang sesuai filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAttempts.map((att) => (
                                        <tr key={att.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(att.id)}
                                                    onChange={() => toggleSelectId(att.id)}
                                                    className="rounded border-border"
                                                />
                                            </td>
                                            <td className="p-3.5 font-mono font-bold text-foreground">
                                                {att.event_type}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-semibold text-foreground">{att.endpoint_name}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono truncate max-w-xs">{att.target_url}</div>
                                            </td>
                                            <td className="p-3.5">
                                                {renderStatusBadge(att.status)}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    {renderResponseStatusBadge(att.response_status)}
                                                    <span className="text-[10px] font-mono text-muted-foreground">{att.response_latency_ms}ms</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5 font-mono text-muted-foreground">
                                                Attempt {att.attempt_number}
                                            </td>
                                            <td className="p-3.5 text-[10px] font-mono text-muted-foreground">
                                                {att.created_at_formatted}
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setInspectAttempt(att)}
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Inspeksi Payload"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        disabled={actionLoadingId === att.id}
                                                        onClick={() => handleReplaySingle(att)}
                                                        className="h-6 text-[10px] px-2 gap-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                                        title="Replay Event"
                                                    >
                                                        <RotateCcw className="h-2.5 w-2.5" />
                                                        <span>Replay</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteAttempt(att)}
                                                        className="h-6 w-6 p-0 text-rose-500"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
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

            {/* Forensic Payload Inspector Modal */}
            <Dialog open={!!inspectAttempt} onOpenChange={(open) => !open && setInspectAttempt(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600 font-mono">
                            <Terminal className="h-5 w-5" />
                            <span>Forensic Webhook Inspector</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Payload detail, HTTP request headers, and response body logs.
                        </DialogDescription>
                    </DialogHeader>

                    {inspectAttempt && (
                        <div className="space-y-3 pt-2 text-xs">
                            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                                <div className="flex items-center justify-between font-mono">
                                    <span className="font-bold text-foreground">{inspectAttempt.event_type}</span>
                                    {renderStatusBadge(inspectAttempt.status)}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">
                                    URL: {inspectAttempt.target_url}
                                </div>
                            </div>

                            {/* Request Payload JSON */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground">Request Payload (JSON):</span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyPayloadToClipboard(JSON.stringify(inspectAttempt.payload, null, 2))}
                                        className="h-5 text-[10px] px-1.5 gap-1"
                                    >
                                        {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                        <span>{isCopied ? 'Tersalin' : 'Salin JSON'}</span>
                                    </Button>
                                </div>
                                <pre className="p-3 rounded-xl bg-muted/60 border border-border font-mono text-[11px] overflow-x-auto max-h-48 text-foreground">
                                    {JSON.stringify(inspectAttempt.payload, null, 2)}
                                </pre>
                            </div>

                            {/* Request Headers */}
                            {inspectAttempt.request_headers && (
                                <div className="space-y-1">
                                    <span className="font-semibold text-foreground">Request Headers:</span>
                                    <pre className="p-2.5 rounded-xl bg-muted/40 border border-border font-mono text-[10px] overflow-x-auto text-muted-foreground">
                                        {JSON.stringify(inspectAttempt.request_headers, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Response Body Logs */}
                            <div className="space-y-1">
                                <span className="font-semibold text-foreground">
                                    Response Body ({inspectAttempt.response_status ? `${inspectAttempt.response_status}` : 'No Response'}):
                                </span>
                                <pre className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 font-mono text-[10px] overflow-x-auto max-h-32 text-rose-600 dark:text-rose-400">
                                    {inspectAttempt.response_body || 'Tidak ada respon yang diterima (Connection Timeout / Network Unreachable)'}
                                </pre>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setInspectAttempt(null)}
                            className="text-xs"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Tambah / Edit Webhook Endpoint */}
            <Dialog open={endpointModalOpen} onOpenChange={setEndpointModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600">
                            <Webhook className="h-5 w-5" />
                            <span>{editingEndpoint ? `Edit ${editingEndpoint.name}` : 'Daftarkan Endpoint Webhook'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasi URL penerima webhook dan langganan event.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveEndpoint} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Endpoint *
                            </label>
                            <Input
                                placeholder="cth: Slack DevOps Dispatcher"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Target Webhook URL *
                            </label>
                            <Input
                                type="url"
                                placeholder="https://api.domain.com/webhooks/pandu"
                                value={formUrl}
                                onChange={(e) => setFormUrl(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Langganan Event (Pisahkan dengan koma)
                            </label>
                            <Input
                                placeholder="task.created, task.updated, sprint.completed"
                                value={formSubscriptions}
                                onChange={(e) => setFormSubscriptions(e.target.value)}
                                className="text-xs font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Max Retries (Batas Percobaan)
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formMaxRetries}
                                    onChange={(e) => setFormMaxRetries(Number(e.target.value))}
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Strategi Backoff
                                </label>
                                <Select value={formBackoff} onValueChange={setFormBackoff}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="exponential">Exponential Backoff</SelectItem>
                                        <SelectItem value="linear">Linear Interval</SelectItem>
                                        <SelectItem value="fixed">Fixed Delay</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEndpointModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingEndpoint}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                            >
                                {isSavingEndpoint ? 'Menyimpan...' : 'Simpan Endpoint'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
