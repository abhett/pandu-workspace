import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Copy,
    Cpu,
    Database,
    Globe,
    HardDrive,
    Headphones,
    Home,
    Layers,
    Radio,
    RefreshCw,
    Server,
    ShieldAlert,
    Wifi,
    WifiOff,
    Wrench,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceHealthItem {
    id: string;
    service_name: string;
    display_name: string;
    category: string;
    status: string;
    uptime_percentage: number;
    latency_ms: number;
    meta?: Record<string, any>;
    last_checked_at_formatted: string;
}

interface IncidentItem {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    affected_services: string[];
    started_at_formatted: string;
    resolved_at_formatted: string;
    duration: string;
}

interface SystemOverview {
    status: string;
    status_label: string;
    average_uptime: number;
    services: ServiceHealthItem[];
    incidents: IncidentItem[];
    last_updated: string;
}

interface Props {
    overview: SystemOverview;
}

export default function SystemStatusPage({ overview }: Props) {
    const [activeTab, setActiveTab] = useState<'health' | 'errors'>('health');
    const [copiedId, setCopiedId] = useState(false);

    // Rate Limit 30s Countdown State for interactive simulator
    const [rateLimitSeconds, setRateLimitSeconds] = useState(30);
    const [rateLimitActive, setRateLimitActive] = useState(true);

    useEffect(() => {
        if (!rateLimitActive) return;

        const interval = setInterval(() => {
            setRateLimitSeconds((prev) => {
                if (prev <= 1) {
                    setRateLimitActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [rateLimitActive]);

    const resetRateLimit = () => {
        setRateLimitSeconds(30);
        setRateLimitActive(true);
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText('req_9a8b7c6d5e4f');
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2500);
    };

    const getServiceIcon = (category: string) => {
        switch (category) {
            case 'ai':
                return <Cpu className="size-5 text-purple-400" />;
            case 'storage':
                return <HardDrive className="size-5 text-blue-400" />;
            case 'networking':
                return <Radio className="size-5 text-amber-400" />;
            default:
                return <Database className="size-5 text-emerald-400" />;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Sistem', href: '#' },
                { title: 'Status & Kesehatan Layanan', href: '#' },
            ]}
        >
            <Head title="Status Sistem & Kesehatan Layanan - Pandu Management" />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Activity className="size-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Status Sistem & Kesehatan Infrastruktur
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pemantauan metrik ketersediaan SLA 99.9%+, latensi kluster, dan galeri interaktif kondisi kesalahan.
                        </p>
                    </div>

                    {/* Navigation Tabs Switcher */}
                    <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border shrink-0 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('health')}
                            className={cn(
                                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                activeTab === 'health'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Kesehatan Layanan
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('errors')}
                            className={cn(
                                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                activeTab === 'errors'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Galeri Status Eksepsi
                        </button>
                    </div>
                </div>

                {activeTab === 'health' ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Overall Operational Banner */}
                        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                    <CheckCircle2 className="size-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                                            {overview.status_label}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground">
                                        Seluruh Layanan Utama Beroperasi Normal
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-emerald-500/20 pt-3 md:pt-0 md:pl-6 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-mono">Rata-rata Uptime</span>
                                    <span className="text-base font-bold text-foreground font-mono">{overview.average_uptime}%</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] uppercase font-mono">Status SLA</span>
                                    <span className="text-base font-bold text-emerald-400 font-mono">100.0%</span>
                                </div>
                            </div>
                        </div>

                        {/* Service Cards Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Server className="size-4 text-primary" /> Komponen Layanan & Kluster Komputasi
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    Diperbarui otomatis tiap 60s
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {overview.services.map((service) => (
                                    <div
                                        key={service.id}
                                        className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-4 hover:border-primary/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center border border-border">
                                                    {getServiceIcon(service.category)}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-foreground leading-tight">
                                                        {service.display_name}
                                                    </h4>
                                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                                        {service.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Normal
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
                                            <div className="bg-muted/30 p-2.5 rounded-xl">
                                                <span className="text-[10px] text-muted-foreground block">Uptime 30 Hari</span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {service.uptime_percentage}%
                                                </span>
                                            </div>
                                            <div className="bg-muted/30 p-2.5 rounded-xl">
                                                <span className="text-[10px] text-muted-foreground block">Latensi Respons</span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {service.latency_ms} ms
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Incident History Timeline */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Clock className="size-4 text-primary" /> Riwayat Insiden & Pemeliharaan Terjadwal
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    30 Hari Terakhir
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                {overview.incidents.map((incident) => (
                                    <div
                                        key={incident.id}
                                        className="p-4 rounded-xl bg-muted/20 border border-border space-y-2 text-xs"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold uppercase">
                                                    {incident.status}
                                                </span>
                                                <h4 className="font-bold text-foreground text-xs">
                                                    {incident.title}
                                                </h4>
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                {incident.started_at_formatted} ({incident.duration})
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                                            {incident.description}
                                        </p>
                                        {incident.affected_services.length > 0 && (
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-muted-foreground">Layanan terkait:</span>
                                                {incident.affected_services.map((srv, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-[9px] font-mono">
                                                        {srv}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Kinetic Error States Gallery Tab */
                    <div className="space-y-8 animate-fade-in">
                        <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
                            Kumpulan referensi komponen visual untuk menangani skenario eksepsi sistem, perutean gagal, batas kuota, dan status pemeliharaan.
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* 1. 403 Forbidden */}
                            <div className="bg-card rounded-2xl p-8 border border-border shadow-xs flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                                <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-xs">
                                    <ShieldAlert className="size-8" />
                                </div>
                                <div className="space-y-1 max-w-sm">
                                    <h3 className="text-lg font-bold text-foreground">Akses Ditolak (403 Forbidden)</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Anda tidak memiliki izin yang diperlukan untuk melihat halaman ini. Hubungi administrator organisasi jika ini merupakan kesalahan.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <Button variant="outline" className="text-xs font-semibold gap-1.5">
                                        <Headphones className="size-3.5" /> Hubungi Admin
                                    </Button>
                                    <Button variant="default" className="text-xs font-semibold gap-1.5">
                                        <ArrowLeft className="size-3.5" /> Kembali
                                    </Button>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground/60">ERR_CODE: 403_ORGANIZATION_FORBIDDEN</span>
                            </div>

                            {/* 2. 404 Not Found */}
                            <div className="bg-card rounded-2xl p-8 border border-border shadow-xs flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                                <div className="text-5xl font-black font-mono tracking-tighter text-primary/40">
                                    404
                                </div>
                                <div className="space-y-1 max-w-sm">
                                    <h3 className="text-lg font-bold text-foreground">Halaman Tidak Ditemukan</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Dokumen atau rute yang Anda cari mungkin telah dipindahkan, diarsipkan, atau dihapus permanen.
                                    </p>
                                </div>
                                <Link href="/dashboard">
                                    <Button className="text-xs font-semibold gap-1.5 shadow-xs">
                                        <Home className="size-3.5" /> Kembali ke Dashboard
                                    </Button>
                                </Link>
                                <span className="text-[10px] font-mono text-muted-foreground/60">HTTP_STATUS: 404_PAGE_NOT_FOUND</span>
                            </div>

                            {/* 3. 500 Connection & Server Error */}
                            <div className="bg-card rounded-2xl p-8 border border-border shadow-xs space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                                        <WifiOff className="size-6 animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">Koneksi Server Terputus</h3>
                                        <p className="text-xs text-amber-400 font-semibold">Gagal menghubungi kluster API utama</p>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Kami tidak dapat memuat data terbaru karena masalah jaringan atau server sedang tidak merespons. Silakan coba lagi dalam beberapa saat.
                                </p>

                                <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between gap-2 text-[11px] font-mono">
                                    <span className="text-muted-foreground truncate">ERR_CONNECTION_REFUSED | ID: req_9a8b7c6d5e4f</span>
                                    <button
                                        type="button"
                                        onClick={handleCopyId}
                                        className="text-primary hover:underline flex items-center gap-1 shrink-0 text-xs font-sans font-semibold"
                                    >
                                        <Copy className="size-3" />
                                        {copiedId ? 'Disalin!' : 'Salin ID'}
                                    </button>
                                </div>

                                <Button variant="outline" className="text-xs font-semibold gap-1.5">
                                    <RefreshCw className="size-3.5" /> Coba Lagi
                                </Button>
                            </div>

                            {/* 4. 429 Rate Limited with Working SVG Countdown */}
                            <div className="bg-card rounded-2xl p-8 border border-border shadow-xs space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                            <circle
                                                className="text-muted/40"
                                                cx="50"
                                                cy="50"
                                                fill="none"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                            />
                                            <circle
                                                className={rateLimitActive ? 'text-amber-400' : 'text-emerald-400'}
                                                cx="50"
                                                cy="50"
                                                fill="none"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                strokeDasharray="264"
                                                strokeDashoffset={(264 * (30 - rateLimitSeconds)) / 30}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <span className="absolute font-mono text-xs font-bold text-foreground">
                                            {rateLimitSeconds}s
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn('w-2 h-2 rounded-full', rateLimitActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400')} />
                                            <h3 className="text-base font-bold text-foreground">
                                                {rateLimitActive ? 'Batas Akses Tercapai (429)' : 'Akses Dipulihkan'}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {rateLimitActive
                                                ? 'Permintaan melebihi kuota 60 req/menit. Sistem sedang mendinginkan antrian.'
                                                : 'Antrian telah normal. Anda dapat melanjutkan pengiriman permintaan.'}
                                        </p>
                                    </div>
                                </div>

                                {!rateLimitActive && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetRateLimit}
                                        className="text-xs"
                                    >
                                        Uji Ulang Simulasi 30s
                                    </Button>
                                )}
                            </div>

                            {/* 5. 503 Maintenance Mode */}
                            <div className="lg:col-span-2 bg-gradient-to-r from-muted/30 to-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                                        <Wrench className="size-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">Sistem Dalam Pemeliharaan Terjadwal (503)</h3>
                                        <p className="text-xs text-muted-foreground">Peningkatan performa basis data & migrasi kluster.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                                        <span>Progres Pemeliharaan: ~75%</span>
                                        <span>Estimasi Selesai: 15:00 WIB (~45 Menit)</span>
                                    </div>
                                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full rounded-full w-3/4 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
