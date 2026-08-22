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
    Rocket,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronRight,
    ArrowUp,
    RotateCcw,
    Trash2,
    Plus,
    Activity,
    ShieldAlert,
    Timer,
    BarChart3,
    GitCommit,
    Server,
    Info,
} from 'lucide-react';

interface RiskFactor {
    key: string;
    label: string;
    value: string;
    score: number;
    weight_pct: number;
}

interface EnvironmentStage {
    name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
}

interface PipelineItem {
    id: string;
    title: string;
    version_tag: string;
    commit_sha: string | null;
    repository_url: string | null;
    environments: EnvironmentStage[];
    risk_score: number;
    risk_factors: RiskFactor[];
    current_environment: string;
    status: string;
    auto_rollback_enabled: boolean;
    rollback_threshold_pct: number;
    deployed_by_name: string;
    project_name: string | null;
    started_at_formatted: string | null;
    completed_at_formatted: string | null;
    created_at_formatted: string;
}

interface Metrics {
    total_deployments: number;
    success_rate: number;
    avg_risk_score: number;
    mttr_deployment: string;
}

interface Props {
    organization: { id: string; name: string };
    metrics: Metrics;
    pipelines: PipelineItem[];
}

const ENV_ORDER = ['dev', 'staging', 'canary', 'production'];

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

export default function DeploymentsPage({ organization, metrics, pipelines }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [detailPipeline, setDetailPipeline] = useState<PipelineItem | null>(null);

    const [formTitle, setFormTitle] = useState('');
    const [formVersion, setFormVersion] = useState('');
    const [formCommit, setFormCommit] = useState('');
    const [formRepo, setFormRepo] = useState('');
    const [formAutoRollback, setFormAutoRollback] = useState(true);
    const [formThreshold, setFormThreshold] = useState('2.0');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setFormTitle('');
        setFormVersion('');
        setFormCommit('');
        setFormRepo('');
        setFormAutoRollback(true);
        setFormThreshold('2.0');
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        fetchJson('/organization/sre/deployments', 'POST', {
            title: formTitle,
            version_tag: formVersion,
            commit_sha: formCommit || null,
            repository_url: formRepo || null,
            auto_rollback_enabled: formAutoRollback,
            rollback_threshold_pct: parseFloat(formThreshold),
        })
            .then(() => {
                setIsSubmitting(false);
                setCreateOpen(false);
                resetForm();
                router.reload();
            })
            .catch(() => setIsSubmitting(false));
    };

    const handlePromote = (p: PipelineItem) => {
        const nextIdx = ENV_ORDER.indexOf(p.current_environment) + 1;
        const nextEnv = ENV_ORDER[nextIdx] ?? 'production';
        if (!confirm(`Promosikan "${p.title}" ke environment ${nextEnv}?`)) return;
        fetchJson(`/organization/sre/deployments/${p.id}/promote`, 'POST').then(() => router.reload());
    };

    const handleRollback = (p: PipelineItem) => {
        if (!confirm(`Rollback "${p.title}" dari ${p.current_environment}?`)) return;
        fetchJson(`/organization/sre/deployments/${p.id}/rollback`, 'POST').then(() => router.reload());
    };

    const handleDelete = (p: PipelineItem) => {
        if (!confirm(`Hapus pipeline "${p.title}"?`)) return;
        fetchJson(`/organization/sre/deployments/${p.id}`, 'DELETE').then(() => router.reload());
    };

    const getRiskColor = (score: number) => {
        if (score < 25) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
        if (score < 55) return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
        return 'text-rose-600 bg-rose-500/10 border-rose-500/30';
    };

    const getRiskLabel = (score: number) => {
        if (score < 25) return 'Rendah';
        if (score < 55) return 'Sedang';
        return 'Tinggi';
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
            passed: { label: 'Passed', className: 'bg-emerald-600 text-white', Icon: CheckCircle2 },
            running: { label: 'Running', className: 'bg-blue-600 text-white animate-pulse', Icon: Activity },
            pending: { label: 'Pending', className: 'bg-muted text-muted-foreground', Icon: Timer },
            rolled_back: { label: 'Rolled Back', className: 'bg-amber-600 text-white', Icon: RotateCcw },
            failed: { label: 'Failed', className: 'bg-rose-600 text-white', Icon: XCircle },
        };
        const cfg = map[status] ?? map['pending'];
        return (
            <Badge className={`${cfg.className} text-[10px] font-mono gap-1`}>
                <cfg.Icon className="h-3 w-3" />
                {cfg.label}
            </Badge>
        );
    };

    const getEnvStageBadge = (stage: EnvironmentStage) => {
        const colors: Record<string, string> = {
            passed: 'bg-emerald-500 text-white',
            running: 'bg-blue-500 text-white animate-pulse',
            rolled_back: 'bg-amber-500 text-white',
            failed: 'bg-rose-500 text-white',
            pending: 'bg-muted text-muted-foreground',
        };
        return (
            <div
                key={stage.name}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase ${colors[stage.status] ?? colors.pending}`}
                title={`${stage.name}: ${stage.status}`}
            >
                {stage.name}
            </div>
        );
    };

    const canPromote = (p: PipelineItem) =>
        (p.status === 'running' || p.status === 'pending') &&
        ENV_ORDER.indexOf(p.current_environment) < ENV_ORDER.length - 1;

    return (
        <AppLayout>
            <Head title="Deployment Pipeline Tracker & Rollout Risk Analyzer" />

            <div className="space-y-6 pb-16">
                {/* Header */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <Rocket className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Deployment Pipeline Tracker
                                </h1>
                                <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-xs font-mono">
                                    Rollout Risk Analyzer
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pantau pipeline rilis multi-environment, kalkulasi risiko rollout otomatis, dan inisiasi rollback dengan satu klik
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => { resetForm(); setCreateOpen(true); }}
                        className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Deployment Baru</span>
                    </Button>
                </div>

                {/* KPI Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Deployments</span>
                            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600"><Rocket className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.total_deployments}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Pipeline rilis yang terdaftar</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Success Rate</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 font-mono">{metrics.success_rate}%</span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Excellent</Badge>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${metrics.success_rate}%` }} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Avg Rollout Risk Score</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><ShieldAlert className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.avg_risk_score}</span>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Rata-rata skor risiko pipeline aktif</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">MTTR Deployment</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Timer className="h-4 w-4" /></div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-foreground font-mono">{metrics.mttr_deployment}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Mean Time To Recover deployment</div>
                    </div>
                </div>

                {/* Pipeline Progress Board */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-violet-600" />
                        <h3 className="font-bold text-sm text-foreground">Pipeline Progress Board</h3>
                        <span className="text-xs text-muted-foreground">— Status rilis live per environment</span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {pipelines.map((p) => (
                            <div
                                key={p.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-violet-500/30 transition-colors"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {getStatusBadge(p.status)}
                                            <Badge className={`text-[10px] font-mono ${getRiskColor(p.risk_score)}`}>
                                                Risiko: {p.risk_score}/100 ({getRiskLabel(p.risk_score)})
                                            </Badge>
                                        </div>
                                        <h4 className="font-bold text-sm text-foreground leading-snug truncate">{p.title}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Rocket className="h-3 w-3 text-violet-500" />
                                                {p.version_tag}
                                            </span>
                                            {p.commit_sha && (
                                                <span className="flex items-center gap-1 font-mono">
                                                    <GitCommit className="h-3 w-3" />
                                                    {p.commit_sha}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Server className="h-3 w-3" />
                                                {p.deployed_by_name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDetailPipeline(p)}
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-violet-600"
                                        >
                                            <Info className="h-3.5 w-3.5" />
                                        </Button>
                                        {canPromote(p) && (
                                            <Button
                                                size="sm"
                                                onClick={() => handlePromote(p)}
                                                className="h-6 text-[10px] px-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1"
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                                Promote
                                            </Button>
                                        )}
                                        {(p.status === 'running' || p.status === 'passed') && p.current_environment !== 'dev' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRollback(p)}
                                                className="h-6 text-[10px] px-2 text-amber-600 border-amber-500/40 font-semibold gap-1"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Rollback
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(p)}
                                            className="h-7 w-7 p-0 text-rose-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Environment Pipeline Stages */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {(p.environments.length > 0 ? p.environments : ENV_ORDER.map(e => ({ name: e, status: 'pending', started_at: null, completed_at: null }))).map((stage, idx, arr) => (
                                        <React.Fragment key={stage.name}>
                                            {getEnvStageBadge(stage)}
                                            {idx < arr.length - 1 && (
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Risk Score Bar */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Rollout Risk Score</span>
                                        <span className="font-mono font-bold">{p.risk_score}/100</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full ${p.risk_score < 25 ? 'bg-emerald-500' : p.risk_score < 55 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                            style={{ width: `${p.risk_score}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="text-[10px] text-muted-foreground font-mono">
                                    {p.auto_rollback_enabled && (
                                        <span className="text-emerald-600">⚡ Auto-rollback aktif (threshold: {p.rollback_threshold_pct}%)</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal: Create Pipeline */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-violet-600">
                            <Rocket className="h-5 w-5" />
                            <span>Daftarkan Deployment Pipeline Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pipeline akan dimulai dari environment <strong>Dev</strong> secara otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">Judul Rilis *</label>
                            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Contoh: Rilis Fitur Multi-Tenant SSO v5.0" className="text-xs" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Version Tag *</label>
                                <Input value={formVersion} onChange={e => setFormVersion(e.target.value)} placeholder="v4.14.0" className="text-xs" required />
                            </div>
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Commit SHA</label>
                                <Input value={formCommit} onChange={e => setFormCommit(e.target.value)} placeholder="a3f9d2e1..." className="text-xs font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="font-semibold text-foreground block mb-1">Repository URL</label>
                            <Input value={formRepo} onChange={e => setFormRepo(e.target.value)} placeholder="https://github.com/org/repo" className="text-xs" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="auto-rollback"
                                    checked={formAutoRollback}
                                    onChange={e => setFormAutoRollback(e.target.checked)}
                                    className="rounded accent-violet-600"
                                />
                                <label htmlFor="auto-rollback" className="font-semibold text-foreground cursor-pointer">Auto-Rollback</label>
                            </div>
                            <div>
                                <label className="font-semibold text-foreground block mb-1">Error Threshold (%)</label>
                                <Input value={formThreshold} onChange={e => setFormThreshold(e.target.value)} type="number" step="0.1" min="0.1" max="10" className="text-xs" />
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20 text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-violet-600 block">Rollout Risk Score akan dihitung otomatis</span>
                                <span className="text-muted-foreground">Berdasarkan ukuran diff, coverage test, riwayat insiden, dan target environment.</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="text-xs">Batal</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold">
                                {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Pipeline'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Risk Breakdown Detail */}
            <Dialog open={!!detailPipeline} onOpenChange={() => setDetailPipeline(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <BarChart3 className="h-5 w-5 text-violet-600" />
                            <span>Rollout Risk Score Breakdown</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {detailPipeline?.title} — {detailPipeline?.version_tag}
                        </DialogDescription>
                    </DialogHeader>

                    {detailPipeline && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3">
                                <span className={`text-3xl font-black font-mono ${detailPipeline.risk_score < 25 ? 'text-emerald-600' : detailPipeline.risk_score < 55 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {detailPipeline.risk_score}
                                </span>
                                <div>
                                    <div className="text-xs font-semibold text-foreground">/ 100 — {getRiskLabel(detailPipeline.risk_score)} Risk</div>
                                    <div className="text-[11px] text-muted-foreground">Dihitung dari 5 faktor tertimbang</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {(detailPipeline.risk_factors ?? []).map((f) => (
                                    <div key={f.key} className="flex items-center gap-3 text-xs">
                                        <div className="w-36 flex-shrink-0 text-muted-foreground">{f.label}</div>
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${f.score < 8 ? 'bg-emerald-500' : f.score < 16 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.min(100, (f.score / 30) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="w-16 text-right font-mono font-bold">{f.score} pts</div>
                                        <Badge className="bg-muted text-muted-foreground text-[9px] font-mono w-10 justify-center">{f.weight_pct}%</Badge>
                                        <div className="w-24 text-[10px] text-muted-foreground text-right">{f.value}</div>
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
