import React, { useState } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Bot,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Edit3,
    ExternalLink,
    Eye,
    Flame,
    GitCommit,
    Globe,
    Layers,
    Lock,
    Package,
    Plus,
    Radio,
    Rocket,
    Send,
    Shield,
    Sparkles,
    Tag,
    Trash2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReleaseItem {
    id: string;
    version: string;
    title: string;
    description?: string;
    type: 'major' | 'minor' | 'patch' | 'hotfix';
    status: 'draft' | 'published' | 'archived';
    is_public: boolean;
    published_at?: string;
    created_at: string;
    content?: {
        new_features?: string[];
        improvements?: string[];
        bug_fixes?: string[];
        breaking_changes?: string[];
    };
    creator?: {
        id: number;
        name: string;
        avatar?: string;
    };
    project?: {
        id: string;
        name: string;
        key: string;
    };
    reactions_count?: number;
}

interface ProjectOption {
    id: string;
    name: string;
    key: string;
}

interface SprintOption {
    id: string;
    name: string;
    project_id: string;
    status: string;
}

interface PageProps {
    releases?: ReleaseItem[];
    projects?: ProjectOption[];
    sprints?: SprintOption[];
    selectedProjectId?: string | null;
}

export default function ReleasesIndexPage({
    releases = [],
    projects = [],
    sprints = [],
    selectedProjectId = '',
}: PageProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(selectedProjectId || '');

    // AI Generator Form
    const aiForm = useForm({
        sprint_id: sprints[0]?.id || '',
        version: 'v3.5.0',
        type: 'minor' as 'major' | 'minor' | 'patch' | 'hotfix',
    });

    // Manual Draft Form
    const manualForm = useForm({
        version: '',
        title: '',
        description: '',
        type: 'minor' as 'major' | 'minor' | 'patch' | 'hotfix',
        project_id: '',
        is_public: true,
        features_text: '',
        improvements_text: '',
        fixes_text: '',
    });

    const handleFilterChange = (projId: string) => {
        setSelectedProject(projId);
        router.get(
            '/releases',
            { project_id: projId || undefined },
            { preserveState: true, replace: true }
        );
    };

    const submitAiGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        aiForm.post('/releases/generate-ai', {
            onSuccess: () => setIsAiModalOpen(false),
        });
    };

    const submitManualDraft = (e: React.FormEvent) => {
        e.preventDefault();
        const content = {
            new_features: manualForm.data.features_text.split('\n').filter(Boolean),
            improvements: manualForm.data.improvements_text.split('\n').filter(Boolean),
            bug_fixes: manualForm.data.fixes_text.split('\n').filter(Boolean),
            breaking_changes: [],
        };

        router.post('/releases', {
            version: manualForm.data.version,
            title: manualForm.data.title,
            description: manualForm.data.description,
            type: manualForm.data.type,
            project_id: manualForm.data.project_id || undefined,
            is_public: manualForm.data.is_public,
            content,
        }, {
            onSuccess: () => {
                manualForm.reset();
                setIsManualModalOpen(false);
            },
        });
    };

    const publishRelease = (releaseId: string) => {
        router.post(`/releases/${releaseId}/publish`);
    };

    const deleteRelease = (releaseId: string) => {
        if (confirm('Hapus catatan rilis ini?')) {
            router.delete(`/releases/${releaseId}`);
        }
    };

    return (
        <AppLayout>
            <Head title="Manajemen Catatan Rilis & Changelog - Pandu" />

            <div className="space-y-8 animate-fade-in pb-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono py-0.5 border-primary/30 text-primary bg-primary/5">
                                Release Operations & Changelog Hub
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">Product Versioning</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                            <Rocket className="size-7 text-primary" /> Catatan Rilis & Changelog Hub
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Otomatisasi penyusunan changelog dari tugas sprint selesai dengan AI Co-Pilot dan publikasi ke halaman publik.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link href="/changelog" target="_blank">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold h-9 shadow-xs">
                                <Globe className="size-3.5" />
                                <span>Lihat Changelog Publik</span>
                                <ExternalLink className="size-3 text-muted-foreground" />
                            </Button>
                        </Link>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setIsManualModalOpen(true)}
                            className="gap-1.5 text-xs font-semibold h-9"
                        >
                            <Plus className="size-3.5" />
                            <span>Buat Manual</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setIsAiModalOpen(true)}
                            className="bg-gradient-to-r from-primary to-purple-500 font-semibold gap-1.5 shadow-xs h-9"
                        >
                            <Sparkles className="size-3.5" />
                            <span>Ekstrak dari Sprint (AI)</span>
                        </Button>
                    </div>
                </div>

                {/* Flash Success Notification */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                        <CheckCircle2 className="size-4" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Overview Metrics Bento Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-xs">
                        <span className="text-[11px] font-mono text-muted-foreground uppercase">Total Versi</span>
                        <h3 className="text-2xl font-black text-foreground">{releases.length}</h3>
                    </div>
                    <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-xs">
                        <span className="text-[11px] font-mono text-emerald-400 uppercase">Dipublikasikan</span>
                        <h3 className="text-2xl font-black text-emerald-400">
                            {releases.filter((r) => r.status === 'published').length}
                        </h3>
                    </div>
                    <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-xs">
                        <span className="text-[11px] font-mono text-amber-400 uppercase">Draft Pending</span>
                        <h3 className="text-2xl font-black text-amber-400">
                            {releases.filter((r) => r.status === 'draft').length}
                        </h3>
                    </div>
                    <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-xs">
                        <span className="text-[11px] font-mono text-primary uppercase">Rilis Publik</span>
                        <h3 className="text-2xl font-black text-primary">
                            {releases.filter((r) => r.is_public).length}
                        </h3>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex items-center justify-between gap-4 pt-2 border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                        <Package className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">Daftar Rilis Versi</span>
                    </div>

                    <select
                        value={selectedProject}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-8"
                    >
                        <option value="">Semua Proyek Organisasi</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.key})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Releases Timeline List */}
                <div className="space-y-6">
                    {releases.length === 0 ? (
                        <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3">
                            <Rocket className="size-10 text-muted-foreground mx-auto" />
                            <h3 className="text-base font-bold text-foreground">Belum Ada Catatan Rilis</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Buat catatan rilis manual atau gunakan AI Release Generator untuk mengekstrak tugas sprint yang telah selesai.
                            </p>
                            <Button size="sm" onClick={() => setIsAiModalOpen(true)} className="gap-1.5 font-semibold">
                                <Sparkles className="size-3.5" /> Ekstrak dari Sprint Sekarang
                            </Button>
                        </div>
                    ) : (
                        releases.map((rel) => {
                            const isDraft = rel.status === 'draft';
                            return (
                                <div
                                    key={rel.id}
                                    className="bg-card rounded-3xl border border-border p-6 sm:p-8 space-y-6 shadow-sm hover:border-primary/40 transition-colors relative"
                                >
                                    {/* Header Info */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black font-mono text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                                                {rel.version}
                                            </span>
                                            <div>
                                                <h3 className="text-base font-bold text-foreground">{rel.title}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Dibuat oleh {rel.creator?.name || 'Sistem'} • {rel.published_at ? `Dirilis pada ${rel.published_at.slice(0, 10)}` : 'Draft'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={cn(
                                                    'font-mono text-[10px] uppercase',
                                                    rel.type === 'major' && 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                                                    rel.type === 'minor' && 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                                    rel.type === 'patch' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                    rel.type === 'hotfix' && 'bg-red-500/10 text-red-400 border-red-500/20'
                                                )}
                                            >
                                                {rel.type}
                                            </Badge>

                                            <Badge variant={isDraft ? 'outline' : 'default'} className="text-[10px] font-mono capitalize">
                                                {rel.status}
                                            </Badge>

                                            {rel.is_public ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono flex items-center gap-1">
                                                    <Globe className="size-2.5" /> Publik
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-muted text-muted-foreground text-[10px] font-mono flex items-center gap-1">
                                                    <Lock className="size-2.5" /> Internal
                                                </Badge>
                                            )}

                                            {isDraft && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => publishRelease(rel.id)}
                                                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs ml-2"
                                                >
                                                    <Check className="size-3.5 mr-1" /> Publikasikan
                                                </Button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => deleteRelease(rel.id)}
                                                className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                                                title="Hapus Rilis"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {rel.description && (
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {rel.description}
                                        </p>
                                    )}

                                    {/* Categorized Changes Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* New Features */}
                                        {rel.content?.new_features && rel.content.new_features.length > 0 && (
                                            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-2">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-primary" /> Fitur Baru (New Features)
                                                </span>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.new_features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="text-primary mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Improvements */}
                                        {rel.content?.improvements && rel.content.improvements.length > 0 && (
                                            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-2">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Zap className="size-3.5 text-blue-400" /> Peningkatan & Optimasi
                                                </span>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.improvements.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="text-blue-400 mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Bug Fixes */}
                                        {rel.content?.bug_fixes && rel.content.bug_fixes.length > 0 && (
                                            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-2">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <CheckCircle2 className="size-3.5 text-emerald-400" /> Perbaikan Bug (Bug Fixes)
                                                </span>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.bug_fixes.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="text-emerald-400 mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Breaking Changes */}
                                        {rel.content?.breaking_changes && rel.content.breaking_changes.length > 0 && (
                                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
                                                <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                                                    <AlertTriangle className="size-3.5" /> Perubahan Berdampak (Breaking Changes)
                                                </span>
                                                <ul className="space-y-1.5 text-xs text-destructive/90">
                                                    {rel.content.breaking_changes.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span>•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* AI Generator Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="space-y-1 pb-3 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="size-5 text-primary" /> Ekstrak Catatan Rilis dengan AI
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                AI akan merangkum seluruh tugas berstatus Done dari sprint yang dipilih dan mengelompokkannya secara otomatis.
                            </p>
                        </div>

                        <form onSubmit={submitAiGenerate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Pilih Sprint Sumber</label>
                                <select
                                    value={aiForm.data.sprint_id}
                                    onChange={(e) => aiForm.setData('sprint_id', e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-10"
                                    required
                                >
                                    {sprints.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Tag Versi (SemVer)</label>
                                    <Input
                                        placeholder="v3.5.0"
                                        value={aiForm.data.version}
                                        onChange={(e) => aiForm.setData('version', e.target.value)}
                                        className="h-10 text-xs font-mono"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Tipe Rilis</label>
                                    <select
                                        value={aiForm.data.type}
                                        onChange={(e) => aiForm.setData('type', e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-10"
                                    >
                                        <option value="major">Major (v4.0.0)</option>
                                        <option value="minor">Minor (v3.5.0)</option>
                                        <option value="patch">Patch (v3.4.1)</option>
                                        <option value="hotfix">Hotfix</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAiModalOpen(false)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={aiForm.processing}
                                    className="bg-gradient-to-r from-primary to-purple-500 font-semibold gap-1.5 shadow-xs text-xs"
                                >
                                    <Sparkles className="size-3.5" />
                                    <span>{aiForm.processing ? 'Mengekstrak...' : 'Hasilkan Catatan Rilis'}</span>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Draft Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="space-y-1 pb-3 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Plus className="size-5 text-primary" /> Buat Draft Catatan Rilis
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Masukkan rincian versi dan daftar perubahan secara manual.
                            </p>
                        </div>

                        <form onSubmit={submitManualDraft} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Versi</label>
                                    <Input
                                        placeholder="v3.4.0"
                                        value={manualForm.data.version}
                                        onChange={(e) => manualForm.setData('version', e.target.value)}
                                        className="h-10 text-xs font-mono"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Tipe Rilis</label>
                                    <select
                                        value={manualForm.data.type}
                                        onChange={(e) => manualForm.setData('type', e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-10"
                                    >
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                        <option value="patch">Patch</option>
                                        <option value="hotfix">Hotfix</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Judul Rilis</label>
                                <Input
                                    placeholder="Rilis Musim Gugur: Fitur AI & Mobile Hub"
                                    value={manualForm.data.title}
                                    onChange={(e) => manualForm.setData('title', e.target.value)}
                                    className="h-10 text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Ringkasan Deskripsi</label>
                                <Textarea
                                    placeholder="Ringkasan singkat tentang rilis versi ini..."
                                    value={manualForm.data.description}
                                    onChange={(e) => manualForm.setData('description', e.target.value)}
                                    className="text-xs min-h-[70px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">🚀 Fitur Baru (1 baris per item)</label>
                                <Textarea
                                    placeholder="Implementasi Async Standup Timer&#10;Mode Mobile Touch Companion"
                                    value={manualForm.data.features_text}
                                    onChange={(e) => manualForm.setData('features_text', e.target.value)}
                                    className="text-xs min-h-[70px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">⚡ Peningkatan (1 baris per item)</label>
                                <Textarea
                                    placeholder="Optimasi query database audit logs&#10;Peningkatan performa SSR Vite"
                                    value={manualForm.data.improvements_text}
                                    onChange={(e) => manualForm.setData('improvements_text', e.target.value)}
                                    className="text-xs min-h-[70px]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">🐞 Perbaikan Bug (1 baris per item)</label>
                                <Textarea
                                    placeholder="Perbaikan padding safe area mobile&#10;Fix session timeout redirect loop"
                                    value={manualForm.data.fixes_text}
                                    onChange={(e) => manualForm.setData('fixes_text', e.target.value)}
                                    className="text-xs min-h-[70px]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsManualModalOpen(false)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    className="font-semibold text-xs shadow-xs"
                                >
                                    Simpan Draft Rilis
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
