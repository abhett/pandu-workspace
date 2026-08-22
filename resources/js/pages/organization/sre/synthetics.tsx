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
    Globe,
    CheckCircle2,
    Zap,
    Lock,
    Radio,
    PauseCircle,
    PlayCircle,
    Plus,
    Activity,
    Server,
    Trash2,
    RefreshCw,
    ShieldCheck,
    Layers,
    MapPin,
    AlertCircle,
    Clock,
} from 'lucide-react';

interface LocationStat {
    code: string;
    name: string;
    latency_ms: number;
    is_healthy: boolean;
}

interface MonitorItem {
    id: string;
    name: string;
    target_url: string;
    probe_type: string;
    interval_seconds: number;
    timeout_seconds: number;
    expected_status_code: number;
    uptime_percentage_24h: number;
    uptime_percentage_30d: number;
    avg_latency_ms: number;
    status: string;
    ssl_expires_at_formatted: string | null;
    ssl_days_remaining: number | null;
    ssl_issuer: string;
    last_checked_formatted: string;
    locations: string[];
    location_stats: LocationStat[];
}

interface ProbeLogItem {
    id: string;
    synthetic_monitor_id: string;
    monitor_name: string;
    location: string;
    location_name: string;
    status_code: number | null;
    latency_ms: number;
    is_success: boolean;
    ssl_valid_days: number | null;
    error_message: string | null;
    checked_at_formatted: string;
}

interface Metrics {
    active_monitors: number;
    global_uptime: number;
    avg_latency_ms: number;
    ssl_expiring_soon: number;
}

interface AvailableLocation {
    code: string;
    name: string;
}

interface Props {
    organization: { id: string; name: string };
    metrics: Metrics;
    monitors: MonitorItem[];
    probe_logs: ProbeLogItem[];
    available_locations: AvailableLocation[];
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

export default function SyntheticsPage({
    organization,
    metrics,
    monitors,
    probe_logs,
    available_locations,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [probingId, setProbingId] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [targetUrl, setTargetUrl] = useState('https://');
    const [probeType, setProbeType] = useState('http');
    const [intervalSeconds, setIntervalSeconds] = useState(60);
    const [timeoutSeconds, setTimeoutSeconds] = useState(10);
    const [expectedStatusCode, setExpectedStatusCode] = useState(200);
    const [selectedLocations, setSelectedLocations] = useState<string[]>(['JKT-1', 'SIN-1', 'HND-1']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetCreateForm = () => {
        setName('');
        setTargetUrl('https://');
        setProbeType('http');
        setIntervalSeconds(60);
        setTimeoutSeconds(10);
        setExpectedStatusCode(200);
        setSelectedLocations(['JKT-1', 'SIN-1', 'HND-1']);
    };

    const handleOpenCreate = () => {
        resetCreateForm();
        setCreateOpen(true);
    };

    const handleCreateMonitor = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        fetchJson('/organization/sre/synthetics', 'POST', {
            name,
            target_url: targetUrl,
            probe_type: probeType,
            interval_seconds: intervalSeconds,
            timeout_seconds: timeoutSeconds,
            expected_status_code: expectedStatusCode,
            locations: selectedLocations,
        })
            .then(() => {
                setIsSubmitting(false);
                setCreateOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handleRunProbe = (monitorId: string) => {
        setProbingId(monitorId);
        fetchJson(`/organization/sre/synthetics/${monitorId}/probe`, 'POST')
            .then(() => {
                setProbingId(null);
                router.reload();
            })
            .catch(() => setProbingId(null));
    };

    const handleToggleStatus = (monitorId: string) => {
        fetchJson(`/organization/sre/synthetics/${monitorId}/toggle`, 'POST').then(() => router.reload());
    };

    const handleDeleteMonitor = (m: MonitorItem) => {
        if (!confirm(`Hapus monitor sintetik "${m.name}"?`)) return;
        fetchJson(`/organization/sre/synthetics/${m.id}`, 'DELETE').then(() => router.reload());
    };

    const toggleLocation = (code: string) => {
        if (selectedLocations.includes(code)) {
            if (selectedLocations.length > 1) {
                setSelectedLocations(selectedLocations.filter(c => c !== code));
            }
        } else {
            setSelectedLocations([...selectedLocations, code]);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> Operational
                    </Badge>
                );
            case 'degraded':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-mono">
                        <AlertCircle className="h-3 w-3" /> Degraded
                    </Badge>
                );
            case 'paused':
                return (
                    <Badge className="bg-muted text-muted-foreground text-[10px] gap-1 font-mono">
                        <PauseCircle className="h-3 w-3" /> Paused
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono animate-pulse">
                        <AlertCircle className="h-3 w-3" /> Down
                    </Badge>
                );
        }
    };

    return (
        <AppLayout>
            <Head title="Synthetic Monitoring & Global Uptime Probe Studio" />

            <div className="space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-emerald-600 flex items-center justify-center text-white shadow-md">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Synthetic Monitoring & Global Uptime Studio
                                </h1>
                                <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-xs font-mono">
                                    Multi-Region Probes
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pemantauan berkala HTTP/API endpoint, verifikasi validitas SSL certificate, serta kalkulasi SLA ketersediaan multi-region
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="h-9 text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-xs"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Monitor Sintetik Baru</span>
                    </Button>
                </div>

                {/* KPI Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Active Probes</span>
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600"><Radio className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.active_monitors}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Endpoint terpantau di {organization.name}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Global SLA Uptime (30d)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><ShieldCheck className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">{metrics.global_uptime}%</span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Tier 1</Badge>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(100, metrics.global_uptime)}%` }} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Avg Global Latency</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Zap className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.avg_latency_ms} ms</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Rata-rata respons seluruh region</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">SSL Expiry Alert</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><Lock className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">
                            {metrics.ssl_expiring_soon}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {metrics.ssl_expiring_soon === 0 ? 'Semua sertifikat aman (>30 hari)' : 'Perlu diperbarui segera (<30 hari)'}
                        </div>
                    </div>
                </div>

                {/* Synthetic Monitors Cards */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-600" />
                        <h3 className="font-bold text-sm text-foreground">Target Endpoint Sintetik & Latensi Multi-Region</h3>
                        <span className="text-xs text-muted-foreground">— Probe real-time per lokasi edge server</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {monitors.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-cyan-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px] font-mono uppercase">
                                                {m.probe_type}
                                            </Badge>
                                            {getStatusBadge(m.status)}
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                Every {m.interval_seconds}s
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-base text-foreground leading-snug">{m.name}</h4>
                                        <span className="text-xs text-muted-foreground font-mono truncate block mt-0.5 max-w-sm">
                                            {m.target_url}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRunProbe(m.id)}
                                            disabled={probingId === m.id}
                                            className="h-7 text-xs px-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${probingId === m.id ? 'animate-spin' : ''}`} />
                                            <span>Probe</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleToggleStatus(m.id)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        >
                                            {m.status === 'paused' ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteMonitor(m)}
                                            className="h-7 w-7 p-0 text-rose-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Multi-Region Latency Badges */}
                                <div className="space-y-1.5">
                                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-cyan-600" />
                                            <span>Edge Latency per Region</span>
                                        </span>
                                        <span className="font-mono text-[10px] text-muted-foreground">Avg: {m.avg_latency_ms}ms</span>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                        {m.location_stats.map((loc) => (
                                            <div
                                                key={loc.code}
                                                className="p-2 rounded-xl bg-muted/40 border border-border/80 text-center space-y-0.5 shadow-2xs"
                                            >
                                                <div className="text-[10px] font-bold text-muted-foreground">{loc.code}</div>
                                                <div className="font-mono text-xs font-semibold text-foreground">
                                                    {loc.latency_ms}ms
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Uptime & SSL Footer */}
                                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Uptime 24h</span>
                                            <span className="font-mono font-bold text-emerald-600">{m.uptime_percentage_24h}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Uptime 30d</span>
                                            <span className="font-mono font-bold text-emerald-600">{m.uptime_percentage_30d}%</span>
                                        </div>
                                    </div>

                                    {m.ssl_days_remaining !== null && (
                                        <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border text-[11px]">
                                            <Lock className={`h-3 w-3 ${m.ssl_days_remaining <= 30 ? 'text-amber-500' : 'text-emerald-500'}`} />
                                            <span className="text-muted-foreground">SSL Valid:</span>
                                            <span className={`font-mono font-bold ${m.ssl_days_remaining <= 30 ? 'text-amber-600' : 'text-foreground'}`}>
                                                {m.ssl_days_remaining} hari
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Probe Event Logs */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-cyan-600" />
                        <h3 className="font-bold text-sm text-foreground">Log Eksekusi Multi-Region Probe</h3>
                        <span className="text-xs text-muted-foreground">— Riwayat pengecekan real-time & error trace</span>
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/50 text-muted-foreground border-b border-border font-medium">
                                    <tr>
                                        <th className="py-3 px-4">Nama Monitor</th>
                                        <th className="py-3 px-4">Lokasi Probe</th>
                                        <th className="py-3 px-4">Status Code</th>
                                        <th className="py-3 px-4">Latensi</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">SSL Valid</th>
                                        <th className="py-3 px-4 text-right">Waktu Eksekusi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {probe_logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                Belum ada log pengecekan probe.
                                            </td>
                                        </tr>
                                    ) : (
                                        probe_logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground max-w-xs truncate">
                                                    {log.monitor_name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge className="bg-muted text-muted-foreground font-mono text-[10px]">
                                                        {log.location_name} ({log.location})
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold">
                                                    {log.status_code ? (
                                                        <span className={log.status_code < 400 ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {log.status_code}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-medium">{log.latency_ms} ms</td>
                                                <td className="py-3 px-4">
                                                    {log.is_success ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono">
                                                            <CheckCircle2 className="h-3 w-3" /> PASS
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono">
                                                            <AlertCircle className="h-3 w-3" /> FAIL
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">
                                                    {log.ssl_valid_days ? `${log.ssl_valid_days}d` : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                                                    {log.checked_at_formatted}
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

            {/* Modal: Create Synthetic Monitor */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-cyan-600">
                            <Globe className="h-5 w-5" />
                            <span>Daftarkan Monitor Sintetik Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasi target URL, interval pengecekan berkala, dan pilih region edge server penguji.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateMonitor} className="space-y-4 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">Nama Monitor *</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Production GraphQL Endpoint"
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">Target Endpoint URL *</label>
                            <Input
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                placeholder="https://api.domain.com/health"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Tipe Probe *</label>
                                <select
                                    value={probeType}
                                    onChange={(e) => setProbeType(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="http">HTTP / HTTPS Request</option>
                                    <option value="api">REST API (JSON Validate)</option>
                                    <option value="ssl">SSL Certificate Prober</option>
                                    <option value="tcp">TCP / Ping Port Check</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-foreground block mb-1">Interval Probe *</label>
                                <select
                                    value={intervalSeconds}
                                    onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10))}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value={30}>Setiap 30 Detik</option>
                                    <option value={60}>Setiap 1 Menit</option>
                                    <option value={300}>Setiap 5 Menit</option>
                                    <option value={900}>Setiap 15 Menit</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Expected HTTP Status</label>
                                <Input
                                    type="number"
                                    value={expectedStatusCode}
                                    onChange={(e) => setExpectedStatusCode(parseInt(e.target.value, 10))}
                                    className="text-xs font-mono"
                                    min={100}
                                    max={599}
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-foreground block mb-1">Timeout (Detik)</label>
                                <Input
                                    type="number"
                                    value={timeoutSeconds}
                                    onChange={(e) => setTimeoutSeconds(parseInt(e.target.value, 10))}
                                    className="text-xs font-mono"
                                    min={1}
                                    max={60}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Pilih Region Probe ({selectedLocations.length} terpilih)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {available_locations.map((loc) => (
                                    <div
                                        key={loc.code}
                                        onClick={() => toggleLocation(loc.code)}
                                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                                            selectedLocations.includes(loc.code)
                                                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-700 dark:text-cyan-400 font-semibold'
                                                : 'hover:bg-muted/50 text-muted-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Server className="h-3.5 w-3.5" />
                                            <span>{loc.code}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{loc.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold">
                                {isSubmitting ? 'Mendaftarkan...' : 'Simpan & Jalankan Probe'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
