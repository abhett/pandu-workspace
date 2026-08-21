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
    Layers,
    Database,
    Network,
    Server,
    ShieldCheck,
    Layout,
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    Search,
    Edit,
    Trash2,
    ExternalLink,
    Check,
    X,
    Info,
    ArrowUpRight,
    Compass,
    Sliders,
    Sparkles,
    Shield,
    BookOpen,
} from 'lucide-react';

interface AdrItem {
    id: string;
    adr_number: number;
    adr_code: string;
    project_id: string | null;
    project_name: string | null;
    domain: 'data_architecture' | 'api_design' | 'infrastructure' | 'security_compliance' | 'frontend_architecture';
    title: string;
    status: 'proposed' | 'accepted' | 'superseded' | 'deprecated' | 'rejected';
    context_and_problem: string;
    decision_outcome: string;
    positive_consequences: string[];
    negative_consequences: string[];
    alternatives_considered: string[];
    superseded_by: {
        id: string;
        adr_code: string;
        title: string;
    } | null;
    decided_at_formatted: string | null;
    author: {
        id: number;
        name: string;
    } | null;
    created_at_formatted: string;
}

interface DomainStat {
    domain: string;
    label: string;
    total: number;
    accepted: number;
    proposed: number;
}

interface Metrics {
    total_adrs: number;
    accepted_standards: number;
    proposed_rfcs: number;
    superseded_adrs: number;
    governance_health_score: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    domainStats: DomainStat[];
    adrs: AdrItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    members: Array<{ id: number; name: string; email: string }>;
    selectedDomain: string | null;
    selectedStatus: string | null;
    selectedProjectId: string | null;
}

export default function AdrStudioPage({
    organization,
    metrics,
    domainStats,
    adrs,
    projects,
    members,
    selectedDomain,
    selectedStatus,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Create / Edit Modal
    const [adrModalOpen, setAdrModalOpen] = useState(false);
    const [editingAdr, setEditingAdr] = useState<AdrItem | null>(null);
    const [formProjectId, setFormProjectId] = useState<string>('none');
    const [formAuthorId, setFormAuthorId] = useState<string>('none');
    const [formDomain, setFormDomain] = useState<string>('data_architecture');
    const [formTitle, setFormTitle] = useState('');
    const [formStatus, setFormStatus] = useState<string>('accepted');
    const [formContext, setFormContext] = useState('');
    const [formDecision, setFormDecision] = useState('');
    const [formPositive, setFormPositive] = useState('');
    const [formNegative, setFormNegative] = useState('');
    const [formAlternatives, setFormAlternatives] = useState('');
    const [formSupersededById, setFormSupersededById] = useState<string>('none');
    const [isSaving, setIsSaving] = useState(false);

    const handleFilterChange = (domain?: string, status?: string) => {
        const params = new URLSearchParams();
        const curDomain = domain !== undefined ? domain : selectedDomain;
        const curStatus = status !== undefined ? status : selectedStatus;

        if (curDomain && curDomain !== 'all') params.append('domain', curDomain);
        if (curStatus && curStatus !== 'all') params.append('status', curStatus);

        router.get(`/organization/architecture/adr?${params.toString()}`);
    };

    const openCreateModal = () => {
        setEditingAdr(null);
        setFormProjectId('none');
        setFormAuthorId(members[0]?.id ? members[0].id.toString() : 'none');
        setFormDomain('data_architecture');
        setFormTitle('');
        setFormStatus('accepted');
        setFormContext('');
        setFormDecision('');
        setFormPositive('');
        setFormNegative('');
        setFormAlternatives('');
        setFormSupersededById('none');
        setAdrModalOpen(true);
    };

    const openEditModal = (adr: AdrItem) => {
        setEditingAdr(adr);
        setFormProjectId(adr.project_id || 'none');
        setFormAuthorId(adr.author?.id ? adr.author.id.toString() : 'none');
        setFormDomain(adr.domain);
        setFormTitle(adr.title);
        setFormStatus(adr.status);
        setFormContext(adr.context_and_problem);
        setFormDecision(adr.decision_outcome);
        setFormPositive((adr.positive_consequences || []).join('\n'));
        setFormNegative((adr.negative_consequences || []).join('\n'));
        setFormAlternatives((adr.alternatives_considered || []).join('\n'));
        setFormSupersededById(adr.superseded_by?.id || 'none');
        setAdrModalOpen(true);
    };

    const handleSaveAdr = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const url = editingAdr
            ? `/organization/architecture/adr/${editingAdr.id}`
            : '/organization/architecture/adr';

        const method = editingAdr ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: formProjectId === 'none' ? null : formProjectId,
                author_id: formAuthorId === 'none' ? null : Number(formAuthorId),
                domain: formDomain,
                title: formTitle,
                status: formStatus,
                context_and_problem: formContext,
                decision_outcome: formDecision,
                positive_consequences: formPositive,
                negative_consequences: formNegative,
                alternatives_considered: formAlternatives,
                superseded_by_id: formSupersededById === 'none' ? null : formSupersededById,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setAdrModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleDeleteAdr = (adr: AdrItem) => {
        if (!confirm(`Hapus rekaman arsitektur "${adr.adr_code}: ${adr.title}"?`)) return;

        fetch(`/organization/architecture/adr/${adr.id}`, {
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

    const renderDomainBadge = (domain: string) => {
        switch (domain) {
            case 'data_architecture':
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] gap-1">
                        <Database className="h-2.5 w-2.5" />
                        <span>Data Architecture</span>
                    </Badge>
                );
            case 'api_design':
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1">
                        <Network className="h-2.5 w-2.5" />
                        <span>API Design</span>
                    </Badge>
                );
            case 'infrastructure':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                        <Server className="h-2.5 w-2.5" />
                        <span>Cloud Infrastructure</span>
                    </Badge>
                );
            case 'security_compliance':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        <span>Security Standards</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                        <Layout className="h-2.5 w-2.5" />
                        <span>Frontend Architecture</span>
                    </Badge>
                );
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Accepted Standard</span>
                    </Badge>
                );
            case 'proposed':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>Under RFC Review</span>
                    </Badge>
                );
            case 'superseded':
                return (
                    <Badge className="bg-purple-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Superseded</span>
                    </Badge>
                );
            case 'deprecated':
                return (
                    <Badge className="bg-slate-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Deprecated</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Rejected</span>
                    </Badge>
                );
        }
    };

    const filteredAdrs = adrs.filter((adr) => {
        return (
            adr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adr.context_and_problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adr.decision_outcome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            adr.adr_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Architecture Decision Record (ADR) & Technical Governance Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                            <Compass className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Architecture Decision Records (ADR) Governance Studio
                                </h1>
                                <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-xs font-mono">
                                    MADR Standard
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Dokumentasi terstruktur keputusan arsitektur sistem, mitigasi trade-off desain, dan konsensus teknis tim rekayasa
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={openCreateModal}
                            className="h-9 text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Buat ADR Baru</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total ADRs */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Rekaman ADR</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <BookOpen className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_adrs}
                            </span>
                            <span className="text-xs text-muted-foreground">Keputusan Terdokumentasi</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Format Markdown Architectural Decision Records
                        </div>
                    </div>

                    {/* Accepted Standards */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Standar Arsitektur Aktif</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.accepted_standards}
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Accepted
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Panduan acuan implementasi kode produksi
                        </div>
                    </div>

                    {/* Proposed RFCs */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Usulan Desain (RFC)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.proposed_rfcs}
                            </span>
                            <span className="text-xs text-muted-foreground">Under Review</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Menunggu konsensus tech lead & architect
                        </div>
                    </div>

                    {/* Governance Health Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Tata Kelola Desain</span>
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                <Shield className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono">
                                {metrics.governance_health_score}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Konsistensi kepatuhan arsitektur menyeluruh
                        </div>
                    </div>
                </div>

                {/* 5 Domains Grid Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {domainStats.map((d) => (
                        <div
                            key={d.domain}
                            onClick={() => handleFilterChange(d.domain, undefined)}
                            className={`rounded-2xl border p-3.5 shadow-xs cursor-pointer transition-all ${
                                selectedDomain === d.domain
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-border bg-card hover:border-border/80'
                            }`}
                        >
                            <div className="text-xs font-bold text-foreground truncate">{d.label}</div>
                            <div className="mt-2 flex items-baseline justify-between text-xs">
                                <span className="font-mono font-bold text-foreground">{d.total} ADR</span>
                                <span className="text-[10px] text-emerald-600">{d.accepted} Aktif</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter & Search Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nomor ADR, judul keputusan, konteks, atau solusi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedDomain || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-44 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Domain</SelectItem>
                                <SelectItem value="data_architecture">💾 Data Architecture</SelectItem>
                                <SelectItem value="api_design">🔌 API Design</SelectItem>
                                <SelectItem value="infrastructure">☁️ Cloud Infrastructure</SelectItem>
                                <SelectItem value="security_compliance">🛡️ Security Standards</SelectItem>
                                <SelectItem value="frontend_architecture">🖥️ Frontend Architecture</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="accepted">🟢 Accepted</SelectItem>
                                <SelectItem value="proposed">🟡 Proposed RFC</SelectItem>
                                <SelectItem value="superseded">🟣 Superseded</SelectItem>
                                <SelectItem value="deprecated">⚪ Deprecated</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ADR Records Catalog */}
                <div className="space-y-4">
                    {filteredAdrs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                            <h3 className="font-bold text-sm text-foreground">Tidak Ada Rekaman ADR</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Belum ada keputusan arsitektur yang sesuai dengan filter pencarian.
                            </p>
                        </div>
                    ) : (
                        filteredAdrs.map((adr) => (
                            <div
                                key={adr.id}
                                className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-border/80 transition-colors"
                            >
                                {/* ADR Header */}
                                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-3">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-mono font-bold text-xs bg-muted px-2.5 py-1 rounded-lg border border-border">
                                            {adr.adr_code}
                                        </span>
                                        {renderDomainBadge(adr.domain)}
                                        <h3 className="font-bold text-sm text-foreground">
                                            {adr.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {renderStatusBadge(adr.status)}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditModal(adr)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteAdr(adr)}
                                                className="h-6 w-6 p-0 text-rose-500"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Context & Decision Outcome */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                                        <span className="font-semibold text-foreground block">
                                            Konteks & Latar Belakang Masalah:
                                        </span>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {adr.context_and_problem}
                                        </p>
                                    </div>

                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                                        <span className="font-semibold text-foreground block">
                                            Keputusan Arsitektural (Decision Outcome):
                                        </span>
                                        <p className="text-foreground leading-relaxed font-medium">
                                            {adr.decision_outcome}
                                        </p>
                                    </div>
                                </div>

                                {/* Trade-Offs & Consequences */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                                    {/* Positive Consequences */}
                                    {adr.positive_consequences.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Dampak Positif / Keuntungan:</span>
                                            </span>
                                            <ul className="space-y-1 text-muted-foreground">
                                                {adr.positive_consequences.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-1.5">
                                                        <span className="text-emerald-500 font-bold">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Negative Consequences */}
                                    {adr.negative_consequences.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                <X className="h-3.5 w-3.5" />
                                                <span>Trade-Off / Konsekuensi Negatif:</span>
                                            </span>
                                            <ul className="space-y-1 text-muted-foreground">
                                                {adr.negative_consequences.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-1.5">
                                                        <span className="text-rose-500 font-bold">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Alternatives Considered */}
                                {adr.alternatives_considered.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 text-xs flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-muted-foreground">Alternatif yang Dievaluasi:</span>
                                        {adr.alternatives_considered.map((alt, idx) => (
                                            <Badge key={idx} variant="outline" className="text-[10px]">
                                                {alt}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Metadata Footer */}
                                <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                                    <span>Penulis: {adr.author?.name ?? 'Tim Arsitek'}</span>
                                    {adr.decided_at_formatted && <span>Disetujui pada: {adr.decided_at_formatted}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal: Tambah / Edit ADR */}
            <Dialog open={adrModalOpen} onOpenChange={setAdrModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-cyan-600">
                            <Compass className="h-5 w-5" />
                            <span>{editingAdr ? `Edit ${editingAdr.adr_code}` : 'Buat Rekaman Keputusan Arsitektur (ADR)'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Dokumentasi standar MADR (Markdown Architectural Decision Records).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAdr} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Domain Arsitektur *
                                </label>
                                <Select value={formDomain} onValueChange={setFormDomain}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="data_architecture">💾 Data Architecture</SelectItem>
                                        <SelectItem value="api_design">🔌 API Design</SelectItem>
                                        <SelectItem value="infrastructure">☁️ Cloud Infrastructure</SelectItem>
                                        <SelectItem value="security_compliance">🛡️ Security Standards</SelectItem>
                                        <SelectItem value="frontend_architecture">🖥️ Frontend Architecture</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Status Konsensus *
                                </label>
                                <Select value={formStatus} onValueChange={setFormStatus}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="accepted">🟢 Accepted (Active Standard)</SelectItem>
                                        <SelectItem value="proposed">🟡 Proposed (Under RFC Review)</SelectItem>
                                        <SelectItem value="superseded">🟣 Superseded</SelectItem>
                                        <SelectItem value="deprecated">⚪ Deprecated</SelectItem>
                                        <SelectItem value="rejected">🔴 Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Keputusan Arsitektur *
                            </label>
                            <Input
                                placeholder="cth: Adopsi UUID v7 sebagai Primary Key Global Terdistribusi"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Konteks & Latar Belakang Masalah (Problem Statement) *
                            </label>
                            <Textarea
                                placeholder="Jelaskan kebutuhan teknis dan kendala yang dihadapi..."
                                value={formContext}
                                onChange={(e) => setFormContext(e.target.value)}
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Keputusan Arsitektur (Decision Outcome) *
                            </label>
                            <Textarea
                                placeholder="Jelaskan pilihan solusi arsitektural yang disepakati..."
                                value={formDecision}
                                onChange={(e) => setFormDecision(e.target.value)}
                                className="text-xs min-h-[70px]"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Dampak Positif / Keuntungan (1 per baris)
                                </label>
                                <Textarea
                                    placeholder="Keuntungan 1&#10;Keuntungan 2"
                                    value={formPositive}
                                    onChange={(e) => setFormPositive(e.target.value)}
                                    className="text-xs min-h-[60px]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Trade-Off / Risiko (1 per baris)
                                </label>
                                <Textarea
                                    placeholder="Risiko/Biaya 1&#10;Risiko/Biaya 2"
                                    value={formNegative}
                                    onChange={(e) => setFormNegative(e.target.value)}
                                    className="text-xs min-h-[60px]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Alternatif yang Dipertimbangkan (1 per baris)
                            </label>
                            <Textarea
                                placeholder="Alternatif A&#10;Alternatif B"
                                value={formAlternatives}
                                onChange={(e) => setFormAlternatives(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdrModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold"
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan ADR'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
