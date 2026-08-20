import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    kineticToast,
    ToastPosition,
} from '@/components/kinetic-toast';
import {
    CircularSpinner,
    DeterminateProgressBar,
    PulsingDots,
    SkeletonCard,
    SkeletonTable,
} from '@/components/loading-feedback';
import {
    Activity,
    AlertTriangle,
    BellRing,
    CheckCircle2,
    Clock,
    Eye,
    Layers,
    Layout,
    RefreshCw,
    Sparkles,
    Undo2,
    XCircle,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeedbackShowcasePage() {
    const [selectedPosition, setSelectedPosition] = useState<ToastPosition>('bottom-right');
    const [showSkeletons, setShowSkeletons] = useState(false);
    const [simulatedProgress, setSimulatedProgress] = useState(65);

    const handlePositionChange = (pos: ToastPosition) => {
        setSelectedPosition(pos);
        kineticToast.setPosition(pos);
        kineticToast.info('Posisi Toast Diubah', `Semua notifikasi toast sekarang muncul di ${pos}.`);
    };

    const triggerSuccess = () => {
        kineticToast.success(
            'Tugas Berhasil Disimpan',
            'Perubahan pada sprint dan backlog telah disinkronkan ke server.'
        );
    };

    const triggerError = () => {
        kineticToast.error(
            'Gagal Menyinkronkan Data',
            'Koneksi API gateway mengalami timeout. Silakan coba sesaat lagi.',
            {
                label: 'Coba Lagi',
                onClick: () => kineticToast.info('Mencoba menyinkronkan ulang...'),
            }
        );
    };

    const triggerWarning = () => {
        kineticToast.warning(
            'Latensi Jaringan Tinggi',
            'Database cluster memerlukan waktu 240ms lebih lama dari batas normal.'
        );
    };

    const triggerInfo = () => {
        kineticToast.info(
            'Pembaruan Sistem Tersedia',
            'Pandu Management v2.5 telah dirilis dengan peningkatan AI Co-Pilot.'
        );
    };

    const triggerUndo = () => {
        kineticToast.undo(
            '1 Tugas Telah Diarsipkan',
            'Tugas TSK-1049 dipindahkan ke arsip.',
            () => {
                kineticToast.success('Aksi Dibatalkan', 'Tugas TSK-1049 telah dikembalikan ke papan aktif.');
            }
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Sistem', href: '#' },
                { title: 'Galeri Toast & Umpan Balik', href: '#' },
            ]}
        >
            <Head title="Galeri Toast & Umpan Balik Progresif - Pandu Management" />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <BellRing className="size-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Galeri Toast & Umpan Balik Kinetik
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Sistem notifikasi non-intrusif, timer hitung mundur aksi undo, serta kerangka pemuatan progresif (*skeleton states*).
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={showSkeletons ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowSkeletons(!showSkeletons)}
                            className="text-xs font-semibold gap-1.5"
                        >
                            <RefreshCw className={cn('size-3.5', showSkeletons && 'animate-spin')} />
                            {showSkeletons ? 'Tampilkan Konten Aktual' : 'Simulasikan Skeleton Loading'}
                        </Button>
                    </div>
                </div>

                {/* Main Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Live Dispatcher Box (8 Cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Zap className="size-4 text-primary" /> Pemicu Toast Langsung (*Live Dispatcher*)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Klik tombol untuk menguji respon notifikasi real-time.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => kineticToast.clearAll()}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Bersihkan Semua Toast
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerSuccess}
                                    className="justify-start gap-2 text-xs font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
                                >
                                    <CheckCircle2 className="size-4 text-emerald-400" />
                                    <span>Sukses</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerError}
                                    className="justify-start gap-2 text-xs font-semibold border-red-500/30 hover:bg-red-500/10 text-red-400"
                                >
                                    <XCircle className="size-4 text-red-400" />
                                    <span>Error & Retry</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerWarning}
                                    className="justify-start gap-2 text-xs font-semibold border-amber-500/30 hover:bg-amber-500/10 text-amber-400"
                                >
                                    <AlertTriangle className="size-4 text-amber-400" />
                                    <span>Peringatan</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerInfo}
                                    className="justify-start gap-2 text-xs font-semibold border-blue-500/30 hover:bg-blue-500/10 text-blue-400"
                                >
                                    <Sparkles className="size-4 text-blue-400" />
                                    <span>Informasi</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={triggerUndo}
                                    className="justify-start gap-2 text-xs font-semibold col-span-2 sm:col-span-2 shadow-xs"
                                >
                                    <Undo2 className="size-4" />
                                    <span>Aksi Destruktif dengan Hitung Mundur (Undo)</span>
                                </Button>
                            </div>

                            {/* Simulated Screen Area */}
                            <div className="border border-dashed border-border rounded-xl p-8 bg-muted/20 text-center space-y-2">
                                <span className="text-xs font-mono text-muted-foreground block">
                                    Simulasi Ruang Kerja Aktif • Posisi Notifikasi: <span className="font-bold text-primary font-sans">{selectedPosition}</span>
                                </span>
                                <p className="text-xs text-muted-foreground">
                                    Notifikasi akan melayang di atas antarmuka dan otomatis menghilang setelah waktu durasi habis.
                                </p>
                            </div>
                        </div>

                        {/* Skeleton & Progressive Loading Feedback Section */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Layers className="size-4 text-primary" /> Kerangka Pemuatan Progresif (*Progressive Skeleton States*)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Mencegah pergeseran tata letak (*layout shift*) saat data sedang diambil secara asinkron.
                                    </p>
                                </div>
                            </div>

                            {showSkeletons ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <SkeletonCard count={2} />
                                    </div>
                                    <SkeletonTable rows={3} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-muted/20 rounded-2xl p-5 border border-border space-y-2">
                                            <div className="flex items-center justify-between text-muted-foreground text-xs">
                                                <span>Sprint 28 Velocity</span>
                                                <Zap className="size-4 text-purple-400" />
                                            </div>
                                            <p className="text-2xl font-black font-mono text-foreground">54 pts</p>
                                            <p className="text-[11px] text-emerald-400 font-semibold">+14% dibanding lalu</p>
                                        </div>
                                        <div className="bg-muted/20 rounded-2xl p-5 border border-border space-y-2">
                                            <div className="flex items-center justify-between text-muted-foreground text-xs">
                                                <span>Rata-rata Waktu Siklus</span>
                                                <Clock className="size-4 text-blue-400" />
                                            </div>
                                            <p className="text-2xl font-black font-mono text-foreground">2.4 hari</p>
                                            <p className="text-[11px] text-muted-foreground">In-Progress hingga Done</p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-muted/20 border border-border">
                                        <DeterminateProgressBar
                                            label="Proses Sinkronisasi Aset & Repositori"
                                            value={simulatedProgress}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Options Sidebar (4 Cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Position Selector */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Layout className="size-4 text-primary" /> Posisi Notifikasi Toast
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Pilih sudut layar tempat munculnya tumpukan toast.
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {(
                                    [
                                        'top-left',
                                        'top-center',
                                        'top-right',
                                        'bottom-left',
                                        'bottom-center',
                                        'bottom-right',
                                    ] as ToastPosition[]
                                ).map((pos) => (
                                    <button
                                        key={pos}
                                        type="button"
                                        onClick={() => handlePositionChange(pos)}
                                        className={cn(
                                            'p-2.5 rounded-xl border text-center font-mono font-semibold transition-all text-[11px]',
                                            selectedPosition === pos
                                                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Active Process Spinners Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Activity className="size-4 text-primary" /> Indikator Proses Aktif
                            </h3>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-xl border border-border gap-2">
                                    <CircularSpinner className="size-6" />
                                    <span className="text-[11px] font-mono text-muted-foreground">Indeterminate</span>
                                </div>

                                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-xl border border-border gap-2">
                                    <PulsingDots />
                                    <span className="text-[11px] font-mono text-muted-foreground">Pulsing Pulse</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
