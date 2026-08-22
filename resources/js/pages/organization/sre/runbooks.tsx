import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Terminal,
    Play,
    ShieldAlert,
    Clock,
    Zap,
    CheckCircle2,
    RotateCcw,
    Sliders,
    Database,
    Cpu,
    Network,
    Plus,
    Trash2,
    ChevronRight,
    Search,
    Flame,
    FileText,
    Server,
    ExternalLink,
    Code,
    Lock,
    UserCheck,
    Check,
    X,
} from 'lucide-react';

interface RunbookStep {
    [key: string]: any;
    id: string;
    title: string;
    type: 'automated_script' | 'api_webhook' | 'approval_gate' | 'manual_check';
    action_command?: string;
    timeout_seconds?: number;
}

interface RunbookParam {
    [key: string]: any;
    key: string;
    label: string;
    type: string;
    default?: any;
    required?: boolean;
}

interface Runbook {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category: 'database' | 'networking' | 'cache' | 'deployment' | 'scaling';
    severity: 'critical' | 'high' | 'medium' | 'low';
    estimated_duration_minutes: number;
    is_automated: boolean;
    total_runs: number;
    success_rate: number;
    last_executed_formatted: string;
    steps_count: number;
    steps: RunbookStep[];
    parameters: RunbookParam[];
    executions_count: number;
}

interface StepResult {
    step_id: string;
    title: string;
    type: string;
    status: 'completed' | 'failed' | 'running' | 'pending';
    output_logs?: string;
    duration_ms?: number;
}

interface Execution {
    id: string;
    incident_runbook_id: string;
    runbook_title: string;
    runbook_category: string;
    runbook_severity: string;
    executed_by: string;
    status: 'completed' | 'failed' | 'running' | 'cancelled';
    trigger_type: 'manual' | 'alert_webhook' | 'oncall_escalation';
    execution_params: Record<string, any>;
    step_results: StepResult[];
    total_duration_ms: number;
    started_at_formatted: string;
    completed_at_formatted: string;
}

interface CategoryOption {
    id: string;
    label: string;
    color: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: {
        total_playbooks: number;
        automation_coverage_percent: number;
        total_executions_30d: number;
        avg_mttr_minutes: number;
        overall_success_rate: number;
    };
    runbooks: Runbook[];
    executions: Execution[];
    categories: CategoryOption[];
}

export default function IncidentRunbooksStudio({
    organization,
    metrics,
    runbooks,
    executions,
    categories,
}: Props) {
    const [activeTab, setActiveTab] = useState<'playbooks' | 'executions'>('playbooks');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Runner Modal State
    const [selectedRunbook, setSelectedRunbook] = useState<Runbook | null>(null);
    const [runParams, setRunParams] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [activeExecution, setActiveExecution] = useState<Execution | null>(null);

    // Detail Drawer Modal State
    const [viewExecution, setViewExecution] = useState<Execution | null>(null);

    // Create Playbook Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newCategory, setNewCategory] = useState<'database' | 'networking' | 'cache' | 'deployment' | 'scaling'>('database');
    const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
    const [newDuration, setNewDuration] = useState(5);
    const [newIsAutomated, setNewIsAutomated] = useState(true);
    const [newSteps, setNewSteps] = useState<RunbookStep[]>([
        {
            id: 'step_1',
            title: 'Analisis Root-Cause & Capture Dump Metrik',
            type: 'automated_script',
            action_command: 'curl -s https://metrics.internal/healthz',
            timeout_seconds: 30,
        },
        {
            id: 'step_2',
            title: 'Eksekusi Remediasi Pemulihan Layanan',
            type: 'automated_script',
            action_command: 'kubectl rollout restart deployment/core-service',
            timeout_seconds: 120,
        },
    ]);

    const handleOpenRunner = (rb: Runbook) => {
        setSelectedRunbook(rb);
        const defaults: Record<string, any> = {};
        (rb.parameters || []).forEach((p) => {
            defaults[p.key] = p.default ?? '';
        });
        setRunParams(defaults);
        setActiveExecution(null);
    };

    const handleExecuteRunbook = () => {
        if (!selectedRunbook) return;
        setIsExecuting(true);

        router.post(
            `/organization/sre/runbooks/${selectedRunbook.id}/execute`,
            {
                execution_params: runParams,
                trigger_type: 'manual',
            },
            {
                preserveScroll: true,
                onSuccess: (page: any) => {
                    setIsExecuting(false);
                    // Find latest execution for this runbook
                    const latestExec = page.props?.executions?.[0];
                    if (latestExec) {
                        setActiveExecution(latestExec);
                    }
                },
                onError: () => {
                    setIsExecuting(false);
                },
            }
        );
    };

    const handleDeleteRunbook = (id: string, title: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus runbook "${title}"?`)) {
            router.delete(`/organization/sre/runbooks/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const handleAddStepToForm = () => {
        const nextId = `step_${newSteps.length + 1}`;
        setNewSteps([
            ...newSteps,
            {
                id: nextId,
                title: 'Langkah Operasional Baru',
                type: 'automated_script',
                action_command: 'echo "Executing operational check"',
                timeout_seconds: 60,
            },
        ]);
    };

    const handleRemoveStepFromForm = (index: number) => {
        setNewSteps(newSteps.filter((_, i) => i !== index));
    };

    const handleCreateRunbookSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            '/organization/sre/runbooks',
            {
                title: newTitle,
                description: newDescription,
                category: newCategory,
                severity: newSeverity,
                estimated_duration_minutes: Number(newDuration),
                is_automated: newIsAutomated,
                steps: newSteps,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    setNewTitle('');
                    setNewDescription('');
                },
            }
        );
    };

    const filteredRunbooks = runbooks.filter((rb) => {
        const matchesCategory = selectedCategory === 'all' || rb.category === selectedCategory;
        const matchesSearch =
            rb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (rb.description && rb.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const getStepIcon = (type: string) => {
        switch (type) {
            case 'automated_script':
                return <Code className="w-3.5 h-3.5 text-emerald-400" />;
            case 'api_webhook':
                return <Server className="w-3.5 h-3.5 text-blue-400" />;
            case 'approval_gate':
                return <Lock className="w-3.5 h-3.5 text-amber-400" />;
            case 'manual_check':
                return <UserCheck className="w-3.5 h-3.5 text-purple-400" />;
            default:
                return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">Critical</span>;
            case 'high':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">High</span>;
            case 'medium':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Medium</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20">Low</span>;
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'database':
                return <span className="flex items-center gap-1 text-xs text-amber-400 font-medium"><Database className="w-3 h-3" /> Database</span>;
            case 'cache':
                return <span className="flex items-center gap-1 text-xs text-rose-400 font-medium"><Cpu className="w-3 h-3" /> Cache</span>;
            case 'networking':
                return <span className="flex items-center gap-1 text-xs text-blue-400 font-medium"><Network className="w-3 h-3" /> Traffic & Network</span>;
            case 'deployment':
                return <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium"><RotateCcw className="w-3 h-3" /> Rollback & Deploy</span>;
            case 'scaling':
                return <span className="flex items-center gap-1 text-xs text-purple-400 font-medium"><Sliders className="w-3 h-3" /> Auto-Scaling</span>;
            default:
                return <span className="text-xs text-slate-400">{cat}</span>;
        }
    };

    const getTriggerBadge = (trigger: string) => {
        switch (trigger) {
            case 'oncall_escalation':
                return <span className="px-2 py-0.5 text-xs rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">On-Call Escalation</span>;
            case 'alert_webhook':
                return <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">Alert Webhook</span>;
            default:
                return <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">Manual SRE</span>;
        }
    };

    return (
        <AppLayout>
            <Head title="Automated Incident Remediation Runbooks - Pandu SRE Studio" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                                <Zap className="w-3 h-3" /> SRE Operational Playbooks
                            </span>
                            <span className="text-xs text-slate-400">• {organization.name}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Automated Incident Remediation Runbooks Studio
                        </h1>
                        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                            Eksekusi SOP mitigasi darurat sistem langkah-demi-langkah dengan parameterisasi, verifikasi gerbang persetujuan (*approval gate*), dan audit log eksekusi terminal.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Playbook Baru
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">Active Playbooks</span>
                            <FileText className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{metrics.total_playbooks}</div>
                        <div className="text-xs text-slate-400 mt-1">SOP Mitigasi Terdaftar</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">Automation Rate</span>
                            <Zap className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">{metrics.automation_coverage_percent}%</div>
                        <div className="text-xs text-slate-400 mt-1">Full Auto Remediation</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">30D Executions</span>
                            <Terminal className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{metrics.total_executions_30d}</div>
                        <div className="text-xs text-slate-400 mt-1">Insiden Ditangani</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">Avg MTTR Target</span>
                            <Clock className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-2xl font-bold text-amber-400">{metrics.avg_mttr_minutes}m</div>
                        <div className="text-xs text-slate-400 mt-1">Waktu Pemulihan Rata-rata</div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
                        <div className="flex items-center justify-between text-slate-400 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider">Success Rate</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">{metrics.overall_success_rate}%</div>
                        <div className="text-xs text-slate-400 mt-1">Tanpa Kegagalan Step</div>
                    </div>
                </div>

                {/* Tabs & Filters */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('playbooks')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                                activeTab === 'playbooks'
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            Playbooks Catalog ({runbooks.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('executions')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                                activeTab === 'executions'
                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            Execution Audit Trail ({executions.length})
                        </button>
                    </div>

                    {activeTab === 'playbooks' && (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {/* Category Filter */}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="all">Semua Kategori</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>

                            {/* Search */}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Cari playbook..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl pl-8 pr-3 py-2 w-48 focus:w-64 transition-all focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                {activeTab === 'playbooks' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredRunbooks.map((rb) => (
                            <div
                                key={rb.id}
                                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg relative group"
                            >
                                <div>
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="space-y-1">
                                            {getCategoryBadge(rb.category)}
                                            <h3 className="font-semibold text-white text-base group-hover:text-indigo-400 transition leading-snug">
                                                {rb.title}
                                            </h3>
                                        </div>
                                        <div>{getSeverityBadge(rb.severity)}</div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                        {rb.description || 'Tidak ada deskripsi rinci untuk playbook ini.'}
                                    </p>

                                    {/* Steps Sequence Mini-View */}
                                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 mb-4 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="font-medium flex items-center gap-1">
                                                <Terminal className="w-3 h-3 text-indigo-400" /> Sequence ({rb.steps_count} langkah)
                                            </span>
                                            <span className="text-slate-500">~{rb.estimated_duration_minutes} min</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            {(rb.steps || []).slice(0, 3).map((step, idx) => (
                                                <div
                                                    key={step.id || idx}
                                                    className="flex items-center gap-2 text-xs text-slate-300 truncate"
                                                >
                                                    {getStepIcon(step.type)}
                                                    <span className="truncate text-slate-300 font-mono text-[11px]">
                                                        {idx + 1}. {step.title}
                                                    </span>
                                                </div>
                                            ))}
                                            {(rb.steps || []).length > 3 && (
                                                <div className="text-[10px] text-slate-500 italic pl-5">
                                                    + {rb.steps.length - 3} langkah lanjutan lainnya...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats & Last Executed */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/60 pt-3 mb-4 text-slate-400">
                                        <div>
                                            <span className="text-slate-500 text-[10px] uppercase block">Total Runs</span>
                                            <span className="text-white font-medium">{rb.total_runs} kali</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-[10px] uppercase block">Terakhir Dijalankan</span>
                                            <span className="text-slate-300 font-medium truncate block">{rb.last_executed_formatted}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={() => handleOpenRunner(rb)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" /> Jalankan Runbook
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRunbook(rb.id, rb.title)}
                                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                                        title="Hapus Playbook"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Executions Table */
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                                    <tr>
                                        <th className="px-5 py-3.5 font-semibold">Playbook & Kategori</th>
                                        <th className="px-5 py-3.5 font-semibold">Trigger Origin</th>
                                        <th className="px-5 py-3.5 font-semibold">Operator / Bot</th>
                                        <th className="px-5 py-3.5 font-semibold">Status</th>
                                        <th className="px-5 py-3.5 font-semibold">Durasi</th>
                                        <th className="px-5 py-3.5 font-semibold">Waktu Eksekusi</th>
                                        <th className="px-5 py-3.5 font-semibold text-right">Detail Log</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {executions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                                                Belum ada riwayat eksekusi runbook.
                                            </td>
                                        </tr>
                                    ) : (
                                        executions.map((exec) => (
                                            <tr key={exec.id} className="hover:bg-slate-800/30 transition">
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-white">{exec.runbook_title}</div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        {getCategoryBadge(exec.runbook_category)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">{getTriggerBadge(exec.trigger_type)}</td>
                                                <td className="px-5 py-4 text-slate-300 font-medium">{exec.executed_by}</td>
                                                <td className="px-5 py-4">
                                                    {exec.status === 'completed' ? (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                                            <CheckCircle2 className="w-3 h-3" /> PASS
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                                                            <ShieldAlert className="w-3 h-3" /> FAIL
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-slate-300 font-mono">
                                                    {exec.total_duration_ms}ms
                                                </td>
                                                <td className="px-5 py-4 text-slate-400">{exec.started_at_formatted}</td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => setViewExecution(exec)}
                                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition inline-flex items-center gap-1"
                                                    >
                                                        <Terminal className="w-3 h-3 text-indigo-400" /> Buka Log
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RUNNER MODAL / DRAWER */}
                {selectedRunbook && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            Interactive SRE Runner
                                        </span>
                                        <span className="text-xs text-slate-400">• {selectedRunbook.category.toUpperCase()}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-white mt-1">{selectedRunbook.title}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedRunbook(null)}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {!activeExecution ? (
                                    <>
                                        {/* Parameter Form */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Parameter Konfigurasi Eksekusi
                                            </h3>
                                            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
                                                {(selectedRunbook.parameters || []).map((param) => (
                                                    <div key={param.key} className="space-y-1">
                                                        <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                                                            <span>{param.label}</span>
                                                            <span className="text-[10px] text-slate-500 font-mono">
                                                                {param.key} ({param.type})
                                                            </span>
                                                        </label>
                                                        {param.type === 'boolean' ? (
                                                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!runParams[param.key]}
                                                                    onChange={(e) =>
                                                                        setRunParams({ ...runParams, [param.key]: e.target.checked })
                                                                    }
                                                                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="text-xs text-slate-400">Aktifkan opsi ini</span>
                                                            </label>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={runParams[param.key] ?? ''}
                                                                onChange={(e) =>
                                                                    setRunParams({ ...runParams, [param.key]: e.target.value })
                                                                }
                                                                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sequence Preview */}
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Rangkaian Langkah Eksekusi (
                                                {selectedRunbook.steps.length} Steps)
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedRunbook.steps.map((step, idx) => (
                                                    <div
                                                        key={step.id || idx}
                                                        className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                                                    {getStepIcon(step.type)} {step.title}
                                                                </div>
                                                                {step.action_command && (
                                                                    <div className="font-mono text-[11px] text-slate-400 mt-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                                                        $ {step.action_command}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                                            timeout {step.timeout_seconds || 60}s
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Active Execution Terminal View */
                                    <div className="space-y-4">
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                                                <CheckCircle2 className="w-4 h-4" /> EKSEKUSI BERHASIL DILAKUKAN
                                            </div>
                                            <span className="text-xs text-emerald-300 font-mono">
                                                Total Latency: {activeExecution.total_duration_ms}ms
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {activeExecution.step_results.map((sr, idx) => (
                                                <div
                                                    key={sr.step_id || idx}
                                                    className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                            <span>
                                                                {idx + 1}. {sr.title}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {sr.duration_ms}ms
                                                        </span>
                                                    </div>
                                                    {sr.output_logs && (
                                                        <pre className="p-2.5 bg-black/60 rounded-lg text-[11px] font-mono text-emerald-400 whitespace-pre-wrap border border-slate-900">
                                                            {sr.output_logs}
                                                        </pre>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setSelectedRunbook(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                                >
                                    Tutup
                                </button>
                                {!activeExecution && (
                                    <button
                                        disabled={isExecuting}
                                        onClick={handleExecuteRunbook}
                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-600/30 active:scale-[0.98]"
                                    >
                                        {isExecuting ? (
                                            <>
                                                <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Menjalankan Playbook...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3.5 h-3.5 fill-current" /> Konfirmasi & Eksekusi Sekarang
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW EXECUTION LOGS MODAL */}
                {viewExecution && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            Execution Audit Trace
                                        </span>
                                        <span className="text-xs text-slate-400">• {viewExecution.started_at_formatted}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-white mt-1">{viewExecution.runbook_title}</h2>
                                </div>
                                <button
                                    onClick={() => setViewExecution(null)}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                                    <div>
                                        <span className="text-slate-500 text-[10px] block">Operator</span>
                                        <span className="text-white font-medium">{viewExecution.executed_by}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 text-[10px] block">Trigger Type</span>
                                        <span className="text-slate-300 font-medium">{viewExecution.trigger_type}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 text-[10px] block">Total Duration</span>
                                        <span className="text-emerald-400 font-mono font-medium">{viewExecution.total_duration_ms}ms</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {viewExecution.step_results.map((sr, idx) => (
                                        <div
                                            key={sr.step_id || idx}
                                            className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>
                                                        {idx + 1}. {sr.title}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {sr.duration_ms}ms
                                                </span>
                                            </div>
                                            {sr.output_logs && (
                                                <pre className="p-2.5 bg-black/60 rounded-lg text-[11px] font-mono text-emerald-400 whitespace-pre-wrap border border-slate-900">
                                                    {sr.output_logs}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
                                <button
                                    onClick={() => setViewExecution(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE PLAYBOOK MODAL */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                                <div className="flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-indigo-400" />
                                    <h2 className="text-lg font-bold text-white">Buat Incident Runbook Baru</h2>
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateRunbookSubmit} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                    <div>
                                        <label className="text-xs font-medium text-slate-300 block mb-1">Judul Runbook Playbook *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: Emergency Restart Kube Worker Pods"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-300 block mb-1">Deskripsi Prosedur</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Jelaskan skenario penggunaan dan mitigasi insiden..."
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-300 block mb-1">Kategori Layanan</label>
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value as any)}
                                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="database">Database & Storage</option>
                                                <option value="cache">Cache & Memory</option>
                                                <option value="networking">Traffic & Network</option>
                                                <option value="deployment">Rollback & Deployment</option>
                                                <option value="scaling">Auto-Scaling & Pods</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-300 block mb-1">Tingkat Keparahan</label>
                                            <select
                                                value={newSeverity}
                                                onChange={(e) => setNewSeverity(e.target.value as any)}
                                                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="critical">Critical (P1)</option>
                                                <option value="high">High (P2)</option>
                                                <option value="medium">Medium (P3)</option>
                                                <option value="low">Low (P4)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Steps Builder */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                                Langkah-Langkah Eksekusi ({newSteps.length})
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddStepToForm}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Tambah Step
                                            </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            {newSteps.map((step, idx) => (
                                                <div
                                                    key={step.id || idx}
                                                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono text-slate-400 font-semibold text-[11px]">
                                                            Step {idx + 1}
                                                        </span>
                                                        <select
                                                            value={step.type}
                                                            onChange={(e) => {
                                                                const updated = [...newSteps];
                                                                updated[idx].type = e.target.value as any;
                                                                setNewSteps(updated);
                                                            }}
                                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] rounded px-2 py-1"
                                                        >
                                                            <option value="automated_script">Automated CLI Script</option>
                                                            <option value="api_webhook">API Webhook</option>
                                                            <option value="approval_gate">Approval Gate</option>
                                                            <option value="manual_check">Manual Check</option>
                                                        </select>
                                                        {newSteps.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveStepFromForm(idx)}
                                                                className="text-slate-500 hover:text-rose-400 p-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Judul langkah..."
                                                        value={step.title}
                                                        onChange={(e) => {
                                                            const updated = [...newSteps];
                                                            updated[idx].title = e.target.value;
                                                            setNewSteps(updated);
                                                        }}
                                                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded px-2.5 py-1.5 text-xs outline-none"
                                                    />

                                                    <input
                                                        type="text"
                                                        placeholder="Perintah aksi / command (misal: kubectl restart...)"
                                                        value={step.action_command || ''}
                                                        onChange={(e) => {
                                                            const updated = [...newSteps];
                                                            updated[idx].action_command = e.target.value;
                                                            setNewSteps(updated);
                                                        }}
                                                        className="w-full font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded px-2.5 py-1.5 text-[11px] outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30"
                                    >
                                        Simpan Playbook
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
