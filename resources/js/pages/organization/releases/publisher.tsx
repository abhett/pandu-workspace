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
    Rocket,
    Sparkles,
    Globe,
    Clock,
    CheckCircle2,
    Calendar,
    Plus,
    Search,
    Edit,
    Trash2,
    Share2,
    Send,
    Terminal,
    FileText,
    Copy,
    Check,
    Tag,
    Layers,
    MessageSquare,
    Mail,
    Flame,
    AlertTriangle,
} from 'lucide-react';

interface PublicationItem {
    id: string;
    version_tag: string;
    version_type: 'major' | 'minor' | 'patch';
    release_title: string;
    executive_summary: string;
    markdown_content: string;
    categories: {
        features?: string[];
        fixes?: string[];
        performance?: string[];
        breaking?: string[];
    };
    target_channels: string[];
    status: 'draft' | 'scheduled' | 'published';
    project_name: string | null;
    published_by_name: string;
    published_at_formatted: string | null;
    created_at_formatted: string;
}

interface Metrics {
    total_releases_count: number;
    published_count: number;
    quarterly_features_shipped: number;
    avg_release_cycle_days: number;
    public_subscriber_reach: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    publications: PublicationItem[];
    projects: Array<{ id: string; name: string; key: string }>;
    sprints: Array<{ id: string; name: string; status: string }>;
    selectedStatus: string | null;
    selectedProjectId: string | null;
}

export default function ReleasePublisherPage({
    organization,
    metrics,
    publications,
    projects,
    sprints,
    selectedStatus,
    selectedProjectId,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Modal: Generate AI Release Notes
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [formProjectId, setFormProjectId] = useState<string>('none');
    const [formVersionType, setFormVersionType] = useState<string>('minor');
    const [formVersionTag, setFormVersionTag] = useState('v3.3.0');
    const [formTitle, setFormTitle] = useState('Release v3.3.0: Core Velocity & Resilience');
    const [formSummary, setFormSummary] = useState(
        'Versi v3.3.0 memperkenalkan pengawasan Webhook Dead-Letter Queue penuh, PR Review SLA load balancer, dan Incident War Room dengan analisis akar masalah otomatis.'
    );
    const [formFeatures, setFormFeatures] = useState(
        "Automated PR Review SLA telemetry with reviewer load balancing matrix.\nReal-Time Webhook Dead-Letter Queue (DLQ) with 1-click single & bulk replay.\nLive Incident War Room timeline feed with MTTA/MTTR resolution radar."
    );
    const [formFixes, setFormFixes] = useState(
        "Fixed connection timeout on high-volume background export jobs.\nResolved WebSocket cursor synchronization delay in Whiteboard studio."
    );
    const [formBreaking, setFormBreaking] = useState('');
    const [formChannels, setFormChannels] = useState<string[]>([
        'public_changelog',
        'github_releases',
        'slack_broadcast',
        'email_digest',
    ]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Modal: Markdown Viewer
    const [viewingPub, setViewingPub] = useState<PublicationItem | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleFilterChange = (stat?: string, proj?: string) => {
        const params = new URLSearchParams();
        const curStat = stat !== undefined ? stat : selectedStatus;
        const curProj = proj !== undefined ? proj : selectedProjectId;

        if (curStat && curStat !== 'all') params.append('status', curStat);
        if (curProj && curProj !== 'all') params.append('project_id', curProj);

        router.get(`/organization/releases/publisher?${params.toString()}`);
    };

    const handleVersionTypeChange = (type: string) => {
        setFormVersionType(type);
        if (type === 'major') {
            setFormVersionTag('v4.0.0');
            setFormTitle('Release v4.0.0: Next-Gen Enterprise Architecture');
        } else if (type === 'minor') {
            setFormVersionTag('v3.3.0');
            setFormTitle('Release v3.3.0: Core Velocity & Resilience');
        } else {
            setFormVersionTag('v3.2.1');
            setFormTitle('Release v3.2.1: Performance & Stability Hotfixes');
        }
    };

    const toggleChannel = (channel: string) => {
        if (formChannels.includes(channel)) {
            setFormChannels(formChannels.filter((c) => c !== channel));
        } else {
            setFormChannels([...formChannels, channel]);
        }
    };

    const handleGenerateRelease = (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);

        fetch('/organization/releases/publisher/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: formProjectId === 'none' ? null : formProjectId,
                version_type: formVersionType,
                version_tag: formVersionTag,
                release_title: formTitle,
                executive_summary: formSummary,
                features: formFeatures,
                fixes: formFixes,
                breaking: formBreaking,
                target_channels: formChannels,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsGenerating(false);
                setGenerateModalOpen(false);
                router.reload();
            })
            .catch(() => setIsGenerating(false));
    };

    const handlePublishRelease = (pub: PublicationItem) => {
        if (!confirm(`Publikasikan rilis "${pub.version_tag}" ke semua kanal terpilih?`)) return;

        setActionLoadingId(pub.id);
        fetch(`/organization/releases/publisher/${pub.id}/publish`, {
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

    const handleDeletePub = (pub: PublicationItem) => {
        if (!confirm(`Hapus draf catatan rilis "${pub.version_tag}"?`)) return;

        fetch(`/organization/releases/publisher/${pub.id}`, {
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

    const copyMarkdown = (text: string) => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const renderVersionBadge = (type: string, tag: string) => {
        switch (type) {
            case 'major':
                return (
                    <Badge className="bg-rose-600 text-white text-xs gap-1 font-mono font-bold">
                        <Flame className="h-3 w-3" />
                        <span>{tag} Major</span>
                    </Badge>
                );
            case 'minor':
                return (
                    <Badge className="bg-purple-600 text-white text-xs gap-1 font-mono font-bold">
                        <Sparkles className="h-3 w-3" />
                        <span>{tag} Minor</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-600 text-white text-xs gap-1 font-mono font-bold">
                        <Tag className="h-3 w-3" />
                        <span>{tag} Patch</span>
                    </Badge>
                );
        }
    };

    const renderChannelIcon = (channel: string) => {
        switch (channel) {
            case 'public_changelog':
                return (
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <Globe className="h-2.5 w-2.5 text-blue-500" />
                        <span>Changelog</span>
                    </Badge>
                );
            case 'github_releases':
                return (
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <Terminal className="h-2.5 w-2.5 text-purple-500" />
                        <span>GitHub</span>
                    </Badge>
                );
            case 'slack_broadcast':
                return (
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <MessageSquare className="h-2.5 w-2.5 text-emerald-500" />
                        <span>Slack</span>
                    </Badge>
                );
            case 'email_digest':
                return (
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <Mail className="h-2.5 w-2.5 text-amber-500" />
                        <span>Email</span>
                    </Badge>
                );
            default:
                return null;
        }
    };

    const filteredPublications = publications.filter((p) => {
        return (
            p.version_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.release_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.executive_summary.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Automated AI Release Notes & SemVer Changelog Publisher Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md">
                            <Rocket className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Release Notes & SemVer Changelog Publisher
                                </h1>
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs font-mono">
                                    AI-Powered SemVer
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Agregasi otomatis commit & task sprint, kalkulator SemVer, ringkasan eksekutif AI, dan publikasi 1-klik multi-kanal
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={() => setGenerateModalOpen(true)}
                            className="h-9 text-xs gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-sm"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Buat Catatan Rilis (AI)</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Releases */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Rilis Terbit</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Rocket className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_releases_count}
                            </span>
                            <span className="text-xs text-muted-foreground">versi rilis</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.published_count} rilis aktif publik
                        </div>
                    </div>

                    {/* Features Shipped */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Fitur Rilis Kuartal Ini (Q3)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.quarterly_features_shipped}
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Shipped
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Agregasi fitur baru dari sprint selesai
                        </div>
                    </div>

                    {/* Release Cadence */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Siklus Rilis Rata-rata</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_release_cycle_days}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">hari per rilis</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Kecepatan delivery iterasi tim
                        </div>
                    </div>

                    {/* Audience Reach */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Jangkauan Audiens Rilis</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Globe className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.public_subscriber_reach.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">subscribers</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Penerima digest email & GitHub stars
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari versi (cth: v3.2.0), judul rilis, atau kata kunci..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={selectedStatus || 'all'}
                            onValueChange={(val) => handleFilterChange(val, undefined)}
                        >
                            <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="published">🟢 Published</SelectItem>
                                <SelectItem value="draft">🟡 Draft</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedProjectId || 'all'}
                            onValueChange={(val) => handleFilterChange(undefined, val)}
                        >
                            <SelectTrigger className="h-8 text-xs w-44">
                                <SelectValue />
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
                    </div>
                </div>

                {/* Release Publications Catalog */}
                <div className="space-y-4">
                    {filteredPublications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                            <Rocket className="h-10 w-10 text-purple-500 mx-auto mb-2 opacity-80" />
                            <h3 className="font-bold text-sm text-foreground">Belum Ada Catatan Rilis</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Klik tombol &quot;Buat Catatan Rilis (AI)&quot; untuk meng-generate rilis baru dari item sprint.
                            </p>
                        </div>
                    ) : (
                        filteredPublications.map((pub) => {
                            const isDraft = pub.status === 'draft';
                            return (
                                <div
                                    key={pub.id}
                                    className={`rounded-2xl border bg-card p-5 shadow-xs space-y-4 transition-all ${
                                        isDraft
                                            ? 'border-amber-500/40 bg-amber-500/5'
                                            : 'border-border hover:border-border/80'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-3">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            {renderVersionBadge(pub.version_type, pub.version_tag)}
                                            <h3 className="font-bold text-sm text-foreground">
                                                {pub.release_title}
                                            </h3>
                                            {pub.project_name && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    📁 {pub.project_name}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isDraft && (
                                                <Button
                                                    size="sm"
                                                    disabled={actionLoadingId === pub.id}
                                                    onClick={() => handlePublishRelease(pub)}
                                                    className="h-7 text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-1"
                                                >
                                                    <Send className="h-3 w-3" />
                                                    <span>Publikasikan Sekarang</span>
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setViewingPub(pub)}
                                                className="h-7 text-xs font-semibold gap-1"
                                            >
                                                <FileText className="h-3 w-3" />
                                                <span>Markdown</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeletePub(pub)}
                                                className="h-7 w-7 p-0 text-rose-500"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Executive Summary */}
                                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs">
                                        <span className="font-semibold text-foreground block mb-1">
                                            Ringkasan Eksekutif:
                                        </span>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {pub.executive_summary}
                                        </p>
                                    </div>

                                    {/* Categorized Highlights */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        {/* Features */}
                                        {pub.categories.features && pub.categories.features.length > 0 && (
                                            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                                                <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    <span>Fitur Baru &amp; Peningkatan ({pub.categories.features.length})</span>
                                                </span>
                                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                                                    {pub.categories.features.map((f, idx) => (
                                                        <li key={idx} className="line-clamp-1">{f}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Bug Fixes */}
                                        {pub.categories.fixes && pub.categories.fixes.length > 0 && (
                                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                                                <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>Perbaikan Bug &amp; Stabilitas ({pub.categories.fixes.length})</span>
                                                </span>
                                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                                                    {pub.categories.fixes.map((fix, idx) => (
                                                        <li key={idx} className="line-clamp-1">{fix}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer: Target Channels & Author */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground pt-1 border-t border-border/30">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-semibold text-foreground">Kanal Distribusi:</span>
                                            {pub.target_channels.map((ch, idx) => (
                                                <React.Fragment key={idx}>{renderChannelIcon(ch)}</React.Fragment>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3 text-[11px] font-mono">
                                            <span>Dirilis oleh: <strong className="text-foreground">{pub.published_by_name}</strong></span>
                                            <span>{pub.published_at_formatted ? `Terbit: ${pub.published_at_formatted}` : 'Status: Draf'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal: Generator AI Release Notes */}
            <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600">
                            <Sparkles className="h-5 w-5" />
                            <span>AI Release Notes & SemVer Generator</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Agregasi task sprint, klasifikasi SemVer otomatis, dan ringkasan eksekutif.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleGenerateRelease} className="space-y-3 pt-2 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="font-semibold text-foreground block mb-1">
                                    Tipe Versi SemVer *
                                </label>
                                <Select value={formVersionType} onValueChange={handleVersionTypeChange}>
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="major">🔴 Major (v4.0.0) - Breaking</SelectItem>
                                        <SelectItem value="minor">🟣 Minor (v3.3.0) - Features</SelectItem>
                                        <SelectItem value="patch">🔵 Patch (v3.2.1) - Fixes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="font-semibold text-foreground block mb-1">
                                    Tag Versi Rilis *
                                </label>
                                <Input
                                    value={formVersionTag}
                                    onChange={(e) => setFormVersionTag(e.target.value)}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Judul Rilis *
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
                                Ringkasan Eksekutif (AI Executive Summary) *
                            </label>
                            <Textarea
                                value={formSummary}
                                onChange={(e) => setFormSummary(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Fitur Baru &amp; Peningkatan (1 per baris)
                            </label>
                            <Textarea
                                value={formFeatures}
                                onChange={(e) => setFormFeatures(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Perbaikan Bug &amp; Stabilitas (1 per baris)
                            </label>
                            <Textarea
                                value={formFixes}
                                onChange={(e) => setFormFixes(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Kanal Distribusi Publikasi
                            </label>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {[
                                    { id: 'public_changelog', label: '🌐 Public Changelog' },
                                    { id: 'github_releases', label: '🐙 GitHub Releases' },
                                    { id: 'slack_broadcast', label: '💬 Slack Channel' },
                                    { id: 'email_digest', label: '📧 Email Digest' },
                                ].map((ch) => (
                                    <label
                                        key={ch.id}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/20"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formChannels.includes(ch.id)}
                                            onChange={() => toggleChannel(ch.id)}
                                            className="rounded border-border"
                                        />
                                        <span className="text-[11px] font-medium">{ch.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setGenerateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isGenerating}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold"
                            >
                                {isGenerating ? 'Meng-generate...' : 'Simpan Draf Rilis'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Markdown Content Viewer */}
            <Dialog open={!!viewingPub} onOpenChange={(open) => !open && setViewingPub(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-600 font-mono">
                            <FileText className="h-5 w-5" />
                            <span>{viewingPub ? `${viewingPub.version_tag} Markdown Content` : ''}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Format markdown siap salin untuk GitHub Releases atau dokumentasi.
                        </DialogDescription>
                    </DialogHeader>

                    {viewingPub && (
                        <div className="space-y-3 pt-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">Markdown Source:</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyMarkdown(viewingPub.markdown_content)}
                                    className="h-6 text-[10px] px-2 gap-1"
                                >
                                    {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                    <span>{isCopied ? 'Tersalin' : 'Salin Markdown'}</span>
                                </Button>
                            </div>
                            <pre className="p-4 rounded-xl bg-muted/60 border border-border font-mono text-[11px] overflow-x-auto max-h-72 text-foreground whitespace-pre-wrap">
                                {viewingPub.markdown_content}
                            </pre>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setViewingPub(null)}
                            className="text-xs"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
