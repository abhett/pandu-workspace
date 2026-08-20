import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
} from '@/components/ui/dialog';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Code,
    Download,
    Eye,
    Filter,
    Globe,
    Key,
    Lock,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    User,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLogItem {
    id: string;
    organization_id: string;
    user_id: number | null;
    actor?: { id: number; name: string; email: string; avatar?: string };
    event_category: 'security' | 'access' | 'data_change' | 'system' | 'automation';
    action: string;
    resource_type: string;
    resource_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    status: 'success' | 'failed';
    changes: Record<string, any> | null;
    error_message: string | null;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedLogs {
    data: AuditLogItem[];
    current_page: number;
    last_page: number;
    total: number;
    from: number;
    to: number;
    links: PaginationLink[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    logs: PaginatedLogs;
    filters: {
        category: string;
        status: string;
        search?: string;
        days?: number;
    };
}

export default function AuditLogsPage({ organization, logs, filters }: Props) {
    const [search, setSearch] = useState<string>(filters.search || '');
    const [category, setCategory] = useState<string>(filters.category || 'all');
    const [status, setStatus] = useState<string>(filters.status || 'all');
    const [days, setDays] = useState<number>(filters.days || 30);

    // Slide-over / Modal Detail State
    const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

    const applyFilters = () => {
        router.get(
            '/organization/audit-logs',
            {
                search: search || undefined,
                category: category !== 'all' ? category : undefined,
                status: status !== 'all' ? status : undefined,
                days: days || undefined,
            },
            { preserveState: true }
        );
    };

    const handleExportCsv = () => {
        const query = new URLSearchParams({
            search: search || '',
            category: category !== 'all' ? category : '',
            status: status !== 'all' ? status : '',
            days: days ? String(days) : '',
        }).toString();

        window.location.href = `/organization/audit-logs/export?${query}`;
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'security':
                return <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">Keamanan</Badge>;
            case 'access':
                return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]">Akses & RBAC</Badge>;
            case 'data_change':
                return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">Perubahan Data</Badge>;
            case 'automation':
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Otomasi</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">Sistem</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Keamanan & Kepatuhan', href: '#' },
                { title: 'Log Audit Sistem', href: '#' },
            ]}
        >
            <Head title={`Log Audit Sistem - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-5 text-emerald-500" />
                            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                                ENTERPRISE COMPLIANCE & AUDIT TRAIL
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
                            Log Audit Sistem
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            Lacak seluruh jejak aktivitas keamanan, perubahan izin RBAC, dan aktivitas konfigurasi ruang kerja Anda.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            className="text-xs font-semibold gap-1.5 shadow-2xs"
                        >
                            <Download className="size-3.5" />
                            <span>Ekspor Berkas CSV</span>
                        </Button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Search Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Pencarian Teks</label>
                            <div className="relative">
                                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder="Aktor, aksi, IP, resource..."
                                    className="pl-8 text-xs font-mono h-8"
                                />
                            </div>
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Kategori Event</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="all">Semua Kategori</option>
                                <option value="security">Keamanan & Autentikasi</option>
                                <option value="access">Akses & Peran RBAC</option>
                                <option value="data_change">Perubahan Data & Proyek</option>
                                <option value="automation">Otomasi & Webhook</option>
                                <option value="system">Sistem</option>
                            </select>
                        </div>

                        {/* Status Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="all">Semua Status</option>
                                <option value="success">Sukses</option>
                                <option value="failed">Gagal</option>
                            </select>
                        </div>

                        {/* Date Range Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Rentang Waktu</label>
                            <select
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value={7}>7 Hari Terakhir</option>
                                <option value={30}>30 Hari Terakhir</option>
                                <option value={90}>90 Hari Terakhir</option>
                                <option value={365}>1 Tahun Terakhir</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-border/40">
                        <Button
                            size="sm"
                            onClick={applyFilters}
                            className="text-xs h-7 font-semibold gap-1.5"
                        >
                            <Filter className="size-3" />
                            <span>Terapkan Filter</span>
                        </Button>
                    </div>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                                    <th className="py-3 px-4 font-semibold">Waktu (WIB)</th>
                                    <th className="py-3 px-4 font-semibold">Aktor Pelaksana</th>
                                    <th className="py-3 px-4 font-semibold">Kategori</th>
                                    <th className="py-3 px-4 font-semibold">Aksi</th>
                                    <th className="py-3 px-4 font-semibold">Sumber Daya Target</th>
                                    <th className="py-3 px-4 font-semibold">Alamat IP</th>
                                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                                    <th className="py-3 px-4 font-semibold text-right">Detail</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {logs.data.length > 0 ? (
                                    logs.data.map((log) => (
                                        <tr
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            className="hover:bg-muted/10 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                                                {new Date(log.created_at).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                                        {log.actor?.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-foreground block truncate">
                                                            {log.actor?.name || 'Sistem / Tamu'}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground block truncate font-mono">
                                                            {log.actor?.email || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                {getCategoryBadge(log.event_category)}
                                            </td>

                                            <td className="py-3 px-4 font-mono font-semibold text-foreground">
                                                {log.action}
                                            </td>

                                            <td className="py-3 px-4">
                                                <span className="font-mono text-[11px] bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border">
                                                    {log.resource_type}{log.resource_id ? `:${log.resource_id.substring(0, 8)}` : ''}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                                                {log.ip_address || '-'}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                {log.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold font-mono">
                                                        <span className="size-1.5 rounded-full bg-emerald-400" />
                                                        Sukses
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-semibold font-mono">
                                                        <span className="size-1.5 rounded-full bg-red-400" />
                                                        Gagal
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <button className="p-1 hover:bg-muted rounded text-muted-foreground group-hover:text-primary transition-colors">
                                                    <Eye className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                                            Tidak ditemukan log audit yang cocok dengan filter saat ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {logs.total > 0 && (
                        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                            <span className="text-muted-foreground font-mono">
                                Menampilkan {logs.from} - {logs.to} dari total <strong>{logs.total}</strong> log aktivitas
                            </span>

                            <div className="flex items-center gap-1">
                                {logs.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveState
                                        className={cn(
                                            'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
                                            link.active
                                                ? 'bg-primary text-primary-foreground font-bold'
                                                : link.url
                                                ? 'hover:bg-muted text-foreground'
                                                : 'text-muted-foreground/40 pointer-events-none'
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over Inspection Modal */}
            <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Shield className="size-4 text-primary" /> Rincian Log Audit Sistem
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 py-1 text-xs">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 font-mono text-[11px] border border-border">
                                <div>
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Waktu Eksekusi</span>
                                    <span className="font-semibold text-foreground">{new Date(selectedLog.created_at).toUTCString()}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Aktor</span>
                                    <span className="font-semibold text-foreground">{selectedLog.actor?.name || 'Sistem'}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Aksi</span>
                                    <span className="font-semibold text-primary">{selectedLog.action}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Sumber Daya</span>
                                    <span className="font-semibold text-foreground">{selectedLog.resource_type}:{selectedLog.resource_id || '-'}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Alamat IP</span>
                                    <span className="font-semibold text-foreground">{selectedLog.ip_address || '-'}</span>
                                </div>
                                <div className="pt-2">
                                    <span className="text-muted-foreground block uppercase text-[9px] font-bold">Status</span>
                                    <span className={cn('font-semibold capitalize', selectedLog.status === 'success' ? 'text-emerald-400' : 'text-red-400')}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                            </div>

                            {/* User Agent */}
                            {selectedLog.user_agent && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Client User Agent</span>
                                    <div className="p-2 rounded-lg bg-card border border-border text-[11px] font-mono text-muted-foreground break-all">
                                        {selectedLog.user_agent}
                                    </div>
                                </div>
                            )}

                            {/* Changes Payload Diff */}
                            {selectedLog.changes && (
                                <div className="space-y-1">
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Payload Metadata & Diff</span>
                                    <pre className="p-3 rounded-xl bg-card border border-border text-[10px] font-mono overflow-x-auto text-foreground max-h-48">
                                        {JSON.stringify(selectedLog.changes, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* Error Message if failed */}
                            {selectedLog.error_message && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono space-y-1">
                                    <span className="font-bold block">Pesan Kegagalan:</span>
                                    <p>{selectedLog.error_message}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" onClick={() => setSelectedLog(null)} className="text-xs">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
