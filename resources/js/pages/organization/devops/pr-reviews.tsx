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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    GitPullRequest,
    GitMerge,
    CheckCircle2,
    Clock,
    Activity,
    ShieldCheck,
    Users,
    FolderGit2,
    Plus,
    Search,
    Edit,
    Trash2,
    AlertTriangle,
    Flame,
    Zap,
    GitBranch,
    FileCode,
    SlidersHorizontal,
    ArrowRightLeft,
    Check,
} from 'lucide-react';

interface PrReviewItem {
    id: string;
    pr_number: number;
    title: string;
    repository_name: string;
    branch_name: string;
    author: { id: number; name: string; email: string } | null;
    assigned_reviewer: { id: number; name: string; email: string } | null;
    additions_count: number;
    deletions_count: number;
    status: 'pending_review' | 'changes_requested' | 'approved' | 'merged';
    sla_status: 'within_sla' | 'at_risk' | 'breached';
    ttfr_hours: number | null;
    turnaround_hours: number | null;
    matched_codeowner_rule: string | null;
    project_name: string | null;
    opened_at_formatted: string;
    first_reviewed_at_formatted: string | null;
    merged_at_formatted: string | null;
}

interface ReviewerLoadItem {
    id: number;
    name: string;
    email: string;
    pending_count: number;
    completed_count: number;
    capacity: 'available' | 'normal' | 'overloaded';
}

interface CodeownerRuleItem {
    id: string;
    path_pattern: string;
    domain_name: string;
    lead_reviewer_name: string | null;
    fallback_reviewer_name: string | null;
}

interface Metrics {
    total_prs: number;
    active_prs: number;
    avg_ttfr_hours: number;
    avg_turnaround_hours: number;
    sla_compliance_pct: number;
    stale_prs_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    reviewerMatrix: ReviewerLoadItem[];
    prs: PrReviewItem[];
    codeownerRules: CodeownerRuleItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    members: Array<{ id: number; name: string; email: string }>;
    selectedStatus: string | null;
    selectedSlaStatus: string | null;
    selectedReviewerId: string | null;
}

export default function PrReviewSlaPage({
    organization,
    metrics,
    reviewerMatrix,
    prs,
    codeownerRules,
    projects,
    members,
    selectedStatus,
    selectedSlaStatus,
    selectedReviewerId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCodeowners, setShowCodeowners] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal: Create PR
    const [createPrModalOpen, setCreatePrModalOpen] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formRepo, setFormRepo] = useState('pandu-core-api');
    const [formBranch, setFormBranch] = useState('feature/');
    const [formAuthorId, setFormAuthorId] = useState<string>(members[0]?.id ? members[0].id.toString() : 'none');
    const [formReviewerId, setFormReviewerId] = useState<string>(members.length > 1 ? members[1].id.toString() : 'none');
    const [formProjectId, setFormProjectId] = useState<string>('none');
    const [formAdditions, setFormAdditions] = useState<number>(150);
    const [formDeletions, setFormDeletions] = useState<number>(30);
    const [formCodeownerRule, setFormCodeownerRule] = useState('app/Services/**');
    const [isSavingPr, setIsSavingPr] = useState(false);

    // Modal: Create Codeowner Rule
    const [codeownerModalOpen, setCodeownerModalOpen] = useState(false);
    const [formPattern, setFormPattern] = useState('');
    const [formDomainName, setFormDomainName] = useState('');
    const [formLeadId, setFormLeadId] = useState<string>(members[0]?.id ? members[0].id.toString() : 'none');
    const [formFallbackId, setFormFallbackId] = useState<string>('none');
    const [isSavingRule, setIsSavingRule] = useState(false);

    const handleFilterChange = (stat?: string, sla?: string, rev?: string) => {
        const params = new URLSearchParams();
        const curStat = stat !== undefined ? stat : selectedStatus;
        const curSla = sla !== undefined ? sla : selectedSlaStatus;
        const curRev = rev !== undefined ? rev : selectedReviewerId;

        if (curStat && curStat !== 'all') params.append('status', curStat);
        if (curSla && curSla !== 'all') params.append('sla_status', curSla);
        if (curRev && curRev !== 'all') params.append('reviewer_id', curRev);

        router.get(`/organization/devops/pr-reviews?${params.toString()}`);
    };

    const openCreatePrModal = () => {
        setFormTitle('');
        setFormRepo('pandu-core-api');
        setFormBranch('feature/speed-enhancements');
        setFormAuthorId(members[0]?.id ? members[0].id.toString() : 'none');
        setFormReviewerId(members.length > 1 ? members[1].id.toString() : 'none');
        setFormProjectId('none');
        setFormAdditions(180);
        setFormDeletions(45);
        setFormCodeownerRule('app/Services/Developer/**');
        setCreatePrModalOpen(true);
    };

    const handleSavePr = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPr(true);

        fetch('/organization/devops/pr-reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: formTitle,
                repository_name: formRepo,
                branch_name: formBranch,
                author_id: formAuthorId === 'none' ? null : Number(formAuthorId),
                assigned_reviewer_id: formReviewerId === 'none' ? null : Number(formReviewerId),
                project_id: formProjectId === 'none' ? null : formProjectId,
                additions_count: Number(formAdditions),
                deletions_count: Number(formDeletions),
                matched_codeowner_rule: formCodeownerRule,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingPr(false);
                setCreatePrModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingPr(false));
    };

    const handleReassignReviewer = (pr: PrReviewItem, newReviewerId: number) => {
        setActionLoadingId(pr.id);
        fetch(`/organization/devops/pr-reviews/${pr.id}/reassign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                reviewer_id: newReviewerId,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleUpdateStatus = (pr: PrReviewItem, newStatus: string) => {
        setActionLoadingId(pr.id);
        fetch(`/organization/devops/pr-reviews/${pr.id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                status: newStatus,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleDeletePr = (pr: PrReviewItem) => {
        if (!confirm(`Hapus rekaman PR #${pr.pr_number}?`)) return;

        fetch(`/organization/devops/pr-reviews/${pr.id}`, {
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

    const handleSaveRule = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRule(true);

        fetch('/organization/devops/codeowners', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                path_pattern: formPattern,
                domain_name: formDomainName,
                lead_reviewer_id: formLeadId === 'none' ? null : Number(formLeadId),
                fallback_reviewer_id: formFallbackId === 'none' ? null : Number(formFallbackId),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingRule(false);
                setCodeownerModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingRule(false));
    };

    const handleDeleteRule = (rule: CodeownerRuleItem) => {
        if (!confirm(`Hapus aturan CODEOWNERS untuk "${rule.domain_name}"?`)) return;

        fetch(`/organization/devops/codeowners/${rule.id}`, {
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

    const renderSlaBadge = (sla: string) => {
        switch (sla) {
            case 'breached':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <Flame className="h-3 w-3" />
                        <span>SLA Breached</span>
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase font-bold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>At Risk</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Within SLA</span>
                    </Badge>
                );
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'merged':
                return (
                    <Badge className="bg-purple-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <GitMerge className="h-3 w-3" />
                        <span>Merged</span>
                    </Badge>
                );
            case 'approved':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Check className="h-3 w-3" />
                        <span>Approved</span>
                    </Badge>
                );
            case 'changes_requested':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Changes Req.</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>In Review</span>
                    </Badge>
                );
        }
    };

    const filteredPrs = prs.filter((pr) => {
        return (
            pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pr.repository_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pr.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `#${pr.pr_number}`.includes(searchTerm)
        );
    });

    return (
        <AppLayout>
            <Head title="Pull Request Review SLA & Code Reviewer Load Balancer" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center text-white shadow-md">
                            <GitPullRequest className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    PR Review SLA & Reviewer Load Balancer
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    Engineering Velocity
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pemantauan SLA waktu review, deteksi bottleneck, penyeimbang beban reviewer, dan rekomendasi domain CODEOWNERS
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCodeowners(!showCodeowners)}
                            className="h-9 text-xs gap-1.5 font-semibold"
                        >
                            <FileCode className="h-3.5 w-3.5" />
                            <span>{showCodeowners ? 'Sembunyikan CODEOWNERS' : 'Aturan CODEOWNERS'}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={openCreatePrModal}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Daftarkan PR</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active PRs in Review */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">PR Aktif dalam Review</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <GitPullRequest className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.active_prs}
                            </span>
                            <span className="text-xs text-muted-foreground">/ {metrics.total_prs} total PR</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.stale_prs_count} PR mengalami keterlambatan (Stale)
                        </div>
                    </div>

                    {/* TTFR */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Time to First Review (TTFR)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.avg_ttfr_hours}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">jam (Target: &lt; 4h)</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Rata-rata waktu tanggap reviewer pertama
                        </div>
                    </div>

                    {/* Turnaround Time */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Review Turnaround Time</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_turnaround_hours}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">jam hingga merge</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Siklus dari PR dibuka hingga siap rilis
                        </div>
                    </div>

                    {/* SLA Compliance */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kepatuhan SLA Code Review</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                                {metrics.sla_compliance_pct}%
                            </span>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                Optimal
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            PR terselesaikan dalam target waktu SLA
                        </div>
                    </div>
                </div>

                {/* Reviewer Load Balancer Matrix Cards */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-indigo-600" />
                                <span>Reviewer Load Balancer Matrix</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Distribusi antrean review aktif untuk mencegah kelebihan beban pada lead engineer
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Available (0 PR)</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Normal (1-2 PR)</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>Overloaded (3+ PR)</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                        {reviewerMatrix.map((rev) => {
                            const isOverloaded = rev.capacity === 'overloaded';
                            const isAvailable = rev.capacity === 'available';
                            return (
                                <div
                                    key={rev.id}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                        isOverloaded
                                            ? 'border-rose-500/40 bg-rose-500/5'
                                            : isAvailable
                                            ? 'border-emerald-500/30 bg-emerald-500/5'
                                            : 'border-border bg-muted/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs text-foreground truncate max-w-[130px]">
                                            {rev.name}
                                        </span>
                                        <Badge
                                            className={`text-[9px] font-mono capitalize ${
                                                isOverloaded
                                                    ? 'bg-rose-600 text-white'
                                                    : isAvailable
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-blue-600 text-white'
                                            }`}
                                        >
                                            {rev.capacity}
                                        </Badge>
                                    </div>
                                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                        <span>Pending: <strong className="text-foreground">{rev.pending_count} PR</strong></span>
                                        <span>Merged: {rev.completed_count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Collapsible CODEOWNERS Section */}
                {showCodeowners && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <FileCode className="h-4 w-4 text-purple-600" />
                                    <span>Aturan Pemilik Modul (CODEOWNERS Rules)</span>
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Pemetaan pola direktori file kode ke lead reviewer yang bertanggung jawab
                                </p>
                            </div>

                            <Button
                                size="sm"
                                onClick={() => {
                                    setFormPattern('');
                                    setFormDomainName('');
                                    setFormLeadId(members[0]?.id ? members[0].id.toString() : 'none');
                                    setFormFallbackId('none');
                                    setCodeownerModalOpen(true);
                                }}
                                className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                            >
                                <Plus className="h-3 w-3" />
                                <span>Tambah Aturan</span>
                            </Button>
                        </div>

                        <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                                        <th className="p-3">Pola Direktori (Path Pattern)</th>
                                        <th className="p-3">Domain Rekayasa</th>
                                        <th className="p-3">Lead Reviewer</th>
                                        <th className="p-3">Fallback Reviewer</th>
                                        <th className="p-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {codeownerRules.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                                Belum ada aturan CODEOWNERS yang didefinisikan.
                                            </td>
                                        </tr>
                                    ) : (
                                        codeownerRules.map((rule) => (
                                            <tr key={rule.id} className="hover:bg-muted/10">
                                                <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                                                    {rule.path_pattern}
                                                </td>
                                                <td className="p-3 text-foreground font-medium">
                                                    {rule.domain_name}
                                                </td>
                                                <td className="p-3 text-foreground">
                                                    👤 {rule.lead_reviewer_name ?? '-'}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {rule.fallback_reviewer_name ? `👤 ${rule.fallback_reviewer_name}` : '-'}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteRule(rule)}
                                                        className="h-6 w-6 p-0 text-rose-500"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari PR #number, judul, repository, atau branch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="pending_review">🔵 In Review</SelectItem>
                                <SelectItem value="changes_requested">🟠 Changes Req.</SelectItem>
                                <SelectItem value="approved">🟢 Approved</SelectItem>
                                <SelectItem value="merged">🟣 Merged</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedSlaStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua SLA</SelectItem>
                                <SelectItem value="within_sla">🟢 Within SLA</SelectItem>
                                <SelectItem value="at_risk">🟠 At Risk</SelectItem>
                                <SelectItem value="breached">🔴 Breached</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedReviewerId || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, undefined, val)}
                        >
                            <SelectTrigger className="h-8 text-xs w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">👥 Semua Reviewer</SelectItem>
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={m.id.toString()}>
                                        👤 {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* PR Reviews Catalog Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3.5">Pull Request</th>
                                    <th className="p-3.5">Author & Reviewer</th>
                                    <th className="p-3.5">Perubahan (+/-)</th>
                                    <th className="p-3.5">Status Review</th>
                                    <th className="p-3.5">Status SLA</th>
                                    <th className="p-3.5">TTFR / Turnaround</th>
                                    <th className="p-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredPrs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                            <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            Tidak ada Pull Request yang sesuai dengan filter pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPrs.map((pr) => (
                                        <tr key={pr.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        #{pr.pr_number}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        {pr.repository_name}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] font-mono">
                                                        <GitBranch className="h-2.5 w-2.5 mr-1" />
                                                        {pr.branch_name}
                                                    </Badge>
                                                </div>
                                                <div className="font-semibold text-foreground max-w-md line-clamp-1">
                                                    {pr.title}
                                                </div>
                                                {pr.matched_codeowner_rule && (
                                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                        CODEOWNER: {pr.matched_codeowner_rule}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="text-foreground">Author: <strong>{pr.author?.name ?? 'Developer'}</strong></div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-muted-foreground text-[11px]">Reviewer:</span>
                                                    <Select
                                                        value={pr.assigned_reviewer?.id ? pr.assigned_reviewer.id.toString() : 'none'}
                                                        onValueChange={(val) => val !== 'none' && handleReassignReviewer(pr, Number(val))}
                                                    >
                                                        <SelectTrigger className="h-6 text-[10px] w-36 px-2 py-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {members.map((m) => (
                                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                                    👤 {m.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </td>

                                            <td className="p-3.5 font-mono">
                                                <span className="text-emerald-600 font-bold">+{pr.additions_count}</span>
                                                <span className="text-muted-foreground mx-1">/</span>
                                                <span className="text-rose-600 font-bold">-{pr.deletions_count}</span>
                                            </td>

                                            <td className="p-3.5">
                                                {renderStatusBadge(pr.status)}
                                            </td>

                                            <td className="p-3.5">
                                                {renderSlaBadge(pr.sla_status)}
                                            </td>

                                            <td className="p-3.5 font-mono text-[11px]">
                                                <div>TTFR: <strong className="text-foreground">{pr.ttfr_hours ? `${pr.ttfr_hours}h` : '-'}</strong></div>
                                                {pr.turnaround_hours && (
                                                    <div className="text-muted-foreground">Turnaround: {pr.turnaround_hours}h</div>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {pr.status !== 'approved' && pr.status !== 'merged' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionLoadingId === pr.id}
                                                            onClick={() => handleUpdateStatus(pr, 'approved')}
                                                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                            title="Approve PR"
                                                        >
                                                            <Check className="h-2.5 w-2.5" />
                                                        </Button>
                                                    )}

                                                    {pr.status !== 'merged' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionLoadingId === pr.id}
                                                            onClick={() => handleUpdateStatus(pr, 'merged')}
                                                            className="h-6 text-[10px] px-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                                            title="Merge PR"
                                                        >
                                                            <GitMerge className="h-2.5 w-2.5" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeletePr(pr)}
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

            {/* Modal: Tambah PR Baru */}
            <Dialog open={createPrModalOpen} onOpenChange={setCreatePrModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                            <GitPullRequest className="h-5 w-5" />
                            <span>Daftarkan Pull Request Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Integrasikan pelacakan SLA review kode dan penugasan reviewer otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePr} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Judul Pull Request *
                            </label>
                            <Input
                                placeholder="cth: feat(billing): idempotent webhook ingestion"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Repository *
                                </label>
                                <Input
                                    placeholder="pandu-core-api"
                                    value={formRepo}
                                    onChange={(e) => setFormRepo(e.target.value)}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Branch Name *
                                </label>
                                <Input
                                    placeholder="feature/billing-dlq"
                                    value={formBranch}
                                    onChange={(e) => setFormBranch(e.target.value)}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Author PR
                                </label>
                                <Select value={formAuthorId} onValueChange={setFormAuthorId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                👤 {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Assigned Reviewer
                                </label>
                                <Select value={formReviewerId} onValueChange={setFormReviewerId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map((m) => (
                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                👤 {m.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Lines Added (+)
                                </label>
                                <Input
                                    type="number"
                                    value={formAdditions}
                                    onChange={(e) => setFormAdditions(Number(e.target.value))}
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Lines Deleted (-)
                                </label>
                                <Input
                                    type="number"
                                    value={formDeletions}
                                    onChange={(e) => setFormDeletions(Number(e.target.value))}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Aturan Path CODEOWNERS Terkait
                            </label>
                            <Input
                                placeholder="app/Services/Developer/**"
                                value={formCodeownerRule}
                                onChange={(e) => setFormCodeownerRule(e.target.value)}
                                className="text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreatePrModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingPr}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSavingPr ? 'Menyimpan...' : 'Daftarkan PR'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tambah Aturan CODEOWNERS */}
            <Dialog open={codeownerModalOpen} onOpenChange={setCodeownerModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600">
                            <FileCode className="h-5 w-5" />
                            <span>Definisikan Aturan CODEOWNERS</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Petakan direktori file ke tim reviewer yang tepat.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRule} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pola Direktori (Path Pattern) *
                            </label>
                            <Input
                                placeholder="cth: app/Services/Billing/**"
                                value={formPattern}
                                onChange={(e) => setFormPattern(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Domain Rekayasa *
                            </label>
                            <Input
                                placeholder="cth: Billing & Payment Processing"
                                value={formDomainName}
                                onChange={(e) => setFormDomainName(e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Lead Reviewer *
                            </label>
                            <Select value={formLeadId} onValueChange={setFormLeadId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            👤 {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Fallback Reviewer (Opsional)
                            </label>
                            <Select value={formFallbackId} onValueChange={setFormFallbackId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tidak Ada</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            👤 {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCodeownerModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingRule}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                            >
                                {isSavingRule ? 'Menyimpan...' : 'Simpan Aturan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
