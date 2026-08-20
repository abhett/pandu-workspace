import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
    Webhook,
    Plus,
    Send,
    RotateCw,
    Trash2,
    Edit,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Copy,
    Check,
    Code2,
    Activity,
    Shield,
    ExternalLink,
    Search,
    Terminal,
    Eye,
    Zap,
    KeyRound,
    Layers,
    FileText,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface WebhookItem {
    id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    active: boolean;
    headers: Record<string, string>;
    project?: Project | null;
    deliveries_count: number;
    successful_deliveries_count: number;
    failed_deliveries_count: number;
    created_at_formatted: string;
}

interface WebhookDeliveryItem {
    id: string;
    event_id: string;
    event_type: string;
    status: string;
    response_code?: number | null;
    duration_ms?: number | null;
    attempt: number;
    payload: any;
    response_body?: string | null;
    error_message?: string | null;
    delivered_at_formatted?: string | null;
    created_at_formatted: string;
}

interface EventCategory {
    category: string;
    events: {
        id: string;
        name: string;
        description: string;
    }[];
}

interface Stats {
    total_subscriptions: number;
    active_subscriptions: number;
    total_deliveries: number;
    successful_deliveries_count?: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
    avg_duration_ms: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    webhooks: WebhookItem[];
    stats: Stats;
    available_events: EventCategory[];
    projects: Project[];
}

export default function WebhookManagementPage({
    organization,
    webhooks,
    stats,
    available_events,
    projects,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // Modal Create / Edit
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>(['task.created', 'task.status_changed']);
    const [projectId, setProjectId] = useState<string>('all');
    const [isActive, setIsActive] = useState(true);
    const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Delivery Inspector Drawer
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [inspectorWebhook, setInspectorWebhook] = useState<WebhookItem | null>(null);
    const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryItem | null>(null);
    const [redelivering, setRedelivering] = useState(false);

    // Docs / Signature Verification Modal
    const [docsModalOpen, setDocsModalOpen] = useState(false);
    const [activeLangTab, setActiveLangTab] = useState<'nodejs' | 'python' | 'php' | 'go'>('nodejs');

    // Ping Testing
    const [pingingId, setPingingId] = useState<string | null>(null);
    const [pingSuccessMessage, setPingSuccessMessage] = useState<string | null>(null);

    // Copy helper
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSecretId(id);
        setTimeout(() => setCopiedSecretId(null), 2000);
    };

    // Open create modal
    const openCreateModal = () => {
        setEditingWebhook(null);
        setName('');
        setUrl('');
        setSelectedEvents(['task.created', 'task.status_changed']);
        setProjectId('all');
        setIsActive(true);
        setCustomHeaders([{ key: '', value: '' }]);
        setErrorMessage(null);
        setFormModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (webhook: WebhookItem) => {
        setEditingWebhook(webhook);
        setName(webhook.name);
        setUrl(webhook.url);
        setSelectedEvents(webhook.events || []);
        setProjectId(webhook.project?.id || 'all');
        setIsActive(webhook.active);
        const headersArr = Object.entries(webhook.headers || {}).map(([k, v]) => ({ key: k, value: String(v) }));
        setCustomHeaders(headersArr.length > 0 ? headersArr : [{ key: '', value: '' }]);
        setErrorMessage(null);
        setFormModalOpen(true);
    };

    // Handle form submission
    const handleSaveWebhook = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!name || !url) {
            setErrorMessage('Nama dan URL Endpoint wajib diisi.');
            return;
        }

        if (selectedEvents.length === 0) {
            setErrorMessage('Pilih minimal satu event yang dilanggani.');
            return;
        }

        const headersObj: Record<string, string> = {};
        customHeaders.forEach((h) => {
            if (h.key.trim()) {
                headersObj[h.key.trim()] = h.value.trim();
            }
        });

        setSubmitting(true);

        const payload = {
            name,
            url,
            events: selectedEvents,
            project_id: projectId === 'all' ? null : projectId,
            active: isActive,
            headers: headersObj,
        };

        if (editingWebhook) {
            router.put(`/organization/webhooks/${editingWebhook.id}`, payload, {
                onSuccess: () => {
                    setFormModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err) => {
                    setErrorMessage(Object.values(err)[0] || 'Gagal memperbarui webhook.');
                    setSubmitting(false);
                },
            });
        } else {
            router.post('/organization/webhooks', payload, {
                onSuccess: () => {
                    setFormModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err) => {
                    setErrorMessage(Object.values(err)[0] || 'Gagal membuat webhook.');
                    setSubmitting(false);
                },
            });
        }
    };

    // Handle Delete Webhook
    const handleDeleteWebhook = (webhook: WebhookItem) => {
        if (!confirm(`Hapus endpoint webhook "${webhook.name}"?`)) return;

        router.delete(`/organization/webhooks/${webhook.id}`);
    };

    // Handle Rotate Secret
    const handleRotateSecret = (webhook: WebhookItem) => {
        if (!confirm('Putar ulang signing secret? Sistem penerima harus memperbarui secret untuk memvalidasi signature.')) {
            return;
        }

        router.post(`/organization/webhooks/${webhook.id}/rotate-secret`);
    };

    // Handle Ping Test
    const handlePingTest = async (webhook: WebhookItem) => {
        setPingingId(webhook.id);
        setPingSuccessMessage(null);

        try {
            const response = await fetch(`/organization/webhooks/${webhook.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                setPingSuccessMessage(`Paket uji coba berhasil dikirim ke ${webhook.name}.`);
                setTimeout(() => setPingSuccessMessage(null), 4000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPingingId(null);
        }
    };

    // Open Deliveries Inspector
    const openInspector = async (webhook: WebhookItem) => {
        setInspectorWebhook(webhook);
        setInspectorOpen(true);
        setLoadingDeliveries(true);
        setSelectedDelivery(null);

        try {
            const response = await fetch(`/organization/webhooks/${webhook.id}/deliveries`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await response.json();
            if (data.success) {
                setDeliveries(data.deliveries || []);
                if (data.deliveries && data.deliveries.length > 0) {
                    setSelectedDelivery(data.deliveries[0]);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDeliveries(false);
        }
    };

    // Redeliver / Replay a specific delivery
    const handleRedeliver = async (delivery: WebhookDeliveryItem) => {
        setRedelivering(true);

        try {
            const response = await fetch(`/organization/webhooks/deliveries/${delivery.id}/redeliver`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const data = await response.json();
            if (data.success && inspectorWebhook) {
                openInspector(inspectorWebhook);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRedelivering(false);
        }
    };

    // Filter webhooks
    const filteredWebhooks = webhooks.filter((w) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <AppLayout>
            <Head title="Webhook & Outbound Integration Hub" />

            <div className="space-y-6 pb-16">
                {/* Header Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold shadow-sm">
                                <Webhook className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Webhook & Outbound Integration Hub
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Kirim notifikasi event real-time ke sistem eksternal, bot Discord/Slack, atau server API dengan tanda tangan kriptografi HMAC-SHA256.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDocsModalOpen(true)}
                                className="text-xs gap-1.5 border-border hover:bg-muted"
                            >
                                <Code2 className="h-3.5 w-3.5 text-primary" />
                                <span>Panduan Verifikasi Signature</span>
                            </Button>

                            <Button
                                onClick={openCreateModal}
                                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-md"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Daftarkan Webhook</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Ping Success Banner */}
                {pingSuccessMessage && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{pingSuccessMessage}</span>
                    </div>
                )}

                {/* Bento KPI Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Webhook Terdaftar</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Webhook className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {stats.total_subscriptions}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({stats.active_subscriptions} aktif)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Endpoint terdaftar dalam organisasi
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Pengiriman Payload</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Send className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {stats.total_deliveries.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">paket</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Terkirim ke server endpoint eksternal
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Keberhasilan (Success Rate)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {stats.success_rate}%
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                ({stats.successful_deliveries} sukses)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            HTTP status code 2xx dari server target
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Waktu Respons</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {stats.avg_duration_ms}
                            </span>
                            <span className="text-xs text-muted-foreground">ms</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Latensi HTTP round-trip dispatch
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama webhook atau target URL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <Badge variant="outline" className="text-xs font-mono font-medium">
                        {filteredWebhooks.length} Webhook Terdaftar
                    </Badge>
                </div>

                {/* Webhooks Grid */}
                {filteredWebhooks.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
                        <div className="p-4 rounded-2xl bg-muted text-muted-foreground inline-block mb-3">
                            <Webhook className="h-8 w-8" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Belum ada webhook yang terdaftar</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            Daftarkan endpoint webhook baru untuk mulai mendistribusikan event tugas dan sprint ke sistem pihak ketiga.
                        </p>
                        <Button onClick={openCreateModal} className="mt-4 text-xs font-semibold gap-1.5 shadow-sm">
                            <Plus className="h-4 w-4" />
                            <span>Daftarkan Webhook Pertama</span>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredWebhooks.map((webhook) => {
                            const isPinging = pingingId === webhook.id;

                            return (
                                <div
                                    key={webhook.id}
                                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        {webhook.name}
                                                    </h3>
                                                    <Badge
                                                        variant={webhook.active ? 'default' : 'secondary'}
                                                        className={`text-[10px] ${
                                                            webhook.active
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {webhook.active ? 'Aktif' : 'Nonaktif'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 font-mono">
                                                    <span>
                                                        {webhook.project ? `Proyek: ${webhook.project.name} (${webhook.project.key})` : 'Cakupan: Semua Proyek (Global)'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEditModal(webhook)}
                                                    title="Edit Webhook"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteWebhook(webhook)}
                                                    title="Hapus Webhook"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* URL Bar */}
                                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2 text-xs font-mono text-foreground mb-3">
                                            <span className="truncate">{webhook.url}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                onClick={() => copyToClipboard(webhook.url, `url-${webhook.id}`)}
                                                title="Salin URL"
                                            >
                                                {copiedSecretId === `url-${webhook.id}` ? (
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Events Badges */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {webhook.events.includes('*') ? (
                                                <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px]">
                                                    Semua Event (* Wildcard)
                                                </Badge>
                                            ) : (
                                                webhook.events.slice(0, 3).map((evt) => (
                                                    <Badge key={evt} variant="outline" className="text-[10px] font-mono">
                                                        {evt}
                                                    </Badge>
                                                ))
                                            )}
                                            {webhook.events.length > 3 && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    +{webhook.events.length - 3} lainnya
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Signing Secret Preview */}
                                        <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-muted/20 border border-border/40 mb-3">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <KeyRound className="h-3 w-3 text-amber-500" />
                                                <span>Signing Secret:</span>
                                                <span className="font-mono text-foreground">
                                                    whsec_••••••••••••
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(webhook.secret, `sec-${webhook.id}`)}
                                                    title="Salin Secret"
                                                >
                                                    {copiedSecretId === `sec-${webhook.id}` ? (
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleRotateSecret(webhook)}
                                                    title="Putar Secret Baru"
                                                >
                                                    <RotateCw className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions & Stats */}
                                    <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                            <span className="text-emerald-500 font-semibold">{webhook.successful_deliveries_count} sukses</span>
                                            <span>•</span>
                                            <span className="text-red-500 font-semibold">{webhook.failed_deliveries_count} gagal</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isPinging}
                                                onClick={() => handlePingTest(webhook)}
                                                className="text-xs h-8 gap-1.5 border-border"
                                            >
                                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                                <span>{isPinging ? 'Mengirim...' : 'Test Ping'}</span>
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => openInspector(webhook)}
                                                className="text-xs h-8 gap-1.5"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>Log Pengiriman</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Daftarkan / Edit Webhook */}
            <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-primary" />
                            <span>{editingWebhook ? 'Edit Endpoint Webhook' : 'Daftarkan Endpoint Webhook Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasikan endpoint HTTP destination untuk menerima payload event secara otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveWebhook} className="space-y-4 pt-2">
                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Nama Endpoint Webhook
                            </label>
                            <Input
                                placeholder="misal: CI/CD Pipeline Dispatcher, Slack Bot Gateway"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Target Endpoint URL (HTTPS)
                            </label>
                            <Input
                                type="url"
                                placeholder="https://api.domainanda.com/webhooks/pandu"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Cakupan Proyek (Scope)
                                </label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih cakupan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Proyek (Global Organisasi)</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.key})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                                <div>
                                    <span className="text-xs font-semibold text-foreground block">Status Webhook</span>
                                    <span className="text-[10px] text-muted-foreground">Aktifkan pengiriman</span>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} />
                            </div>
                        </div>

                        {/* Events Selection Checklist */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Pilih Event yang Dilanggani
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 text-primary"
                                    onClick={() => {
                                        if (selectedEvents.includes('*')) {
                                            setSelectedEvents(['task.created', 'task.status_changed']);
                                        } else {
                                            setSelectedEvents(['*']);
                                        }
                                    }}
                                >
                                    {selectedEvents.includes('*') ? 'Pilih Event Spesifik' : 'Pilih Semua (* Wildcard)'}
                                </Button>
                            </div>

                            {!selectedEvents.includes('*') ? (
                                <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border/60 max-h-52 overflow-y-auto">
                                    {available_events.map((cat) => (
                                        <div key={cat.category}>
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                                {cat.category}
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {cat.events.map((evt) => {
                                                    const checked = selectedEvents.includes(evt.id);
                                                    return (
                                                        <label
                                                            key={evt.id}
                                                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start gap-2 transition-all ${
                                                                checked
                                                                    ? 'bg-primary/10 border-primary/40 text-foreground font-semibold'
                                                                    : 'bg-card border-border/50 text-muted-foreground hover:bg-muted/40'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 rounded border-border"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedEvents([...selectedEvents, evt.id]);
                                                                    } else {
                                                                        setSelectedEvents(selectedEvents.filter((id) => id !== evt.id));
                                                                    }
                                                                }}
                                                            />
                                                            <div>
                                                                <span className="block">{evt.name}</span>
                                                                <span className="font-mono text-[9px] text-muted-foreground block">
                                                                    {evt.id}
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs">
                                    Endpoint ini akan menerima <strong>seluruh event</strong> yang terjadi di organisasi.
                                </div>
                            )}
                        </div>

                        {/* Custom HTTP Headers */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Custom HTTP Headers (Opsional)
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 text-primary"
                                    onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                                >
                                    + Tambah Header
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {customHeaders.map((header, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Key (misal: Authorization)"
                                            value={header.key}
                                            onChange={(e) => {
                                                const updated = [...customHeaders];
                                                updated[idx].key = e.target.value;
                                                setCustomHeaders(updated);
                                            }}
                                            className="h-8 text-xs font-mono flex-1"
                                        />
                                        <Input
                                            placeholder="Value (misal: Bearer token123)"
                                            value={header.value}
                                            onChange={(e) => {
                                                const updated = [...customHeaders];
                                                updated[idx].value = e.target.value;
                                                setCustomHeaders(updated);
                                            }}
                                            className="h-8 text-xs font-mono flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => setCustomHeaders(customHeaders.filter((_, i) => i !== idx))}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFormModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submitting ? 'Menyimpan...' : editingWebhook ? 'Simpan Perubahan' : 'Daftarkan Webhook'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Live Delivery Inspector */}
            <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-primary" />
                                <span>Inspektur Pengiriman Webhook (Delivery Logs)</span>
                            </DialogTitle>
                            {inspectorWebhook && (
                                <Badge variant="outline" className="font-mono text-xs">
                                    {inspectorWebhook.name}
                                </Badge>
                            )}
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pantau riwayat pengiriman payload HTTP, durasi latensi, kode status, dan kirim ulang (replay) payload.
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDeliveries ? (
                        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <RotateCw className="h-6 w-6 animate-spin text-primary" />
                            <span>Memuat riwayat pengiriman...</span>
                        </div>
                    ) : deliveries.length === 0 ? (
                        <div className="py-16 text-center text-xs text-muted-foreground">
                            Belum ada pengiriman payload yang tercatat untuk webhook ini.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden pt-2 min-h-[360px]">
                            {/* Left List of Deliveries */}
                            <div className="border border-border rounded-xl overflow-y-auto max-h-[420px] divide-y divide-border/60">
                                {deliveries.map((del) => {
                                    const isSuccess = del.status === 'success';
                                    const isSelected = selectedDelivery?.id === del.id;

                                    return (
                                        <div
                                            key={del.id}
                                            onClick={() => setSelectedDelivery(del)}
                                            className={`p-3 text-xs cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'bg-primary/10 border-l-4 border-l-primary'
                                                    : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    {isSuccess ? (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                                    )}
                                                    <span className="font-mono font-bold text-foreground">
                                                        {del.event_type}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[9px] font-mono ${
                                                        isSuccess
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {del.response_code || del.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                <span>{del.created_at_formatted}</span>
                                                <span>{del.duration_ms ? `${del.duration_ms}ms` : '—'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right Payload & Response Inspector */}
                            {selectedDelivery ? (
                                <div className="md:col-span-2 border border-border rounded-xl p-4 overflow-y-auto max-h-[420px] flex flex-col justify-between bg-muted/10 space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                            <div>
                                                <span className="text-xs font-bold text-foreground">
                                                    Event ID: {selectedDelivery.event_id}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground block font-mono">
                                                    Terkirim: {selectedDelivery.delivered_at_formatted || selectedDelivery.created_at_formatted}
                                                </span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={redelivering}
                                                onClick={() => handleRedeliver(selectedDelivery)}
                                                className="text-xs h-7 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                            >
                                                <RotateCw className={`h-3 w-3 ${redelivering ? 'animate-spin' : ''}`} />
                                                <span>Kirim Ulang (Replay)</span>
                                            </Button>
                                        </div>

                                        {/* Payload JSON */}
                                        <div>
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                                Request JSON Payload
                                            </span>
                                            <pre className="p-3 rounded-xl bg-background border border-border/80 font-mono text-[11px] overflow-x-auto max-h-44 text-foreground">
                                                {JSON.stringify(selectedDelivery.payload, null, 2)}
                                            </pre>
                                        </div>

                                        {/* Response Body */}
                                        {selectedDelivery.response_body && (
                                            <div>
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                                                    Response Body ({selectedDelivery.response_code})
                                                </span>
                                                <pre className="p-3 rounded-xl bg-background border border-border/80 font-mono text-[11px] overflow-x-auto max-h-32 text-muted-foreground">
                                                    {selectedDelivery.response_body}
                                                </pre>
                                            </div>
                                        )}

                                        {selectedDelivery.error_message && (
                                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                                                <strong>Error:</strong> {selectedDelivery.error_message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="md:col-span-2 border border-border rounded-xl p-8 text-center text-xs text-muted-foreground flex items-center justify-center">
                                    Pilih salah satu pengiriman di sebelah kiri untuk melihat detail payload.
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-3">
                        <Button variant="outline" onClick={() => setInspectorOpen(false)} className="text-xs">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Panduan Verifikasi Signature */}
            <Dialog open={docsModalOpen} onOpenChange={setDocsModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <span>Panduan Verifikasi Tanda Tangan (HMAC-SHA256)</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Setiap webhook request menyertakan header <code className="font-mono text-primary font-bold">X-WMS-Signature</code> dan <code className="font-mono text-primary font-bold">X-WMS-Timestamp</code> untuk mencegah pemalsuan dan replay attacks.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Language Tabs */}
                        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
                            {(['nodejs', 'python', 'php', 'go'] as const).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setActiveLangTab(lang)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                        activeLangTab === lang
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {lang === 'nodejs' ? 'Node.js / Express' : lang === 'python' ? 'Python / Flask' : lang === 'php' ? 'PHP' : 'Go'}
                                </button>
                            ))}
                        </div>

                        {/* Code Snippets */}
                        <div className="relative">
                            <pre className="p-4 rounded-xl bg-muted/80 border border-border font-mono text-[11px] overflow-x-auto text-foreground max-h-72">
                                {activeLangTab === 'nodejs' && `const crypto = require('crypto');

function verifyPanduWebhook(rawBody, timestamp, signatureHeader, secret) {
    const computed = 'v1=' + crypto
        .createHmac('sha256', secret)
        .update(\`\${timestamp}.\${rawBody}\`)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(computed));
}`}
                                {activeLangTab === 'python' && `import hmac
import hashlib

def verify_pandu_webhook(raw_body_bytes, timestamp, signature_header, secret):
    signed_payload = f"{timestamp}.".encode('utf-8') + raw_body_bytes
    expected_sig = "v1=" + hmac.new(
        secret.encode('utf-8'),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature_header, expected_sig)`}
                                {activeLangTab === 'php' && `function verifyPanduWebhook(string $rawBody, string $timestamp, string $signatureHeader, string $secret): bool {
    $computed = 'v1=' . hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);
    return hash_equals($signatureHeader, $computed);
}`}
                                {activeLangTab === 'go' && `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

func VerifyPanduWebhook(rawBody []byte, timestamp string, signatureHeader string, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(fmt.Sprintf("%s.", timestamp)))
    mac.Write(rawBody)
    expectedSig := "v1=" + hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(signatureHeader), []byte(expectedSig))
}`}
                            </pre>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setDocsModalOpen(false)} className="text-xs">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
