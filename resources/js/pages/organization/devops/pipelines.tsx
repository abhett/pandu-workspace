import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    GitBranch,
    GitCommit,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    ShieldCheck,
    Play,
    RotateCcw,
    Plus,
    Search,
    ChevronRight,
    Server,
    Terminal,
    Layers,
    Sliders,
    ArrowUpRight,
    Shield,
    Workflow,
    Cpu,
    ExternalLink,
    Zap,
} from 'lucide-react';

interface Stage {
    name: string;
    label: string;
    status: 'pending' | 'running' | 'passed' | 'failed' | 'blocked_by_gate';
    duration_seconds: number;
}

interface PipelineRunItem {
    id: string;
    pipeline_config_id: string;
    pipeline_name: string;
    project_name: string;
    project_key: string;
    run_number: number;
    environment: 'development' | 'staging' | 'production';
    status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'blocked_by_gate';
    branch: string;
    commit_sha: string;
    commit_sha_short: string;
    commit_message: string | null;
    author_name: string;
    trigger_type: 'webhook_push' | 'pull_request' | 'manual_trigger' | 'rollback';
    stages: Stage[];
    duration_seconds: number;
    duration_formatted: string;
    gate_approved_by_name: string | null;
    gate_approved_at_formatted: string | null;
    gate_notes: string | null;
    created_at_formatted: string;
}

interface PipelineConfigItem {
    id: string;
    name: string;
    project_name: string;
    project_key: string;
    provider: string;
    repository_url: string | null;
    default_branch: string;
    require_prod_approval: boolean;
    is_active: boolean;
    latest_run: {
        id: string;
        run_number: number;
        environment: string;
        status: string;
        branch: string;
        commit_sha: string;
        created_at_formatted: string;
    } | null;
    created_at_formatted: string;
}

interface Metrics {
    success_rate_prod_pct: number;
    pending_gates_count: number;
    total_runs_month: number;
    avg_duration_minutes: number;
    active_configs_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    configs: PipelineConfigItem[];
    runs: PipelineRunItem[];
    pendingGates: PipelineRunItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    selectedProjectId: string | null;
}

export default function CicdPipelinesPage({
    organization,
    metrics,
    configs,
    runs,
    pendingGates,
    projects,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [envFilter, setEnvFilter] = useState('all');

    // New Config Modal
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configProjectId, setConfigProjectId] = useState<string>(projects[0]?.id || '');
    const [configName, setConfigName] = useState('');
    const [configRepoUrl, setConfigRepoUrl] = useState('');
    const [configProvider, setConfigProvider] = useState('github_actions');
    const [configBranch, setConfigBranch] = useState('main');
    const [configRequireApproval, setConfigRequireApproval] = useState(true);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Manual Trigger Modal
    const [triggerModalOpen, setTriggerModalOpen] = useState(false);
    const [triggerConfigId, setTriggerConfigId] = useState<string>(configs[0]?.id || '');
    const [triggerEnv, setTriggerEnv] = useState<'development' | 'staging' | 'production'>('staging');
    const [triggerBranch, setTriggerBranch] = useState('');
    const [isTriggeringRun, setIsTriggeringRun] = useState(false);

    // Gate Approval / Rejection Modal
    const [gateModalOpen, setGateModalOpen] = useState(false);
    const [selectedGateRun, setSelectedGateRun] = useState<PipelineRunItem | null>(null);
    const [gateActionType, setGateActionType] = useState<'approve' | 'reject'>('approve');
    const [gateNotes, setGateNotes] = useState('');
    const [isSubmittingGate, setIsSubmittingGate] = useState(false);

    const handleSelectProject = (projId: string) => {
        const params = new URLSearchParams();
        if (projId !== 'all') params.append('project_id', projId);
        router.get(`/organization/devops/pipelines?${params.toString()}`);
    };

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingConfig(true);

        fetch('/organization/devops/pipelines/configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: configProjectId,
                name: configName,
                repository_url: configRepoUrl || null,
                provider: configProvider,
                default_branch: configBranch,
                require_prod_approval: configRequireApproval,
                is_active: true,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingConfig(false);
                setConfigModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingConfig(false));
    };

    const handleTriggerRun = (e: React.FormEvent) => {
        e.preventDefault();
        if (!triggerConfigId) return;
        setIsTriggeringRun(true);

        fetch(`/organization/devops/pipelines/configs/${triggerConfigId}/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                environment: triggerEnv,
                branch: triggerBranch || null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsTriggeringRun(false);
                setTriggerModalOpen(false);
                router.reload();
            })
            .catch(() => setIsTriggeringRun(false));
    };

    const openGateModal = (run: PipelineRunItem, action: 'approve' | 'reject') => {
        setSelectedGateRun(run);
        setGateActionType(action);
        setGateNotes(action === 'approve' ? 'Semua pengujian lolos, siap deploy ke produksi.' : 'Ditemukan anomali performa.');
        setGateModalOpen(true);
    };

    const handleExecuteGate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGateRun) return;
        setIsSubmittingGate(true);

        const url =
            gateActionType === 'approve'
                ? `/organization/devops/pipelines/runs/${selectedGateRun.id}/approve-gate`
                : `/organization/devops/pipelines/runs/${selectedGateRun.id}/reject-gate`;

        const body =
            gateActionType === 'approve'
                ? { notes: gateNotes }
                : { reason: gateNotes };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(body),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingGate(false);
                setGateModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmittingGate(false));
    };

    const handleRollback = (run: PipelineRunItem) => {
        if (!confirm(`Konfirmasi pemicuan rollback otomatis untuk Run #${run.run_number}?`)) return;

        fetch(`/organization/devops/pipelines/runs/${run.id}/rollback`, {
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

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'passed':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Passed</span>
                    </Badge>
                );
            case 'blocked_by_gate':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-mono uppercase animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Approval Gate</span>
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono uppercase">
                        <XCircle className="h-3 w-3" />
                        <span>Failed</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>Running</span>
                    </Badge>
                );
        }
    };

    const renderEnvBadge = (env: string) => {
        switch (env) {
            case 'production':
                return (
                    <Badge className="bg-purple-600 text-white text-[10px] font-mono uppercase">
                        Production
                    </Badge>
                );
            case 'staging':
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] font-mono uppercase">
                        Staging
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-slate-600 text-white text-[10px] font-mono uppercase">
                        Development
                    </Badge>
                );
        }
    };

    const filteredRuns = runs.filter((r) => {
        const matchesSearch =
            r.pipeline_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.commit_sha.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.author_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEnv = envFilter === 'all' || r.environment === envFilter;
        return matchesSearch && matchesEnv;
    });

    return (
        <AppLayout>
            <Head title="CI/CD Pipeline & Deployment Gate Orchestrator" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <Workflow className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Continuous Integration & Deployment Gate Orchestrator
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    DevOps Suite
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Orkestrasi tahapan build multi-stage, verifikasi gerbang rilis produksi (Production Gate), dan rollback 1-klik
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Scope Project Filter */}
                        <Select
                            value={selectedProjectId || 'all'}
                            onValueChange={(val) => handleSelectProject(val)}
                        >
                            <SelectTrigger className="h-9 text-xs w-44">
                                <SelectValue placeholder="Semua Proyek" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">🌐 Semua Proyek</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        📁 {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfigModalOpen(true)}
                            className="h-9 text-xs gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Konfigurasi Pipeline</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => {
                                if (configs.length > 0) {
                                    setTriggerConfigId(configs[0].id);
                                    setTriggerModalOpen(true);
                                } else {
                                    setConfigModalOpen(true);
                                }
                            }}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <Play className="h-3.5 w-3.5" />
                            <span>Trigger Manual Run</span>
                        </Button>
                    </div>
                </div>

                {/* Pending Deployment Gate Alerts */}
                {pendingGates.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 animate-bounce" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Antrean Gerbang Rilis Produksi Memerlukan Persetujuan ({pendingGates.length})
                                </h3>
                            </div>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                Action Required
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pendingGates.map((gate) => (
                                <div
                                    key={gate.id}
                                    className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                #{gate.run_number}
                                            </Badge>
                                            <span className="font-bold text-xs text-foreground">
                                                {gate.pipeline_name}
                                            </span>
                                        </div>
                                        <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                                            PRODUCTION
                                        </Badge>
                                    </div>

                                    <div className="text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">{gate.author_name}</span>{' '}
                                        meminta rilis branch <code className="bg-muted px-1 rounded">{gate.branch}</code> (
                                        <code className="bg-muted px-1 rounded font-mono">{gate.commit_sha_short}</code>)
                                    </div>

                                    {gate.commit_message && (
                                        <p className="text-[11px] italic text-muted-foreground truncate">
                                            "{gate.commit_message}"
                                        </p>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openGateModal(gate, 'reject')}
                                            className="h-7 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                        >
                                            <XCircle className="h-3.5 w-3.5 mr-1" />
                                            <span>Tolak</span>
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => openGateModal(gate, 'approve')}
                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                            <span>Setujui Deploy</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Prod Success Rate */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Success Rate (Prod)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.success_rate_prod_pct}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Healthy
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Persentase deploy produksi berhasil
                        </div>
                    </div>

                    {/* Pending Gate Approvals */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Antrean Gerbang Rilis</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.pending_gates_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Menunggu Otorisasi</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Production deployment gate
                        </div>
                    </div>

                    {/* Total Runs Month */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Pipeline Runs</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_runs_month}
                            </span>
                            <span className="text-xs text-muted-foreground">Bulan Ini</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dari {metrics.active_configs_count} pipeline aktif
                        </div>
                    </div>

                    {/* Avg Lead Time Deploy */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Lead Time</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_duration_minutes}m
                            </span>
                            <span className="text-xs text-muted-foreground">Durasi Rata-rata</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Waktu siklus Build hingga Deploy
                        </div>
                    </div>
                </div>

                {/* Main Pipeline Runs Feed & Configs Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Pipeline Runs Stream (8 cols) */}
                    <div className="lg:col-span-8 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Cari branch, commit SHA, atau author..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>

                            <Select value={envFilter} onValueChange={setEnvFilter}>
                                <SelectTrigger className="h-8 text-xs w-44 font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Environment</SelectItem>
                                    <SelectItem value="production">🟣 Production</SelectItem>
                                    <SelectItem value="staging">🔵 Staging</SelectItem>
                                    <SelectItem value="development">⚪ Development</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            {filteredRuns.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
                                    <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <h4 className="text-xs font-bold text-foreground">Belum Ada Riwayat Pipeline Run</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Picu pipeline manual atau hubungkan repositori melalui webhook CI/CD.
                                    </p>
                                </div>
                            ) : (
                                filteredRuns.map((run) => (
                                    <div
                                        key={run.id}
                                        className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3 hover:border-border/80 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs font-mono font-bold">
                                                    #{run.run_number}
                                                </Badge>
                                                <span className="font-bold text-sm text-foreground">
                                                    {run.pipeline_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({run.project_key})
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {renderEnvBadge(run.environment)}
                                                {renderStatusBadge(run.status)}
                                            </div>
                                        </div>

                                        {/* Multi-Stage Visual Sequence */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                            {run.stages.map((stage, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`rounded-xl p-2.5 border text-xs flex flex-col justify-between ${
                                                        stage.status === 'passed'
                                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                            : stage.status === 'blocked_by_gate'
                                                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 animate-pulse'
                                                            : stage.status === 'failed'
                                                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-600'
                                                            : 'bg-muted/40 border-border text-muted-foreground'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold capitalize text-[11px]">
                                                            {stage.name.replace('_', ' ')}
                                                        </span>
                                                        {stage.status === 'passed' && <CheckCircle2 className="h-3 w-3" />}
                                                        {stage.status === 'blocked_by_gate' && <AlertTriangle className="h-3 w-3" />}
                                                        {stage.status === 'failed' && <XCircle className="h-3 w-3" />}
                                                    </div>
                                                    <div className="text-[10px] font-mono mt-1 opacity-80">
                                                        {stage.duration_seconds > 0 ? `${stage.duration_seconds}s` : '--'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Git Meta Footer */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/40 text-xs text-muted-foreground font-mono">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <GitBranch className="h-3 w-3 text-foreground" />
                                                    <code className="text-foreground">{run.branch}</code>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <GitCommit className="h-3 w-3" />
                                                    <code>{run.commit_sha_short}</code>
                                                </span>
                                                <span>Oleh: {run.author_name}</span>
                                                <span>Durasi: {run.duration_formatted}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {run.environment === 'production' && run.status === 'passed' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRollback(run)}
                                                        className="h-6 text-[10px] px-2 gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                                        title="Rollback ke versi ini"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        <span>Rollback</span>
                                                    </Button>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    {run.created_at_formatted}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Configured Pipelines Sidebar (4 cols) */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-indigo-600" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Pipeline Terkonfigurasi ({configs.length})
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            {configs.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-6 text-center bg-card">
                                    <Workflow className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <h4 className="text-xs font-bold text-foreground">Belum Ada Pipeline</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Tambahkan konfigurasi pipeline untuk proyek Anda.
                                    </p>
                                </div>
                            ) : (
                                configs.map((cfg) => (
                                    <div
                                        key={cfg.id}
                                        className="rounded-2xl border border-border bg-card p-3.5 shadow-xs space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-foreground truncate">
                                                {cfg.name}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {cfg.provider}
                                            </Badge>
                                        </div>

                                        <div className="text-[11px] text-muted-foreground">
                                            Proyek: <span className="font-semibold text-foreground">{cfg.project_name}</span> |
                                            Branch: <code className="bg-muted px-1 rounded">{cfg.default_branch}</code>
                                        </div>

                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {cfg.require_prod_approval ? '🛡️ Gate Aktif' : '⚡ Auto-Deploy'}
                                            </span>

                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setTriggerConfigId(cfg.id);
                                                    setTriggerModalOpen(true);
                                                }}
                                                className="h-6 text-[10px] px-2 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                            >
                                                <Play className="h-3 w-3" />
                                                <span>Jalankan</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Tambah Konfigurasi Pipeline */}
            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Workflow className="h-5 w-5 text-indigo-600" />
                            <span>Konfigurasi Pipeline CI/CD Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Daftarkan pipeline repositori git untuk otomatisasi build dan deployment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveConfig} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Target Proyek *
                            </label>
                            <Select value={configProjectId} onValueChange={setConfigProjectId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} ({p.key})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Pipeline *
                            </label>
                            <Input
                                placeholder="cth: Main Backend API Service"
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Provider CI/CD *
                            </label>
                            <Select value={configProvider} onValueChange={setConfigProvider}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="github_actions">🐙 GitHub Actions</SelectItem>
                                    <SelectItem value="gitlab_ci">🦊 GitLab CI</SelectItem>
                                    <SelectItem value="jenkins">☕ Jenkins</SelectItem>
                                    <SelectItem value="custom_webhook">⚡ Custom Webhook</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Default Branch *
                            </label>
                            <Input
                                placeholder="main"
                                value={configBranch}
                                onChange={(e) => setConfigBranch(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                URL Repositori Git (Opsional)
                            </label>
                            <Input
                                placeholder="https://github.com/org/repo"
                                value={configRepoUrl}
                                onChange={(e) => setConfigRepoUrl(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <div>
                                <span className="text-xs font-semibold block text-foreground">
                                    Wajibkan Gerbang Persetujuan Produksi (Production Gate)
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    Memerlukan otorisasi Manager/Owner sebelum tahap deploy dieksekusi
                                </span>
                            </div>
                            <Switch
                                checked={configRequireApproval}
                                onCheckedChange={setConfigRequireApproval}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfigModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingConfig}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSavingConfig ? 'Menyimpan...' : 'Simpan Pipeline'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Pemicu Manual Run */}
            <Dialog open={triggerModalOpen} onOpenChange={setTriggerModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-indigo-600" />
                            <span>Picu Eksekusi Pipeline Manual</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Jalankan build dan automated test pipeline pada environment yang dipilih.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleTriggerRun} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pilih Pipeline *
                            </label>
                            <Select value={triggerConfigId} onValueChange={setTriggerConfigId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {configs.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} ({c.project_name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Target Environment *
                            </label>
                            <Select
                                value={triggerEnv}
                                onValueChange={(val: 'development' | 'staging' | 'production') => setTriggerEnv(val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="development">⚪ Development</SelectItem>
                                    <SelectItem value="staging">🔵 Staging</SelectItem>
                                    <SelectItem value="production">🟣 Production (Gate Protected)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Branch Khusus (Opsional)
                            </label>
                            <Input
                                placeholder="Biarkan kosong untuk default branch"
                                value={triggerBranch}
                                onChange={(e) => setTriggerBranch(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTriggerModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isTriggeringRun}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isTriggeringRun ? 'Memproses...' : 'Jalankan Pipeline'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Otorisasi Gate (Approve / Reject) */}
            <Dialog open={gateModalOpen} onOpenChange={setGateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {gateActionType === 'approve' ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    <span>Persetujuan Rilis Produksi</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-rose-600" />
                                    <span>Penolakan Rilis Produksi</span>
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Run #{selectedGateRun?.run_number} - {selectedGateRun?.pipeline_name}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteGate} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                {gateActionType === 'approve' ? 'Catatan Persetujuan (Opsional)' : 'Alasan Penolakan *'}
                            </label>
                            <Textarea
                                value={gateNotes}
                                onChange={(e) => setGateNotes(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required={gateActionType === 'reject'}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setGateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingGate}
                                className={`text-white text-xs font-semibold ${
                                    gateActionType === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                            >
                                {isSubmittingGate
                                    ? 'Memproses...'
                                    : gateActionType === 'approve'
                                    ? 'Konfirmasi Setujui'
                                    : 'Konfirmasi Tolak'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
