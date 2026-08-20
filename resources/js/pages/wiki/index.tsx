import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
} from '@/components/ui/dialog';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Clock,
    Copy,
    Edit3,
    Eye,
    FileCode,
    FileText,
    Folder,
    FolderPlus,
    History,
    ListCollapse,
    MoreVertical,
    Plus,
    Save,
    Search,
    Share2,
    Sparkles,
    Star,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WikiRevision {
    id: string;
    version: number;
    title: string;
    content: string;
    created_at: string;
    author?: { id: number; name: string; avatar?: string };
}

interface WikiPage {
    id: string;
    wiki_space_id: string;
    parent_id: string | null;
    title: string;
    slug: string;
    icon: string;
    content: string;
    is_favorite: boolean;
    version: number;
    created_by: number;
    last_edited_by: number;
    created_at: string;
    updated_at: string;
    space?: { id: string; name: string; slug: string };
    creator?: { id: number; name: string; avatar?: string };
    last_editor?: { id: number; name: string; avatar?: string };
    children?: WikiPage[];
    revisions?: WikiRevision[];
}

interface WikiSpace {
    id: string;
    organization_id: string;
    project_id: string | null;
    name: string;
    slug: string;
    icon: string;
    description: string | null;
    pages: WikiPage[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: {
        id: string;
        name: string;
        key: string;
    } | null;
    spaces: WikiSpace[];
    favorites: WikiPage[];
    active_page: WikiPage | null;
}

export default function WikiIndex({ organization, project, spaces, favorites, active_page }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});

    // Active page editing state
    const [isEditing, setIsEditing] = useState(false);
    const [docTitle, setDocTitle] = useState(active_page?.title || '');
    const [docContent, setDocContent] = useState(active_page?.content || '');
    const [isSaving, setIsSaving] = useState(false);

    // Modals
    const [showNewSpaceModal, setShowNewSpaceModal] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newSpaceDesc, setNewSpaceDesc] = useState('');

    const [showNewPageModal, setShowNewPageModal] = useState(false);
    const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaces[0]?.id || '');
    const [newPageTitle, setNewPageTitle] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

    useEffect(() => {
        if (active_page) {
            setDocTitle(active_page.title);
            setDocContent(active_page.content || '');
            setIsEditing(false);

            // Auto expand space containing active page
            if (active_page.wiki_space_id) {
                setExpandedSpaces((prev) => ({ ...prev, [active_page.wiki_space_id]: true }));
            }
        }
    }, [active_page]);

    const toggleSpace = (spaceId: string) => {
        setExpandedSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }));
    };

    const handleSavePage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!active_page) return;

        setIsSaving(true);

        fetch(`/wiki/pages/${active_page.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: docTitle,
                content: docContent,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setIsEditing(false);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleToggleFavorite = () => {
        if (!active_page) return;

        fetch(`/wiki/pages/${active_page.id}/favorite`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleDeletePage = () => {
        if (!active_page) return;
        if (!confirm(`Hapus dokumen "${active_page.title}"?`)) return;

        fetch(`/wiki/pages/${active_page.id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.visit('/wiki'));
    };

    const handleCreateSpace = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSpaceName.trim()) return;

        fetch('/wiki/spaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: newSpaceName,
                description: newSpaceDesc,
                project_id: project?.id || null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setShowNewSpaceModal(false);
                setNewSpaceName('');
                setNewSpaceDesc('');
                router.reload();
            });
    };

    const templatePresets: Record<string, { title: string; content: string }> = {
        prd: {
            title: 'Product Requirement Document (PRD)',
            content: `# Product Requirement Document (PRD)\n\n## 1. Ringkasan & Problem Statement\nJelaskan masalah pengguna dan peluang produk.\n\n## 2. Sasaran & User Stories\n- Sebagai [User], saya ingin [Fitur], agar [Manfaat].\n\n## 3. Spesifikasi Fungsional\n- [ ] Persyaratan 1\n- [ ] Persyaratan 2\n\n## 4. Metrik Keberhasilan (KPI)\n- Konversi target\n- Waktu respon pengguna`,
        },
        adr: {
            title: 'Architecture Decision Record (ADR)',
            content: `# ADR: [Judul Keputusan Arsitektur]\n\n**Status**: Proposed / Accepted / Deprecated\n**Tanggal**: ${new Date().toISOString().split('T')[0]}\n\n## Konteks & Latar Belakang\nJelaskan isu teknis yang dihadapi.\n\n## Keputusan Arsitektur\nKami memutuskan untuk menggunakan pendekatan [Solusi].\n\n## Konsekuensi & Dampak\n- **Kelebihan**: ...\n- **Tantangan**: ...`,
        },
        meeting: {
            title: 'Catatan Rapat & Action Items',
            content: `# Catatan Rapat: [Topik Rapat]\n\n**Tanggal**: ${new Date().toLocaleDateString('id-ID')}\n**Peserta**: ...\n\n## Agenda Pembahasan\n1. Review sprint progress\n2. Blockers & resolusi\n\n## Keputusan Rapat\n- Keputusan 1\n\n## Action Items\n- [ ] Task 1 (Assignee: @lead, Due: Besok)`,
        },
        runbook: {
            title: 'Engineering Runbook & Deployment',
            content: `# Runbook: [Nama Layanan / Prosedur]\n\n## Prosedur Deployment\n\`\`\`bash\ncomposer install --no-dev --optimize-autoloader\nphp artisan migrate --force\nphp artisan config:cache\n\`\`\`\n\n## Prosedur Rollback\nLangkah-langkah jika terjadi kegagalan sistem.`,
        },
    };

    const handleCreatePage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPageTitle.trim() || !selectedSpaceId) return;

        let content = '';
        if (selectedTemplate !== 'blank' && templatePresets[selectedTemplate]) {
            content = templatePresets[selectedTemplate].content;
        }

        fetch(`/wiki/spaces/${selectedSpaceId}/pages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: newPageTitle,
                content,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setShowNewPageModal(false);
                setNewPageTitle('');
                setSelectedTemplate('blank');
                if (data.page) {
                    router.visit(`/wiki/pages/${data.page.id}`);
                } else {
                    router.reload();
                }
            });
    };

    const handleAiDraftAssist = () => {
        setDocContent((prev) => {
            return prev + `\n\n### 🤖 AI Summary & Recommendation\nDokumen ini merangkum spesifikasi teknis dan panduan operasional tim. Rekomendasi: pastikan checklist action items ditinjau pada sprint berikutnya.`;
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: project?.name || 'Wiki & Dokumentasi', href: '#' },
            ]}
        >
            <Head title={`Wiki & Dokumentasi - ${active_page?.title || organization.name}`} />

            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-background">
                {/* LEFT SIDEBAR: Spaces & Document Tree */}
                <aside className="w-full lg:w-72 bg-card/60 border-r border-border flex flex-col shrink-0 overflow-y-auto max-h-[calc(100vh-64px)]">
                    {/* Header */}
                    <div className="p-4 border-b border-border space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="size-4 text-primary" />
                                <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                                    Engineering Wiki
                                </span>
                            </div>

                            <button
                                onClick={() => setShowNewSpaceModal(true)}
                                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                title="Buat Spasi Baru"
                            >
                                <FolderPlus className="size-4" />
                            </button>
                        </div>

                        {/* New Doc Button & Search */}
                        <div className="space-y-2">
                            <Button
                                onClick={() => setShowNewPageModal(true)}
                                className="w-full text-xs font-semibold h-8 gap-1.5 shadow-2xs"
                            >
                                <Plus className="size-3.5" />
                                <span>Dokumen Baru</span>
                            </Button>

                            <div className="relative">
                                <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari dokumen..."
                                    className="pl-7 text-xs font-mono h-7 bg-card"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tree */}
                    <div className="p-3 space-y-4 flex-1">
                        {/* Favorites */}
                        {favorites.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2">
                                    Favorit Disematkan
                                </span>
                                <div className="space-y-0.5">
                                    {favorites.map((fav) => (
                                        <Link
                                            key={fav.id}
                                            href={`/wiki/pages/${fav.id}`}
                                            className={cn(
                                                'flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-colors',
                                                active_page?.id === fav.id
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted/60'
                                            )}
                                        >
                                            <Star className="size-3.5 text-amber-500 fill-current shrink-0" />
                                            <span className="truncate">{fav.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Spaces & Pages */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-2">
                                Spasi Dokumentasi
                            </span>

                            {spaces.map((space) => {
                                const isExpanded = expandedSpaces[space.id] ?? true;

                                return (
                                    <div key={space.id} className="space-y-0.5">
                                        <div
                                            onClick={() => toggleSpace(space.id)}
                                            className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5 truncate">
                                                {isExpanded ? (
                                                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                                )}
                                                <Folder className="size-3.5 text-primary shrink-0" />
                                                <span className="truncate">{space.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono opacity-60">
                                                {space.pages.length}
                                            </span>
                                        </div>

                                        {isExpanded && (
                                            <div className="pl-4 space-y-0.5 border-l border-border/40 ml-3">
                                                {space.pages
                                                    .filter((p) => !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    .map((page) => (
                                                        <Link
                                                            key={page.id}
                                                            href={`/wiki/pages/${page.id}`}
                                                            className={cn(
                                                                'flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors',
                                                                active_page?.id === page.id
                                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                                            )}
                                                        >
                                                            <FileText className="size-3 shrink-0" />
                                                            <span className="truncate">{page.title}</span>
                                                        </Link>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* MAIN DOCUMENT CANVAS */}
                <main className="flex-1 flex flex-col overflow-y-auto max-h-[calc(100vh-64px)]">
                    {active_page ? (
                        <div className="flex-1 flex flex-col">
                            {/* Top Doc Toolbar */}
                            <div className="p-4 border-b border-border bg-card/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {active_page.space?.name || 'Dokumentasi'}
                                    </Badge>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                                        Versi {active_page.version}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="size-3" />
                                        <span>Diperbarui {new Date(active_page.updated_at).toLocaleDateString('id-ID')}</span>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleToggleFavorite}
                                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-amber-500 transition-colors"
                                        title={active_page.is_favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                                    >
                                        <Star
                                            className={cn(
                                                'size-4',
                                                active_page.is_favorite ? 'text-amber-500 fill-current' : ''
                                            )}
                                        />
                                    </button>

                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAiDraftAssist}
                                                className="text-xs h-8 gap-1 text-primary border-primary/30"
                                            >
                                                <Sparkles className="size-3" />
                                                <span>AI Draft</span>
                                            </Button>

                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleSavePage}
                                                disabled={isSaving}
                                                className="text-xs h-8 gap-1 font-semibold"
                                            >
                                                <Save className="size-3" />
                                                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(true)}
                                            className="text-xs h-8 gap-1 font-semibold"
                                        >
                                            <Edit3 className="size-3" />
                                            <span>Sunting Dokumen</span>
                                        </Button>
                                    )}

                                    <button
                                        onClick={handleDeletePage}
                                        className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                                        title="Hapus dokumen"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Document Content Area */}
                            <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <Input
                                            type="text"
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                            placeholder="Judul Dokumen..."
                                            className="text-2xl font-bold font-mono h-12 bg-card border-border"
                                        />

                                        <Textarea
                                            value={docContent}
                                            onChange={(e) => setDocContent(e.target.value)}
                                            placeholder="Tulis dokumen Anda menggunakan format Markdown..."
                                            rows={20}
                                            className="font-mono text-xs leading-relaxed bg-card border-border p-4 rounded-xl"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground border-b border-border pb-4">
                                            {active_page.title}
                                        </h1>

                                        <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-4 whitespace-pre-wrap font-sans text-foreground">
                                            {active_page.content || 'Dokumen ini belum memiliki isi konten. Klik "Sunting Dokumen" untuk mulai menulis.'}
                                        </div>

                                        {/* Revision History Section */}
                                        {active_page.revisions && active_page.revisions.length > 0 && (
                                            <div className="mt-12 pt-6 border-t border-border space-y-3">
                                                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                                                    <History className="size-3.5" /> Riwayat Revisi Versi ({active_page.revisions.length})
                                                </h3>

                                                <div className="divide-y divide-border/60 text-xs">
                                                    {active_page.revisions.map((rev) => (
                                                        <div key={rev.id} className="py-2 flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    v{rev.version}
                                                                </Badge>
                                                                <span className="text-foreground font-medium">{rev.title}</span>
                                                            </div>
                                                            <span>{new Date(rev.created_at).toLocaleString('id-ID')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 text-muted-foreground">
                            <BookOpen className="size-12 stroke-[1.5]" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-base text-foreground">Pilih atau Buat Dokumen</h3>
                                <p className="text-xs">Pilih dokumen dari pohon navigasi di sebelah kiri untuk melihat dan menyunting.</p>
                            </div>
                            <Button onClick={() => setShowNewPageModal(true)} className="text-xs font-semibold gap-1.5">
                                <Plus className="size-3.5" />
                                <span>Buat Dokumen Pertama</span>
                            </Button>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal: Buat Spasi Baru */}
            <Dialog open={showNewSpaceModal} onOpenChange={setShowNewSpaceModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FolderPlus className="size-4 text-primary" /> Buat Spasi Dokumentasi Baru
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateSpace} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Nama Spasi</label>
                            <Input
                                type="text"
                                value={newSpaceName}
                                onChange={(e) => setNewSpaceName(e.target.value)}
                                placeholder="Contoh: Engineering, Product, HR..."
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Deskripsi (Opsional)</label>
                            <Input
                                type="text"
                                value={newSpaceDesc}
                                onChange={(e) => setNewSpaceDesc(e.target.value)}
                                placeholder="Keterangan singkat spasi..."
                                className="text-xs font-mono"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowNewSpaceModal(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" className="text-xs font-semibold">
                                Buat Spasi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Buat Dokumen Baru dari Template */}
            <Dialog open={showNewPageModal} onOpenChange={setShowNewPageModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="size-4 text-primary" /> Buat Dokumen Wiki Baru
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreatePage} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Pilih Spasi</label>
                            <select
                                value={selectedSpaceId}
                                onChange={(e) => setSelectedSpaceId(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                {spaces.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Pilih Template Dokumen</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => {
                                    setSelectedTemplate(e.target.value);
                                    if (e.target.value !== 'blank' && templatePresets[e.target.value]) {
                                        setNewPageTitle(templatePresets[e.target.value].title);
                                    }
                                }}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="blank">Dokumen Kosong (Blank Document)</option>
                                <option value="prd">Product Requirement Document (PRD)</option>
                                <option value="adr">Architecture Decision Record (ADR)</option>
                                <option value="meeting">Meeting Notes & Action Items</option>
                                <option value="runbook">Engineering Runbook & Deployment</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Judul Dokumen</label>
                            <Input
                                type="text"
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                placeholder="Judul Dokumen..."
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowNewPageModal(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" className="text-xs font-semibold">
                                Buat Dokumen
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
