import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Database,
    AlertTriangle,
    Flame,
    CheckCircle2,
    Clock,
    RefreshCw,
    Search,
    Trash2,
    Check,
    Copy,
    Layers,
    ShieldAlert,
    Terminal,
    Server,
    Zap,
    Cpu,
    ArrowRightLeft,
    FileCode,
} from 'lucide-react';

interface EnvironmentItem {
    id: string;
    name: string;
    environment_slug: string;
    database_type: string;
    schema_version: string;
    total_tables_count: number;
    total_indexes_count: number;
    drift_status: 'in_sync' | 'drift_detected' | 'critical_mismatch';
    last_scanned_at_formatted: string | null;
}

interface DriftReportItem {
    id: string;
    table_name: string;
    drift_type: 'missing_column' | 'type_mismatch' | 'missing_index' | 'lock_hazard';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    safe_ddl_remedy: string;
    is_resolved: boolean;
    source_env_name: string | null;
    target_env_name: string | null;
    detected_at_formatted: string;
    resolved_at_formatted: string | null;
}

interface Metrics {
    total_environments_count: number;
    in_sync_percentage: number;
    active_drifts_count: number;
    critical_lock_hazards: number;
    unindexed_foreign_keys: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    environments: EnvironmentItem[];
    driftReports: DriftReportItem[];
    selectedSeverity: string | null;
    selectedEnvironment: string | null;
}

export default function DatabaseDriftPage({
    organization,
    metrics,
    environments,
    driftReports,
    selectedSeverity,
    selectedEnvironment,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [copiedReportId, setCopiedReportId] = useState<string | null>(null);

    // Safe DDL Tool Interactive State
    const [ddlAction, setDdlAction] = useState<string>('create_index_concurrently');
    const [ddlTable, setDdlTable] = useState('tasks');
    const [ddlColumn, setDdlColumn] = useState('assignee_id');
    const [generatedResult, setGeneratedResult] = useState<{
        generated_sql: string;
        laravel_migration: string;
    } | null>({
        generated_sql:
            '-- Step 1: Create index concurrently without acquiring AccessExclusiveLock on tasks\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id);',
        laravel_migration:
            "// In Laravel migration:\nDB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id)');",
    });
    const [isGeneratingDdl, setIsGeneratingDdl] = useState(false);
    const [ddlCopied, setDdlCopied] = useState(false);

    const handleFilterChange = (sev?: string, env?: string) => {
        const params = new URLSearchParams();
        const curSev = sev !== undefined ? sev : selectedSeverity;
        const curEnv = env !== undefined ? env : selectedEnvironment;

        if (curSev && curSev !== 'all') params.append('severity', curSev);
        if (curEnv && curEnv !== 'all') params.append('environment', curEnv);

        router.get(`/organization/database/drift?${params.toString()}`);
    };

    const handleTriggerScan = () => {
        setIsScanning(true);
        fetch('/organization/database/drift/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsScanning(false);
                router.reload();
            })
            .catch(() => setIsScanning(false));
    };

    const handleResolveReport = (report: DriftReportItem) => {
        setActionLoadingId(report.id);
        fetch(`/organization/database/drift/${report.id}/resolve`, {
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

    const handleDeleteReport = (report: DriftReportItem) => {
        if (!confirm(`Hapus laporan drift untuk tabel "${report.table_name}"?`)) return;

        fetch(`/organization/database/drift/${report.id}`, {
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

    const handleGenerateSafeDdl = (e: React.FormEvent) => {
        e.preventDefault();
        setIsGeneratingDdl(true);

        fetch('/organization/database/drift/generate-ddl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                action: ddlAction,
                table_name: ddlTable,
                column_name: ddlColumn,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsGeneratingDdl(false);
                setGeneratedResult(data.result);
            })
            .catch(() => setIsGeneratingDdl(false));
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedReportId(id);
        setTimeout(() => setCopiedReportId(null), 2000);
    };

    const renderSeverityBadge = (sev: string) => {
        switch (sev) {
            case 'critical':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <Flame className="h-3 w-3" />
                        <span>Critical Hazard</span>
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>High Risk</span>
                    </Badge>
                );
            case 'medium':
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Medium</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-slate-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Low</span>
                    </Badge>
                );
        }
    };

    const renderDriftTypeBadge = (type: string) => {
        switch (type) {
            case 'lock_hazard':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono">
                        <Flame className="h-2.5 w-2.5" />
                        <span>Table Lock Hazard</span>
                    </Badge>
                );
            case 'missing_index':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-mono">
                        <Layers className="h-2.5 w-2.5" />
                        <span>Missing FK Index</span>
                    </Badge>
                );
            case 'missing_column':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono">
                        <span>Missing Column</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1 font-mono">
                        <span>Type Mismatch</span>
                    </Badge>
                );
        }
    };

    const filteredReports = driftReports.filter((r) => {
        return (
            r.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.drift_type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Database Migration Drift, Index Health & Zero-Downtime Safe DDL Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md">
                            <Database className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Database Drift & Zero-Downtime Safe DDL Studio
                                </h1>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                                    Schema Governance
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pemantauan integritas skema antar-environment, deteksi missing foreign key index, bahaya table lock, dan resep Safe DDL
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            disabled={isScanning}
                            onClick={handleTriggerScan}
                            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                            <span>{isScanning ? 'Memindai Skema...' : 'Scan Skema Sekarang'}</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* In-Sync Percentage */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">In-Sync Skema Antar-Env</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.in_sync_percentage}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Synchronized
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.total_environments_count} database cluster terpantau
                        </div>
                    </div>

                    {/* Active Drifts */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Drift Skema Terdeteksi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.active_drifts_count}
                            </span>
                            <span className="text-xs text-muted-foreground">inkonsistensi</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Perbedaan kolom, tipe, atau indeks
                        </div>
                    </div>

                    {/* Table Lock Hazards */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Bahaya Table Lock (Lock Hazards)</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                                {metrics.critical_lock_hazards}
                            </span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                Perlu Safe DDL
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Potensi penguncian tabel pada migrasi besar
                        </div>
                    </div>

                    {/* Unindexed Foreign Keys */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Foreign Key Tanpa Indeks</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.unindexed_foreign_keys}
                            </span>
                            <span className="text-xs text-muted-foreground">kolom</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Penyebab lambatnya cascade locks
                        </div>
                    </div>
                </div>

                {/* Environment Sync Matrix Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {environments.map((env) => {
                        const isDrift = env.drift_status === 'drift_detected';
                        return (
                            <div
                                key={env.id}
                                className={`p-4 rounded-2xl border bg-card shadow-xs space-y-2.5 transition-all ${
                                    isDrift ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Server className="h-4 w-4 text-emerald-600" />
                                        <span className="font-bold text-xs text-foreground truncate max-w-[170px]">
                                            {env.name}
                                        </span>
                                    </div>
                                    <Badge
                                        className={`text-[9px] font-mono capitalize ${
                                            isDrift ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                                        }`}
                                    >
                                        {isDrift ? 'Drift Alert' : 'In Sync'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                                    <div>Tipe: <strong className="text-foreground">{env.database_type}</strong></div>
                                    <div>Versi: <strong className="text-foreground">{env.schema_version.slice(0, 10)}</strong></div>
                                    <div>Tabel: {env.total_tables_count}</div>
                                    <div>Indeks: {env.total_indexes_count}</div>
                                </div>

                                <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
                                    <span>Dipindai: {env.last_scanned_at_formatted ?? 'Baru saja'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Interactive Zero-Downtime Safe DDL Studio */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span>Zero-Downtime Safe DDL Migration Recipe Generator</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Hasilkan skrip migrasi database aman multi-tahap untuk mencegah AccessExclusiveLock pada database produksi
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleGenerateSafeDdl} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tindakan DDL *
                            </label>
                            <Select value={ddlAction} onValueChange={setDdlAction}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="create_index_concurrently">⚡ CREATE INDEX CONCURRENTLY</SelectItem>
                                    <SelectItem value="add_not_null_column_safely">🛡️ Add NOT NULL Column Safely</SelectItem>
                                    <SelectItem value="change_column_type">🔄 Modify Type via Dual-Write</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Tabel Target *
                            </label>
                            <Input
                                value={ddlTable}
                                onChange={(e) => setDdlTable(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Kolom Target *
                            </label>
                            <Input
                                value={ddlColumn}
                                onChange={(e) => setDdlColumn(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={isGeneratingDdl}
                                className="h-8 w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                                <Zap className="h-3.5 w-3.5" />
                                <span>{isGeneratingDdl ? 'Menghitung...' : 'Generate Safe Recipe'}</span>
                            </Button>
                        </div>
                    </form>

                    {generatedResult && (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                    Resep SQL Zero-Downtime:
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedResult.generated_sql);
                                        setDdlCopied(true);
                                        setTimeout(() => setDdlCopied(false), 2000);
                                    }}
                                    className="h-5 text-[10px] px-1.5 gap-1"
                                >
                                    {ddlCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                    <span>{ddlCopied ? 'Tersalin' : 'Salin SQL'}</span>
                                </Button>
                            </div>
                            <pre className="p-3 rounded-xl bg-muted/60 border border-border font-mono text-[11px] overflow-x-auto text-foreground whitespace-pre-wrap">
                                {generatedResult.generated_sql}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama tabel (cth: tasks, audit_logs) atau deskripsi drift..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedSeverity || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Severity</SelectItem>
                                <SelectItem value="critical">🔴 Critical Hazard</SelectItem>
                                <SelectItem value="high">🟠 High Risk</SelectItem>
                                <SelectItem value="medium">🔵 Medium</SelectItem>
                                <SelectItem value="low">⚪ Low</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedEnvironment || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val)}
                        >
                            <SelectTrigger className="h-8 text-xs w-40 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Lingkungan</SelectItem>
                                <SelectItem value="production">🌐 Production</SelectItem>
                                <SelectItem value="staging">🧪 Staging</SelectItem>
                                <SelectItem value="local">💻 Local Dev</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Schema Drift & Index Health Reports Catalog */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3.5">Tabel Target</th>
                                    <th className="p-3.5">Tipe Drift</th>
                                    <th className="p-3.5">Tingkat Bahaya</th>
                                    <th className="p-3.5">Deskripsi Inkonsistensi</th>
                                    <th className="p-3.5">Resep Safe DDL Remedy</th>
                                    <th className="p-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                            Semua skema basis data tersinkronisasi sempurna dan aman tanpa henti.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3.5 font-mono font-bold text-foreground">
                                                {report.table_name}
                                            </td>

                                            <td className="p-3.5">
                                                {renderDriftTypeBadge(report.drift_type)}
                                            </td>

                                            <td className="p-3.5">
                                                {renderSeverityBadge(report.severity)}
                                            </td>

                                            <td className="p-3.5 max-w-sm text-muted-foreground leading-relaxed">
                                                {report.description}
                                            </td>

                                            <td className="p-3.5 font-mono text-[10px] max-w-xs">
                                                <div className="p-2 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-1 overflow-x-auto">
                                                    <code className="text-foreground truncate">{report.safe_ddl_remedy}</code>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => copyToClipboard(report.safe_ddl_remedy, report.id)}
                                                        className="h-5 w-5 p-0 shrink-0"
                                                        title="Salin Safe DDL"
                                                    >
                                                        {copiedReportId === report.id ? (
                                                            <Check className="h-2.5 w-2.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-2.5 w-2.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!report.is_resolved && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionLoadingId === report.id}
                                                            onClick={() => handleResolveReport(report)}
                                                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                            title="Tandai Selesai"
                                                        >
                                                            <Check className="h-2.5 w-2.5" />
                                                            <span>Selesai</span>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteReport(report)}
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
        </AppLayout>
    );
}
