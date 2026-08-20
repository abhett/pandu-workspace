import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    Plus,
    ShieldAlert,
    CheckCircle2,
    Clock,
    UserCheck,
    Search,
    Edit3,
    Trash2,
    FileText,
    History,
    PieChart,
    Layers,
    Columns3,
    ListTodo,
    DollarSign,
    PenTool,
    Settings,
    Workflow,
    AlertCircle,
    Activity,
    Check,
    X,
    Filter,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
    slug: string;
    color: string;
    icon: string;
}

interface ActionLogItem {
    id: string;
    action_taken: string;
    status_before: string;
    status_after: string;
    user_name?: string;
    created_at_formatted: string;
}

interface RiskItem {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    probability: number;
    impact: number;
    exposure_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'mitigating' | 'accepted' | 'transferred' | 'avoided' | 'closed';
    mitigation_strategy?: string | null;
    contingency_plan?: string | null;
    owner_name?: string | null;
    owner_email?: string | null;
    task_key?: string | null;
    task_title?: string | null;
    identified_date_formatted: string;
    target_resolution_date_formatted?: string | null;
    action_logs: ActionLogItem[];
}

interface HeatmapCell {
    probability: number;
    impact: number;
    score: number;
    level: string;
    count: number;
    risks: Array<{ id: string; title: string; status: string; exposure_score: number }>;
}

interface RiskSummary {
    metrics: {
        total_risks: number;
        critical_count: number;
        high_count: number;
        medium_count: number;
        low_count: number;
        mitigated_count: number;
        mitigation_rate: number;
        average_exposure_score: number;
        category_breakdown: Record<string, number>;
    };
    heatmap: Record<number, Record<number, HeatmapCell>>;
    risks: RiskItem[];
}

interface MemberItem {
    id: number;
    name: string;
    email: string;
}

interface TaskItem {
    id: string;
    key: string;
    title: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: Project;
    summary: RiskSummary;
    members: MemberItem[];
    tasks: TaskItem[];
}

export default function ProjectRisksPage({
    organization,
    project,
    summary,
    members,
    tasks,
}: Props) {
    const [activeTab, setActiveTab] = useState<'register' | 'heatmap' | 'distribution'>('register');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ p: number; i: number } | null>(null);

    // Modal Create / Edit Risk
    const [riskModalOpen, setRiskModalOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
    const [riskTitle, setRiskTitle] = useState('');
    const [riskCategory, setRiskCategory] = useState('technical');
    const [riskDescription, setRiskDescription] = useState('');
    const [riskProbability, setRiskProbability] = useState<number>(3);
    const [riskImpact, setRiskImpact] = useState<number>(3);
    const [riskStatus, setRiskStatus] = useState<string>('open');
    const [mitigationStrategy, setMitigationStrategy] = useState('');
    const [contingencyPlan, setContingencyPlan] = useState('');
    const [ownerId, setOwnerId] = useState<string>('');
    const [taskId, setTaskId] = useState<string>('');
    const [identifiedDate, setIdentifiedDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState('');
    const [submittingRisk, setSubmittingRisk] = useState(false);

    // Modal Mitigation Action Log
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [targetRiskForAction, setTargetRiskForAction] = useState<RiskItem | null>(null);
    const [actionTakenText, setActionTakenText] = useState('');
    const [statusAfterAction, setStatusAfterAction] = useState<string>('mitigating');
    const [residualProb, setResidualProb] = useState<number | string>('');
    const [residualImp, setResidualImp] = useState<number | string>('');
    const [submittingAction, setSubmittingAction] = useState(false);

    // Risk Level Badge Formatter Helper
    const renderRiskLevelBadge = (level: string, score: number) => {
        const configs: Record<string, { label: string; color: string }> = {
            critical: { label: 'Kritis (Critical)', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
            high: { label: 'Tinggi (High)', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
            medium: { label: 'Sedang (Medium)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            low: { label: 'Rendah (Low)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
        };

        const cfg = configs[level] || configs.medium;

        return (
            <Badge className={`text-[10px] font-bold font-mono gap-1 ${cfg.color}`}>
                <span>{cfg.label}</span>
                <span>({score})</span>
            </Badge>
        );
    };

    // Risk Status Badge Formatter
    const renderStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            open: { label: 'Terbuka (Open)', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
            mitigating: { label: 'Sedang Dimitigasi', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
            accepted: { label: 'Diterima (Accepted)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
            transferred: { label: 'Dialihkan (Transferred)', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
            avoided: { label: 'Dihindari (Avoided)', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30' },
            closed: { label: 'Ditutup (Closed)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
        };

        const cfg = configs[status] || configs.open;

        return (
            <Badge className={`text-[10px] font-semibold ${cfg.color}`}>
                {cfg.label}
            </Badge>
        );
    };

    // Handle Save Risk (Create / Edit)
    const handleSaveRisk = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingRisk(true);

        const payload = {
            title: riskTitle,
            category: riskCategory,
            description: riskDescription,
            probability: Number(riskProbability),
            impact: Number(riskImpact),
            status: riskStatus,
            mitigation_strategy: mitigationStrategy,
            contingency_plan: contingencyPlan,
            owner_id: ownerId ? Number(ownerId) : null,
            task_id: taskId || null,
            identified_date: identifiedDate,
            target_resolution_date: targetDate || null,
        };

        if (editingRisk) {
            router.put(`/projects/${project.id}/risks/${editingRisk.id}`, payload, {
                onSuccess: () => {
                    setRiskModalOpen(false);
                    setEditingRisk(null);
                },
                onFinish: () => setSubmittingRisk(false),
            });
        } else {
            router.post(`/projects/${project.id}/risks`, payload, {
                onSuccess: () => {
                    setRiskModalOpen(false);
                    setRiskTitle('');
                    setRiskDescription('');
                    setMitigationStrategy('');
                    setContingencyPlan('');
                },
                onFinish: () => setSubmittingRisk(false),
            });
        }
    };

    // Handle Delete Risk
    const handleDeleteRisk = (risk: RiskItem) => {
        if (!confirm(`Hapus risiko "${risk.title}" dari register proyek?`)) return;

        router.delete(`/projects/${project.id}/risks/${risk.id}`);
    };

    // Handle Log Mitigation Action Submit
    const handleSaveActionLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRiskForAction) return;
        setSubmittingAction(true);

        router.post(`/projects/${project.id}/risks/${targetRiskForAction.id}/action-logs`, {
            action_taken: actionTakenText,
            status_after: statusAfterAction,
            residual_probability: residualProb ? Number(residualProb) : null,
            residual_impact: residualImp ? Number(residualImp) : null,
        }, {
            onSuccess: () => {
                setActionModalOpen(false);
                setTargetRiskForAction(null);
                setActionTakenText('');
            },
            onFinish: () => setSubmittingAction(false),
        });
    };

    // Filtered Risks
    const filteredRisks = summary.risks.filter((r) => {
        const matchQuery = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        const matchLevel = levelFilter === 'all' || r.risk_level === levelFilter;
        const matchCell = !selectedHeatmapCell || (r.probability === selectedHeatmapCell.p && r.impact === selectedHeatmapCell.i);

        return matchQuery && matchStatus && matchLevel && matchCell;
    });

    return (
        <AppLayout>
            <Head title={`Risiko & Mitigasi - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Project Sub-Navigation Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs text-sm"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                        >
                            {project.key}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {project.key}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Register Risiko, Matriks Heatmap 5x5 & Pelacakan Tindakan Mitigasi
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
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
                            <span>Anggaran & Biaya</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/whiteboard`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Kanvas & Ideasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/risks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Risiko & Mitigasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/settings`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Pengaturan</span>
                        </Link>
                    </div>
                </div>

                {/* Risk Quick Action & Status Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Profil Risiko:</span>
                        <Badge
                            className={`text-[10px] uppercase font-bold ${
                                summary.metrics.critical_count > 0
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    : summary.metrics.high_count > 0
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                        >
                            {summary.metrics.critical_count > 0
                                ? `${summary.metrics.critical_count} Risiko Kritis Terdeteksi`
                                : summary.metrics.high_count > 0
                                ? `${summary.metrics.high_count} Risiko Tinggi Terdeteksi`
                                : 'Profil Risiko Terkendali'}
                        </Badge>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => {
                            setEditingRisk(null);
                            setRiskTitle('');
                            setRiskDescription('');
                            setMitigationStrategy('');
                            setContingencyPlan('');
                            setRiskModalOpen(true);
                        }}
                        className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Daftarkan Risiko Baru</span>
                    </Button>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Risiko Teridentifikasi</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {summary.metrics.total_risks}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Rata-rata Skor Eksposur: {summary.metrics.average_exposure_score} / 25
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Risiko Kritis & Tinggi</span>
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 font-mono">
                                {summary.metrics.critical_count + summary.metrics.high_count}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({summary.metrics.critical_count} Kritis, {summary.metrics.high_count} Tinggi)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Memerlukan rencana mitigasi prioritas
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Mitigasi</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {summary.metrics.mitigation_rate}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({summary.metrics.mitigated_count} / {summary.metrics.total_risks})
                            </span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${Math.min(summary.metrics.mitigation_rate, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Risiko Terbuka (Open)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {summary.metrics.total_risks - summary.metrics.mitigated_count}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Menunggu eksekusi aksi mitigasi
                        </div>
                    </div>
                </div>

                {/* 5x5 Probability vs Impact Heatmap Matrix Card */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                <span>Matriks Heatmap Risiko 5x5 (Probability vs Impact)</span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Klik pada sel untuk memfilter daftar risiko pada kombinasi probabilitas dan dampak tertentu.
                            </p>
                        </div>

                        {selectedHeatmapCell && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedHeatmapCell(null)}
                                className="text-xs text-muted-foreground hover:text-foreground h-7"
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                <span>Reset Filter Sel (P:{selectedHeatmapCell.p}, D:{selectedHeatmapCell.i})</span>
                            </Button>
                        )}
                    </div>

                    {/* Heatmap Grid Visual */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            <div className="grid grid-cols-6 gap-2 text-center text-xs">
                                {/* Top Header Corner */}
                                <div className="p-2 text-muted-foreground font-bold text-[11px] flex items-center justify-center">
                                    Probabilitas ↓ / Dampak →
                                </div>
                                {[1, 2, 3, 4, 5].map((impactVal) => (
                                    <div key={impactVal} className="p-2 bg-muted/40 rounded-xl font-bold text-foreground text-[11px]">
                                        Dampak {impactVal}
                                        <span className="block font-normal text-[10px] text-muted-foreground">
                                            {impactVal === 1 ? 'Sangat Rendah' : impactVal === 2 ? 'Rendah' : impactVal === 3 ? 'Sedang' : impactVal === 4 ? 'Tinggi' : 'Bencana'}
                                        </span>
                                    </div>
                                ))}

                                {/* 5 Probability Rows */}
                                {[5, 4, 3, 2, 1].map((probVal) => (
                                    <React.Fragment key={probVal}>
                                        <div className="p-2 bg-muted/40 rounded-xl font-bold text-foreground text-[11px] flex flex-col justify-center">
                                            P{probVal}
                                            <span className="font-normal text-[10px] text-muted-foreground">
                                                {probVal === 5 ? 'Hampir Pasti' : probVal === 4 ? 'Tinggi' : probVal === 3 ? 'Sedang' : probVal === 2 ? 'Rendah' : 'Jarang'}
                                            </span>
                                        </div>

                                        {[1, 2, 3, 4, 5].map((impactVal) => {
                                            const cell = summary.heatmap[probVal]?.[impactVal];
                                            const isSelected = selectedHeatmapCell?.p === probVal && selectedHeatmapCell?.i === impactVal;

                                            // Cell background based on risk level
                                            const bgClass =
                                                cell?.level === 'critical'
                                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 border-red-500/40'
                                                    : cell?.level === 'high'
                                                    ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-700 dark:text-orange-300 border-orange-500/40'
                                                    : cell?.level === 'medium'
                                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';

                                            return (
                                                <button
                                                    key={`${probVal}-${impactVal}`}
                                                    onClick={() => setSelectedHeatmapCell(isSelected ? null : { p: probVal, i: impactVal })}
                                                    className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${bgClass} ${
                                                        isSelected ? 'ring-3 ring-primary ring-offset-2 scale-105 shadow-md' : ''
                                                    }`}
                                                >
                                                    <span className="font-mono text-xs font-bold">
                                                        Skor: {cell?.score}
                                                    </span>
                                                    {cell && cell.count > 0 ? (
                                                        <Badge className="text-[10px] font-bold bg-foreground text-background">
                                                            {cell.count} Risiko
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground/60">—</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('register')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'register'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <FileText className="h-4 w-4" />
                            <span>Daftar Register Risiko ({filteredRisks.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('distribution')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'distribution'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <PieChart className="h-4 w-4" />
                            <span>Distribusi Domain</span>
                        </button>

                        {/* Status Filter Select */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 text-xs w-36 bg-card">
                                <SelectValue placeholder="Status..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="mitigating">Mitigating</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="transferred">Transferred</SelectItem>
                                <SelectItem value="avoided">Avoided</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Level Filter Select */}
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="h-8 text-xs w-36 bg-card">
                                <SelectValue placeholder="Level..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Level</SelectItem>
                                <SelectItem value="critical">Kritis (Critical)</SelectItem>
                                <SelectItem value="high">Tinggi (High)</SelectItem>
                                <SelectItem value="medium">Sedang (Medium)</SelectItem>
                                <SelectItem value="low">Rendah (Low)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari risiko atau strategi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-9 text-xs"
                        />
                    </div>
                </div>

                {/* TAB 1: Risk Register Table */}
                {activeTab === 'register' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        {filteredRisks.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Tidak ada risiko yang sesuai dengan filter pencarian.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Risiko & Kategori</th>
                                            <th className="py-3 px-4">P x D = Skor</th>
                                            <th className="py-3 px-4">Level Risiko</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">PIC (Owner)</th>
                                            <th className="py-3 px-4">Strategi Mitigasi</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredRisks.map((risk) => (
                                            <tr key={risk.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground text-sm">{risk.title}</div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge variant="outline" className="text-[9px] uppercase font-mono">
                                                            {risk.category}
                                                        </Badge>
                                                        {risk.task_key && (
                                                            <Badge variant="secondary" className="text-[9px] font-mono">
                                                                {risk.task_key}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {risk.description && (
                                                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                                                            {risk.description}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 font-mono font-bold">
                                                    <div className="text-foreground">
                                                        P{risk.probability} × D{risk.impact} = {risk.exposure_score}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    {renderRiskLevelBadge(risk.risk_level, risk.exposure_score)}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {renderStatusBadge(risk.status)}
                                                </td>

                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {risk.owner_name || '—'}
                                                </td>

                                                <td className="py-3 px-4 max-w-xs">
                                                    <div className="text-foreground line-clamp-2">
                                                        {risk.mitigation_strategy || 'Belum ada strategi.'}
                                                    </div>
                                                    {risk.contingency_plan && (
                                                        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                                            Kontingensi: {risk.contingency_plan}
                                                        </div>
                                                    )}
                                                    {risk.action_logs.length > 0 && (
                                                        <div className="text-[10px] text-blue-500 mt-1 font-semibold flex items-center gap-1">
                                                            <History className="h-3 w-3" />
                                                            <span>{risk.action_logs.length} Aksi Tercatat</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-7 gap-1"
                                                            onClick={() => {
                                                                setTargetRiskForAction(risk);
                                                                setStatusAfterAction(risk.status);
                                                                setResidualProb(risk.probability);
                                                                setResidualImp(risk.impact);
                                                                setActionModalOpen(true);
                                                            }}
                                                            title="Catat Aksi Mitigasi"
                                                        >
                                                            <History className="h-3 w-3 text-blue-500" />
                                                            <span>Aksi</span>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={() => {
                                                                setEditingRisk(risk);
                                                                setRiskTitle(risk.title);
                                                                setRiskCategory(risk.category);
                                                                setRiskDescription(risk.description || '');
                                                                setRiskProbability(risk.probability);
                                                                setRiskImpact(risk.impact);
                                                                setRiskStatus(risk.status);
                                                                setMitigationStrategy(risk.mitigation_strategy || '');
                                                                setContingencyPlan(risk.contingency_plan || '');
                                                                setRiskModalOpen(true);
                                                            }}
                                                            title="Edit Risiko"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteRisk(risk)}
                                                            title="Hapus Risiko"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: Category Distribution */}
                {activeTab === 'distribution' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-primary" />
                                <span>Distribusi Risiko per Domain / Kategori</span>
                            </h3>

                            <div className="space-y-3">
                                {[
                                    { key: 'technical', label: 'Teknis & Arsitektur', color: 'bg-blue-500' },
                                    { key: 'schedule', label: 'Jadwal & Keterlambatan', color: 'bg-amber-500' },
                                    { key: 'budget', label: 'Anggaran & Finansial', color: 'bg-purple-500' },
                                    { key: 'resource', label: 'Sumber Daya & SDM', color: 'bg-cyan-500' },
                                    { key: 'security', label: 'Keamanan & Privasi Data', color: 'bg-rose-500' },
                                    { key: 'compliance', label: 'Kepatuhan & Hukum', color: 'bg-indigo-500' },
                                    { key: 'external', label: 'Ketergantungan Eksternal', color: 'bg-emerald-500' },
                                    { key: 'other', label: 'Lainnya', color: 'bg-slate-500' },
                                ].map((cat) => {
                                    const count = summary.metrics.category_breakdown[cat.key] || 0;
                                    const total = summary.metrics.total_risks || 1;
                                    const percent = summary.metrics.total_risks > 0 ? Math.round((count / total) * 100) : 0;

                                    return (
                                        <div key={cat.key} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-foreground">{cat.label}</span>
                                                <span className="font-mono font-semibold text-foreground">
                                                    {count} Risiko ({percent}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full ${cat.color}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-primary" />
                                    <span>Panduan Evaluasi Skor Risiko</span>
                                </h3>

                                <div className="space-y-2 text-xs text-muted-foreground">
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <strong className="text-red-700 dark:text-red-300 block mb-0.5">
                                            Kritis (Skor 20 - 25):
                                        </strong>
                                        Dampak katastropik dan probabilitas tinggi. Memerlukan eskalasi segera ke pimpinan proyek dan mitigasi harian.
                                    </div>

                                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                        <strong className="text-orange-700 dark:text-orange-300 block mb-0.5">
                                            Tinggi (Skor 12 - 19):
                                        </strong>
                                        Dapat mengganggu milestone rilis. Wajib menyusun rencana kontingensi cadangan.
                                    </div>

                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <strong className="text-amber-700 dark:text-amber-300 block mb-0.5">
                                            Sedang (Skor 5 - 11):
                                        </strong>
                                        Dapat ditangani dalam alur kerja sprint normal oleh tim pengembang terkait.
                                    </div>

                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <strong className="text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                            Rendah (Skor 1 - 4):
                                        </strong>
                                        Dampak minimal, cukup dipantau secara berkala (*accepted risk*).
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Tambah / Edit Risiko */}
            <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-primary" />
                            <span>{editingRisk ? 'Edit Risiko Proyek' : 'Daftarkan Risiko Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Isi detail potensi risiko, estimasi probabilitas & dampak, serta rencana tindakan.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRisk} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Risiko
                            </label>
                            <Input
                                placeholder="misal: Keterlambatan Integrasi Payment Gateway Pihak Ketiga"
                                value={riskTitle}
                                onChange={(e) => setRiskTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Kategori Domain
                                </label>
                                <Select value={riskCategory} onValueChange={setRiskCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Teknis & Arsitektur</SelectItem>
                                        <SelectItem value="schedule">Jadwal & Keterlambatan</SelectItem>
                                        <SelectItem value="budget">Anggaran & Finansial</SelectItem>
                                        <SelectItem value="resource">Sumber Daya & SDM</SelectItem>
                                        <SelectItem value="security">Keamanan & Data</SelectItem>
                                        <SelectItem value="compliance">Kepatuhan & Hukum</SelectItem>
                                        <SelectItem value="external">Ketergantungan Eksternal</SelectItem>
                                        <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Status Risiko
                                </label>
                                <Select value={riskStatus} onValueChange={setRiskStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Terbuka (Open)</SelectItem>
                                        <SelectItem value="mitigating">Sedang Dimitigasi</SelectItem>
                                        <SelectItem value="accepted">Diterima (Accepted)</SelectItem>
                                        <SelectItem value="transferred">Dialihkan (Transferred)</SelectItem>
                                        <SelectItem value="avoided">Dihindari (Avoided)</SelectItem>
                                        <SelectItem value="closed">Ditutup (Closed)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Probability & Impact Selectors */}
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Probabilitas (1-5)
                                </label>
                                <Select
                                    value={riskProbability.toString()}
                                    onValueChange={(v) => setRiskProbability(Number(v))}
                                >
                                    <SelectTrigger className="h-9 text-xs bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Sangat Jarang (10%)</SelectItem>
                                        <SelectItem value="2">2 - Rendah (30%)</SelectItem>
                                        <SelectItem value="3">3 - Sedang (50%)</SelectItem>
                                        <SelectItem value="4">4 - Tinggi (70%)</SelectItem>
                                        <SelectItem value="5">5 - Hampir Pasti (90%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Dampak (1-5)
                                </label>
                                <Select
                                    value={riskImpact.toString()}
                                    onValueChange={(v) => setRiskImpact(Number(v))}
                                >
                                    <SelectTrigger className="h-9 text-xs bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Sangat Rendah (Negligible)</SelectItem>
                                        <SelectItem value="2">2 - Rendah (Minor)</SelectItem>
                                        <SelectItem value="3">3 - Sedang (Moderate)</SelectItem>
                                        <SelectItem value="4">4 - Tinggi (Major)</SelectItem>
                                        <SelectItem value="5">5 - Bencana (Catastrophic)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Strategi Mitigasi Pencegahan
                            </label>
                            <textarea
                                value={mitigationStrategy}
                                onChange={(e) => setMitigationStrategy(e.target.value)}
                                placeholder="Langkah-langkah aktif untuk mengurangi kemungkinan terjadinya risiko..."
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs min-h-[60px] text-foreground"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Rencana Kontingensi Darurat (Opsional)
                            </label>
                            <textarea
                                value={contingencyPlan}
                                onChange={(e) => setContingencyPlan(e.target.value)}
                                placeholder="Rencana aksi darurat jika risiko benar-benar terjadi..."
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs min-h-[60px] text-foreground"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    PIC Penanggung Jawab (Owner)
                                </label>
                                <Select value={ownerId} onValueChange={setOwnerId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih PIC..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Belum Ditentukan</SelectItem>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Penyelesaian
                                </label>
                                <Input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRiskModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingRisk}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingRisk ? 'Menyimpan...' : 'Simpan Risiko'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Catat Aksi Mitigasi */}
            <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            <span>Catat Tindakan Mitigasi</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Perbarui riwayat aksi mitigasi pada risiko: <strong>{targetRiskForAction?.title}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveActionLog} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tindakan yang Dilakukan
                            </label>
                            <textarea
                                value={actionTakenText}
                                onChange={(e) => setActionTakenText(e.target.value)}
                                placeholder="misal: Telah menambahkan automated retry mechanism dan fallback cluster..."
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs min-h-[80px] text-foreground"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Status Baru Setelah Aksi
                            </label>
                            <Select value={statusAfterAction} onValueChange={setStatusAfterAction}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mitigating">Sedang Dimitigasi</SelectItem>
                                    <SelectItem value="accepted">Diterima (Accepted)</SelectItem>
                                    <SelectItem value="avoided">Dihindari (Avoided)</SelectItem>
                                    <SelectItem value="closed">Ditutup / Selesai (Closed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Probabilitas Sisa (1-5)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={residualProb}
                                    onChange={(e) => setResidualProb(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    placeholder="Opsional"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Dampak Sisa (1-5)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={residualImp}
                                    onChange={(e) => setResidualImp(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    placeholder="Opsional"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setActionModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingAction}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingAction ? 'Menyimpan...' : 'Simpan Aksi Mitigasi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
