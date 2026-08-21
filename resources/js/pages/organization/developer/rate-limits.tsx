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
    Gauge,
    Activity,
    AlertTriangle,
    Clock,
    ShieldCheck,
    ShieldAlert,
    Plus,
    Edit,
    Trash2,
    Sliders,
    Play,
    Zap,
    CheckCircle2,
    Lock,
    Unlock,
    Server,
    Flame,
    ArrowUpRight,
    TrendingUp,
} from 'lucide-react';

interface PolicyItem {
    id: string;
    name: string;
    tier: 'free' | 'pro' | 'enterprise' | 'custom';
    requests_per_minute: number;
    burst_allowance: number;
    daily_quota: number;
    is_throttling_enabled: boolean;
    is_active: boolean;
    created_at_formatted: string;
}

interface TrendItem {
    hour: string;
    requests: number;
    throttled: number;
}

interface EndpointItem {
    route: string;
    description: string;
    calls_24h: number;
    avg_latency_ms: number;
    status_2xx_pct: number;
    error_count: number;
}

interface Metrics {
    total_requests_24h: number;
    peak_rpm: number;
    throttled_requests_count: number;
    avg_latency_ms: number;
    compliance_rate_pct: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    trafficTrend: TrendItem[];
    policies: PolicyItem[];
    topEndpoints: EndpointItem[];
    selectedTier: string | null;
}

export default function ApiRateLimiterPage({
    organization,
    metrics,
    trafficTrend,
    policies,
    topEndpoints,
    selectedTier,
}: Props) {
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
    const [formName, setFormName] = useState('');
    const [formTier, setFormTier] = useState<string>('free');
    const [formRpm, setFormRpm] = useState<number>(60);
    const [formBurst, setFormBurst] = useState<number>(20);
    const [formDailyQuota, setFormDailyQuota] = useState<number>(10000);
    const [formThrottling, setFormThrottling] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);

    // Simulator State
    const [simulatedRequests, setSimulatedRequests] = useState<number>(250);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<{
        simulated_requests: number;
        policy_limit_rpm: number;
        burst_allowance: number;
        allowed_requests: number;
        throttled_requests_429: number;
        throttled_percentage: number;
        limiter_defense_status: string;
    } | null>(null);

    const handleTierFilter = (tierVal: string) => {
        const params = new URLSearchParams();
        if (tierVal && tierVal !== 'all') params.append('tier', tierVal);
        router.get(`/organization/developer/rate-limits?${params.toString()}`);
    };

    const openCreateModal = () => {
        setEditingPolicy(null);
        setFormName('');
        setFormTier('free');
        setFormRpm(60);
        setFormBurst(20);
        setFormDailyQuota(10000);
        setFormThrottling(true);
        setModalOpen(true);
    };

    const openEditModal = (p: PolicyItem) => {
        setEditingPolicy(p);
        setFormName(p.name);
        setFormTier(p.tier);
        setFormRpm(p.requests_per_minute);
        setFormBurst(p.burst_allowance);
        setFormDailyQuota(p.daily_quota);
        setFormThrottling(p.is_throttling_enabled);
        setModalOpen(true);
    };

    const handleSavePolicy = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const url = editingPolicy
            ? `/organization/developer/rate-limits/${editingPolicy.id}`
            : '/organization/developer/rate-limits';

        const method = editingPolicy ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: formName,
                tier: formTier,
                requests_per_minute: Number(formRpm),
                burst_allowance: Number(formBurst),
                daily_quota: Number(formDailyQuota),
                is_throttling_enabled: formThrottling,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleToggleThrottling = (p: PolicyItem) => {
        setActionLoadingId(p.id);
        fetch(`/organization/developer/rate-limits/${p.id}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                is_throttling_enabled: !p.is_throttling_enabled,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleRunSimulation = () => {
        setIsSimulating(true);
        fetch('/organization/developer/rate-limits/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                simulated_requests: simulatedRequests,
            }),
        })
            .then((res) => res.json())
            .then((res) => {
                setIsSimulating(false);
                if (res.simulation) {
                    setSimulationResult(res.simulation);
                }
            })
            .catch(() => setIsSimulating(false));
    };

    const handleDeletePolicy = (p: PolicyItem) => {
        if (!confirm(`Hapus kebijakan rate limit "${p.name}"?`)) return;

        fetch(`/organization/developer/rate-limits/${p.id}`, {
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

    const renderTierBadge = (tier: string) => {
        switch (tier) {
            case 'enterprise':
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] uppercase font-mono">
                        Enterprise
                    </Badge>
                );
            case 'pro':
                return (
                    <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px] uppercase font-mono">
                        Pro
                    </Badge>
                );
            case 'custom':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] uppercase font-mono">
                        Custom
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] uppercase font-mono">
                        Free
                    </Badge>
                );
        }
    };

    return (
        <AppLayout>
            <Head title="API Rate Limiter, Quota Management & Traffic Throttling Console" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
                            <Gauge className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    API Rate Limiter & Traffic Throttling Console
                                </h1>
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                    Traffic Governance
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pengawasan laju traffic API, penetapan kuota bertingkat (RPM), mitigasi lonjakan burst, dan simulator uji beban
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={openCreateModal}
                            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Buat Kebijakan Kuota</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Requests */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Permintaan API (24 Jam)</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_requests_24h.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">calls</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Kepatuhan traffic: {metrics.compliance_rate_pct}%
                        </div>
                    </div>

                    {/* Peak RPM */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Puncak Laju Traffic (Peak)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.peak_rpm}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">RPM</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Permintaan tertinggi per menit hari ini
                        </div>
                    </div>

                    {/* Throttled 429 */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Pelanggaran Throttled (429)</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                                {metrics.throttled_requests_count}
                            </span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                Protected
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Permintaan melebihi batas quota & burst
                        </div>
                    </div>

                    {/* Avg Latency */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Latensi API</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.avg_latency_ms}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">ms</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Respon server optimal & stabil
                        </div>
                    </div>
                </div>

                {/* 24-Hour Traffic Timeline */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                Pola Beban Panggilan API & Throttling (24 Jam Terakhir)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Visualisasi volume traffic sukses (Cyan) dan lonjakan pembatasan 429 (Merah)
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
                                <span>Permintaan Normal</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                                <span>Throttled (429)</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-2 items-end h-36">
                        {trafficTrend.map((item, idx) => {
                            const barHeight = Math.min(100, Math.max(15, (item.requests / 8000) * 100));
                            return (
                                <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                                    <div className="w-full flex items-end gap-0.5 h-28 justify-center">
                                        <div
                                            style={{ height: `${barHeight}%` }}
                                            className={`w-full rounded-t-sm transition-all ${
                                                item.throttled > 0
                                                    ? 'bg-rose-500 hover:bg-rose-600'
                                                    : 'bg-cyan-500 hover:bg-cyan-600'
                                            }`}
                                            title={`${item.hour}: ${item.requests.toLocaleString()} reqs (${item.throttled} throttled)`}
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

                {/* Policies & Top Endpoints Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Quota Policies Table (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                                    <h3 className="font-bold text-sm text-foreground">
                                        Kebijakan Kuota & Pembatasan API ({policies.length})
                                    </h3>
                                </div>

                                <Select
                                    value={selectedTier || 'all'}
                                    onValueChange={handleTierFilter}
                                >
                                    <SelectTrigger className="h-7 text-xs w-32 font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Tier</SelectItem>
                                        <SelectItem value="free">Free Tier</SelectItem>
                                        <SelectItem value="pro">Pro Tier</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                            <th className="p-3.5">Kebijakan</th>
                                            <th className="p-3.5">Batas Laju (RPM)</th>
                                            <th className="p-3.5">Toleransi Burst</th>
                                            <th className="p-3.5">Kuota Harian</th>
                                            <th className="p-3.5">Throttling</th>
                                            <th className="p-3.5 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {policies.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="p-3.5">
                                                    <div className="font-bold text-foreground">{p.name}</div>
                                                    <div className="mt-1">{renderTierBadge(p.tier)}</div>
                                                </td>
                                                <td className="p-3.5 font-mono font-bold text-cyan-600">
                                                    {p.requests_per_minute} RPM
                                                </td>
                                                <td className="p-3.5 font-mono text-muted-foreground">
                                                    +{p.burst_allowance} reqs
                                                </td>
                                                <td className="p-3.5 font-mono text-foreground">
                                                    {p.daily_quota.toLocaleString()} / hari
                                                </td>
                                                <td className="p-3.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={actionLoadingId === p.id}
                                                        onClick={() => handleToggleThrottling(p)}
                                                        className="h-6 text-[10px] px-2 gap-1"
                                                    >
                                                        {p.is_throttling_enabled ? (
                                                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                                <Lock className="h-3 w-3" />
                                                                <span>Aktif</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground flex items-center gap-1">
                                                                <Unlock className="h-3 w-3" />
                                                                <span>Bypass</span>
                                                            </span>
                                                        )}
                                                    </Button>
                                                </td>
                                                <td className="p-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditModal(p)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeletePolicy(p)}
                                                            className="h-6 w-6 p-0 text-rose-500"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Traffic Simulator & Top Endpoints (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Traffic Simulator */}
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-600" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Simulator Uji Lonjakan Traffic API
                                </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Uji ketahanan pembatasan laju traffic terhadap skenario lonjakan permintaan mendadak.
                            </p>

                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="text-muted-foreground">Simulasi Panggilan:</span>
                                    <span className="font-bold text-foreground">{simulatedRequests} RPM</span>
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="1500"
                                    step="10"
                                    value={simulatedRequests}
                                    onChange={(e) => setSimulatedRequests(Number(e.target.value))}
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />

                                <Button
                                    size="sm"
                                    disabled={isSimulating}
                                    onClick={handleRunSimulation}
                                    className="w-full h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold mt-2"
                                >
                                    <Play className="h-3.5 w-3.5" />
                                    <span>{isSimulating ? 'Menjalankan Uji...' : 'Jalankan Simulasi Lonjakan'}</span>
                                </Button>
                            </div>

                            {simulationResult && (
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2 font-mono">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Traffic Diterima:</span>
                                        <span className="font-bold text-emerald-600">{simulationResult.allowed_requests} reqs (Lolos)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Traffic Ter-Throttle (429):</span>
                                        <span className="font-bold text-rose-600">{simulationResult.throttled_requests_429} reqs ({simulationResult.throttled_percentage}%)</span>
                                    </div>
                                    <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                        Status Pertahanan: <strong className="text-foreground">{simulationResult.limiter_defense_status}</strong>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Endpoints */}
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
                            <h3 className="font-bold text-xs text-foreground">
                                Rute Endpoint API Terpopuler (24 Jam)
                            </h3>

                            <div className="space-y-2">
                                {topEndpoints.map((ep, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-mono font-bold text-foreground">{ep.route}</span>
                                            <span className="font-mono text-muted-foreground">{ep.calls_24h.toLocaleString()} calls</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                            <span>Latensi: {ep.avg_latency_ms}ms</span>
                                            <span className="text-emerald-600 font-semibold">{ep.status_2xx_pct}% Sukses</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Tambah / Edit Kebijakan Rate Limit */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Gauge className="h-5 w-5" />
                            <span>{editingPolicy ? `Edit ${editingPolicy.name}` : 'Buat Kebijakan Kuota API'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasi batas laju pemanggilan RPM dan alokasi kuota traffic.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePolicy} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Kebijakan *
                            </label>
                            <Input
                                placeholder="cth: Pro Production API Quota"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Tingkatan (Tier) *
                                </label>
                                <Select value={formTier} onValueChange={setFormTier}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Free Community</SelectItem>
                                        <SelectItem value="pro">Pro Tier</SelectItem>
                                        <SelectItem value="enterprise">Enterprise</SelectItem>
                                        <SelectItem value="custom">Custom Quota</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Limit (Requests / Min) *
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10000"
                                    value={formRpm}
                                    onChange={(e) => setFormRpm(Number(e.target.value))}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Toleransi Burst Lonjakan
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="5000"
                                    value={formBurst}
                                    onChange={(e) => setFormBurst(Number(e.target.value))}
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Kuota Harian Total *
                                </label>
                                <Input
                                    type="number"
                                    min="100"
                                    max="100000000"
                                    value={formDailyQuota}
                                    onChange={(e) => setFormDailyQuota(Number(e.target.value))}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan Kebijakan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
