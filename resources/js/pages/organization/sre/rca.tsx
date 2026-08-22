import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Activity,
    AlertCircle,
    AlertOctagon,
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Award,
    BarChart2,
    Boxes,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Copy,
    Cpu,
    Database,
    Download,
    Eye,
    FileText,
    Filter,
    Flame,
    GitCommit,
    GitPullRequest,
    HardDrive,
    HelpCircle,
    Layers,
    ListOrdered,
    Network,
    Play,
    Plus,
    Radio,
    RefreshCw,
    Search,
    Send,
    Server,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sliders,
    Sparkles,
    Terminal,
    Timer,
    Trash2,
    TrendingDown,
    TrendingUp,
    UserCheck,
    Users,
    X,
    XCircle,
    Zap
} from 'lucide-react';

interface BlastRadius {
    affected_users_count?: number;
    affected_tenants_count?: number;
    error_rate_spike_pct?: number;
    latency_p99_ms?: number;
    estimated_revenue_impact_usd?: number;
    degraded_services?: string[];
}

interface FiveWhy {
    level: number;
    question: string;
    answer: string;
    evidence?: string;
}

interface BlameCommit {
    commit_sha: string;
    author: string;
    message: string;
    timestamp?: string;
    changed_files?: string[];
    similarity_score: number;
}

interface TelemetryCorrelation {
    timestamp: string;
    anomaly_type: string;
    metric: string;
    value: string;
    deviation: string;
}

interface TimelineEvent {
    time: string;
    phase: string;
    title: string;
    severity: 'info' | 'warning' | 'critical' | 'success';
}

interface PostMortemReport {
    incident_title?: string;
    author?: string;
    status?: string;
    detection_method?: string;
    summary?: string;
    lessons_learned?: string[];
}

interface ActionItem {
    id: string;
    root_cause_analysis_id: string;
    title: string;
    description?: string;
    priority: 'p0' | 'p1' | 'p2' | 'p3';
    type: 'preventative' | 'monitoring' | 'architectural' | 'runbook';
    status: 'open' | 'in_progress' | 'completed' | 'wont_fix';
    assignee?: { id: string; name: string; email: string };
    due_date?: string;
    completed_at?: string;
}

interface RootCauseAnalysis {
    id: string;
    organization_id: string;
    incident_id: string;
    trace_id?: string;
    title: string;
    status: 'analyzing' | 'completed' | 'verified' | 'dismissed';
    severity: 'critical' | 'high' | 'medium' | 'low';
    primary_cause_category: 'code_defect' | 'database_bottleneck' | 'network_timeout' | 'resource_exhaustion' | 'third_party_outage' | 'config_drift';
    suspect_service?: string;
    suspect_operation?: string;
    confidence_score: number;
    impact_summary?: string;
    blast_radius?: BlastRadius;
    five_whys?: FiveWhy[];
    contributing_factors?: string[];
    blame_commits?: BlameCommit[];
    telemetry_correlations?: TelemetryCorrelation[];
    timeline_events?: TimelineEvent[];
    mitigation_steps?: string[];
    post_mortem_report?: PostMortemReport;
    creator?: { id: string; name: string; email: string };
    verifier?: { id: string; name: string; email: string };
    verified_at?: string;
    action_items?: ActionItem[];
    created_at: string;
}

interface Props {
    organization: { id: string; name: string };
    kpi: {
        total_analyses: number;
        avg_confidence_score: number;
        avg_mttrc_minutes: number;
        critical_incidents: number;
        open_action_items: number;
        total_impacted_users: number;
    };
    category_breakdown: Record<string, number>;
    analyses: RootCauseAnalysis[];
    action_items: ActionItem[];
    recent_traces: Array<{
        id: string;
        trace_id: string;
        root_service: string;
        root_operation: string;
        status: string;
        total_duration_ms: number;
        error_count: number;
        created_at: string;
    }>;
    filters: {
        status?: string;
        severity?: string;
        category?: string;
        search?: string;
    };
}

export default function RootCauseAnalysisStudio({
    organization,
    kpi,
    category_breakdown,
    analyses,
    action_items,
    recent_traces,
    filters
}: Props) {
    const [selectedRcaId, setSelectedRcaId] = useState<string>(analyses[0]?.id || '');
    const [activeTab, setActiveTab] = useState<'whys' | 'blast' | 'blame' | 'postmortem' | 'actions'>('whys');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [severityFilter, setSeverityFilter] = useState(filters.severity || 'all');
    const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [showDiagnoseModal, setShowDiagnoseModal] = useState(false);
    const [showNewActionModal, setShowNewActionModal] = useState(false);
    const [copiedPostMortem, setCopiedPostMortem] = useState(false);

    // Diagnosis Form State
    const [diagScenario, setDiagScenario] = useState<string>('redis_cache_stampede');
    const [diagCustomTitle, setDiagCustomTitle] = useState<string>('');
    const [diagTraceId, setDiagTraceId] = useState<string>('');

    // Action Item Form State
    const [newActionTitle, setNewActionTitle] = useState('');
    const [newActionDescription, setNewActionDescription] = useState('');
    const [newActionPriority, setNewActionPriority] = useState<'p0' | 'p1' | 'p2' | 'p3'>('p1');
    const [newActionType, setNewActionType] = useState<'preventative' | 'monitoring' | 'architectural' | 'runbook'>('preventative');

    const selectedRca = useMemo(() => {
        return analyses.find(a => a.id === selectedRcaId) || analyses[0] || null;
    }, [analyses, selectedRcaId]);

    const handleApplyFilters = () => {
        router.get(
            '/organization/sre/rca',
            {
                search: searchQuery || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                severity: severityFilter !== 'all' ? severityFilter : undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRunDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        setIsDiagnosing(true);

        router.post(
            '/organization/sre/rca/analyze',
            {
                scenario: diagScenario,
                custom_title: diagCustomTitle || undefined,
                trace_id: diagTraceId || undefined,
            },
            {
                onSuccess: () => {
                    setIsDiagnosing(false);
                    setShowDiagnoseModal(false);
                    setDiagCustomTitle('');
                    setDiagTraceId('');
                },
                onError: () => {
                    setIsDiagnosing(false);
                }
            }
        );
    };

    const handleVerifyRca = (rca: RootCauseAnalysis) => {
        router.post(
            `/organization/sre/rca/${rca.id}/verify`,
            { adjusted_confidence: rca.confidence_score },
            { preserveScroll: true }
        );
    };

    const handleDeleteRca = (rca: RootCauseAnalysis) => {
        if (confirm(`Hapus rekaman Root Cause Analysis "${rca.title}"?`)) {
            router.delete(`/organization/sre/rca/${rca.id}`, { preserveScroll: true });
        }
    };

    const handleCreateActionItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRca) return;

        router.post(
            `/organization/sre/rca/${selectedRca.id}/action-items`,
            {
                title: newActionTitle,
                description: newActionDescription || undefined,
                priority: newActionPriority,
                type: newActionType,
            },
            {
                onSuccess: () => {
                    setShowNewActionModal(false);
                    setNewActionTitle('');
                    setNewActionDescription('');
                },
                preserveScroll: true
            }
        );
    };

    const handleToggleActionStatus = (item: ActionItem) => {
        const nextStatus = item.status === 'completed' ? 'open' : 'completed';
        router.patch(
            `/organization/sre/rca/action-items/${item.id}`,
            { status: nextStatus },
            { preserveScroll: true }
        );
    };

    const handleCopyMarkdown = () => {
        if (!selectedRca) return;
        const blast = selectedRca.blast_radius || {};
        const whys = selectedRca.five_whys || [];
        const commits = selectedRca.blame_commits || [];

        let md = `# 🚨 Post-Mortem Report: ${selectedRca.title}\n\n`;
        md += `**Incident ID:** \`${selectedRca.incident_id}\` | **Severity:** \`${selectedRca.severity.toUpperCase()}\` | **Confidence:** \`${selectedRca.confidence_score}%\`\n`;
        md += `**Suspect Service:** \`${selectedRca.suspect_service || 'N/A'}\` | **Suspect Operation:** \`${selectedRca.suspect_operation || 'N/A'}\`\n\n`;
        md += `## 1. Executive Summary\n${selectedRca.impact_summary || 'N/A'}\n\n`;
        md += `### 💥 Blast Radius & Business Impact\n`;
        md += `- **Affected Users:** ${(blast.affected_users_count || 0).toLocaleString()}\n`;
        md += `- **Impacted Tenants:** ${blast.affected_tenants_count || 0}\n`;
        md += `- **Peak Error Rate Spike:** ${blast.error_rate_spike_pct || 0}%\n`;
        md += `- **P99 Latency Surge:** ${blast.latency_p99_ms || 0} ms\n`;
        md += `- **Estimated Revenue Risk:** $${(blast.estimated_revenue_impact_usd || 0).toLocaleString()}\n\n`;
        md += `## 2. Root Cause Analysis (5-Whys Deduction)\n`;
        whys.forEach((w) => {
            md += `**Why #${w.level}:** ${w.question}\n> **Answer:** ${w.answer}\n`;
            if (w.evidence) md += `> *Evidence:* \`${w.evidence}\`\n`;
            md += `\n`;
        });
        if (commits.length > 0) {
            md += `## 3. Correlated Code Commits\n`;
            commits.forEach(c => {
                md += `- Commit \`${c.commit_sha}\` by **${c.author}**: *${c.message}* (Risk: ${c.similarity_score}%)\n`;
            });
            md += `\n`;
        }

        navigator.clipboard.writeText(md);
        setCopiedPostMortem(true);
        setTimeout(() => setCopiedPostMortem(false), 3000);
    };

    const handleDownloadMarkdown = () => {
        if (!selectedRca) return;
        const blast = selectedRca.blast_radius || {};
        const whys = selectedRca.five_whys || [];
        const commits = selectedRca.blame_commits || [];

        let md = `# Post-Mortem: ${selectedRca.title}\n\n`;
        md += `Incident ID: ${selectedRca.incident_id}\nSeverity: ${selectedRca.severity}\n\n`;
        md += `## Executive Summary\n${selectedRca.impact_summary}\n\n`;
        md += `## 5-Whys Causality Chain\n`;
        whys.forEach(w => {
            md += `Why #${w.level}: ${w.question}\nAnswer: ${w.answer}\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `post-mortem-${selectedRca.incident_id.toLowerCase()}.md`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse"><Flame className="size-3" /> Critical</span>;
            case 'high':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30"><AlertTriangle className="size-3" /> High</span>;
            case 'medium':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30"><Clock className="size-3" /> Medium</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="size-3" /> Low</span>;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'database_bottleneck':
                return <Database className="size-4 text-cyan-400" />;
            case 'resource_exhaustion':
                return <Cpu className="size-4 text-purple-400" />;
            case 'third_party_outage':
                return <Network className="size-4 text-amber-400" />;
            case 'code_defect':
                return <Terminal className="size-4 text-rose-400" />;
            case 'network_timeout':
                return <Radio className="size-4 text-orange-400" />;
            default:
                return <Boxes className="size-4 text-slate-400" />;
        }
    };

    return (
        <AppLayout>
            <Head title="AI-Powered Automated Root Cause Analysis (RCA) & Smart Post-Mortem Copilot" />

            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400">
                                <Sparkles className="size-6 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-white">
                                        AI Automated Root Cause Analysis (RCA) & Post-Mortem Copilot
                                    </h1>
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Sprint 82
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1">
                                    Autonomous 5-Whys deduction, telemetry & distributed trace correlation, blast radius calculation, and enterprise post-mortem generator.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.reload({ preserveScroll: true })}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 transition-colors"
                            title="Segarkan Data"
                        >
                            <RefreshCw className="size-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <button
                            onClick={() => setShowDiagnoseModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
                        >
                            <Zap className="size-4 fill-current" />
                            <span>⚡ Run AI Outage Diagnosis</span>
                        </button>
                    </div>
                </div>

                {/* KPI Overview Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Incidents Analyzed</span>
                            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
                                <Activity className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-white">{kpi.total_analyses}</span>
                            <span className="text-xs text-emerald-400 font-medium flex items-center">
                                <CheckCircle2 className="size-3 mr-1" /> 100% Deduce Rate
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            {kpi.critical_incidents} Critical severity detected
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mean Time to Root-Cause</span>
                            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                                <Timer className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-emerald-400">{kpi.avg_mttrc_minutes} min</span>
                            <span className="text-xs text-slate-400">vs ~45 min manual</span>
                        </div>
                        <div className="mt-2 text-xs text-emerald-400 font-medium">
                            ⚡ 11.8x Faster Autonomous Triage
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg AI Confidence Score</span>
                            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
                                <Award className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-purple-400">{kpi.avg_confidence_score}%</span>
                            <span className="text-xs text-purple-300 font-medium">High Precision</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Verified against Multi-Span Traces
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Open Action Items</span>
                            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400">
                                <ShieldAlert className="size-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-rose-400">{kpi.open_action_items}</span>
                            <span className="text-xs text-slate-400">Preventative P0/P1</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            {kpi.total_impacted_users.toLocaleString()} total users shielded
                        </div>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                placeholder="Search by incident, suspect service, cause..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={severityFilter}
                            onChange={(e) => { setSeverityFilter(e.target.value); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Severity</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Cause Categories</option>
                            <option value="resource_exhaustion">Resource Exhaustion</option>
                            <option value="database_bottleneck">Database Bottleneck</option>
                            <option value="third_party_outage">Third-Party Outage</option>
                            <option value="code_defect">Code Defect</option>
                            <option value="network_timeout">Network Timeout</option>
                            <option value="config_drift">Config Drift</option>
                        </select>

                        <button
                            onClick={handleApplyFilters}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                        >
                            Filter
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Showing <strong className="text-white">{analyses.length}</strong> analyses</span>
                    </div>
                </div>

                {/* Main 2-Column War Room Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: List of Root Cause Analyses */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Incident Investigations</span>
                            <span className="text-[11px] text-slate-500">Auto-correlated with Traces</span>
                        </div>

                        <div className="space-y-3 max-h-[820px] overflow-y-auto pr-1">
                            {analyses.map((rca) => {
                                const isSelected = rca.id === selectedRca?.id;
                                const blast = rca.blast_radius || {};

                                return (
                                    <div
                                        key={rca.id}
                                        onClick={() => setSelectedRcaId(rca.id)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                                            isSelected
                                                ? 'bg-slate-900 border-indigo-500/70 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-indigo-400">
                                                    {rca.incident_id}
                                                </span>
                                                {getSeverityBadge(rca.severity)}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-semibold">
                                                    {rca.confidence_score}% AI Match
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-semibold text-white mt-2 leading-snug line-clamp-2">
                                            {rca.title}
                                        </h3>

                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                            <div className="flex items-center gap-1">
                                                {getCategoryIcon(rca.primary_cause_category)}
                                                <span className="capitalize">{rca.primary_cause_category.replace(/_/g, ' ')}</span>
                                            </div>
                                            <span>•</span>
                                            <span className="font-mono text-slate-300">{rca.suspect_service || 'root-service'}</span>
                                        </div>

                                        {/* Blast Radius Chips */}
                                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                                            <div className="flex items-center gap-3">
                                                <span title="Affected Users" className="flex items-center gap-1 text-slate-300">
                                                    <Users className="size-3 text-slate-400" />
                                                    {(blast.affected_users_count || 0).toLocaleString()} users
                                                </span>
                                                <span title="P99 Latency Surge" className="flex items-center gap-1 text-amber-400 font-mono">
                                                    <Zap className="size-3" />
                                                    {blast.latency_p99_ms || 0}ms
                                                </span>
                                            </div>
                                            <span className="text-slate-500 font-mono text-[10px]">
                                                {new Date(rca.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Deep Diagnostic Inspector */}
                    <div className="lg:col-span-7">
                        {selectedRca ? (
                            <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col min-h-[820px]">
                                {/* Active Header */}
                                <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {selectedRca.incident_id}
                                            </span>
                                            {getSeverityBadge(selectedRca.severity)}
                                            {selectedRca.status === 'verified' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    <ShieldCheck className="size-3.5" /> SRE Verified
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {selectedRca.status !== 'verified' && (
                                                <button
                                                    onClick={() => handleVerifyRca(selectedRca)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
                                                >
                                                    <CheckCircle2 className="size-3.5" />
                                                    <span>Verify RCA</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={handleCopyMarkdown}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                                                title="Copy Markdown Post-Mortem"
                                            >
                                                {copiedPostMortem ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                                <span>{copiedPostMortem ? 'Copied!' : 'Copy MD'}</span>
                                            </button>

                                            <button
                                                onClick={handleDownloadMarkdown}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                                                title="Download Post-Mortem .md"
                                            >
                                                <Download className="size-3.5" />
                                                <span>Export</span>
                                            </button>

                                            <button
                                                onClick={() => handleDeleteRca(selectedRca)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                title="Delete Analysis"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h2 className="text-lg font-bold text-white mt-3">
                                        {selectedRca.title}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {selectedRca.impact_summary}
                                    </p>

                                    {/* Quick Diagnostic Metadata Strip */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                                        <div>
                                            <span className="text-slate-500 text-[11px] block">Suspect Service</span>
                                            <span className="font-mono text-cyan-300 font-medium">{selectedRca.suspect_service || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-[11px] block">Suspect Operation</span>
                                            <span className="font-mono text-slate-200 text-[11px] truncate block" title={selectedRca.suspect_operation}>
                                                {selectedRca.suspect_operation || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-[11px] block">Trace Link</span>
                                            <span className="font-mono text-indigo-400 text-[11px] truncate block" title={selectedRca.trace_id}>
                                                {selectedRca.trace_id || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 text-[11px] block">AI Confidence</span>
                                            <span className="font-mono text-emerald-400 font-bold">{selectedRca.confidence_score}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Inspector Tabs */}
                                <div className="flex items-center gap-2 px-5 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
                                    <button
                                        onClick={() => setActiveTab('whys')}
                                        className={`py-3 px-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                            activeTab === 'whys'
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <ListOrdered className="size-4" />
                                        <span>5-Whys Deduction</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('blast')}
                                        className={`py-3 px-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                            activeTab === 'blast'
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Flame className="size-4" />
                                        <span>Blast Radius & Telemetry</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('blame')}
                                        className={`py-3 px-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                            activeTab === 'blame'
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <GitCommit className="size-4" />
                                        <span>Git Blame & Trigger Diff</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('postmortem')}
                                        className={`py-3 px-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                            activeTab === 'postmortem'
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <FileText className="size-4" />
                                        <span>Post-Mortem Studio</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('actions')}
                                        className={`py-3 px-3 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                            activeTab === 'actions'
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <ShieldCheck className="size-4" />
                                        <span>Preventative Actions ({selectedRca.action_items?.length || 0})</span>
                                    </button>
                                </div>

                                {/* Tab Content Area */}
                                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                                    {/* TAB 1: 5-Whys Recursive Deduction */}
                                    {activeTab === 'whys' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                                    <Sparkles className="size-4" />
                                                    Recursive 5-Whys AI Causality Chain
                                                </h4>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    Engine: Bayesian Fault Tree + Trace Span Analysis
                                                </span>
                                            </div>

                                            <div className="space-y-3 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-indigo-500/20">
                                                {(selectedRca.five_whys || []).map((why, idx) => {
                                                    const isRoot = idx === (selectedRca.five_whys?.length || 1) - 1;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-xl border pl-10 relative transition-all ${
                                                                isRoot
                                                                    ? 'bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                                                    : 'bg-slate-950/70 border-slate-800'
                                                            }`}
                                                        >
                                                            <div className={`absolute left-2.5 top-4 size-3.5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
                                                                isRoot
                                                                    ? 'bg-indigo-500 border-white text-white animate-pulse'
                                                                    : 'bg-slate-800 border-indigo-400 text-indigo-400'
                                                            }`}>
                                                                {why.level}
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-indigo-300">
                                                                    {isRoot ? '🎯 ROOT CAUSE (Why #5)' : `Why #${why.level}`}
                                                                </span>
                                                                {isRoot && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                                        Definitive Cause
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-xs font-medium text-slate-300 mt-1">
                                                                <strong className="text-white">Pertanyaan:</strong> {why.question}
                                                            </p>

                                                            <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-200">
                                                                <span className="font-semibold text-emerald-400">Deduksi AI: </span>
                                                                {why.answer}
                                                            </div>

                                                            {why.evidence && (
                                                                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/30 border border-cyan-800/30 px-2 py-1 rounded">
                                                                    <Terminal className="size-3 text-cyan-400 shrink-0" />
                                                                    <span className="truncate">{why.evidence}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Contributing Factors & Mitigation */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                                                    <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                                                        <ShieldAlert className="size-4 text-amber-400" />
                                                        Contributing Risk Factors
                                                    </h5>
                                                    <ul className="space-y-1.5 text-xs text-slate-400">
                                                        {(selectedRca.contributing_factors || []).map((cf, i) => (
                                                            <li key={i} className="flex items-start gap-1.5">
                                                                <span className="text-amber-400">•</span>
                                                                <span>{cf}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                                                    <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                                                        <CheckCircle2 className="size-4 text-emerald-400" />
                                                        Executed Immediate Mitigations
                                                    </h5>
                                                    <ul className="space-y-1.5 text-xs text-slate-400">
                                                        {(selectedRca.mitigation_steps || []).map((ms, i) => (
                                                            <li key={i} className="flex items-start gap-1.5">
                                                                <span className="text-emerald-400">✓</span>
                                                                <span>{ms}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: Blast Radius & Telemetry Correlation */}
                                    {activeTab === 'blast' && (
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                                                    <Flame className="size-4" />
                                                    Blast Radius & Customer Impact Assessment
                                                </h4>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">Impacted Users</span>
                                                        <div className="text-xl font-bold font-mono text-white mt-1">
                                                            {((selectedRca.blast_radius?.affected_users_count) || 0).toLocaleString()}
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">Impacted Tenants</span>
                                                        <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                                                            {selectedRca.blast_radius?.affected_tenants_count || 0} Orgs
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">Error Rate Surge</span>
                                                        <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                                                            +{selectedRca.blast_radius?.error_rate_spike_pct || 0}%
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">P99 Latency Surge</span>
                                                        <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                                                            {selectedRca.blast_radius?.latency_p99_ms || 0} ms
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">Estimated Revenue Risk</span>
                                                        <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                                                            ${(selectedRca.blast_radius?.estimated_revenue_impact_usd || 0).toLocaleString()}
                                                        </div>
                                                    </div>

                                                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                                                        <span className="text-[11px] text-slate-500 uppercase font-medium">Degraded Mesh Nodes</span>
                                                        <div className="text-xs font-mono text-slate-300 mt-2 truncate">
                                                            {(selectedRca.blast_radius?.degraded_services || []).join(', ') || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Telemetry Correlation Events */}
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                                                    <BarChart2 className="size-4" />
                                                    Correlated Telemetry Anomalies & Spikes
                                                </h4>

                                                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-900/70 text-slate-400 border-b border-slate-800">
                                                            <tr>
                                                                <th className="p-3 font-semibold">Timestamp</th>
                                                                <th className="p-3 font-semibold">Anomaly Type</th>
                                                                <th className="p-3 font-semibold">Telemetry Metric</th>
                                                                <th className="p-3 font-semibold">Observed Peak</th>
                                                                <th className="p-3 font-semibold">Sigma Deviation</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800/60 font-mono">
                                                            {(selectedRca.telemetry_correlations || []).map((t, i) => (
                                                                <tr key={i} className="hover:bg-slate-900/40">
                                                                    <td className="p-3 text-slate-400">{t.timestamp}</td>
                                                                    <td className="p-3 text-white font-sans font-semibold">{t.anomaly_type}</td>
                                                                    <td className="p-3 text-cyan-300">{t.metric}</td>
                                                                    <td className="p-3 text-amber-400">{t.value}</td>
                                                                    <td className="p-3 text-rose-400 font-bold">{t.deviation}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Incident Lifecycle Timeline */}
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                                    <Clock className="size-4" />
                                                    Incident Progression Lifecycle
                                                </h4>

                                                <div className="space-y-2">
                                                    {(selectedRca.timeline_events || []).map((evt, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                                                            <span className="font-mono font-bold text-slate-400 w-12">{evt.time}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                                evt.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                                                                evt.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                                                evt.severity === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                                                            }`}>
                                                                {evt.phase}
                                                            </span>
                                                            <span className="text-slate-200 font-medium">{evt.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 3: Git Blame & Code Diff */}
                                    {activeTab === 'blame' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                                    <GitPullRequest className="size-4" />
                                                    Suspected Commit & PR Blame Matcher
                                                </h4>
                                                <span className="text-[11px] text-slate-400">
                                                    Matched via Abstract Syntax Tree + Stack Trace Correlation
                                                </span>
                                            </div>

                                            {(selectedRca.blame_commits || []).length > 0 ? (
                                                <div className="space-y-3">
                                                    {(selectedRca.blame_commits || []).map((commit, idx) => (
                                                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-indigo-400">
                                                                        {commit.commit_sha}
                                                                    </span>
                                                                    <span className="text-xs text-slate-300 font-semibold">{commit.author}</span>
                                                                </div>
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                                    {commit.similarity_score}% Risk Correlation
                                                                </span>
                                                            </div>

                                                            <p className="text-xs font-medium text-white mt-2 font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                                                                {commit.message}
                                                            </p>

                                                            {commit.changed_files && (
                                                                <div className="mt-3">
                                                                    <span className="text-[11px] text-slate-500 block mb-1 font-semibold uppercase">Changed Files:</span>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {commit.changed_files.map((file, fIdx) => (
                                                                            <span key={fIdx} className="px-2 py-0.5 rounded bg-slate-900 text-[11px] font-mono text-cyan-300 border border-slate-800">
                                                                                {file}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-slate-500 text-xs">
                                                    No direct commit triggers detected for this infrastructure incident.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 4: Smart Post-Mortem Studio */}
                                    {activeTab === 'postmortem' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                    <FileText className="size-4" />
                                                    Executive Incident Post-Mortem Document
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleCopyMarkdown}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                                                    >
                                                        {copiedPostMortem ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                                        <span>{copiedPostMortem ? 'Copied to Clipboard' : 'Copy Markdown'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed space-y-4 max-h-[550px] overflow-y-auto">
                                                <div className="border-b border-slate-800 pb-4">
                                                    <h1 className="text-lg font-bold text-white">
                                                        Incident Post-Mortem: {selectedRca.title}
                                                    </h1>
                                                    <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                                                        <span><strong>ID:</strong> {selectedRca.incident_id}</span>
                                                        <span><strong>Severity:</strong> {selectedRca.severity.toUpperCase()}</span>
                                                        <span><strong>Author:</strong> {selectedRca.post_mortem_report?.author || 'AI RCA Copilot'}</span>
                                                        <span><strong>Detection:</strong> {selectedRca.post_mortem_report?.detection_method || 'Synthetic Probe Alarm'}</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold text-indigo-300 mb-1">1. Ringkasan Eksekutif & Kronologi</h3>
                                                    <p className="text-slate-300">
                                                        {selectedRca.post_mortem_report?.summary || selectedRca.impact_summary}
                                                    </p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold text-indigo-300 mb-1">2. Dampak Pengguna & Bisnis</h3>
                                                    <p className="text-slate-300">
                                                        Insiden ini berdampak pada {(selectedRca.blast_radius?.affected_users_count || 0).toLocaleString()} pengguna aktif dan {selectedRca.blast_radius?.affected_tenants_count || 0} tenant organisasi dengan estimasi risiko pendapatan sebesar ${ (selectedRca.blast_radius?.estimated_revenue_impact_usd || 0).toLocaleString() }.
                                                    </p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold text-indigo-300 mb-1">3. Akar Masalah (Root Cause)</h3>
                                                    <p className="text-slate-300 font-medium">
                                                        {selectedRca.five_whys?.[selectedRca.five_whys.length - 1]?.answer || 'Tercatat kegagalan pada lapisan service mesh.'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <h3 className="text-sm font-bold text-indigo-300 mb-1">4. Lessons Learned (Pembelajaran Utama)</h3>
                                                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                                                        {(selectedRca.post_mortem_report?.lessons_learned || [
                                                            'Perlu penguatan circuit breaker pada downstream dependencies.',
                                                            'Alarm observabilitas harus dipasang pada level saturasi memori dan antrean.'
                                                        ]).map((item, idx) => (
                                                            <li key={idx}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 5: Preventative Action Items */}
                                    {activeTab === 'actions' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                                    <ShieldCheck className="size-4" />
                                                    Preventative Action Items ({selectedRca.action_items?.length || 0})
                                                </h4>
                                                <button
                                                    onClick={() => setShowNewActionModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                                                >
                                                    <Plus className="size-3.5" />
                                                    <span>Add Action Item</span>
                                                </button>
                                            </div>

                                            <div className="space-y-2.5">
                                                {(selectedRca.action_items || []).map((item) => {
                                                    const isCompleted = item.status === 'completed';

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                                                                isCompleted
                                                                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                                                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <button
                                                                    onClick={() => handleToggleActionStatus(item)}
                                                                    className={`mt-0.5 size-4 rounded border flex items-center justify-center transition-colors ${
                                                                        isCompleted
                                                                            ? 'bg-emerald-600 border-emerald-500 text-white'
                                                                            : 'border-slate-600 hover:border-indigo-400 bg-slate-900'
                                                                    }`}
                                                                >
                                                                    {isCompleted && <Check className="size-3" />}
                                                                </button>

                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                                                                            {item.title}
                                                                        </span>
                                                                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold font-mono uppercase ${
                                                                            item.priority === 'p0' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                                                            item.priority === 'p1' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                                                                        }`}>
                                                                            {item.priority}
                                                                        </span>
                                                                        <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-400 capitalize">
                                                                            {item.type}
                                                                        </span>
                                                                    </div>

                                                                    {item.description && (
                                                                        <p className="text-xs text-slate-400 mt-1">
                                                                            {item.description}
                                                                        </p>
                                                                    )}

                                                                    {item.due_date && (
                                                                        <span className="text-[11px] text-slate-500 mt-2 block font-mono">
                                                                            Due: {item.due_date}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center">
                                <Sparkles className="size-12 text-indigo-400 mb-3 animate-pulse" />
                                <h3 className="text-base font-semibold text-white">No Root Cause Analysis Selected</h3>
                                <p className="text-xs text-slate-400 max-w-sm mt-1">
                                    Pilih rekaman insiden di sebelah kiri atau klik tombol diagnosis untuk memulai analisis baru.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Run AI Outage Diagnosis */}
            {showDiagnoseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                    <Zap className="size-5" />
                                </div>
                                <h3 className="text-base font-bold text-white">Trigger AI Outage Diagnosis</h3>
                            </div>
                            <button
                                onClick={() => setShowDiagnoseModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRunDiagnosis} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Incident Simulation Scenario
                                </label>
                                <select
                                    value={diagScenario}
                                    onChange={(e) => setDiagScenario(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="redis_cache_stampede">
                                        ⚡ Redis Cluster OOM & Session Eviction (Cache Stampede)
                                    </option>
                                    <option value="db_connection_pool_exhaustion">
                                        🐘 PostgreSQL Connection Pool Exhaustion on Reporting Burst
                                    </option>
                                    <option value="payment_webhook_timeout">
                                        💳 Cascading Gateway Timeout on Third-Party Payment Webhook
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Custom Incident Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={diagCustomTitle}
                                    onChange={(e) => setDiagCustomTitle(e.target.value)}
                                    placeholder="e.g. Production Payment Latency Spike"
                                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {recent_traces.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Correlate with Distributed Trace (Optional)
                                    </label>
                                    <select
                                        value={diagTraceId}
                                        onChange={(e) => setDiagTraceId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">-- Autonomous Trace Ingestion --</option>
                                        {recent_traces.map(t => (
                                            <option key={t.id} value={t.trace_id}>
                                                {t.trace_id} ({t.root_service} - {t.total_duration_ms}ms)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDiagnoseModal(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isDiagnosing}
                                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                                >
                                    {isDiagnosing ? (
                                        <>
                                            <RefreshCw className="size-4 animate-spin" />
                                            <span>Running AI Deductions...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="size-4" />
                                            <span>Start AI Analysis</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Preventative Action Item */}
            {showNewActionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white">Add Preventative Action Item</h3>
                            <button onClick={() => setShowNewActionModal(false)} className="text-slate-400 hover:text-white">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateActionItem} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newActionTitle}
                                    onChange={(e) => setNewActionTitle(e.target.value)}
                                    placeholder="e.g. Implement Mutex Lock on Cache Loader"
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={newActionDescription}
                                    onChange={(e) => setNewActionDescription(e.target.value)}
                                    placeholder="Technical details..."
                                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                                    <select
                                        value={newActionPriority}
                                        onChange={(e) => setNewActionPriority(e.target.value as any)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="p0">P0 - Blocker</option>
                                        <option value="p1">P1 - High</option>
                                        <option value="p2">P2 - Medium</option>
                                        <option value="p3">P3 - Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                                    <select
                                        value={newActionType}
                                        onChange={(e) => setNewActionType(e.target.value as any)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="preventative">Preventative</option>
                                        <option value="architectural">Architectural</option>
                                        <option value="monitoring">Monitoring</option>
                                        <option value="runbook">Runbook</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewActionModal(false)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                                >
                                    Save Action Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
