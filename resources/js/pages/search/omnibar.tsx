import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Search,
    Sparkles,
    Zap,
    CheckSquare,
    FolderGit2,
    BookOpen,
    Tag,
    Flame,
    User,
    Flag,
    Award,
    Clock,
    TrendingUp,
    ArrowRight,
    X,
    Trash2,
    Command,
    ExternalLink,
    CheckCircle2,
    Shield,
    Sliders,
} from 'lucide-react';

interface SearchResultItem {
    id: string;
    category: string;
    category_label: string;
    title: string;
    subtitle: string;
    url: string;
    badge: string;
    icon: string;
    updated_at?: string;
}

interface Metrics {
    total_indexed_entities: number;
    search_latency_ms: number;
    total_searches_today: number;
    search_status: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    query: string;
    selectedCategory: string;
    results: SearchResultItem[];
    counts: Record<string, number>;
    recentSearches: string[];
    trendingQueries: string[];
}

export default function OmniSearchPage({
    organization,
    metrics,
    query: initialQuery,
    selectedCategory: initialCategory,
    results,
    counts,
    recentSearches,
    trendingQueries,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(initialQuery || '');
    const [activeCategory, setActiveCategory] = useState(initialCategory || 'all');
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut for Cmd+K or / to focus search input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                searchInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const executeSearch = (q: string, cat: string) => {
        setIsSearching(true);
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (cat && cat !== 'all') params.set('category', cat);

        const url = `/search/omnibar${params.toString() ? `?${params.toString()}` : ''}`;
        router.get(url, {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSearching(false),
        });
    };

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        executeSearch(searchQuery, cat);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSearch(searchQuery, activeCategory);
    };

    const handleChipClick = (q: string) => {
        setSearchQuery(q);
        executeSearch(q, activeCategory);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        executeSearch('', activeCategory);
        searchInputRef.current?.focus();
    };

    const handleClearHistory = () => {
        fetch('/search/omnibar/clear', {
            method: 'POST',
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

    const handleItemClick = (item: SearchResultItem) => {
        fetch('/search/omnibar/click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                query: searchQuery,
                clicked_entity_type: item.category,
                clicked_entity_id: item.id,
            }),
        }).catch(() => {});
    };

    const renderCategoryIcon = (category: string) => {
        switch (category) {
            case 'projects':
                return <FolderGit2 className="h-4 w-4 text-blue-500" />;
            case 'tasks':
                return <CheckSquare className="h-4 w-4 text-emerald-500" />;
            case 'wiki':
                return <BookOpen className="h-4 w-4 text-amber-500" />;
            case 'releases':
                return <Tag className="h-4 w-4 text-purple-500" />;
            case 'incidents':
                return <Flame className="h-4 w-4 text-rose-500" />;
            case 'members':
                return <User className="h-4 w-4 text-indigo-500" />;
            case 'feature_flags':
                return <Flag className="h-4 w-4 text-cyan-500" />;
            case 'boardroom':
                return <Award className="h-4 w-4 text-amber-600" />;
            default:
                return <Sparkles className="h-4 w-4 text-primary" />;
        }
    };

    const categoryTabs = [
        { key: 'all', label: 'Semua', count: counts.all || 0 },
        { key: 'tasks', label: 'Tugas & Tiket', count: counts.tasks || 0 },
        { key: 'projects', label: 'Proyek', count: counts.projects || 0 },
        { key: 'wiki', label: 'Dokumen Wiki', count: counts.wiki || 0 },
        { key: 'releases', label: 'Rilis SemVer', count: counts.releases || 0 },
        { key: 'incidents', label: 'Insiden SRE', count: counts.incidents || 0 },
        { key: 'members', label: 'Anggota Tim', count: counts.members || 0 },
        { key: 'feature_flags', label: 'Feature Flags', count: counts.feature_flags || 0 },
        { key: 'boardroom', label: 'Boardroom Decks', count: counts.boardroom || 0 },
    ];

    return (
        <AppLayout>
            <Head title="Unified Search & Global Command Palette (Spotlight ⌘K Studio)" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md">
                            <Search className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Unified Search &amp; Spotlight Omnibar
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    Global Index
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pencarian kilat melintasi seluruh tugas, proyek, wiki, rilis, insiden, anggota, dan fitur organisasi
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium text-muted-foreground bg-muted border border-border rounded-lg shadow-xs">
                            <Command className="h-3 w-3" /> K
                        </kbd>
                    </div>
                </div>

                {/* Top Search Intelligence Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Indexed Entities */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Entitas Terindeks</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_indexed_entities.toLocaleString()}
                            </span>
                            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-[10px]">
                                Real-Time Sync
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Proyek, Tugas, Wiki, Rilis, SRE
                        </div>
                    </div>

                    {/* Latency */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Latensi Indeks</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                ~{metrics.search_latency_ms} ms
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Ultra Fast
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Pencarian instan berkecepatan tinggi
                        </div>
                    </div>

                    {/* Total Searches Today */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Aktivitas Pencarian Hari Ini</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Search className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_searches_today}
                            </span>
                            <span className="text-xs text-muted-foreground">kueri</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Interaksi omnibar tim
                        </div>
                    </div>

                    {/* Search Status */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Status Mesin Pencari</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                                Optimal
                            </span>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                100% Ready
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Seluruh relasi database aktif
                        </div>
                    </div>
                </div>

                {/* Hero Spotlight Search Input */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <form onSubmit={handleFormSubmit} className="relative">
                        <div className="relative flex items-center">
                            <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <Input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ketik kata kunci untuk mencari tugas, proyek, dokumen wiki, rilis, atau anggota... (Tekan ⌘K / /)"
                                className="h-12 pl-12 pr-24 text-sm font-medium rounded-xl border-border bg-muted/20 focus-visible:ring-indigo-500"
                            />
                            <div className="absolute right-2 flex items-center gap-1.5">
                                {searchQuery && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleClearSearch}
                                        className="h-8 w-8 p-0 text-muted-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSearching}
                                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                                >
                                    {isSearching ? 'Mencari...' : 'Cari'}
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        {categoryTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleCategoryClick(tab.key)}
                                className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                                    activeCategory === tab.key
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {searchQuery.trim() !== '' && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                            activeCategory === tab.key
                                                ? 'bg-white/20 text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* History & Trending Tags Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recent Searches */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Pencarian Terakhir Anda</span>
                            </span>
                            {recentSearches.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleClearHistory}
                                    className="h-6 text-[10px] text-muted-foreground hover:text-rose-500"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    <span>Bersihkan</span>
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {recentSearches.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Belum ada riwayat pencarian.</span>
                            ) : (
                                recentSearches.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleChipClick(q)}
                                        className="px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted border border-border/60 text-xs font-mono text-foreground transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Trending Queries */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                                <span>Kueri Tren Populer Organisasi</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {trendingQueries.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleChipClick(q)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono text-amber-600 dark:text-amber-400 transition-colors"
                                >
                                    🔥 {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Layout: Search Results (2/3) + Quick Action Palette (1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Cols: Search Results Feed */}
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Search className="h-4 w-4 text-indigo-600" />
                                <span>Hasil Pencarian</span>
                                {searchQuery.trim() !== '' && (
                                    <span className="text-xs text-muted-foreground font-normal">
                                        ({results.length} ditemukan untuk &ldquo;{searchQuery}&rdquo;)
                                    </span>
                                )}
                            </h3>
                        </div>

                        {results.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                    <Search className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-foreground">
                                        {searchQuery.trim() === '' ? 'Mulai Pencarian Entitas' : 'Tidak Ada Hasil yang Cocok'}
                                    </h4>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        {searchQuery.trim() === ''
                                            ? 'Ketikkan nama tugas, proyek, rilis, atau dokumen pada bilah pencarian di atas.'
                                            : `Tidak ditemukan entitas untuk "${searchQuery}". Coba gunakan kata kunci umum atau ubah kategori filter.`}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {results.map((item) => (
                                    <div
                                        key={`${item.category}-${item.id}`}
                                        className="rounded-2xl border border-border bg-card p-4 hover:border-indigo-500/50 hover:shadow-sm transition-all flex items-start justify-between gap-3 group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2.5 rounded-xl bg-muted/60 border border-border/40 shrink-0 mt-0.5">
                                                {renderCategoryIcon(item.category)}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Link
                                                        href={item.url}
                                                        onClick={() => handleItemClick(item)}
                                                        className="font-bold text-sm text-foreground hover:text-indigo-600 transition-colors"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                    <Badge className="text-[9px] font-mono bg-muted text-muted-foreground border-border">
                                                        {item.category_label}
                                                    </Badge>
                                                    {item.badge && (
                                                        <Badge className="text-[9px] font-mono bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                                                            {item.badge}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {item.subtitle}
                                                </p>
                                                {item.updated_at && (
                                                    <span className="text-[10px] text-muted-foreground font-mono block">
                                                        Diperbarui: {item.updated_at}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <Link
                                            href={item.url}
                                            onClick={() => handleItemClick(item)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        >
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 text-xs gap-1 text-indigo-600 font-semibold"
                                            >
                                                <span>Buka</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right 1 Col: Quick Actions & Shortcuts Studio Palette */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span>Aksi &amp; Pintasan Cepat (Command Palette)</span>
                        </h3>

                        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
                            <Link href="/organization/reports/boardroom" className="block">
                                <div className="p-3 rounded-xl bg-muted/30 hover:bg-amber-500/10 border border-border/40 hover:border-amber-500/30 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                                            <Award className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <strong className="text-xs text-foreground block group-hover:text-amber-600">
                                                Boardroom &amp; Slide Deck
                                            </strong>
                                            <span className="text-[10px] text-muted-foreground">Kokpit C-Level &amp; Presentasi Direksi</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-600" />
                                </div>
                            </Link>

                            <Link href="/organization/compliance/data-privacy" className="block">
                                <div className="p-3 rounded-xl bg-muted/30 hover:bg-indigo-500/10 border border-border/40 hover:border-indigo-500/30 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <strong className="text-xs text-foreground block group-hover:text-indigo-600">
                                                Data Privacy &amp; PII Redaction
                                            </strong>
                                            <span className="text-[10px] text-muted-foreground">Residensi Data ID PDP &amp; GDPR</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-600" />
                                </div>
                            </Link>

                            <Link href="/organization/database/drift" className="block">
                                <div className="p-3 rounded-xl bg-muted/30 hover:bg-blue-500/10 border border-border/40 hover:border-blue-500/30 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                            <Sliders className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <strong className="text-xs text-foreground block group-hover:text-blue-600">
                                                Database Drift &amp; Safe DDL
                                            </strong>
                                            <span className="text-[10px] text-muted-foreground">Zero-Downtime Migration Helper</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600" />
                                </div>
                            </Link>

                            <Link href="/organization/releases/publisher" className="block">
                                <div className="p-3 rounded-xl bg-muted/30 hover:bg-purple-500/10 border border-border/40 hover:border-purple-500/30 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                                            <Tag className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <strong className="text-xs text-foreground block group-hover:text-purple-600">
                                                AI Release Notes Publisher
                                            </strong>
                                            <span className="text-[10px] text-muted-foreground">SemVer Changelog &amp; Distribusi</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-600" />
                                </div>
                            </Link>

                            <Link href="/organization/incidents" className="block">
                                <div className="p-3 rounded-xl bg-muted/30 hover:bg-rose-500/10 border border-border/40 hover:border-rose-500/30 transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                                            <Flame className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <strong className="text-xs text-foreground block group-hover:text-rose-600">
                                                Incident War Rooms
                                            </strong>
                                            <span className="text-[10px] text-muted-foreground">Pusat Tanggap Darurat SRE</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-rose-600" />
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
