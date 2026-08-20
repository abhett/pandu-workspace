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
    TrendingUp,
    Sparkles,
    Columns3,
    ListTodo,
    Calendar,
    Workflow,
    DollarSign,
    PenTool,
    AlertTriangle,
    MessageSquareQuote,
    Zap,
    Shield,
    Target,
    Activity,
    Clock,
    CheckCircle2,
    BarChart3,
    LineChart,
    Layers,
    Save,
    RotateCcw,
    Trash2,
    HelpCircle,
    Info,
    ShieldAlert,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface HistoricalSprint {
    id: string;
    name: string;
    status: string;
    completed_points: number;
    committed_points: number;
    completed_at: string | null;
}

interface VelocityMetrics {
    sample_size: number;
    avg_velocity: number;
    std_dev: number;
    min_velocity: number;
    max_velocity: number;
    stability_index: number;
}

interface PercentileItem {
    sprints: number;
    date: string;
    label: string;
    confidence_pct: number;
}

interface DistributionBin {
    sprints: number;
    projected_date: string;
    frequency: number;
    probability_pct: number;
    cumulative_prob_pct: number;
}

interface SimulationResult {
    target_points: number;
    simulation_runs: number;
    sprint_duration_days: number;
    start_date: string;
    metrics: VelocityMetrics;
    percentiles: {
        p50: PercentileItem;
        p85: PercentileItem;
        p95: PercentileItem;
    };
    distribution_bins: DistributionBin[];
    readiness_score: number;
    historical_velocities: number[];
}

interface SavedScenario {
    id: string;
    title: string;
    target_scope_type: string;
    target_points: number;
    simulation_runs: number;
    sprint_duration_days: number;
    start_date: string;
    results: SimulationResult | null;
    creator: { id: number; name: string } | null;
    created_at: string;
}

interface Props {
    project: Project;
    historical_sprints: HistoricalSprint[];
    velocity_metrics: VelocityMetrics;
    backlog_stats: {
        remaining_points: number;
        total_tasks: number;
        unestimated_tasks: number;
        estimated_ratio_pct: number;
    };
    simulation: SimulationResult;
    scenarios: SavedScenario[];
}

export default function SprintForecastIndex({
    project,
    historical_sprints,
    velocity_metrics,
    backlog_stats,
    simulation: initialSimulation,
    scenarios,
}: Props) {
    const [activeTab, setActiveTab] = useState<'distribution' | 'velocity' | 'scenarios'>('distribution');
    const [currentSimulation, setCurrentSimulation] = useState<SimulationResult>(initialSimulation);

    // Simulation Form Controls
    const [targetPoints, setTargetPoints] = useState<number>(initialSimulation.target_points);
    const [simulationRuns, setSimulationRuns] = useState<number>(1000);
    const [historicalWindow, setHistoricalWindow] = useState<number>(5);
    const [sprintDays, setSprintDays] = useState<number>(14);
    const [isSimulating, setIsSimulating] = useState(false);

    // Save Scenario Modal
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [scenarioTitle, setScenarioTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleRunSimulation = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSimulating(true);

        fetch(`/projects/${project.id}/forecast/simulate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                target_points: targetPoints,
                simulation_runs: simulationRuns,
                historical_sprints_count: historicalWindow,
                sprint_duration_days: sprintDays,
                start_date: new Date().toISOString().split('T')[0],
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSimulating(false);
                if (data.simulation) {
                    setCurrentSimulation(data.simulation);
                }
            })
            .catch(() => setIsSimulating(false));
    };

    const handleSaveScenario = (e: React.FormEvent) => {
        e.preventDefault();
        if (!scenarioTitle.trim()) return;
        setIsSaving(true);

        fetch(`/projects/${project.id}/forecast/scenarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: scenarioTitle,
                target_scope_type: 'custom_points',
                target_points: targetPoints,
                simulation_runs: simulationRuns,
                historical_sprints_count: historicalWindow,
                sprint_duration_days: sprintDays,
                start_date: new Date().toISOString().split('T')[0],
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setSaveModalOpen(false);
                setScenarioTitle('');
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleDeleteScenario = (id: string) => {
        fetch(`/projects/${project.id}/forecast/scenarios/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const maxFrequency = Math.max(...currentSimulation.distribution_bins.map((b) => b.frequency), 1);

    return (
        <AppLayout>
            <Head title={`Prakiraan & Monte Carlo - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Header & Sub-Navigation */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Sprint Velocity Forecast & Monte Carlo Simulation
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Prakiraan rilis probabilistik berbasis ribuan iterasi bootstrap throughput historis dan indeks kesiapan rilis
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => setSaveModalOpen(true)}
                            variant="outline"
                            className="text-xs gap-1.5 font-semibold"
                        >
                            <Save className="h-4 w-4" />
                            <span>Simpan Skenario Prakiraan</span>
                        </Button>
                    </div>

                    {/* Subnav links */}
                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/80 overflow-x-auto text-xs">
                        <Link
                            href={`/projects/${project.id}/board`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Columns3 className="h-3.5 w-3.5" />
                            <span>Papan Kanban</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/tasks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>Daftar Tugas</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/timeline`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Gantt & CPM</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/dependencies`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            <span>Graf Dependensi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/budget`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Anggaran</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/whiteboard`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Kanvas Ideasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/risks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Risiko</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/retrospectives`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <MessageSquareQuote className="h-3.5 w-3.5" />
                            <span>Retrospektif</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/planning-poker`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Planning Poker</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/forecast`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Prakiraan & Monte Carlo</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/sprints/health`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Kesehatan Sprint & Blocker</span>
                        </Link>
                    </div>
                </div>

                {/* Bento KPI Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Velocity</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {velocity_metrics.avg_velocity}
                            </span>
                            <span className="text-xs text-muted-foreground">pts / sprint</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Sampel dari {velocity_metrics.sample_size} sprint terakhir
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Indeks Stabilitas Throughput</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {velocity_metrics.stability_index}%
                            </span>
                            <Badge
                                className={`text-[10px] ${
                                    velocity_metrics.stability_index > 75
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }`}
                            >
                                {velocity_metrics.stability_index > 75 ? 'Sangat Terprediksi' : 'Variasi Sedang'}
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            StdDev: ±{velocity_metrics.std_dev} pts
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Poin Backlog Tersisa</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {backlog_stats.remaining_points}
                            </span>
                            <span className="text-xs text-muted-foreground">Story Points</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {backlog_stats.estimated_ratio_pct}% tiket telah terestimasi
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Kesiapan Rilis</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Shield className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {currentSimulation.readiness_score}%
                            </span>
                            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-[10px]">
                                {currentSimulation.readiness_score > 75 ? 'Tinggi (High)' : 'Sedang'}
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Berdasarkan Monte Carlo {currentSimulation.simulation_runs} runs
                        </div>
                    </div>
                </div>

                {/* Interactive Simulator Control Bar */}
                <form
                    onSubmit={handleRunSimulation}
                    className="rounded-3xl border border-border bg-gradient-to-br from-card via-muted/20 to-card p-5 shadow-xs"
                >
                    <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-bold text-foreground">
                                Konfigurasi Parameter Simulasi Monte Carlo
                            </h3>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                            Ubah parameter dan jalankan simulasi on-the-fly
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Target Poin Backlog (pts)
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="10000"
                                value={targetPoints}
                                onChange={(e) => setTargetPoints(Number(e.target.value))}
                                className="h-9 text-xs font-mono font-bold"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Jumlah Iterasi Simulasi
                            </label>
                            <Select
                                value={simulationRuns.toString()}
                                onValueChange={(v) => setSimulationRuns(Number(v))}
                            >
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="500">500 Iterasi</SelectItem>
                                    <SelectItem value="1000">1.000 Iterasi (Rekomendasi)</SelectItem>
                                    <SelectItem value="2500">2.500 Iterasi</SelectItem>
                                    <SelectItem value="5000">5.000 Iterasi (Presisi Tinggi)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Sampel Sprint Historis
                            </label>
                            <Select
                                value={historicalWindow.toString()}
                                onValueChange={(v) => setHistoricalWindow(Number(v))}
                            >
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 Sprint Terakhir</SelectItem>
                                    <SelectItem value="5">5 Sprint Terakhir (Standar)</SelectItem>
                                    <SelectItem value="8">8 Sprint Terakhir</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Durasi Tiap Sprint (Hari)
                            </label>
                            <Input
                                type="number"
                                min="7"
                                max="60"
                                value={sprintDays}
                                onChange={(e) => setSprintDays(Number(e.target.value))}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setTargetPoints(backlog_stats.remaining_points > 0 ? backlog_stats.remaining_points : 45)}
                                className="text-[11px] text-primary hover:underline font-semibold"
                            >
                                Gunakan Backlog Sisa Saat Ini ({backlog_stats.remaining_points} pts)
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSimulating}
                            className="bg-primary text-primary-foreground text-xs gap-1.5 font-semibold shadow-xs"
                        >
                            <Zap className="h-3.5 w-3.5" />
                            <span>{isSimulating ? 'Menjalankan Simulasi...' : 'Jalankan Simulasi Monte Carlo'}</span>
                        </Button>
                    </div>
                </form>

                {/* Probabilistic Percentile Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* P50 */}
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                                ⚡ P50 (Optimis)
                            </Badge>
                            <span className="text-xs font-mono font-bold text-muted-foreground">50% Keyakinan</span>
                        </div>
                        <div className="mt-4">
                            <span className="text-3xl font-bold font-mono text-foreground">
                                {currentSimulation.percentiles.p50.sprints} Sprint
                            </span>
                            <span className="text-xs text-muted-foreground block mt-1 font-semibold">
                                Proyeksi Tanggal: <span className="font-mono text-foreground">{currentSimulation.percentiles.p50.date}</span>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                            Target internal agresif tim. Terdapat probabilitas 50% seluruh poin terselesaikan pada atau sebelum tanggal ini.
                        </p>
                    </div>

                    {/* P85 */}
                    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 shadow-sm relative overflow-hidden ring-2 ring-primary/20">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                                🎯 P85 (Rekomendasi Agile)
                            </Badge>
                            <span className="text-xs font-mono font-bold text-primary">85% Keyakinan</span>
                        </div>
                        <div className="mt-4">
                            <span className="text-3xl font-bold font-mono text-foreground">
                                {currentSimulation.percentiles.p85.sprints} Sprint
                            </span>
                            <span className="text-xs text-muted-foreground block mt-1 font-semibold">
                                Proyeksi Tanggal: <span className="font-mono text-primary font-bold">{currentSimulation.percentiles.p85.date}</span>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                            Standar industri agile untuk komitmen rilis ke stakeholder dan manajemen dengan tingkat keyakinan tinggi.
                        </p>
                    </div>

                    {/* P95 */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                                🛡️ P95 (Konservatif / Aman)
                            </Badge>
                            <span className="text-xs font-mono font-bold text-muted-foreground">95% Keyakinan</span>
                        </div>
                        <div className="mt-4">
                            <span className="text-3xl font-bold font-mono text-foreground">
                                {currentSimulation.percentiles.p95.sprints} Sprint
                            </span>
                            <span className="text-xs text-muted-foreground block mt-1 font-semibold">
                                Proyeksi Tanggal: <span className="font-mono text-foreground">{currentSimulation.percentiles.p95.date}</span>
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                            Batas aman rilis dengan toleransi risiko keterlambatan minimal untuk kepatuhan SLA atau kontrak ketat.
                        </p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-2 border-b border-border pb-3">
                    <button
                        onClick={() => setActiveTab('distribution')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'distribution'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>Distribusi Frekuensi & Kurva S (Monte Carlo)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('velocity')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'velocity'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Activity className="h-4 w-4" />
                        <span>Riwayat Velocity Sprint</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('scenarios')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'scenarios'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Save className="h-4 w-4" />
                        <span>Skenario Tersimpan ({scenarios.length})</span>
                    </button>
                </div>

                {/* TAB 1: Distribution Histogram & S-Curve */}
                {activeTab === 'distribution' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">
                                        Histogram Distribusi Penyelesaian ({currentSimulation.simulation_runs} Iterasi)
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Sebaran frekuensi berapa sprint yang dibutuhkan untuk menuntaskan {currentSimulation.target_points} story points
                                    </p>
                                </div>
                            </div>

                            {/* Visual Bar Chart */}
                            <div className="space-y-3 pt-2">
                                {currentSimulation.distribution_bins.map((bin) => {
                                    const isP85 = bin.sprints === currentSimulation.percentiles.p85.sprints;
                                    const isP50 = bin.sprints === currentSimulation.percentiles.p50.sprints;
                                    const isP95 = bin.sprints === currentSimulation.percentiles.p95.sprints;

                                    return (
                                        <div key={bin.sprints} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold w-20 text-foreground">
                                                        {bin.sprints} Sprint
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground font-mono">
                                                        ({bin.projected_date})
                                                    </span>
                                                    {isP85 && (
                                                        <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0">
                                                            P85 Target
                                                        </Badge>
                                                    )}
                                                    {isP50 && !isP85 && (
                                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1.5 py-0">
                                                            P50
                                                        </Badge>
                                                    )}
                                                    {isP95 && !isP85 && (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0">
                                                            P95
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 font-mono text-[11px]">
                                                    <span className="text-muted-foreground">
                                                        {bin.probability_pct}% frekuensi
                                                    </span>
                                                    <span className="font-bold text-foreground">
                                                        {bin.cumulative_prob_pct}% kumulatif
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bar Visualization */}
                                            <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        isP85
                                                            ? 'bg-primary'
                                                            : isP50
                                                            ? 'bg-amber-500'
                                                            : isP95
                                                            ? 'bg-emerald-500'
                                                            : 'bg-blue-400/80'
                                                    }`}
                                                    style={{ width: `${(bin.frequency / maxFrequency) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Historical Velocity Trends */}
                {activeTab === 'velocity' && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <h3 className="font-bold text-sm text-foreground mb-1">Riwayat Throughput Sprint Lalu</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            Data kecepatan sprint nyata yang digunakan sebagai sampel probabilitas simulasi Monte Carlo
                        </p>

                        <div className="divide-y divide-border">
                            {historical_sprints.map((sp) => (
                                <div
                                    key={sp.id}
                                    className="py-3 flex items-center justify-between text-xs"
                                >
                                    <div>
                                        <span className="font-bold text-foreground">{sp.name}</span>
                                        <span className="text-muted-foreground ml-2 text-[11px]">
                                            {sp.completed_at ? `Selesai: ${sp.completed_at}` : sp.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 font-mono">
                                        <span className="text-muted-foreground">
                                            Komitmen: {sp.committed_points} pts
                                        </span>
                                        <Badge className="bg-primary text-primary-foreground font-bold">
                                            {sp.completed_points} Story Points Selesai
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: Saved Scenarios */}
                {activeTab === 'scenarios' && (
                    <div className="space-y-4">
                        {scenarios.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                                <Save className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                <h4 className="text-sm font-bold text-foreground">Belum Ada Skenario Tersimpan</h4>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                    Simpan hasil simulasi saat ini sebagai perbandingan di masa depan atau untuk dokumentasi komitmen sprint.
                                </p>
                                <Button size="sm" onClick={() => setSaveModalOpen(true)} className="text-xs">
                                    Simpan Skenario Pertama
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {scenarios.map((sc) => (
                                    <div
                                        key={sc.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-bold text-sm text-foreground">{sc.title}</h4>
                                                <button
                                                    onClick={() => handleDeleteScenario(sc.id)}
                                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Target: <span className="font-mono font-bold text-foreground">{sc.target_points} pts</span> • {sc.simulation_runs} runs
                                            </div>

                                            {sc.results?.percentiles && (
                                                <div className="mt-3 p-2.5 rounded-xl bg-muted/40 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                                                    <div>
                                                        <span className="text-muted-foreground block">P50</span>
                                                        <span className="font-bold text-foreground">{sc.results.percentiles.p50.sprints} Sprints</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-primary block font-bold">P85</span>
                                                        <span className="font-bold text-primary">{sc.results.percentiles.p85.sprints} Sprints</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">P95</span>
                                                        <span className="font-bold text-foreground">{sc.results.percentiles.p95.sprints} Sprints</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-2 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                            <span>Oleh: {sc.creator?.name || 'Tim'}</span>
                                            <span>{new Date(sc.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Simpan Skenario */}
            <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Save className="h-5 w-5 text-primary" />
                            <span>Simpan Skenario Prakiraan</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Simpan hasil konfigurasi simulasi Monte Carlo untuk referensi tim.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveScenario} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Skenario *
                            </label>
                            <Input
                                placeholder="Contoh: Rilis V2.0 MVP Scope Forecast"
                                value={scenarioTitle}
                                onChange={(e) => setScenarioTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground space-y-1">
                            <div>
                                Target Poin: <span className="font-mono font-bold text-foreground">{targetPoints} pts</span>
                            </div>
                            <div>
                                Estimasi P85: <span className="font-mono font-bold text-primary">{currentSimulation.percentiles.p85.sprints} Sprint ({currentSimulation.percentiles.p85.date})</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSaveModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan Skenario'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
