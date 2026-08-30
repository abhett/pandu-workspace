import React, { useState, useEffect, useRef } from 'react';
import { router, Link } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search,
    Sparkles,
    CheckSquare,
    FolderGit2,
    BookOpen,
    FileText,
    User,
    Clock,
    ArrowRight,
    CornerDownLeft,
    X,
    Loader2,
    LayoutDashboard,
    Inbox,
    Calendar,
    Folder,
    Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResultItem {
    id: string;
    category: string;
    category_label: string;
    title: string;
    subtitle: string;
    url: string;
    badge?: string;
    icon?: string;
}

interface GlobalSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when opened
    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Live search query with debounce
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(() => {
            fetch(`/search/omnibar/query?q=${encodeURIComponent(query.trim())}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    setResults(data.results || []);
                    setSelectedIndex(0);
                    setIsLoading(false);
                })
                .catch(() => {
                    setIsLoading(false);
                });
        }, 200);

        return () => clearTimeout(timer);
    }, [query]);

    // Quick navigation shortcuts when query is empty
    const quickNavs = [
        { title: 'Dashboard Utama', subtitle: 'Ringkasan metrik & tugas', url: '/dashboard', icon: LayoutDashboard, category: 'Navigasi' },
        { title: 'Daftar Proyek', subtitle: 'Katalog proyek organisasi', url: '/projects', icon: FolderGit2, category: 'Navigasi' },
        { title: 'Kotak Masuk (Inbox)', subtitle: 'Pemberitahuan & tindakan', url: '/inbox', icon: Inbox, category: 'Navigasi' },
        { title: 'Wiki & Dokumen', subtitle: 'Basis pengetahuan tim', url: '/wiki', icon: BookOpen, category: 'Navigasi' },
        { title: 'Kalender Kerja', subtitle: 'Jadwal & batas waktu', url: '/calendar', icon: Calendar, category: 'Navigasi' },
        { title: 'Manajemen Berkas', subtitle: 'Penyimpanan aset & media', url: '/files', icon: Folder, category: 'Navigasi' },
    ];

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'tasks':
                return <CheckSquare className="size-4 text-emerald-400" />;
            case 'projects':
                return <FolderGit2 className="size-4 text-blue-400" />;
            case 'wiki':
                return <BookOpen className="size-4 text-purple-400" />;
            case 'files':
                return <FileText className="size-4 text-amber-400" />;
            case 'members':
                return <User className="size-4 text-pink-400" />;
            default:
                return <Sparkles className="size-4 text-primary" />;
        }
    };

    const handleSelectUrl = (url: string) => {
        onOpenChange(false);
        router.visit(url);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const activeList = query.trim() ? results : quickNavs;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, activeList.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + activeList.length) % Math.max(1, activeList.length));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeList[selectedIndex]) {
                handleSelectUrl(activeList[selectedIndex].url);
            } else if (query.trim()) {
                handleSelectUrl(`/search/omnibar?q=${encodeURIComponent(query.trim())}`);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col gap-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Pencarian Global Spotlight</DialogTitle>
                </DialogHeader>

                {/* Search Input Header */}
                <div className="flex items-center px-4 border-b border-border bg-muted/20 gap-3">
                    <Search className="size-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cari tugas, proyek, dokumen wiki, berkas, atau menu..."
                        className="h-14 border-0 bg-transparent text-sm font-medium focus-visible:ring-0 shadow-none px-0 text-foreground placeholder:text-muted-foreground"
                    />
                    {isLoading && <Loader2 className="size-4 text-primary animate-spin shrink-0" />}
                    {query && !isLoading && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto max-h-[420px] p-2 space-y-1 divide-y divide-transparent">
                    {query.trim() ? (
                        results.length > 0 ? (
                            <div className="space-y-1">
                                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                                    <span>Hasil Pencarian ({results.length})</span>
                                    <span>Gunakan ↑ ↓ untuk navigasi</span>
                                </div>
                                {results.map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        onClick={() => handleSelectUrl(item.url)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={cn(
                                            'flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors text-xs gap-3',
                                            selectedIndex === idx ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/40 text-muted-foreground'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-xl bg-background border border-border/80 shrink-0 shadow-2xs">
                                                {getCategoryIcon(item.category)}
                                            </div>
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground truncate block">
                                                        {item.title}
                                                    </span>
                                                    {item.badge && (
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                                                            {item.badge}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {item.subtitle || item.category_label}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                                            <span className="text-[10px] font-mono uppercase">{item.category_label}</span>
                                            <CornerDownLeft className="size-3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !isLoading ? (
                            <div className="py-12 text-center space-y-2 text-muted-foreground">
                                <Search className="size-8 mx-auto stroke-[1.5] text-muted-foreground/60" />
                                <p className="text-xs font-semibold text-foreground">Tidak ditemukan hasil untuk "{query}"</p>
                                <p className="text-[11px]">Coba gunakan kata kunci lain atau buka pencarian lanjutan.</p>
                            </div>
                        ) : null
                    ) : (
                        <div className="space-y-1">
                            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                Pintasan Navigasi Cepat
                            </div>
                            {quickNavs.map((nav, idx) => {
                                const Icon = nav.icon;
                                return (
                                    <div
                                        key={nav.url}
                                        onClick={() => handleSelectUrl(nav.url)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={cn(
                                            'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs gap-3',
                                            selectedIndex === idx ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/40 text-muted-foreground'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-background border border-border/80 shrink-0 shadow-2xs">
                                                <Icon className="size-4 text-primary" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground block">{nav.title}</span>
                                                <span className="text-[11px] text-muted-foreground">{nav.subtitle}</span>
                                            </div>
                                        </div>
                                        <CornerDownLeft className="size-3 text-muted-foreground" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px]">Esc</kbd>
                        <span>Tutup</span>
                    </div>
                    {query.trim() && (
                        <Link
                            href={`/search/omnibar?q=${encodeURIComponent(query.trim())}`}
                            onClick={() => onOpenChange(false)}
                            className="text-primary font-semibold hover:underline flex items-center gap-1 font-sans"
                        >
                            <span>Halaman Pencarian Lengkap</span>
                            <ArrowRight className="size-3" />
                        </Link>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
