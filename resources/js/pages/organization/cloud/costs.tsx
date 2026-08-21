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
    Cloud,
    TrendingUp,
    AlertTriangle,
    Flame,
    DollarSign,
    ShieldAlert,
    Cpu,
    Database,
    HardDrive,
    Network,
    Sparkles,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    ChevronRight,
    ArrowUpRight,
    Layers,
    Shield,
    Sliders,
    Zap,
    Percent,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';

interface AnomalyItem {
    id: string;
    provider: string;
    service_name: string;
    anomaly_date: string;
    actual_cost: number;
    expected_cost: number;
    spike_percentage: number;
    severity: 'critical_spike' | 'high_anomaly' | 'moderate_anomaly';
    root_cause_analysis: string;
    status: 'unresolved' | 'investigating' | 'resolved' | 'dismissed';
    resolver_name: string | null;
    resolution_notes: string | null;
    created_at_formatted: string;
}

interface RecommendationItem {
    id: string;
    provider: string;
    title: string;
    description: string;
    resource_id: string | null;
    action_type: 'rightsize' | 'terminate_idle' | 'savings_plan' | 'storage_cleanup';
    estimated_monthly_savings: number;
    currency: string;
    status: 'open' | 'applied' | 'dismissed';
    applier_name: string | null;
    applied_at_formatted: string | null;
}

interface Metrics {
    total_spend_mtd: number;
    projected_spend_eom: number;
    anomalies_count: number;
    potential_monthly_savings: number;
    active_resources_count: number;
}

interface DistributionItem {
    provider?: string;
    category?: string;
    name?: string;
    label?: string;
    amount: number;
    percentage: number;
}

interface TrendItem {
    date: string;
    amount: number;
    expected: number;
    has_anomaly: boolean;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    providerDistribution: DistributionItem[];
    categoryDistribution: DistributionItem[];
    dailyTrend: TrendItem[];
    anomalies: AnomalyItem[];
    recommendations: RecommendationItem[];
    selectedProvider: string | null;
}

export default function CloudCostsPage({
    organization,
    metrics,
    providerDistribution,
    categoryDistribution,
    dailyTrend,
    anomalies,
    recommendations,
    selectedProvider,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    // Triage Anomaly Modal
    const [triageModalOpen, setTriageModalOpen] = useState(false);
    const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
    const [triageStatus, setTriageStatus] = useState<'investigating' | 'resolved' | 'dismissed'>('resolved');
    const [triageNotes, setTriageNotes] = useState('');
    const [isSubmittingTriage, setIsSubmittingTriage] = useState(false);

    // Apply Recommendation Modal
    const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
    const [selectedRec, setSelectedRec] = useState<RecommendationItem | null>(null);
    const [isApplyingRec, setIsApplyingRec] = useState(false);

    const handleSelectProvider = (prov: string) => {
        const params = new URLSearchParams();
        if (prov !== 'all') params.append('provider', prov);
        router.get(`/organization/cloud/costs?${params.toString()}`);
    };

    const openTriageModal = (anomaly: AnomalyItem, initialStatus: 'investigating' | 'resolved' | 'dismissed' = 'resolved') => {
        setSelectedAnomaly(anomaly);
        setTriageStatus(initialStatus);
        setTriageNotes(initialStatus === 'resolved' ? 'Masalah konfigurasi auto-scaling / query telah diperbaiki.' : 'Sedang diinvestigasi bersama tim DevOps.');
        setTriageModalOpen(true);
    };

    const handleExecuteTriage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAnomaly) return;
        setIsSubmittingTriage(true);

        fetch(`/organization/cloud/costs/anomalies/${selectedAnomaly.id}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                status: triageStatus,
                notes: triageNotes,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingTriage(false);
                setTriageModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmittingTriage(false));
    };

    const openApplyRecModal = (rec: RecommendationItem) => {
        setSelectedRec(rec);
        setRecommendationModalOpen(true);
    };

    const handleApplyRecommendation = () => {
        if (!selectedRec) return;
        setIsApplyingRec(true);

        fetch(`/organization/cloud/costs/recommendations/${selectedRec.id}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsApplyingRec(false);
                setRecommendationModalOpen(false);
                router.reload();
            })
            .catch(() => setIsApplyingRec(false));
    };

    const handleDismissRecommendation = (rec: RecommendationItem) => {
        if (!confirm('Abaikan rekomendasi penghematan ini?')) return;

        fetch(`/organization/cloud/costs/recommendations/${rec.id}/dismiss`, {
            method: 'POST',
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

    const renderSeverityBadge = (severity: string, spike: number) => {
        switch (severity) {
            case 'critical_spike':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Flame className="h-3 w-3" />
                        <span>Kritis (+{spike}%)</span>
                    </Badge>
                );
            case 'high_anomaly':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Tinggi (+{spike}%)</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono uppercase">
                        <span>Sedang (+{spike}%)</span>
                    </Badge>
                );
        }
    };

    const renderActionTypeBadge = (type: string) => {
        switch (type) {
            case 'rightsize':
                return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-[10px]">Right-sizing</Badge>;
            case 'terminate_idle':
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">Hapus Idle</Badge>;
            case 'savings_plan':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Savings Plan / CUD</Badge>;
            default:
                return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/30 text-[10px]">Storage Cleanup</Badge>;
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'compute': return <Cpu className="h-3.5 w-3.5 text-blue-500" />;
            case 'database': return <Database className="h-3.5 w-3.5 text-emerald-500" />;
            case 'storage': return <HardDrive className="h-3.5 w-3.5 text-amber-500" />;
            case 'networking': return <Network className="h-3.5 w-3.5 text-purple-500" />;
            default: return <Sparkles className="h-3.5 w-3.5 text-rose-500" />;
        }
    };

    const filteredAnomalies = anomalies.filter((a) => {
        const matchesSearch =
            a.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.root_cause_analysis.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.provider.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    return (
        <AppLayout>
            <Head title="Enterprise Resource Utilization & Cloud Cost Anomaly Detector" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                            <Cloud className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Cloud Resource Utilization & Cost Anomaly Detector
                                </h1>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                                    FinOps Intelligence
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pemantauan multi-cloud real-time, deteksi lonjakan biaya anomali berbasis baseline statistik, dan rekomendasi optimasi right-sizing
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Cloud Provider Filter */}
                        <Select
                            value={selectedProvider || 'all'}
                            onValueChange={(val) => handleSelectProvider(val)}
                        >
                            <SelectTrigger className="h-9 text-xs w-44">
                                <SelectValue placeholder="Semua Provider Cloud" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">🌐 Semua Cloud Provider</SelectItem>
                                <SelectItem value="aws">🟧 Amazon Web Services (AWS)</SelectItem>
                                <SelectItem value="gcp">🟦 Google Cloud Platform (GCP)</SelectItem>
                                <SelectItem value="azure">🟦 Microsoft Azure</SelectItem>
                                <SelectItem value="kubernetes">☸️ Kubernetes Clusters</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Spend MTD */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Pengeluaran Bulan Ini (MTD)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                ${metrics.total_spend_mtd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Real-Time
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dari {metrics.active_resources_count} instance dan resource cloud aktif
                        </div>
                    </div>

                    {/* Projected Spend EOM */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Proyeksi Akhir Bulan (EOM)</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                ${metrics.projected_spend_eom.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ bln</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Berdasarkan laju konsumsi harian saat ini
                        </div>
                    </div>

                    {/* Active Anomalies */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Anomali Biaya Terdeteksi</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.anomalies_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Lonjakan Aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Melebihi baseline rata-rata bergerak 30 hari
                        </div>
                    </div>

                    {/* Potential Savings */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Peluang Penghematan</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                                ${metrics.potential_monthly_savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ bln</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dari rekomendasi optimasi right-sizing terbuka
                        </div>
                    </div>
                </div>

                {/* Visual Analytics: Daily Trend & Distribution Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Daily Spend Trend (8 cols) */}
                    <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground">
                                    Tren Konsumsi Biaya Harian (14 Hari Terakhir)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Titik merah menandakan lonjakan biaya anomali di atas ambang batas standar
                                </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                USD ($) / Hari
                            </Badge>
                        </div>

                        {/* Visual Bar Chart Trend */}
                        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2 items-end h-40">
                            {dailyTrend.map((item, idx) => {
                                const heightPct = Math.min(100, Math.max(15, (item.amount / 300) * 100));
                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                                        <div className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            ${Math.round(item.amount)}
                                        </div>
                                        <div
                                            style={{ height: `${heightPct}%` }}
                                            className={`w-full rounded-t-md transition-all ${
                                                item.has_anomaly
                                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-sm animate-pulse'
                                                    : 'bg-emerald-500/70 hover:bg-emerald-500'
                                            }`}
                                            title={`${item.date}: $${item.amount} (Ekspektasi: $${item.expected})`}
                                        />
                                        <div className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                                            {item.date}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Provider & Category Distribution (4 cols) */}
                    <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <h3 className="font-bold text-sm text-foreground">
                            Distribusi Kategori Cloud
                        </h3>

                        <div className="space-y-3">
                            {categoryDistribution.map((cat, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-foreground font-medium truncate">
                                            {getCategoryIcon(cat.category || '')}
                                            <span>{cat.label}</span>
                                        </span>
                                        <span className="font-mono text-muted-foreground">
                                            ${cat.amount.toFixed(0)} ({cat.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full"
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Anomaly Triage Board & Right-sizing Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Anomaly Triage Table (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Cari service, provider, atau akar masalah..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>

                            <Select value={severityFilter} onValueChange={setSeverityFilter}>
                                <SelectTrigger className="h-8 text-xs w-40 font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Keparahan</SelectItem>
                                    <SelectItem value="critical_spike">🔴 Kritis (&gt;100%)</SelectItem>
                                    <SelectItem value="high_anomaly">🟠 Tinggi (&gt;50%)</SelectItem>
                                    <SelectItem value="moderate_anomaly">🔵 Sedang (&gt;25%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-rose-600" />
                                    <h3 className="font-bold text-sm text-foreground">
                                        Papan Triage Lonjakan Biaya Anomali ({filteredAnomalies.length})
                                    </h3>
                                </div>
                            </div>

                            <div className="divide-y divide-border/60">
                                {filteredAnomalies.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-xs">
                                        Tidak ada anomali biaya yang terdeteksi pada periode ini.
                                    </div>
                                ) : (
                                    filteredAnomalies.map((anom) => (
                                        <div
                                            key={anom.id}
                                            className="p-4 space-y-2.5 hover:bg-muted/10 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                                                        {anom.provider}
                                                    </Badge>
                                                    <span className="font-bold text-xs text-foreground">
                                                        {anom.service_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {renderSeverityBadge(anom.severity, anom.spike_percentage)}
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {anom.anomaly_date}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs font-mono">
                                                <span>
                                                    Biaya Aktual:{' '}
                                                    <span className="font-bold text-rose-600">
                                                        ${anom.actual_cost.toFixed(2)}
                                                    </span>
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Ekspektasi: ${anom.expected_cost.toFixed(2)}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
                                                <span className="font-semibold text-foreground">Analisis AI:</span>{' '}
                                                {anom.root_cause_analysis}
                                            </p>

                                            <div className="flex items-center justify-between pt-1 text-xs">
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    Status: <code className="capitalize font-semibold text-foreground">{anom.status}</code>
                                                </span>

                                                <div className="flex items-center gap-1.5">
                                                    {anom.status !== 'resolved' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openTriageModal(anom, 'resolved')}
                                                            className="h-6 text-[10px] px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            <span>Selesaikan</span>
                                                        </Button>
                                                    )}

                                                    {anom.status === 'unresolved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openTriageModal(anom, 'investigating')}
                                                            className="h-6 text-[10px] px-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                                        >
                                                            <span>Investigasi</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Right-sizing Recommendations Catalog (5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-purple-600" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Rekomendasi Right-Sizing ({recommendations.length})
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {recommendations.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-card">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                    <h4 className="text-xs font-bold text-foreground">Infrastruktur Optimal</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Seluruh resource cloud telah beroperasi efisien tanpa kapasitas idle.
                                    </p>
                                </div>
                            ) : (
                                recommendations.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            {renderActionTypeBadge(rec.action_type)}
                                            <div className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                                                +${rec.estimated_monthly_savings.toFixed(2)}/bln
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-xs text-foreground">
                                            {rec.title}
                                        </h4>

                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {rec.description}
                                        </p>

                                        {rec.resource_id && (
                                            <div className="text-[10px] font-mono text-muted-foreground">
                                                Resource: <code className="bg-muted px-1 rounded">{rec.resource_id}</code>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                            <span className="text-[10px] font-mono text-muted-foreground capitalize">
                                                Status: {rec.status}
                                            </span>

                                            {rec.status === 'open' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDismissRecommendation(rec)}
                                                        className="h-6 text-[10px] px-1.5"
                                                    >
                                                        <span>Abaikan</span>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => openApplyRecModal(rec)}
                                                        className="h-6 text-[10px] px-2 gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                                    >
                                                        <Zap className="h-3 w-3" />
                                                        <span>Terapkan</span>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {rec.status === 'applied' ? '✅ Diterapkan' : 'Dikeluarkan'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Triage Anomali */}
            <Dialog open={triageModalOpen} onOpenChange={setTriageModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Flame className="h-5 w-5" />
                            <span>Triage Anomali Biaya Cloud</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedAnomaly?.service_name} ({selectedAnomaly?.provider.toUpperCase()})
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteTriage} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Status Triage *
                            </label>
                            <Select
                                value={triageStatus}
                                onValueChange={(val: 'investigating' | 'resolved' | 'dismissed') => setTriageStatus(val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="investigating">🟡 Investigasi Sedang Berlangsung</SelectItem>
                                    <SelectItem value="resolved">🟢 Terselesaikan (Telah Diperbaiki)</SelectItem>
                                    <SelectItem value="dismissed">⚪ Abaikan (Pengeluaran yang Diharapkan)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Catatan Resolusi / Tindakan *
                            </label>
                            <Textarea
                                value={triageNotes}
                                onChange={(e) => setTriageNotes(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTriageModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingTriage}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSubmittingTriage ? 'Menyimpan...' : 'Simpan Triage'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Terapkan Rekomendasi Right-Sizing */}
            <Dialog open={recommendationModalOpen} onOpenChange={setRecommendationModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600">
                            <Zap className="h-5 w-5" />
                            <span>Terapkan Optimasi Right-Sizing</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedRec?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Estimasi Penghematan Bulanan:</span>
                                <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                                    +${selectedRec?.estimated_monthly_savings.toFixed(2)} / bulan
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Penyedia Cloud:</span>
                                <span className="font-mono font-semibold uppercase">{selectedRec?.provider}</span>
                            </div>
                        </div>

                        <p className="text-muted-foreground">
                            Konfirmasi bahwa tindakan optimasi ini telah disinkronkan dengan pipeline deployment atau tim infrastruktur.
                        </p>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRecommendationModalOpen(false)}
                            className="text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleApplyRecommendation}
                            disabled={isApplyingRec}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                        >
                            {isApplyingRec ? 'Menerapkan...' : 'Konfirmasi Terapkan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
