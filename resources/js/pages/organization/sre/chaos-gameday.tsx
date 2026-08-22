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
    Flame,
    Shield,
    Activity,
    Timer,
    Plus,
    Zap,
    Play,
    Ban,
    Trash2,
    FileText,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Server,
    Target,
    ChevronRight,
} from 'lucide-react';

interface ScenarioCatalogItem {
    title: string;
    target_service: string;
    fault_type: string;
    environment: string;
    hypothesis: string;
    safety_tripwire: Record<string, number>;
}

interface ExecutionLog {
    time: string;
    stage: string;
    level: string;
    message: string;
}

interface ExperimentItem {
    id: string;
    title: string;
    target_service: string;
    fault_type: string;
    fault_type_label: string;
    environment: string;
    hypothesis: string;
    safety_tripwire: Record<string, number>;
    status: string;
    resilience_score: number | null;
    execution_logs: ExecutionLog[];
    executed_at_formatted: string | null;
    completed_at_formatted: string | null;
    created_by_name: string;
    created_at_formatted: string;
}

interface Metrics {
    resilience_score: number;
    total_drills_executed: number;
    pass_rate: number;
    mttr_chaos_seconds: number;
    reliability_tier: string;
}

interface Props {
    organization: { id: string; name: string };
    metrics: Metrics;
    scenariosCatalog: ScenarioCatalogItem[];
    experiments: ExperimentItem[];
}

export default function ChaosGameDayPage({
    organization,
    metrics,
    scenariosCatalog,
    experiments,
}: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [logViewerOpen, setLogViewerOpen] = useState(false);
    const [viewedExperiment, setViewedExperiment] = useState<ExperimentItem | null>(null);

    // Create form
    const [formTitle, setFormTitle] = useState('');
    const [formTarget, setFormTarget] = useState('');
    const [formFaultType, setFormFaultType] = useState('pool_exhaustion');
    const [formEnvironment, setFormEnvironment] = useState('staging');
    const [formHypothesis, setFormHypothesis] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateFromCatalog = (scenario: ScenarioCatalogItem) => {
        setFormTitle(scenario.title);
        setFormTarget(scenario.target_service);
        setFormFaultType(scenario.fault_type);
        setFormEnvironment(scenario.environment);
        setFormHypothesis(scenario.hypothesis);
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        fetch('/organization/sre/chaos-gameday', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: formTitle,
                target_service: formTarget,
                fault_type: formFaultType,
                environment: formEnvironment,
                hypothesis: formHypothesis,
                safety_tripwire: { max_error_rate_pct: 2.0, abort_timeout_sec: 60 },
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmitting(false);
                setCreateModalOpen(false);
                resetForm();
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const resetForm = () => {
        setFormTitle('');
        setFormTarget('');
        setFormFaultType('pool_exhaustion');
        setFormEnvironment('staging');
        setFormHypothesis('');
    };

    const handleRunDrill = (exp: ExperimentItem) => {
        if (!confirm(`Jalankan drill "${exp.title}" di lingkungan ${exp.environment}?`)) return;

        fetch(`/organization/sre/chaos-gameday/${exp.id}/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleAbortDrill = (exp: ExperimentItem) => {
        fetch(`/organization/sre/chaos-gameday/${exp.id}/abort`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleDeleteExperiment = (exp: ExperimentItem) => {
        if (!confirm(`Hapus eksperimen "${exp.title}"?`)) return;

        fetch(`/organization/sre/chaos-gameday/${exp.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleViewLogs = (exp: ExperimentItem) => {
        setViewedExperiment(exp);
        setLogViewerOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'passed':
                return <Badge className="bg-emerald-600 text-white text-[10px] font-mono"><CheckCircle2 className="h-3 w-3 mr-1" />Passed</Badge>;
            case 'failed':
                return <Badge className="bg-rose-600 text-white text-[10px] font-mono"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
            case 'aborted':
                return <Badge className="bg-amber-600 text-white text-[10px] font-mono"><Ban className="h-3 w-3 mr-1" />Aborted</Badge>;
            case 'running':
                return <Badge className="bg-blue-600 text-white text-[10px] font-mono animate-pulse"><Activity className="h-3 w-3 mr-1" />Running</Badge>;
            default:
                return <Badge className="bg-muted text-muted-foreground text-[10px] font-mono"><Clock className="h-3 w-3 mr-1" />Planned</Badge>;
        }
    };

    const getLogLevelColor = (level: string) => {
        switch (level) {
            case 'success': return 'text-emerald-500';
            case 'warning': return 'text-amber-500';
            case 'danger': return 'text-rose-500';
            default: return 'text-blue-400';
        }
    };

    const getFaultColor = (type: string) => {
        switch (type) {
            case 'pool_exhaustion': return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
            case 'latency_injection': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
            case 'service_blackhole': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
            case 'packet_loss': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <AppLayout>
            <Head title="Enterprise Resilience & Chaos Engineering GameDay Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md">
                            <Flame className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Chaos Engineering GameDay Studio
                                </h1>
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs font-mono">
                                    {metrics.reliability_tier}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Rancang, jalankan, dan verifikasi ketahanan sistem melalui fault injection drills, safety tripwires, dan resilience scoring
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                setCreateModalOpen(true);
                            }}
                            className="h-9 text-xs gap-1.5 font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5 text-rose-600" />
                            <span>Eksperimen Baru</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Resilience Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Indeks Ketahanan Sistem</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Shield className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.resilience_score}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Excellent
                            </Badge>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${metrics.resilience_score}%` }} />
                        </div>
                    </div>

                    {/* Total Drills */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Drill Dieksekusi</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_drills_executed}
                            </span>
                            <span className="text-xs text-muted-foreground">Sesi Drill</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Fault Injection &amp; Recovery Drills
                        </div>
                    </div>

                    {/* Pass Rate */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Kelulusan Drill</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                                {metrics.pass_rate}%
                            </span>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                                On Target
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Melebihi SLA threshold keandalan 90%
                        </div>
                    </div>

                    {/* MTTR Chaos */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">MTTR Chaos Recovery</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Timer className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                ~{metrics.mttr_chaos_seconds}s
                            </span>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                Sub-minute
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Mean Time To Recovery dari injeksi fault
                        </div>
                    </div>
                </div>

                {/* Scenario Catalog */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span>Katalog Template Skenario Chaos</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Skenario fault injection siap pakai — klik untuk membuat eksperimen baru secara instan
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {scenariosCatalog.map((scenario, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleCreateFromCatalog(scenario)}
                                className="text-left p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-rose-500/40 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Badge className={`text-[10px] font-mono ${getFaultColor(scenario.fault_type)}`}>
                                                {scenario.fault_type.replace('_', ' ')}
                                            </Badge>
                                            <Badge className="bg-muted text-muted-foreground text-[10px] font-mono">
                                                {scenario.environment}
                                            </Badge>
                                        </div>
                                        <h4 className="font-semibold text-xs text-foreground group-hover:text-rose-600 transition-colors leading-snug">
                                            {scenario.title}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                            {scenario.hypothesis}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 transition-colors mt-1 flex-shrink-0" />
                                </div>
                                <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Server className="h-3 w-3" />
                                    <span>{scenario.target_service}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Experiments Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3 p-5">
                    <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-rose-600" />
                            <span>Eksperimen &amp; Riwayat Drill</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Daftar eksperimen chaos engineering yang telah dirancang, dieksekusi, dan diverifikasi
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3">Eksperimen</th>
                                    <th className="p-3">Target Service</th>
                                    <th className="p-3">Fault Type</th>
                                    <th className="p-3">Env</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Resilience</th>
                                    <th className="p-3">Dieksekusi</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {experiments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            Belum ada eksperimen chaos. Buat skenario baru dari katalog template.
                                        </td>
                                    </tr>
                                ) : (
                                    experiments.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3">
                                                <span className="font-bold text-foreground block leading-snug">{exp.title}</span>
                                                <span className="text-[10px] text-muted-foreground">{exp.created_by_name}</span>
                                            </td>
                                            <td className="p-3 text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Server className="h-3 w-3" />
                                                    <span>{exp.target_service}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Badge className={`text-[10px] font-mono ${getFaultColor(exp.fault_type)}`}>
                                                    {exp.fault_type_label}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <Badge className="bg-muted text-muted-foreground text-[10px] font-mono">
                                                    {exp.environment}
                                                </Badge>
                                            </td>
                                            <td className="p-3">{getStatusBadge(exp.status)}</td>
                                            <td className="p-3">
                                                {exp.resilience_score ? (
                                                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                        {exp.resilience_score}/100
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-muted-foreground font-mono text-[11px]">
                                                {exp.executed_at_formatted ?? '—'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {exp.status === 'planned' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleRunDrill(exp)}
                                                            className="h-6 text-[10px] px-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1"
                                                        >
                                                            <Play className="h-3 w-3 fill-current" />
                                                            <span>Run</span>
                                                        </Button>
                                                    )}
                                                    {exp.status === 'running' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAbortDrill(exp)}
                                                            className="h-6 text-[10px] px-2 text-amber-600 border-amber-500/40 font-semibold gap-1"
                                                        >
                                                            <Ban className="h-3 w-3" />
                                                            <span>Abort</span>
                                                        </Button>
                                                    )}
                                                    {exp.execution_logs.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewLogs(exp)}
                                                            className="h-6 text-[10px] px-2 text-muted-foreground gap-1"
                                                        >
                                                            <FileText className="h-3 w-3" />
                                                            <span>Log</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteExperiment(exp)}
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

            {/* Modal: Create Experiment */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Flame className="h-5 w-5" />
                            <span>Buat Eksperimen Chaos Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Rancang skenario kegagalan sistem dan hipotesis pemulihan layanan target.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">Judul Eksperimen *</label>
                            <Input
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="Contoh: Redis Cluster Cold Eviction Drill"
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">Target Service *</label>
                            <Input
                                value={formTarget}
                                onChange={(e) => setFormTarget(e.target.value)}
                                placeholder="Contoh: Session & Rate Limit Cache"
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Fault Type *</label>
                                <Select value={formFaultType} onValueChange={setFormFaultType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pool_exhaustion" className="text-xs">Pool Exhaustion</SelectItem>
                                        <SelectItem value="latency_injection" className="text-xs">Latency Injection</SelectItem>
                                        <SelectItem value="service_blackhole" className="text-xs">Service Blackhole</SelectItem>
                                        <SelectItem value="packet_loss" className="text-xs">Packet Loss</SelectItem>
                                        <SelectItem value="cpu_spike" className="text-xs">CPU Spike</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="font-semibold text-foreground block mb-1">Environment *</label>
                                <Select value={formEnvironment} onValueChange={setFormEnvironment}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staging" className="text-xs">Staging</SelectItem>
                                        <SelectItem value="preprod" className="text-xs">Pre-Production</SelectItem>
                                        <SelectItem value="canary" className="text-xs">Canary</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">Hipotesis Pemulihan *</label>
                            <Textarea
                                value={formHypothesis}
                                onChange={(e) => setFormHypothesis(e.target.value)}
                                placeholder="Contoh: Circuit breaker otomatis mengalihkan traffic ke fallback cluster dalam 5 detik."
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-amber-600 block">Safety Tripwire Aktif</span>
                                <span className="text-muted-foreground">Auto-abort jika error rate &gt; 2.0% atau timeout 60 detik terlampaui.</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                            >
                                {isSubmitting ? 'Membuat...' : 'Buat Eksperimen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Execution Log Viewer */}
            <Dialog open={logViewerOpen} onOpenChange={setLogViewerOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <FileText className="h-5 w-5 text-rose-600" />
                            <span>Timeline Eksekusi Drill</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {viewedExperiment?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {viewedExperiment && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs">
                                {getStatusBadge(viewedExperiment.status)}
                                {viewedExperiment.resilience_score && (
                                    <span className="font-mono font-bold text-emerald-600">
                                        Skor: {viewedExperiment.resilience_score}/100
                                    </span>
                                )}
                                <span className="text-muted-foreground">
                                    {viewedExperiment.executed_at_formatted} → {viewedExperiment.completed_at_formatted}
                                </span>
                            </div>

                            <div className="rounded-xl border border-border bg-slate-950 p-4 space-y-2 max-h-[360px] overflow-y-auto">
                                {viewedExperiment.execution_logs.map((log, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-xs font-mono">
                                        <span className="text-slate-500 w-24 flex-shrink-0">{log.time}</span>
                                        <Badge className={`text-[9px] w-44 flex-shrink-0 justify-center font-mono ${
                                            log.level === 'success' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' :
                                            log.level === 'warning' ? 'bg-amber-900/50 text-amber-400 border-amber-800' :
                                            log.level === 'danger' ? 'bg-rose-900/50 text-rose-400 border-rose-800' :
                                            'bg-blue-900/50 text-blue-400 border-blue-800'
                                        }`}>
                                            {log.stage}
                                        </Badge>
                                        <span className={`${getLogLevelColor(log.level)} leading-relaxed`}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
