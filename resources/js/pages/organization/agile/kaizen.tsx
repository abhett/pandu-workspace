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
    CheckCircle2,
    Clock,
    Plus,
    Search,
    ChevronRight,
    Zap,
    Target,
    Layers,
    Users,
    Cpu,
    ArrowUpRight,
    Sliders,
    Sparkles,
    Trash2,
    Edit,
    Check,
    Star,
    Flame,
    RefreshCw,
    Shield,
} from 'lucide-react';

interface InitiativeItem {
    id: string;
    project_id: string;
    project_name: string;
    project_key: string;
    pillar: 'engineering_quality' | 'process_agility' | 'team_collaboration' | 'developer_experience';
    title: string;
    problem_statement: string;
    action_plan: string;
    expected_impact: string | null;
    measured_outcome: string | null;
    status: 'proposed' | 'in_progress' | 'implemented' | 'verified_effective' | 'abandoned';
    impact_score: number;
    due_date_formatted: string | null;
    verified_at_formatted: string | null;
    owner: {
        id: number;
        name: string;
        email: string;
    } | null;
    source_sprint_name: string | null;
    target_sprint_name: string | null;
    created_at_formatted: string;
}

interface PillarStat {
    key: string;
    label: string;
    total: number;
    completed: number;
    rate: number;
}

interface Metrics {
    total_initiatives: number;
    implementation_rate_pct: number;
    verified_effective_count: number;
    avg_impact_score: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    pillarStats: PillarStat[];
    initiatives: InitiativeItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    sprints: Array<{ id: string; name: string; project_id: string; status: string }>;
    members: Array<{ id: number; name: string; email: string }>;
    selectedProjectId: string | null;
}

export default function KaizenImprovementPage({
    organization,
    metrics,
    pillarStats,
    initiatives,
    projects,
    sprints,
    members,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [pillarFilter, setPillarFilter] = useState('all');

    // Create / Edit Modal
    const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
    const [editingInitiative, setEditingInitiative] = useState<InitiativeItem | null>(null);
    const [formProjectId, setFormProjectId] = useState<string>(projects[0]?.id || '');
    const [formTitle, setFormTitle] = useState('');
    const [formPillar, setFormPillar] = useState<'engineering_quality' | 'process_agility' | 'team_collaboration' | 'developer_experience'>('engineering_quality');
    const [formProblem, setFormProblem] = useState('');
    const [formActionPlan, setFormActionPlan] = useState('');
    const [formExpectedImpact, setFormExpectedImpact] = useState('');
    const [formOwnerId, setFormOwnerId] = useState<string>('none');
    const [formTargetSprintId, setFormTargetSprintId] = useState<string>('none');
    const [formDueDate, setFormDueDate] = useState('');
    const [formStatus, setFormStatus] = useState<string>('in_progress');
    const [isSaving, setIsSaving] = useState(false);

    // Verify Impact Modal
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [selectedInitiativeForVerify, setSelectedInitiativeForVerify] = useState<InitiativeItem | null>(null);
    const [impactScore, setImpactScore] = useState(90);
    const [measuredOutcome, setMeasuredOutcome] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSelectProject = (projId: string) => {
        const params = new URLSearchParams();
        if (projId !== 'all') params.append('project_id', projId);
        router.get(`/organization/agile/kaizen?${params.toString()}`);
    };

    const openCreateModal = () => {
        setEditingInitiative(null);
        setFormProjectId(projects[0]?.id || '');
        setFormTitle('');
        setFormPillar('engineering_quality');
        setFormProblem('');
        setFormActionPlan('');
        setFormExpectedImpact('');
        setFormOwnerId('none');
        setFormTargetSprintId('none');
        setFormDueDate('');
        setFormStatus('in_progress');
        setInitiativeModalOpen(true);
    };

    const openEditModal = (init: InitiativeItem) => {
        setEditingInitiative(init);
        setFormProjectId(init.project_id);
        setFormTitle(init.title);
        setFormPillar(init.pillar);
        setFormProblem(init.problem_statement);
        setFormActionPlan(init.action_plan);
        setFormExpectedImpact(init.expected_impact || '');
        setFormOwnerId(init.owner?.id ? init.owner.id.toString() : 'none');
        setFormTargetSprintId('none');
        setFormDueDate('');
        setFormStatus(init.status);
        setInitiativeModalOpen(true);
    };

    const handleSaveInitiative = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const url = editingInitiative
            ? `/organization/agile/kaizen/initiatives/${editingInitiative.id}`
            : '/organization/agile/kaizen/initiatives';

        const method = editingInitiative ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: formProjectId,
                title: formTitle,
                pillar: formPillar,
                problem_statement: formProblem,
                action_plan: formActionPlan,
                expected_impact: formExpectedImpact || null,
                owner_id: formOwnerId === 'none' ? null : Number(formOwnerId),
                target_sprint_id: formTargetSprintId === 'none' ? null : formTargetSprintId,
                due_date: formDueDate || null,
                status: formStatus,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setInitiativeModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const openVerifyModal = (init: InitiativeItem) => {
        setSelectedInitiativeForVerify(init);
        setImpactScore(90);
        setMeasuredOutcome('Kecepatan tim meningkat dan tidak ada temuan blocker berulang pada sprint ini.');
        setVerifyModalOpen(true);
    };

    const handleExecuteVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInitiativeForVerify) return;
        setIsVerifying(true);

        fetch(`/organization/agile/kaizen/initiatives/${selectedInitiativeForVerify.id}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                impact_score: Number(impactScore),
                measured_outcome: measuredOutcome,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsVerifying(false);
                setVerifyModalOpen(false);
                router.reload();
            })
            .catch(() => setIsVerifying(false));
    };

    const handleDeleteInitiative = (init: InitiativeItem) => {
        if (!confirm(`Hapus inisiatif Kaizen "${init.title}"?`)) return;

        fetch(`/organization/agile/kaizen/initiatives/${init.id}`, {
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

    const renderPillarBadge = (pillar: string) => {
        switch (pillar) {
            case 'engineering_quality':
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">Engineering Quality</Badge>;
            case 'process_agility':
                return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">Process Agility</Badge>;
            case 'team_collaboration':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Team Collaboration</Badge>;
            default:
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Developer Experience</Badge>;
        }
    };

    const filteredInitiatives = initiatives.filter((init) => {
        const matchesSearch =
            init.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            init.problem_statement.toLowerCase().includes(searchTerm.toLowerCase()) ||
            init.action_plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (init.owner?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesPillar = pillarFilter === 'all' || init.pillar === pillarFilter;
        return matchesSearch && matchesPillar;
    });

    const columns: Array<{ status: 'proposed' | 'in_progress' | 'implemented' | 'verified_effective'; label: string; color: string }> = [
        { status: 'proposed', label: 'Diusulkan (Proposed)', color: 'border-slate-500/30' },
        { status: 'in_progress', label: 'Sedang Dijalankan (In Progress)', color: 'border-blue-500/30' },
        { status: 'implemented', label: 'Selesai Diterapkan (Implemented)', color: 'border-purple-500/30' },
        { status: 'verified_effective', label: 'Dampak Terverifikasi (Verified)', color: 'border-emerald-500/30' },
    ];

    return (
        <AppLayout>
            <Head title="AI-Driven Sprint Retrospective Action Tracker & Kaizen Improvement Engine" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Sprint Retrospective Action Tracker & Kaizen Engine
                                </h1>
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-mono">
                                    Continuous Improvement
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pelacakan komitmen perbaikan berkelanjutan tim dari hasil retrospektif sprint dan verifikasi dampak produktivitas
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
                            onClick={openCreateModal}
                            className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Inisiatif Kaizen Baru</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Implementation Rate */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Implementasi Kaizen</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.implementation_rate_pct}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Agile Target
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dari seluruh komitmen retrospektif tim
                        </div>
                    </div>

                    {/* Verified Effective */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Terverifikasi Efektif</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.verified_effective_count}
                            </span>
                            <span className="text-xs text-muted-foreground">Inisiatif Selesai</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Dengan bukti metrik perbaikan nyata
                        </div>
                    </div>

                    {/* Avg Impact Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Skor Dampak</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Star className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_impact_score}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Efektivitas pencegahan kendala berulang
                        </div>
                    </div>

                    {/* Total Initiatives */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Inisiatif Kaizen</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Layers className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_initiatives}
                            </span>
                            <span className="text-xs text-muted-foreground">Tindakan</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Lintas 4 pilar kelincahan tim
                        </div>
                    </div>
                </div>

                {/* 4 Pillars Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pillarStats.map((p) => (
                        <div key={p.key} className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground truncate">{p.label}</span>
                                <span className="text-xs font-mono font-semibold text-foreground">{p.rate}%</span>
                            </div>
                            <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-amber-500 h-full rounded-full transition-all"
                                    style={{ width: `${p.rate}%` }}
                                />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {p.completed} dari {p.total} inisiatif selesai
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter & Search Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari inisiatif Kaizen, kendala, atau PIC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <Select value={pillarFilter} onValueChange={setPillarFilter}>
                        <SelectTrigger className="h-8 text-xs w-48 font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Pilar Kaizen</SelectItem>
                            <SelectItem value="engineering_quality">🔵 Engineering Quality</SelectItem>
                            <SelectItem value="process_agility">🟣 Process Agility</SelectItem>
                            <SelectItem value="team_collaboration">🟢 Team Collaboration</SelectItem>
                            <SelectItem value="developer_experience">🟠 Developer Experience</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Interactive Kaizen Action Board (Kanban Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {columns.map((col) => {
                        const colInitiatives = filteredInitiatives.filter((i) => i.status === col.status);
                        return (
                            <div
                                key={col.status}
                                className="rounded-2xl border border-border bg-card/60 p-4 space-y-3 flex flex-col justify-start"
                            >
                                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                                    <h3 className="font-bold text-xs text-foreground truncate">
                                        {col.label}
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {colInitiatives.length}
                                    </Badge>
                                </div>

                                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                                    {colInitiatives.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                                            Tidak ada inisiatif.
                                        </div>
                                    ) : (
                                        colInitiatives.map((init) => (
                                            <div
                                                key={init.id}
                                                className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2 hover:border-border/80 transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-1.5">
                                                    {renderPillarBadge(init.pillar)}
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {init.project_key}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-xs text-foreground leading-snug">
                                                    {init.title}
                                                </h4>

                                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                    <span className="font-semibold text-foreground">Kendala:</span>{' '}
                                                    {init.problem_statement}
                                                </p>

                                                <div className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg border border-border/40">
                                                    <span className="font-semibold text-foreground">Aksi:</span>{' '}
                                                    {init.action_plan}
                                                </div>

                                                {init.status === 'verified_effective' && (
                                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] space-y-1">
                                                        <div className="flex items-center justify-between font-bold">
                                                            <span>Dampak Terverifikasi:</span>
                                                            <span className="font-mono">Skor {init.impact_score}/100</span>
                                                        </div>
                                                        <p className="text-[10px] leading-tight">
                                                            {init.measured_outcome}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                                                    <span>PIC: {init.owner?.name ?? 'Belum Ditugaskan'}</span>
                                                    <div className="flex items-center gap-1">
                                                        {init.status !== 'verified_effective' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => openVerifyModal(init)}
                                                                className="h-5 text-[10px] px-1.5 gap-0.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                title="Verifikasi dampak inisiatif"
                                                            >
                                                                <Check className="h-2.5 w-2.5" />
                                                                <span>Verifikasi</span>
                                                            </Button>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditModal(init)}
                                                            className="h-5 w-5 p-0"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteInitiative(init)}
                                                            className="h-5 w-5 p-0 text-rose-500"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal: Tambah / Edit Inisiatif Kaizen */}
            <Dialog open={initiativeModalOpen} onOpenChange={setInitiativeModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-600" />
                            <span>{editingInitiative ? 'Edit Inisiatif Kaizen' : 'Inisiatif Kaizen Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Komitmen perbaikan berkelanjutan tim dari hasil sprint retrospective.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveInitiative} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Target Proyek *
                                </label>
                                <Select value={formProjectId} onValueChange={setFormProjectId}>
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
                                    Pilar Kaizen *
                                </label>
                                <Select
                                    value={formPillar}
                                    onValueChange={(val: any) => setFormPillar(val)}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="engineering_quality">🔵 Engineering Quality</SelectItem>
                                        <SelectItem value="process_agility">🟣 Process Agility</SelectItem>
                                        <SelectItem value="team_collaboration">🟢 Team Collaboration</SelectItem>
                                        <SelectItem value="developer_experience">🟠 Developer Experience</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Inisiatif Perbaikan *
                            </label>
                            <Input
                                placeholder="cth: Otomasi Mocking Test Suite & Isolasi Database"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pernyataan Masalah (Problem Statement) *
                            </label>
                            <Textarea
                                placeholder="Jelaskan kendala atau inefisiensi yang ditemukan pada retrospective..."
                                value={formProblem}
                                onChange={(e) => setFormProblem(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Rencana Tindakan Nyata (Action Plan) *
                            </label>
                            <Textarea
                                placeholder="Langkah konkret perbaikan teknis atau proses..."
                                value={formActionPlan}
                                onChange={(e) => setFormActionPlan(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    PIC Pemilik Inisiatif (Owner)
                                </label>
                                <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Belum Ditugaskan --</SelectItem>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Status Inisiatif *
                                </label>
                                <Select value={formStatus} onValueChange={setFormStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="proposed">🟡 Proposed</SelectItem>
                                        <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                                        <SelectItem value="implemented">🟣 Implemented</SelectItem>
                                        <SelectItem value="verified_effective">🟢 Verified Effective</SelectItem>
                                        <SelectItem value="abandoned">⚪ Abandoned</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setInitiativeModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan Inisiatif'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Verifikasi Dampak Kaizen */}
            <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Verifikasi Dampak Kaizen</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedInitiativeForVerify?.title}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteVerify} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Skor Dampak Efektivitas (1 - 100) *
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={100}
                                value={impactScore}
                                onChange={(e) => setImpactScore(Number(e.target.value))}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Bukti Hasil Pengukuran Nyata (Measured Outcome) *
                            </label>
                            <Textarea
                                placeholder="cth: Kecepatan CI test turun dari 50s ke 12s, tidak ada kegagalan build pada sprint ini."
                                value={measuredOutcome}
                                onChange={(e) => setMeasuredOutcome(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setVerifyModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isVerifying}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                                {isVerifying ? 'Memproses...' : 'Verifikasi Dampak'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
