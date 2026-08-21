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
    Flag,
    Sliders,
    Percent,
    ToggleLeft,
    ToggleRight,
    Users,
    AlertOctagon,
    Activity,
    ShieldAlert,
    ShieldCheck,
    Plus,
    Search,
    Edit,
    Trash2,
    Zap,
    Radio,
    Flame,
    Check,
    Sparkles,
    Filter,
} from 'lucide-react';

interface FlagItem {
    id: string;
    key: string;
    name: string;
    description: string | null;
    strategy: 'boolean' | 'percentage_rollout' | 'user_targeting' | 'kill_switch';
    is_enabled: boolean;
    rollout_percentage: number;
    target_rules: string[];
    evaluations_count: number;
    error_rate_pct: number;
    status: 'active' | 'paused' | 'archived' | 'killed';
    project_name: string | null;
    creator_name: string | null;
    created_at_formatted: string;
}

interface StrategyStats {
    percentage_rollout: number;
    boolean: number;
    user_targeting: number;
    kill_switch: number;
}

interface Metrics {
    total_flags: number;
    active_rollouts: number;
    total_evaluations_today: number;
    avg_system_error_rate: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    strategyStats: StrategyStats;
    flags: FlagItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    selectedStrategy: string | null;
    selectedStatus: string | null;
    selectedProjectId: string | null;
}

export default function FeatureFlagsPage({
    organization,
    metrics,
    strategyStats,
    flags,
    projects,
    selectedStrategy,
    selectedStatus,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFlag, setEditingFlag] = useState<FlagItem | null>(null);
    const [formProjectId, setFormProjectId] = useState<string>('none');
    const [formKey, setFormKey] = useState('');
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formStrategy, setFormStrategy] = useState<string>('percentage_rollout');
    const [formIsEnabled, setFormIsEnabled] = useState(true);
    const [formRolloutPct, setFormRolloutPct] = useState<number>(25);
    const [formTargetRules, setFormTargetRules] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleFilterChange = (strategy?: string, status?: string, projectId?: string) => {
        const params = new URLSearchParams();
        const curStrat = strategy !== undefined ? strategy : selectedStrategy;
        const curStat = status !== undefined ? status : selectedStatus;
        const curProj = projectId !== undefined ? projectId : selectedProjectId;

        if (curStrat && curStrat !== 'all') params.append('strategy', curStrat);
        if (curStat && curStat !== 'all') params.append('status', curStat);
        if (curProj && curProj !== 'all') params.append('project_id', curProj);

        router.get(`/organization/devops/feature-flags?${params.toString()}`);
    };

    const openCreateModal = () => {
        setEditingFlag(null);
        setFormProjectId('none');
        setFormKey('');
        setFormName('');
        setFormDescription('');
        setFormStrategy('percentage_rollout');
        setFormIsEnabled(true);
        setFormRolloutPct(25);
        setFormTargetRules('');
        setModalOpen(true);
    };

    const openEditModal = (flag: FlagItem) => {
        setEditingFlag(flag);
        setFormProjectId(projects.find(p => p.name === flag.project_name)?.id || 'none');
        setFormKey(flag.key);
        setFormName(flag.name);
        setFormDescription(flag.description || '');
        setFormStrategy(flag.strategy);
        setFormIsEnabled(flag.is_enabled);
        setFormRolloutPct(flag.rollout_percentage);
        setFormTargetRules((flag.target_rules || []).join(', '));
        setModalOpen(true);
    };

    const handleSaveFlag = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const url = editingFlag
            ? `/organization/devops/feature-flags/${editingFlag.id}`
            : '/organization/devops/feature-flags';

        const method = editingFlag ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: formProjectId === 'none' ? null : formProjectId,
                key: formKey,
                name: formName,
                description: formDescription,
                strategy: formStrategy,
                is_enabled: formIsEnabled,
                rollout_percentage: Number(formRolloutPct),
                target_rules: formTargetRules,
                status: formIsEnabled ? 'active' : 'paused',
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleToggleFlag = (flag: FlagItem) => {
        setActionLoadingId(flag.id);
        fetch(`/organization/devops/feature-flags/${flag.id}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                is_enabled: !flag.is_enabled,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleUpdateRollout = (flag: FlagItem, pct: number) => {
        setActionLoadingId(flag.id);
        fetch(`/organization/devops/feature-flags/${flag.id}/rollout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                rollout_percentage: pct,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleTriggerKillSwitch = (flag: FlagItem) => {
        if (!confirm(`⚠️ PERINGATAN DARURAT: Aktifkan Kill Switch untuk "${flag.key}"? Seluruh traffic fitur akan langsung dimatikan.`)) return;

        setActionLoadingId(flag.id);
        fetch(`/organization/devops/feature-flags/${flag.id}/kill`, {
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

    const handleDeleteFlag = (flag: FlagItem) => {
        if (!confirm(`Hapus konfigurasi feature flag "${flag.key}"?`)) return;

        fetch(`/organization/devops/feature-flags/${flag.id}`, {
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

    const renderStrategyBadge = (strategy: string) => {
        switch (strategy) {
            case 'percentage_rollout':
                return (
                    <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px] gap-1">
                        <Percent className="h-2.5 w-2.5" />
                        <span>Canary Rollout</span>
                    </Badge>
                );
            case 'user_targeting':
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1">
                        <Users className="h-2.5 w-2.5" />
                        <span>User Targeting</span>
                    </Badge>
                );
            case 'kill_switch':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                        <AlertOctagon className="h-2.5 w-2.5" />
                        <span>Emergency Kill-Switch</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                        <ToggleRight className="h-2.5 w-2.5" />
                        <span>Boolean Toggle</span>
                    </Badge>
                );
        }
    };

    const filteredFlags = flags.filter((f) => {
        return (
            f.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Enterprise Feature Flags & Progressive Rollout Orchestrator" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                            <Flag className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Enterprise Feature Flags & Progressive Rollout Orchestrator
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    Decoupled Release
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pisahkan rilis kode dari peluncuran fitur, kontrol persentase canary, penargetan segmen pengguna, dan tombol darurat kill switch
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={openCreateModal}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Buat Feature Flag</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Flags */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Feature Flags</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Flag className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_flags}
                            </span>
                            <span className="text-xs text-muted-foreground">Bendera Fitur</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {strategyStats.percentage_rollout} Canary, {strategyStats.boolean} Boolean, {strategyStats.user_targeting} Target
                        </div>
                    </div>

                    {/* Active Rollouts */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rollout Aktif Berjalan</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Radio className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.active_rollouts}
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Active Traffic
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Menghantarkan traffic produksi ke pengguna
                        </div>
                    </div>

                    {/* Evaluations 24h */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Evaluasi Flag (24 Jam)</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_evaluations_today.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">evaluations</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Evaluasi runtime berkecepatan mikrodetik
                        </div>
                    </div>

                    {/* System Error Rate */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Global Error Rate Pasca-Rollout</span>
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                                {metrics.avg_system_error_rate}%
                            </span>
                            <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px]">
                                Stabil
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Batas aman anomali produksi (&lt; 1.0%)
                        </div>
                    </div>
                </div>

                {/* Filter & Strategy Tabs */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari key flag (cth: dark_mode), nama, atau deskripsi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedStrategy || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-44 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Strategi</SelectItem>
                                <SelectItem value="percentage_rollout">📈 Canary Rollout</SelectItem>
                                <SelectItem value="boolean">🔘 Boolean Toggle</SelectItem>
                                <SelectItem value="user_targeting">🎯 User Targeting</SelectItem>
                                <SelectItem value="kill_switch">⚡ Kill Switch</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="active">🟢 Active</SelectItem>
                                <SelectItem value="paused">🟡 Paused</SelectItem>
                                <SelectItem value="killed">🔴 Killed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Flags Cards Grid */}
                <div className="space-y-4">
                    {filteredFlags.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                            <Flag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                            <h3 className="font-bold text-sm text-foreground">Tidak Ada Feature Flag</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Belum ada bendera fitur yang sesuai dengan filter pencarian.
                            </p>
                        </div>
                    ) : (
                        filteredFlags.map((flag) => (
                            <div
                                key={flag.id}
                                className={`rounded-2xl border bg-card p-5 shadow-xs space-y-4 transition-all ${
                                    flag.status === 'killed'
                                        ? 'border-rose-500/40 bg-rose-500/5'
                                        : flag.is_enabled
                                        ? 'border-border hover:border-indigo-500/40'
                                        : 'border-border/60 opacity-85'
                                }`}
                            >
                                {/* Flag Header */}
                                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-3">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-mono font-bold text-xs bg-muted px-2.5 py-1 rounded-lg border border-border text-foreground">
                                            {flag.key}
                                        </span>
                                        {renderStrategyBadge(flag.strategy)}
                                        {flag.project_name && (
                                            <Badge variant="outline" className="text-[10px]">
                                                📁 {flag.project_name}
                                            </Badge>
                                        )}
                                        <h3 className="font-bold text-sm text-foreground">
                                            {flag.name}
                                        </h3>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {flag.status === 'killed' ? (
                                            <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                                                <AlertOctagon className="h-3 w-3" />
                                                <span>KILLED (Emergency)</span>
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant={flag.is_enabled ? 'default' : 'outline'}
                                                disabled={actionLoadingId === flag.id}
                                                onClick={() => handleToggleFlag(flag)}
                                                className={`h-7 text-xs font-semibold gap-1.5 ${
                                                    flag.is_enabled
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        : 'text-muted-foreground'
                                                }`}
                                            >
                                                {flag.is_enabled ? (
                                                    <>
                                                        <ToggleRight className="h-3.5 w-3.5" />
                                                        <span>Aktif (Enabled)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="h-3.5 w-3.5" />
                                                        <span>Mati (Disabled)</span>
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        {flag.status !== 'killed' && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={actionLoadingId === flag.id}
                                                onClick={() => handleTriggerKillSwitch(flag)}
                                                className="h-7 text-[10px] px-2 gap-1 bg-rose-600 hover:bg-rose-700 font-semibold"
                                                title="Emergency Kill Switch"
                                            >
                                                <Zap className="h-3 w-3" />
                                                <span>Kill Switch</span>
                                            </Button>
                                        )}

                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditModal(flag)}
                                                className="h-7 w-7 p-0"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteFlag(flag)}
                                                className="h-7 w-7 p-0 text-rose-500"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Description & Rollout Bar */}
                                <div className="space-y-3">
                                    {flag.description && (
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {flag.description}
                                        </p>
                                    )}

                                    {/* Rollout Progress & Quick Rollout Buttons */}
                                    {flag.strategy === 'percentage_rollout' && (
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <Percent className="h-3.5 w-3.5 text-cyan-600" />
                                                    <span>Persentase Canary Rollout:</span>
                                                    <span className="font-mono font-bold text-cyan-600">
                                                        {flag.rollout_percentage}% Traffic
                                                    </span>
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    {[10, 25, 50, 100].map((pct) => (
                                                        <Button
                                                            key={pct}
                                                            size="sm"
                                                            variant={flag.rollout_percentage === pct ? 'default' : 'outline'}
                                                            disabled={actionLoadingId === flag.id}
                                                            onClick={() => handleUpdateRollout(flag, pct)}
                                                            className={`h-5 text-[10px] px-1.5 font-mono ${
                                                                flag.rollout_percentage === pct
                                                                    ? 'bg-cyan-600 text-white'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {pct}%
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                <div
                                                    style={{ width: `${flag.rollout_percentage}%` }}
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-300"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Rules chips */}
                                    {flag.target_rules && flag.target_rules.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                            <span className="text-[11px] font-semibold text-muted-foreground">Target Rules:</span>
                                            {flag.target_rules.map((rule, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px] font-mono">
                                                    🎯 {rule}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Metadata & Telemetry Footer */}
                                <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <span>Evaluasi: <strong className="text-foreground">{flag.evaluations_count.toLocaleString()}x</strong></span>
                                        <span>Error Rate: <strong className={flag.error_rate_pct > 1.0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{flag.error_rate_pct}%</strong></span>
                                    </div>
                                    <div>
                                        <span>Dibuat oleh: {flag.creator_name ?? 'DevOps Lead'} ({flag.created_at_formatted})</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal: Tambah / Edit Feature Flag */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                            <Flag className="h-5 w-5" />
                            <span>{editingFlag ? `Edit ${editingFlag.key}` : 'Buat Feature Flag Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Konfigurasi bendera fitur dan strategi peluncuran canary.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveFlag} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Key Bendera Fitur *
                                </label>
                                <Input
                                    placeholder="cth: ai_copilot_v2"
                                    value={formKey}
                                    onChange={(e) => setFormKey(e.target.value)}
                                    className="text-xs font-mono"
                                    disabled={!!editingFlag}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Strategi Peluncuran *
                                </label>
                                <Select value={formStrategy} onValueChange={setFormStrategy}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage_rollout">📈 Canary Rollout (%)</SelectItem>
                                        <SelectItem value="boolean">🔘 Boolean Toggle</SelectItem>
                                        <SelectItem value="user_targeting">🎯 User Targeting</SelectItem>
                                        <SelectItem value="kill_switch">⚡ Kill Switch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Fitur *
                            </label>
                            <Input
                                placeholder="cth: AI Copilot Smart Autocomplete"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Deskripsi Fitur
                            </label>
                            <Textarea
                                placeholder="Jelaskan fungsionalitas dan tujuan peluncuran fitur..."
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        {formStrategy === 'percentage_rollout' && (
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Persentase Rollout Awal ({formRolloutPct}%)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formRolloutPct}
                                    onChange={(e) => setFormRolloutPct(Number(e.target.value))}
                                    className="text-xs font-mono"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Aturan Penargetan (Pisahkan dengan koma)
                            </label>
                            <Input
                                placeholder="cth: @pandu.com, internal_testers, role:admin"
                                value={formTargetRules}
                                onChange={(e) => setFormTargetRules(e.target.value)}
                                className="text-xs font-mono"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Proyek Terkait (Opsional)
                            </label>
                            <Select value={formProjectId} onValueChange={setFormProjectId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">🌐 Seluruh Organisasi (Global)</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            📁 {p.name} ({p.key})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan Flag'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
