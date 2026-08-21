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
    Award,
    TrendingUp,
    ShieldCheck,
    Target,
    Zap,
    DollarSign,
    Activity,
    Lock,
    Plus,
    Presentation,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    Flame,
    Printer,
    FileText,
    Trash2,
    Edit3,
    Check,
    Globe,
    Server,
    Sparkles,
    BarChart3,
} from 'lucide-react';

interface OkrItem {
    objective: string;
    target: string;
    progress: number;
    status: 'exceeded' | 'on_track' | 'at_risk';
}

interface BriefingItem {
    id: string;
    title: string;
    period: string;
    executive_summary: string;
    strategic_pillars: Record<string, string>;
    quarterly_okrs: OkrItem[];
    status: 'draft' | 'finalized' | 'presented';
    created_by_name: string;
    presented_at_formatted: string | null;
    created_at_formatted: string;
}

interface PillarData {
    name: string;
    score: number;
    avg_pr_ttfr_hours?: number;
    quarterly_features?: number;
    shipped_releases?: number;
    sprint_completion_rate?: number;
    monthly_cloud_spend_usd?: number;
    burn_runway_months?: number;
    cost_per_dau_usd?: number;
    budget_health?: string;
    uptime_percentage?: number;
    mtta_minutes?: number;
    mttr_minutes?: number;
    p1_outages_count?: number;
    privacy_compliance_score?: number;
    data_residency_region?: string;
    open_critical_cves?: number;
    encryption_status?: string;
    status: string;
}

interface Metrics {
    overall_org_health_score: number;
    quarterly_okr_progress: number;
    cloud_runway_months: number;
    system_uptime_sla: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    pillars: Record<string, PillarData>;
    briefings: BriefingItem[];
    selectedPeriod: string | null;
}

export default function ExecutiveBoardroomPage({
    organization,
    metrics,
    pillars,
    briefings,
    selectedPeriod,
}: Props) {
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal: Create / Edit Briefing
    const [briefingModalOpen, setBriefingModalOpen] = useState(false);
    const [editingBriefingId, setEditingBriefingId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formPeriod, setFormPeriod] = useState('Q3 2026');
    const [formExecutiveSummary, setFormExecutiveSummary] = useState('');
    const [isSavingBriefing, setIsSavingBriefing] = useState(false);

    // Modal: Interactive Fullscreen Presentation Slide Deck
    const [deckModalOpen, setDeckModalOpen] = useState(false);
    const [activeDeckBriefing, setActiveDeckBriefing] = useState<BriefingItem | null>(briefings[0] || null);
    const [currentSlide, setCurrentSlide] = useState(0);

    const handlePeriodChange = (val: string) => {
        if (val === 'all') {
            router.get('/organization/reports/boardroom');
        } else {
            router.get(`/organization/reports/boardroom?period=${val}`);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingBriefingId(null);
        setFormTitle(`Executive Strategy & Velocity Deck - ${selectedPeriod || 'Q3 2026'}`);
        setFormPeriod(selectedPeriod || 'Q3 2026');
        setFormExecutiveSummary(
            'Laporan kinerja eksekutif mengonsolidasikan efisiensi engineering (SLA Review PR < 3 jam), optimalisasi FinOps dengan runway 28 bulan, serta uptime sistem 99.98% tanpa insiden P1.'
        );
        setBriefingModalOpen(true);
    };

    const handleOpenEditModal = (briefing: BriefingItem) => {
        setEditingBriefingId(briefing.id);
        setFormTitle(briefing.title);
        setFormPeriod(briefing.period);
        setFormExecutiveSummary(briefing.executive_summary);
        setBriefingModalOpen(true);
    };

    const handleSaveBriefing = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingBriefing(true);

        const url = editingBriefingId
            ? `/organization/reports/boardroom/${editingBriefingId}`
            : '/organization/reports/boardroom';
        const method = editingBriefingId ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: formTitle,
                period: formPeriod,
                executive_summary: formExecutiveSummary,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingBriefing(false);
                setBriefingModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingBriefing(false));
    };

    const handleFinalizeBriefing = (briefing: BriefingItem) => {
        setActionLoadingId(briefing.id);
        fetch(`/organization/reports/boardroom/${briefing.id}/finalize`, {
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

    const handleDeleteBriefing = (briefing: BriefingItem) => {
        if (!confirm(`Hapus briefing "${briefing.title}"?`)) return;

        fetch(`/organization/reports/boardroom/${briefing.id}`, {
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

    const handleOpenDeck = (briefing: BriefingItem) => {
        setActiveDeckBriefing(briefing);
        setCurrentSlide(0);
        setDeckModalOpen(true);
    };

    const totalSlides = 5;

    return (
        <AppLayout>
            <Head title="Live Executive KPI Boardroom & Investor Pitch Export Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Executive KPI Boardroom &amp; Investor Pitch Studio
                                </h1>
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                    C-Level Cockpit
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Agregasi intelijen eksekutif lintas pilar (Velocity, FinOps, SRE, Privacy) dan pembuat slide deck presentasi dewan direksi
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Select
                            value={selectedPeriod || 'all'}
                            onValueChange={handlePeriodChange}
                        >
                            <SelectTrigger className="h-9 text-xs w-36 font-mono font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Periode</SelectItem>
                                <SelectItem value="Q3 2026">Q3 2026 (Aktif)</SelectItem>
                                <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                                <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                            </SelectContent>
                        </Select>

                        {briefings.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDeck(briefings[0])}
                                className="h-9 text-xs gap-1.5 font-semibold"
                            >
                                <Presentation className="h-3.5 w-3.5 text-amber-600" />
                                <span>Buka Slide Deck</span>
                            </Button>
                        )}

                        <Button
                            size="sm"
                            onClick={handleOpenCreateModal}
                            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Buat Executive Briefing</span>
                        </Button>
                    </div>
                </div>

                {/* Top Executive Health Metrics Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Overall Org Health Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Kesehatan Organisasi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.overall_org_health_score}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                Elite Tier
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Agregasi lintas 4 pilar operasional
                        </div>
                    </div>

                    {/* Quarterly OKR Progress */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Pencapaian Strategic OKR</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Target className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.quarterly_okr_progress}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                On Track
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            4 Inisiatif strategis kuartal berjalan
                        </div>
                    </div>

                    {/* Cloud Burn Runway */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Proyeksi FinOps Runway</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.cloud_runway_months}
                            </span>
                            <span className="text-xs text-muted-foreground">Bulan</span>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                                Sustainable
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Biaya unit economics $0.04/DAU
                        </div>
                    </div>

                    {/* System Uptime SLA */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Core API Uptime SLA</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.system_uptime_sla}%
                            </span>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                0 P1 Outage
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            90 Hari tanpa insiden mayor
                        </div>
                    </div>
                </div>

                {/* 4 Core Executive Pillars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pillar 1: Velocity */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                    <Zap className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">
                                        Product &amp; Engineering Velocity
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">Kinerja throughput tim pengembang</span>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-blue-600 font-mono">
                                {pillars.velocity.score}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Rata-rata TTFR PR Review</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.velocity.avg_pr_ttfr_hours} Jam</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Fitur Terkirim (Q3)</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.velocity.quarterly_features} Fitur</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Rilis Terbit</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.velocity.shipped_releases} Rilis SemVer</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Tingkat Penyelesaian Sprint</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.velocity.sprint_completion_rate}%</strong>
                            </div>
                        </div>
                    </div>

                    {/* Pillar 2: FinOps */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">
                                        FinOps &amp; Cloud Unit Economics
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">Efisiensi biaya dan runway kas</span>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-emerald-600 font-mono">
                                {pillars.finops.score}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Biaya Cloud Bulanan</span>
                                <strong className="text-foreground font-mono text-sm">${pillars.finops.monthly_cloud_spend_usd?.toLocaleString()}</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Biaya per DAU</span>
                                <strong className="text-foreground font-mono text-sm">${pillars.finops.cost_per_dau_usd} / user</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Proyeksi Runway</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.finops.burn_runway_months} Bulan</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Status Anggaran</span>
                                <strong className="text-emerald-600 font-mono text-sm">Under Budget</strong>
                            </div>
                        </div>
                    </div>

                    {/* Pillar 3: SRE Reliability */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">
                                        SRE Reliability &amp; Incident Defense
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">Ketahanan sistem dan kecepatan respon SRE</span>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-purple-600 font-mono">
                                {pillars.reliability.score}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Uptime SLA Inti</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.reliability.uptime_percentage}%</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Mean Time to Acknowledge</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.reliability.mtta_minutes} Menit</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Mean Time to Recovery</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.reliability.mttr_minutes} Menit</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Insiden Kritis P1</span>
                                <strong className="text-emerald-600 font-mono text-sm">0 Insiden</strong>
                            </div>
                        </div>
                    </div>

                    {/* Pillar 4: Governance & Privacy */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">
                                        Governance, Security &amp; Data Privacy
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">Kepatuhan UU PDP &amp; integritas enkripsi</span>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-amber-600 font-mono">
                                {pillars.governance.score}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Skor Kepatuhan PDP / GDPR</span>
                                <strong className="text-foreground font-mono text-sm">{pillars.governance.privacy_compliance_score}%</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Wilayah Penyimpanan Data</span>
                                <strong className="text-foreground font-mono text-xs truncate block">{pillars.governance.data_residency_region}</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Kerentanan Kritis SBOM</span>
                                <strong className="text-emerald-600 font-mono text-sm">0 Critical CVEs</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                <span className="text-muted-foreground block text-[10px]">Status Enkripsi At-Rest</span>
                                <strong className="text-foreground font-mono text-xs">{pillars.governance.encryption_status}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strategic OKRs & Milestones Radar */}
                {briefings.length > 0 && briefings[0].quarterly_okrs.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <Target className="h-4 w-4 text-emerald-600" />
                                    <span>Radar Pencapaian Strategic OKR &amp; Inisiatif Kuartal</span>
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Pelacak target objektif strategis C-Level untuk periode {briefings[0].period}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {briefings[0].quarterly_okrs.map((okr, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-foreground">{okr.objective}</span>
                                        <Badge
                                            className={`text-[9px] font-mono capitalize ${
                                                okr.status === 'exceeded'
                                                    ? 'bg-emerald-600 text-white'
                                                    : okr.status === 'at_risk'
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-blue-600 text-white'
                                            }`}
                                        >
                                            {okr.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                okr.progress >= 95 ? 'bg-emerald-600' : 'bg-blue-600'
                                            }`}
                                            style={{ width: `${Math.min(100, okr.progress)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                        <span>Target: {okr.target}</span>
                                        <strong className="text-foreground">{okr.progress}% Selesai</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Executive Briefings Catalog Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-amber-600" />
                                <span>Katalog Dokumen Briefing &amp; Slide Deck Rapat Direksi</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Kumpulan presentasi eksekutif siap pakai untuk pertemuan dewan komisaris dan pembaruan investor
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3">Judul Briefing</th>
                                    <th className="p-3">Periode</th>
                                    <th className="p-3">Ringkasan Eksekutif</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Pembuat</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {briefings.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Belum ada dokumen briefing yang dibuat.
                                        </td>
                                    </tr>
                                ) : (
                                    briefings.map((briefing) => (
                                        <tr key={briefing.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3 font-bold text-foreground max-w-[200px] truncate">
                                                {briefing.title}
                                            </td>

                                            <td className="p-3 font-mono font-semibold text-amber-600">
                                                {briefing.period}
                                            </td>

                                            <td className="p-3 text-muted-foreground max-w-sm truncate">
                                                {briefing.executive_summary}
                                            </td>

                                            <td className="p-3">
                                                <Badge
                                                    className={`text-[9px] font-mono capitalize ${
                                                        briefing.status === 'finalized'
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-amber-600 text-white'
                                                    }`}
                                                >
                                                    {briefing.status}
                                                </Badge>
                                            </td>

                                            <td className="p-3 text-muted-foreground">
                                                {briefing.created_by_name}
                                            </td>

                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenDeck(briefing)}
                                                        className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                                                    >
                                                        <Presentation className="h-2.5 w-2.5" />
                                                        <span>Slide Deck</span>
                                                    </Button>

                                                    {briefing.status !== 'finalized' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={actionLoadingId === briefing.id}
                                                            onClick={() => handleFinalizeBriefing(briefing)}
                                                            className="h-6 text-[10px] px-2 text-emerald-600 font-semibold"
                                                        >
                                                            <Check className="h-2.5 w-2.5" />
                                                            <span>Finalisasi</span>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEditModal(briefing)}
                                                        className="h-6 w-6 p-0 text-muted-foreground"
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteBriefing(briefing)}
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

            {/* Modal: Tambah / Edit Executive Briefing */}
            <Dialog open={briefingModalOpen} onOpenChange={setBriefingModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <Award className="h-5 w-5" />
                            <span>{editingBriefingId ? 'Perbarui Briefing Eksekutif' : 'Buat Executive Briefing Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Susun ringkasan eksekutif untuk presentasi dewan direksi dan pembaruan investor.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveBriefing} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Judul Briefing Deck *
                            </label>
                            <Input
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Periode / Kuartal *
                            </label>
                            <Input
                                value={formPeriod}
                                onChange={(e) => setFormPeriod(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Ringkasan Eksekutif (Executive Summary) *
                            </label>
                            <Textarea
                                value={formExecutiveSummary}
                                onChange={(e) => setFormExecutiveSummary(e.target.value)}
                                className="text-xs min-h-[100px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBriefingModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingBriefing}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                            >
                                {isSavingBriefing ? 'Menyimpan...' : 'Simpan Briefing'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Interactive Full-Screen Presentation Slide Deck */}
            <Dialog open={deckModalOpen} onOpenChange={setDeckModalOpen}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-card border-border shadow-2xl">
                    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Presentation className="h-5 w-5" />
                            <div>
                                <h2 className="font-bold text-sm">{activeDeckBriefing?.title}</h2>
                                <span className="text-[10px] text-amber-200 font-mono">
                                    {activeDeckBriefing?.period} &bull; Slide {currentSlide + 1} of {totalSlides}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => window.print()}
                                className="h-7 text-xs gap-1 font-semibold"
                            >
                                <Printer className="h-3 w-3" />
                                <span>Cetak Deck</span>
                            </Button>
                        </div>
                    </div>

                    {/* Slide Content Area */}
                    <div className="p-8 min-h-[400px] flex flex-col justify-between bg-card text-foreground">
                        {/* Slide 1: Executive Overview */}
                        {currentSlide === 0 && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                        Executive Briefing &bull; Slide 1
                                    </Badge>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                                        Ringkasan Strategis &amp; Kesehatan Organisasi
                                    </h3>
                                </div>

                                <div className="p-5 rounded-2xl bg-muted/40 border border-border leading-relaxed text-sm text-foreground">
                                    {activeDeckBriefing?.executive_summary}
                                </div>

                                <div className="grid grid-cols-4 gap-3 pt-2">
                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                                        <span className="text-xs text-muted-foreground block">Health Score</span>
                                        <strong className="text-xl font-bold text-amber-600 font-mono">96.2 / 100</strong>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                                        <span className="text-xs text-muted-foreground block">OKR Progress</span>
                                        <strong className="text-xl font-bold text-emerald-600 font-mono">88.5%</strong>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                                        <span className="text-xs text-muted-foreground block">Runway Kas</span>
                                        <strong className="text-xl font-bold text-blue-600 font-mono">28 Bulan</strong>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
                                        <span className="text-xs text-muted-foreground block">Core Uptime SLA</span>
                                        <strong className="text-xl font-bold text-purple-600 font-mono">99.98%</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slide 2: Engineering & Product Velocity */}
                        {currentSlide === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs font-mono">
                                        Pillar 1 &bull; Engineering Velocity
                                    </Badge>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                                        Akselerasi Pengiriman &amp; Produktivitas Tim
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
                                        <span className="text-xs text-muted-foreground">Waktu Respon Review PR (TTFR)</span>
                                        <div className="text-3xl font-bold text-blue-600 font-mono">2.4 Jam</div>
                                        <span className="text-[11px] text-emerald-600 font-medium">&darr; 42% lebih cepat dari kuartal sebelumnya</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
                                        <span className="text-xs text-muted-foreground">Total Fitur Terkirim ke Produksi</span>
                                        <div className="text-3xl font-bold text-foreground font-mono">48 Fitur</div>
                                        <span className="text-[11px] text-blue-600 font-medium">14 Rilis SemVer Terbit</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground">
                                    {activeDeckBriefing?.strategic_pillars?.velocity ?? 'Engineering throughput meningkat pesat dengan penyeimbangan beban review PR.'}
                                </div>
                            </div>
                        )}

                        {/* Slide 3: FinOps & Cloud Unit Economics */}
                        {currentSlide === 2 && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                                        Pillar 2 &bull; FinOps &amp; Unit Economics
                                    </Badge>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                                        Efisiensi Biaya Cloud &amp; Runway Finansial
                                    </h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-center">
                                        <span className="text-xs text-muted-foreground">Pengeluaran Bulanan</span>
                                        <div className="text-2xl font-bold text-foreground font-mono">$12,450</div>
                                        <span className="text-[10px] text-emerald-600 font-semibold">Under Budget</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-center">
                                        <span className="text-xs text-muted-foreground">Biaya per Pengguna Aktif</span>
                                        <div className="text-2xl font-bold text-emerald-600 font-mono">$0.04</div>
                                        <span className="text-[10px] text-muted-foreground">Target &lt; $0.05</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-center">
                                        <span className="text-xs text-muted-foreground">Proyeksi Runway Kas</span>
                                        <div className="text-2xl font-bold text-blue-600 font-mono">28 Bulan</div>
                                        <span className="text-[10px] text-muted-foreground">Modal Berkelanjutan</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground">
                                    {activeDeckBriefing?.strategic_pillars?.finops ?? 'Stabilitas biaya cloud terjaga dengan efisiensi alokasi multi-tenant.'}
                                </div>
                            </div>
                        )}

                        {/* Slide 4: SRE Reliability & Governance */}
                        {currentSlide === 3 && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-mono">
                                        Pillars 3 &amp; 4 &bull; SRE &amp; Security Governance
                                    </Badge>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                                        Keandalan Sistem &amp; Kepatuhan Regulasi Data
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <Activity className="h-4 w-4 text-purple-600" />
                                            <span>SRE Metrics</span>
                                        </h4>
                                        <div className="text-xs space-y-1 font-mono text-muted-foreground">
                                            <div>Core Uptime: <strong className="text-emerald-600">99.98%</strong></div>
                                            <div>MTTA: <strong className="text-foreground">3.8 Menit</strong></div>
                                            <div>MTTR: <strong className="text-foreground">38 Menit</strong></div>
                                            <div>Insiden Mayor P1: <strong className="text-emerald-600">0 Kasus</strong></div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                            <Lock className="h-4 w-4 text-amber-600" />
                                            <span>Governance &amp; Privacy</span>
                                        </h4>
                                        <div className="text-xs space-y-1 font-mono text-muted-foreground">
                                            <div>Kepatuhan UU PDP: <strong className="text-emerald-600">98.4% Compliant</strong></div>
                                            <div>Penyimpanan Fisik: <strong className="text-foreground">Jakarta (ap-southeast-3)</strong></div>
                                            <div>Enkripsi At-Rest: <strong className="text-foreground">AES-256 KMS Hardware</strong></div>
                                            <div>Kerentanan SBOM: <strong className="text-emerald-600">0 Critical CVEs</strong></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slide 5: Strategic OKRs & Next Milestones */}
                        {currentSlide === 4 && (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                        Milestones &bull; Strategic OKRs
                                    </Badge>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                                        Pencapaian Objektif &amp; Rencana Strategis
                                    </h3>
                                </div>

                                <div className="space-y-2.5">
                                    {activeDeckBriefing?.quarterly_okrs.map((okr, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <strong className="text-foreground">{okr.objective}</strong>
                                                <span className="text-[11px] text-muted-foreground block font-mono">Target: {okr.target}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold font-mono text-emerald-600">{okr.progress}%</span>
                                                <Badge className="text-[9px] font-mono bg-emerald-600 text-white">
                                                    {okr.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Slide Navigation Controls */}
                        <div className="flex items-center justify-between pt-6 border-t border-border mt-4">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={currentSlide === 0}
                                onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                                className="text-xs gap-1 font-semibold"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Slide Sebelumnya</span>
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalSlides }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                                            currentSlide === idx ? 'bg-amber-600 w-6' : 'bg-muted-foreground/30'
                                        }`}
                                    />
                                ))}
                            </div>

                            <Button
                                size="sm"
                                disabled={currentSlide === totalSlides - 1}
                                onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
                                className="text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                                <span>Slide Selanjutnya</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
