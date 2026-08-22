import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Activity,
    Network,
    Clock,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Cpu,
    Layers,
    Search,
    Filter,
    Play,
    Trash2,
    RefreshCw,
    Sliders,
    Sparkles,
    ArrowRight,
    ExternalLink,
    ShieldAlert,
    Database,
    Server,
    Radio,
    Zap,
    Copy,
    Check,
    ChevronRight,
    ChevronDown,
    BarChart2,
    Eye,
    TrendingUp,
    Terminal,
    ArrowUpRight,
    AlertOctagon,
    Boxes,
    HardDrive,
    Send
} from 'lucide-react';

interface Span {
    id: string;
    parent_id: string | null;
    service: string;
    operation: string;
    kind: 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER' | 'INTERNAL';
    start_offset_ms: number;
    duration_ms: number;
    status: 'ok' | 'error';
    tags: Record<string, any>;
    error_message?: string;
    stack_trace?: string;
}

interface DistributedTrace {
    id: string;
    organization_id: string;
    trace_id: string;
    root_service: string;
    root_operation: string;
    http_method: string;
    status_code: number;
    status: 'success' | 'error' | 'slow';
    duration_ms: number;
    spans_count: number;
    spans: Span[];
    services_involved: string[];
    critical_path: string[];
    root_cause_service: string | null;
    error_message: string | null;
    client_ip: string | null;
    user_agent: string | null;
    metadata: Record<string, any> | null;
    started_at: string;
    created_at: string;
}

interface ServiceNode {
    id: string;
    name: string;
    type: string;
    rpm: number;
    p95_latency_ms: number;
    error_rate: number;
    status: 'healthy' | 'degraded' | 'down';
    dependencies: string[];
    tech_stack: string;
    x: number;
    y: number;
}

interface TopologyLink {
    source: string;
    target: string;
    protocol: string;
    avg_latency_ms: number;
    status: 'healthy' | 'degraded';
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    kpi: {
        total_traces: number;
        error_count: number;
        slow_count: number;
        error_rate: number;
        avg_latency_ms: number;
        p95_latency_ms: number;
        p99_latency_ms: number;
        healthy_services_count: number;
        total_services_count: number;
        mesh_health_pct: number;
    };
    topology: {
        nodes: ServiceNode[];
        links: TopologyLink[];
    };
    service_nodes: ServiceNode[];
    traces: DistributedTrace[];
    services_list: string[];
    filters: {
        service?: string | null;
        status?: string | null;
        http_method?: string | null;
        min_duration?: string | number | null;
        search?: string | null;
    };
}

export default function DistributedTracesStudio({
    organization,
    kpi,
    topology,
    service_nodes,
    traces,
    services_list,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<'topology' | 'traces' | 'profiler' | 'simulator'>('traces');
    const [selectedTrace, setSelectedTrace] = useState<DistributedTrace | null>(traces[0] || null);
    const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});

    // Filter states
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedService, setSelectedService] = useState(filters.service || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedMethod, setSelectedMethod] = useState(filters.http_method || 'all');
    const [minDuration, setMinDuration] = useState(filters.min_duration || 0);

    // Simulation modal state
    const [isSimulating, setIsSimulating] = useState(false);
    const [simScenario, setSimScenario] = useState('checkout_flow');
    const [simRootService, setSimRootService] = useState('api-gateway');
    const [simMethod, setSimMethod] = useState('POST');
    const [simOperation, setSimOperation] = useState('/api/v2/orders/checkout');

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleApplyFilters = () => {
        router.get(
            '/organization/sre/traces',
            {
                search: searchQuery || undefined,
                service: selectedService !== 'all' ? selectedService : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                http_method: selectedMethod !== 'all' ? selectedMethod : undefined,
                min_duration: Number(minDuration) > 0 ? Number(minDuration) : undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedService('all');
        setSelectedStatus('all');
        setSelectedMethod('all');
        setMinDuration(0);
        router.get('/organization/sre/traces', {}, { preserveState: true, replace: true });
    };

    const handleRunSimulation = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSimulating(true);

        router.post(
            '/organization/sre/traces',
            {
                scenario: simScenario,
                root_service: simRootService,
                http_method: simMethod,
                root_operation: simOperation,
            },
            {
                onSuccess: () => {
                    setIsSimulating(false);
                    setActiveTab('traces');
                },
                onError: () => {
                    setIsSimulating(false);
                },
            }
        );
    };

    const handleDeleteTrace = (trace: DistributedTrace) => {
        if (!confirm(`Hapus data trace ID "${trace.trace_id}"?`)) return;

        router.delete(`/organization/sre/traces/${trace.id}`, {
            onSuccess: () => {
                if (selectedTrace?.id === trace.id) {
                    setSelectedTrace(null);
                }
            },
        });
    };

    const toggleSpanExpand = (spanId: string) => {
        setExpandedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
            case 'healthy':
            case 'ok':
                return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'slow':
            case 'degraded':
                return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'error':
            case 'down':
                return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default:
                return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getMethodColor = (method: string) => {
        switch (method.toUpperCase()) {
            case 'GET':
                return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
            case 'POST':
                return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'PUT':
            case 'PATCH':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'DELETE':
                return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default:
                return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
        }
    };

    const getServiceColor = (svc: string) => {
        const colors: Record<string, string> = {
            'api-gateway': 'bg-indigo-500 text-white',
            'auth-service': 'bg-emerald-600 text-white',
            'order-service': 'bg-blue-600 text-white',
            'payment-gateway': 'bg-purple-600 text-white',
            'ai-inference-worker': 'bg-pink-600 text-white',
            'ai-worker': 'bg-pink-600 text-white',
            'document-service': 'bg-amber-600 text-white',
            'notification-service': 'bg-teal-600 text-white',
            'database-primary': 'bg-cyan-700 text-white',
            'redis-cache': 'bg-red-600 text-white',
        };
        return colors[svc] || 'bg-slate-700 text-slate-100';
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'SRE & DevOps', href: '/organization/sre/traces' },
                { title: 'Distributed Tracing & Service Mesh', href: '/organization/sre/traces' },
            ]}
        >
            <Head title="Distributed Tracing & Service Mesh Topology Studio - Pandu" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 text-indigo-400 shadow-sm">
                                <Network className="size-6 animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    Distributed Tracing & Service Mesh Studio
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                                        <Radio className="size-3 animate-ping" /> Real-time APM
                                    </span>
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Observabilitas end-to-end mikroservis, visualisasi topologi dependensi terdistribusi, dan profiling latency waterfall.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => router.reload()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                            title="Segarkan data"
                        >
                            <RefreshCw className="size-3.5" />
                            Segarkan
                        </button>
                        <button
                            onClick={() => {
                                setSimScenario('checkout_flow');
                                setActiveTab('simulator');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-all"
                        >
                            <Play className="size-3.5 fill-current" />
                            Simulasi Trace Baru
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Total Traces */}
                    <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Traces Terpantau</span>
                            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                                <Activity className="size-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.total_traces}</span>
                            <span className="text-xs text-muted-foreground">permintaan</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${kpi.error_rate > 5 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {kpi.error_rate}% Error Rate
                            </span>
                            <span className="text-muted-foreground font-mono">({kpi.error_count} eror)</span>
                        </div>
                    </div>

                    {/* Latency Percentiles */}
                    <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Latency (P50 / P95 / P99)</span>
                            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                                <Clock className="size-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">{kpi.avg_latency_ms} ms</span>
                            <span className="text-xs text-muted-foreground font-mono">avg</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                            <span>P95: <strong className="text-foreground">{kpi.p95_latency_ms}ms</strong></span>
                            <span>•</span>
                            <span>P99: <strong className="text-foreground">{kpi.p99_latency_ms}ms</strong></span>
                        </div>
                    </div>

                    {/* Service Mesh Health */}
                    <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kesehatan Service Mesh</span>
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                                <Boxes className="size-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">{kpi.mesh_health_pct}%</span>
                            <span className="text-xs text-emerald-400 font-medium">Optimal</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="text-emerald-400 font-semibold">{kpi.healthy_services_count}</span> dari {kpi.total_services_count} mikroservis sehat
                        </div>
                    </div>

                    {/* Bottlenecks / Anomalies */}
                    <div className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Degradasi & Slow Spans</span>
                            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                                <AlertTriangle className="size-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-400 font-mono">{kpi.slow_count}</span>
                            <span className="text-xs text-muted-foreground">trace lambat (&gt;400ms)</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Zap className="size-3 text-amber-400" />
                            <span>Bottleneck terdeteksi di db-query & payment</span>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-border space-x-1">
                    <button
                        onClick={() => setActiveTab('traces')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'traces'
                                ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-500/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                    >
                        <Layers className="size-4" />
                        Traces Waterfall & Gantt ({traces.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('topology')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'topology'
                                ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-500/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                    >
                        <Network className="size-4" />
                        Topologi Service Mesh Graph ({topology.nodes.length} Nodes)
                    </button>
                    <button
                        onClick={() => setActiveTab('profiler')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'profiler'
                                ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-500/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                    >
                        <BarChart2 className="size-4" />
                        Latency Profiler & Root Cause AI
                    </button>
                    <button
                        onClick={() => setActiveTab('simulator')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'simulator'
                                ? 'border-indigo-500 text-indigo-400 font-semibold bg-indigo-500/5'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                    >
                        <Play className="size-4" />
                        Trace Injector & Simulator
                    </button>
                </div>

                {/* TAB 1: TRACES EXPLORER & WATERFALL GANTT */}
                {activeTab === 'traces' && (
                    <div className="space-y-6">
                        {/* Filter Bar */}
                        <div className="rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 items-end">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Pencarian Trace / Operation</label>
                                    <div className="relative mt-1">
                                        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Contoh: /checkout, orders..."
                                            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Service</label>
                                    <select
                                        value={selectedService}
                                        onChange={(e) => setSelectedService(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="all">Semua Service ({services_list.length})</option>
                                        {services_list.map((svc) => (
                                            <option key={svc} value={svc}>{svc}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Status Trace</label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="success">Success (&lt;400ms, 2xx)</option>
                                        <option value="slow">Slow (&gt;400ms)</option>
                                        <option value="error">Error (5xx / exception)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">HTTP Method</label>
                                    <select
                                        value={selectedMethod}
                                        onChange={(e) => setSelectedMethod(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="all">Semua Method</option>
                                        <option value="GET">GET</option>
                                        <option value="POST">POST</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleApplyFilters}
                                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                                    >
                                        <Filter className="size-3" />
                                        Terapkan
                                    </button>
                                    <button
                                        onClick={handleResetFilters}
                                        className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                        title="Reset filter"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid: Trace List on Left, Waterfall Gantt on Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Left: Traces Stream (5 cols) */}
                            <div className="lg:col-span-5 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col max-h-[820px]">
                                <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Activity className="size-3.5 text-indigo-400" />
                                        Trace Records Stream ({traces.length})
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">Klik item untuk detail</span>
                                </div>

                                <div className="divide-y divide-border/60 overflow-y-auto flex-1">
                                    {traces.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <AlertCircle className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                                            <p className="text-sm font-medium text-foreground">Tidak ada trace ditemukan</p>
                                            <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan filter atau simulasikan trace baru.</p>
                                            <button
                                                onClick={() => setActiveTab('simulator')}
                                                className="mt-3 inline-flex items-center gap-1 rounded-md bg-indigo-600/10 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600/20"
                                            >
                                                Simulasi Trace Sekarang
                                            </button>
                                        </div>
                                    ) : (
                                        traces.map((trace) => {
                                            const isSelected = selectedTrace?.id === trace.id;
                                            return (
                                                <div
                                                    key={trace.id}
                                                    onClick={() => setSelectedTrace(trace)}
                                                    className={`p-3.5 transition-all cursor-pointer hover:bg-accent/40 ${
                                                        isSelected ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getMethodColor(trace.http_method)}`}>
                                                                {trace.http_method}
                                                            </span>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(trace.status)}`}>
                                                                {trace.status_code} • {trace.status}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[140px]" title={trace.trace_id}>
                                                                {trace.trace_id.substring(0, 16)}...
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-foreground">
                                                            {trace.duration_ms} ms
                                                        </span>
                                                    </div>

                                                    <div className="mt-1.5 font-medium text-xs text-foreground truncate" title={trace.root_operation}>
                                                        {trace.root_operation}
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="inline-block size-2 rounded-full bg-indigo-400"></span>
                                                            <span className="font-medium text-foreground">{trace.root_service}</span>
                                                            <span>•</span>
                                                            <span>{trace.spans_count} spans</span>
                                                            <span>•</span>
                                                            <span>{trace.services_involved?.length || 1} services</span>
                                                        </div>
                                                        <span className="font-mono text-[10px]">{trace.created_at}</span>
                                                    </div>

                                                    {/* Relative duration progress indicator */}
                                                    <div className="mt-2 w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${
                                                                trace.status === 'error'
                                                                    ? 'bg-rose-500'
                                                                    : trace.duration_ms > 400
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-indigo-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, (trace.duration_ms / 1200) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Right: Detailed Trace Waterfall Gantt Chart (7 cols) */}
                            <div className="lg:col-span-7 space-y-4">
                                {selectedTrace ? (
                                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                        {/* Trace Detail Header */}
                                        <div className="p-4 border-b border-border bg-muted/20">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getMethodColor(selectedTrace.http_method)}`}>
                                                            {selectedTrace.http_method}
                                                        </span>
                                                        <h2 className="text-base font-bold text-foreground">
                                                            {selectedTrace.root_operation}
                                                        </h2>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Trace ID:</span>
                                                        <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                                            {selectedTrace.trace_id}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopy(selectedTrace.trace_id)}
                                                            className="text-muted-foreground hover:text-foreground"
                                                            title="Salin Trace ID"
                                                        >
                                                            {copiedId === selectedTrace.trace_id ? (
                                                                <Check className="size-3.5 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="size-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold font-mono text-foreground">
                                                            {selectedTrace.duration_ms} ms
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {selectedTrace.spans_count} spans • {selectedTrace.status_code}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteTrace(selectedTrace)}
                                                        className="p-2 rounded-lg border border-border text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        title="Hapus Trace"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Critical Path & Root Cause Warning */}
                                            {selectedTrace.status === 'error' && (
                                                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                                                    <AlertOctagon className="size-4 text-rose-400 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-semibold text-rose-200">Root Cause Error Terdeteksi: </span>
                                                        <span>{selectedTrace.error_message || 'Exception terjadi pada child span'}</span>
                                                        {selectedTrace.root_cause_service && (
                                                            <div className="mt-1 font-mono text-[11px] text-rose-400">
                                                                Fault Origin: <strong>{selectedTrace.root_cause_service}</strong>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Microservice Flow Sequence */}
                                            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                                                <span className="text-muted-foreground text-[11px] shrink-0">Service Path:</span>
                                                {selectedTrace.services_involved?.map((svc, idx) => (
                                                    <React.Fragment key={svc}>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getServiceColor(svc)}`}>
                                                            {svc}
                                                        </span>
                                                        {idx < (selectedTrace.services_involved?.length || 0) - 1 && (
                                                            <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Waterfall Gantt Chart Spans View */}
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pb-2 border-b border-border/50">
                                                <span className="w-1/2">Span Hierarchy & Service Operation</span>
                                                <span className="w-1/2 text-right font-mono">0ms ──────── Timeline ({selectedTrace.duration_ms}ms)</span>
                                            </div>

                                            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                                                {selectedTrace.spans?.map((span, idx) => {
                                                    const totalDuration = Math.max(selectedTrace.duration_ms, 1);
                                                    const leftPercent = Math.min(95, (span.start_offset_ms / totalDuration) * 100);
                                                    const widthPercent = Math.max(3, (span.duration_ms / totalDuration) * 100);
                                                    const isExpanded = !!expandedSpans[span.id];
                                                    const isSlow = span.duration_ms > 150;
                                                    const isError = span.status === 'error';

                                                    return (
                                                        <div key={span.id || idx} className="group rounded-lg border border-border/50 bg-background/50 hover:bg-accent/30 transition-all p-2.5 text-xs">
                                                            {/* Span Summary Row */}
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                {/* Left: Service badge + operation name */}
                                                                <div
                                                                    className="flex items-center gap-2 cursor-pointer select-none"
                                                                    onClick={() => toggleSpanExpand(span.id)}
                                                                >
                                                                    <button className="text-muted-foreground group-hover:text-foreground">
                                                                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                                                    </button>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getServiceColor(span.service)}`}>
                                                                        {span.service}
                                                                    </span>
                                                                    <span className="font-semibold text-foreground font-mono truncate max-w-[220px]" title={span.operation}>
                                                                        {span.operation}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                                                        {span.kind}
                                                                    </span>
                                                                </div>

                                                                {/* Right: Gantt duration bar */}
                                                                <div className="w-full sm:w-1/2 flex items-center gap-2">
                                                                    <div className="relative w-full bg-muted/40 h-3.5 rounded-sm overflow-hidden">
                                                                        <div
                                                                            className={`absolute top-0 bottom-0 rounded-sm ${
                                                                                isError
                                                                                    ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                                                                                    : isSlow
                                                                                    ? 'bg-amber-500 shadow-amber-500/50 shadow-sm'
                                                                                    : 'bg-indigo-500 shadow-indigo-500/50 shadow-sm'
                                                                            }`}
                                                                            style={{
                                                                                left: `${leftPercent}%`,
                                                                                width: `${widthPercent}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-[11px] font-mono font-bold shrink-0 w-14 text-right ${isError ? 'text-rose-400' : isSlow ? 'text-amber-400' : 'text-foreground'}`}>
                                                                        {span.duration_ms} ms
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Expanded Span Details: Tags, Attributes, Error */}
                                                            {isExpanded && (
                                                                <div className="mt-2.5 pt-2.5 border-t border-border/40 space-y-2 bg-muted/20 p-2 rounded text-[11px]">
                                                                    <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono">
                                                                        <div>Span ID: <span className="text-foreground">{span.id}</span></div>
                                                                        <div>Start Offset: <span className="text-foreground">+{span.start_offset_ms} ms</span></div>
                                                                        <div>Parent ID: <span className="text-foreground">{span.parent_id || 'root'}</span></div>
                                                                        <div>Status: <span className={span.status === 'ok' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{span.status.toUpperCase()}</span></div>
                                                                    </div>

                                                                    {span.error_message && (
                                                                        <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-rose-300 font-mono text-[10px]">
                                                                            <strong>Error:</strong> {span.error_message}
                                                                        </div>
                                                                    )}

                                                                    {/* Tags Key-Values */}
                                                                    {span.tags && Object.keys(span.tags).length > 0 && (
                                                                        <div className="space-y-1">
                                                                            <div className="font-semibold text-muted-foreground text-[10px] uppercase">Tags & Attributes:</div>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {Object.entries(span.tags).map(([k, v]) => (
                                                                                    <span key={k} className="inline-flex items-center gap-1 rounded bg-background border border-border/80 px-1.5 py-0.5 text-[10px] font-mono">
                                                                                        <span className="text-indigo-400">{k}:</span>
                                                                                        <span className="text-foreground">{String(v)}</span>
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
                                        <Layers className="size-10 mx-auto text-muted-foreground/40 mb-3" />
                                        <h3 className="text-sm font-semibold text-foreground">Pilih trace di sebelah kiri</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Gantt waterfall dan span breakdown akan tampil di panel ini.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: TOPOLOGY SERVICE MESH GRAPH */}
                {activeTab === 'topology' && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Network className="size-4 text-indigo-400" />
                                        Service Mesh Live Communication Matrix
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Visualisasi alur komunikasi dependensi mikroservis, throughput RPM, dan status degradasi node.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Healthy</span>
                                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500" /> Degraded</span>
                                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> Critical / Down</span>
                                </div>
                            </div>

                            {/* Topology Canvas Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                {topology.nodes.map((node) => {
                                    const isSelected = selectedNode?.id === node.id;
                                    return (
                                        <div
                                            key={node.id}
                                            onClick={() => setSelectedNode(node)}
                                            className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-indigo-500/10'
                                                    : 'border-border bg-background/70 hover:border-border/80'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-2 rounded-lg ${getServiceColor(node.id)}`}>
                                                        <Server className="size-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-foreground">{node.name}</h3>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{node.type}</span>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getStatusColor(node.status)}`}>
                                                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                                                    {node.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground">Throughput</div>
                                                    <div className="text-xs font-bold font-mono text-foreground">{node.rpm} rpm</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground">P95 Latency</div>
                                                    <div className="text-xs font-bold font-mono text-foreground">{node.p95_latency_ms} ms</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-muted-foreground">Err Rate</div>
                                                    <div className={`text-xs font-bold font-mono ${node.error_rate > 3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                        {node.error_rate}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tech stack badge */}
                                            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                                                <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{node.tech_stack}</span>
                                                <span className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5">
                                                    Lihat Traces <ArrowRight className="size-2.5" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Service Dependency Flow Matrix */}
                            <div className="mt-8">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                    <Network className="size-3.5 text-indigo-400" />
                                    Dependensi Antar-Layanan & Latency Jaringan (Mesh Links)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {topology.links.map((link, idx) => (
                                        <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2 font-mono">
                                                <span className="font-bold text-foreground">{link.source}</span>
                                                <ArrowRight className="size-3 text-muted-foreground" />
                                                <span className="font-bold text-foreground">{link.target}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-background border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                                                    {link.protocol}
                                                </span>
                                                <span className="font-mono font-bold text-indigo-400">
                                                    {link.avg_latency_ms} ms
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: LATENCY PROFILER & ROOT CAUSE AI */}
                {activeTab === 'profiler' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Service Latency Breakdown */}
                            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <div>
                                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <BarChart2 className="size-4 text-indigo-400" />
                                            Latency Percentile Profiling per Service
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">Analisis degradasi waktu respons P50, P95, dan P99.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {service_nodes.map((node) => {
                                        const p95Ratio = Math.min(100, (node.p95_latency_ms / 300) * 100);
                                        return (
                                            <div key={node.id} className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getServiceColor(node.id)}`}>
                                                            {node.id}
                                                        </span>
                                                        <span className="text-muted-foreground font-mono">({node.tech_stack})</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 font-mono">
                                                        <span>P95: <strong className="text-foreground">{node.p95_latency_ms} ms</strong></span>
                                                        <span>Error: <strong className={node.error_rate > 3 ? 'text-rose-400' : 'text-emerald-400'}>{node.error_rate}%</strong></span>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${
                                                            node.p95_latency_ms > 150
                                                                ? 'bg-amber-500'
                                                                : node.p95_latency_ms > 250
                                                                ? 'bg-rose-500'
                                                                : 'bg-indigo-500'
                                                        }`}
                                                        style={{ width: `${p95Ratio}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Root Cause AI Insights & Recommendations */}
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border/60 pb-3">
                                    <Sparkles className="size-4 text-purple-400" />
                                    AI Bottleneck Diagnostics
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                                            <AlertTriangle className="size-3.5" />
                                            Database Query Bottleneck
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Operasi <code className="text-foreground">SELECT * FROM orders</code> pada service <span className="font-semibold text-foreground">order-service</span> menghabiskan 42% dari total trace time.
                                        </p>
                                        <div className="text-[11px] font-semibold text-amber-300">
                                            Saran AI: Tambahkan index komposit pada <code className="font-mono text-foreground">(user_id, status, created_at)</code> atau manfaatkan Redis cache.
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                                            <Zap className="size-3.5" />
                                            Downstream Gateway Concurrency
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Panggilan HTTP synchronous ke <span className="font-semibold text-foreground">payment-gateway</span> memblok thread worker selama 190ms saat load puncak.
                                        </p>
                                        <div className="text-[11px] font-semibold text-indigo-300">
                                            Saran AI: Implementasikan Circuit Breaker pattern dengan timeout agresif (150ms) dan asynchronous webhook callback.
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                            <CheckCircle2 className="size-3.5" />
                                            Optimal Caching Hit Ratio
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Redis cluster merespons 98.2% request dalam rentang latency &lt;2ms tanpa memory evictions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: TRACE INJECTOR & SIMULATOR */}
                {activeTab === 'simulator' && (
                    <div className="max-w-2xl mx-auto w-full space-y-6">
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
                            <div className="border-b border-border/60 pb-4">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Play className="size-4 text-indigo-400 fill-current" />
                                    Simulasi & Injeksi Distributed Trace
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Buat dan injeksi distributed trace realistis dengan spans lengkap untuk menguji alert observabilitas atau mendemonstrasikan latency profiling.
                                </p>
                            </div>

                            <form onSubmit={handleRunSimulation} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">Pilih Skenario Simulasi</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                        {[
                                            { id: 'checkout_flow', title: 'E-commerce Checkout Flow', desc: 'Gateway → Auth → Orders → Payment → DB (Success / Realistic)', svc: 'api-gateway', method: 'POST', op: '/api/v2/orders/checkout' },
                                            { id: 'user_auth_flow', title: 'User Login & Token Refresh', desc: 'Gateway → Auth → Redis → User DB (<50ms fast path)', svc: 'api-gateway', method: 'POST', op: '/api/v1/auth/token' },
                                            { id: 'document_export_flow', title: 'Async PDF Export Job', desc: 'Gateway → DocService → S3 / Storage (Slow 650ms)', svc: 'api-gateway', method: 'POST', op: '/api/v1/exports/pdf' },
                                            { id: 'ai_inference_pipeline', title: 'AI Assistant Semantic Query', desc: 'Gateway → AI Worker → Vector DB → LLM (850ms heavy)', svc: 'api-gateway', method: 'POST', op: '/api/v1/ai/chat/completion' },
                                            { id: 'failing_payment_flow', title: 'Failing Payment Flow (500)', desc: 'Payment Gateway Timeout Exception (Error Root Cause)', svc: 'api-gateway', method: 'POST', op: '/api/v2/payments/charge' },
                                        ].map((sc) => (
                                            <div
                                                key={sc.id}
                                                onClick={() => {
                                                    setSimScenario(sc.id);
                                                    setSimRootService(sc.svc);
                                                    setSimMethod(sc.method);
                                                    setSimOperation(sc.op);
                                                }}
                                                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                                                    simScenario === sc.id
                                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                                                        : 'border-border bg-background hover:border-border/80'
                                                }`}
                                            >
                                                <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                                                    {sc.title}
                                                    {simScenario === sc.id && <Check className="size-3.5 text-indigo-400" />}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{sc.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">Root Service</label>
                                        <input
                                            type="text"
                                            value={simRootService}
                                            onChange={(e) => setSimRootService(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">HTTP Method</label>
                                        <select
                                            value={simMethod}
                                            onChange={(e) => setSimMethod(e.target.value)}
                                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                            <option value="PUT">PUT</option>
                                            <option value="DELETE">DELETE</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Root Endpoint / Operation</label>
                                    <input
                                        type="text"
                                        value={simOperation}
                                        onChange={(e) => setSimOperation(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-none font-mono"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('traces')}
                                        className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-accent"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSimulating}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        {isSimulating ? (
                                            <>
                                                <RefreshCw className="size-3.5 animate-spin" />
                                                Menginjeksi Trace...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="size-3.5" />
                                                Injeksi & Rekam Trace
                                            </>
                                        )}
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
