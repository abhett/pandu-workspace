import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import HighSecurityConfirmDialog from '@/components/high-security-confirm-dialog';
import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Clock,
    Database,
    Download,
    FileSpreadsheet,
    HardDrive,
    History,
    RefreshCw,
    RotateCcw,
    Save,
    Shield,
    ShieldAlert,
    Trash2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetentionPolicy {
    id: string;
    audit_logs_retention_days: number;
    deleted_tasks_retention_days: number;
    orphan_attachments_retention_days: number;
    auto_purge_enabled: boolean;
    last_purged_at_formatted: string;
}

interface ComplianceExportItem {
    id: string;
    export_type: string;
    status: string;
    file_size_formatted: string;
    requested_by: string;
    created_at_formatted: string;
    expires_at_formatted: string;
    summary?: {
        total_projects?: number;
        total_tasks?: number;
        total_members?: number;
    };
    download_url: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    policy: RetentionPolicy;
    exports: ComplianceExportItem[];
}

export default function DataRetentionPage({ organization, policy, exports }: Props) {
    const [auditLogsDays, setAuditLogsDays] = useState(policy.audit_logs_retention_days);
    const [deletedTasksDays, setDeletedTasksDays] = useState(policy.deleted_tasks_retention_days);
    const [orphanDays, setOrphanDays] = useState(policy.orphan_attachments_retention_days);
    const [autoPurge, setAutoPurge] = useState(policy.auto_purge_enabled);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

    const [showPurgeDialog, setShowPurgeDialog] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleSavePolicy = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        fetch('/organization/data-retention/policy', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                audit_logs_retention_days: auditLogsDays,
                deleted_tasks_retention_days: deletedTasksDays,
                orphan_attachments_retention_days: orphanDays,
                auto_purge_enabled: autoPurge,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleExecutePurge = () => {
        fetch('/organization/data-retention/purge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                confirmation: 'PURGE-EXPIRED-DATA',
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setPurgeMessage(data.message || 'Pembersihan berhasil dieksekusi.');
                setTimeout(() => setPurgeMessage(null), 5000);
                router.reload();
            });
    };

    const handleRequestExport = () => {
        setIsExporting(true);
        fetch('/organization/data-retention/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsExporting(false);
                router.reload();
            })
            .catch(() => setIsExporting(false));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Retensi & Kepatuhan', href: '#' },
            ]}
        >
            <Head title={`Retensi Data & Kepatuhan - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="space-y-1 pb-2 border-b border-border">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <History className="size-6 text-primary" /> Retensi Data & Kepatuhan Regulasi
                        </h1>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono gap-1">
                            <Shield className="size-3" /> GDPR Compliant
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-2xl">
                        Atur ambang batas masa simpan log audit, jadwal pemusnahan tugas terhapus, dan buat ekspor data portabilitas GDPR.
                    </p>
                </div>

                {purgeMessage && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400 font-semibold animate-fade-in">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{purgeMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Retention Policies Configuration */}
                    <div className="lg:col-span-7 space-y-6">
                        <form onSubmit={handleSavePolicy} className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Clock className="size-4 text-primary" /> Kebijakan Masa Simpan (Retention Rules)
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Data di luar periode yang ditentukan akan otomatis dihapus permanen.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                {/* Audit Logs Retention */}
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-foreground">Masa Simpan Log Audit Sistem</label>
                                    <select
                                        value={auditLogsDays}
                                        onChange={(e) => setAuditLogsDays(parseInt(e.target.value))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="30">30 Hari</option>
                                        <option value="90">90 Hari</option>
                                        <option value="365">1 Tahun (Standar Kepatuhan)</option>
                                        <option value="0">Tanpa Batas (Indefinite)</option>
                                    </select>
                                </div>

                                {/* Deleted Tasks Retention */}
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-foreground">Ambang Batas Pembersihan Tugas Terhapus (Trash)</label>
                                    <select
                                        value={deletedTasksDays}
                                        onChange={(e) => setDeletedTasksDays(parseInt(e.target.value))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="14">14 Hari</option>
                                        <option value="30">30 Hari (Rekomendasi)</option>
                                        <option value="60">60 Hari</option>
                                        <option value="90">90 Hari</option>
                                    </select>
                                </div>

                                {/* Orphan Attachments Retention */}
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-foreground">Pembersihan Berkas Lampiran Yatim (Orphan Files)</label>
                                    <select
                                        value={orphanDays}
                                        onChange={(e) => setOrphanDays(parseInt(e.target.value))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="0">Langsung Saat Tugas Dimusnahkan</option>
                                        <option value="7">7 Hari Setelah Pemusnahan</option>
                                        <option value="30">30 Hari Masa Tenggang</option>
                                    </select>
                                </div>

                                {/* Auto Purge Toggle */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 pt-3">
                                    <div className="space-y-0.5">
                                        <span className="font-semibold text-foreground">Jadwal Pemusnahan Otomatis</span>
                                        <p className="text-[11px] text-muted-foreground">
                                            Sistem akan mengeksekusi pembersihan harian pada pukul 02:00 UTC.
                                        </p>
                                    </div>
                                    <Switch checked={autoPurge} onCheckedChange={setAutoPurge} />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                                {saveSuccess && (
                                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mr-auto">
                                        <CheckCircle2 className="size-4" /> Kebijakan berhasil disimpan!
                                    </span>
                                )}
                                <Button type="submit" disabled={isSaving} className="text-xs font-semibold gap-1.5">
                                    <Save className="size-3.5" />
                                    {isSaving ? 'Menyimpan...' : 'Simpan Kebijakan'}
                                </Button>
                            </div>
                        </form>

                        {/* On-Demand Purge Engine Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Trash2 className="size-4 text-amber-400" /> Eksekusi Pembersihan Manual
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Pemusnahan instan data usang yang telah melewati batas retensi saat ini.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <div className="space-y-1 text-xs">
                                    <div className="font-semibold text-foreground">
                                        Pembersihan Terakhir: <span className="font-mono text-muted-foreground">{policy.last_purged_at_formatted}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Tindakan ini memerlukan verifikasi keamanan tinggi.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowPurgeDialog(true)}
                                    className="shrink-0 text-xs font-semibold gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                                >
                                    <RotateCcw className="size-3.5" /> Eksekusi Pembersihan
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: GDPR Export & Regulatory Archives */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* GDPR Export Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Archive className="size-4 text-emerald-400" /> Portabilitas Data GDPR
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Ekspor snapshot lengkap seluruh data workspace organisasi.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-xs">
                                <p className="text-muted-foreground leading-relaxed">
                                    Paket ekspor mencakup proyek, daftar tugas, data keanggotaan, komentar, dan jejak log audit dalam format arsip JSON terstruktur.
                                </p>
                                <Button
                                    onClick={handleRequestExport}
                                    disabled={isExporting}
                                    className="w-full text-xs font-semibold gap-1.5 shadow-xs"
                                >
                                    <Download className="size-3.5" />
                                    {isExporting ? 'Memproses Ekspor...' : 'Buat Snapshot Ekspor Baru'}
                                </Button>
                            </div>
                        </div>

                        {/* Export History Table */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                                <FileSpreadsheet className="size-4 text-primary" /> Riwayat Arsip Kepatuhan
                            </h3>

                            {exports.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    Belum ada arsip ekspor data.
                                </div>
                            ) : (
                                <div className="divide-y divide-border text-xs">
                                    {exports.map((exp) => (
                                        <div key={exp.id} className="py-3 flex items-center justify-between gap-3">
                                            <div className="space-y-0.5">
                                                <span className="font-semibold text-foreground block">
                                                    {exp.export_type}
                                                </span>
                                                <div className="text-[10px] font-mono text-muted-foreground">
                                                    {exp.created_at_formatted} • {exp.file_size_formatted}
                                                </div>
                                            </div>
                                            <a
                                                href={exp.download_url}
                                                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-block"
                                                title="Unduh Paket JSON"
                                            >
                                                <Download className="size-3.5" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* High Security Purge Confirmation Dialog */}
            <HighSecurityConfirmDialog
                open={showPurgeDialog}
                onOpenChange={setShowPurgeDialog}
                title="Pemusnahan Data Retensi Masal"
                description="Tindakan ini akan menghapus secara permanen seluruh task di tempat sampah dan berkas yatim yang melewati batas waktu retensi. Data yang dimusnahkan TIDAK DAPAT dipulihkan kembali."
                requiredConfirmationText="PURGE-EXPIRED-DATA"
                actionButtonLabel="Musnahkan Data Sekarang"
                onConfirm={handleExecutePurge}
                isDestructive={true}
            />
        </AppLayout>
    );
}
