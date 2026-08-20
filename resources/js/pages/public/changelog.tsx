import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Flame,
    Globe,
    Heart,
    Package,
    PartyPopper,
    Rocket,
    Share2,
    Sparkles,
    ThumbsUp,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReleaseItem {
    id: string;
    version: string;
    title: string;
    description?: string;
    type: 'major' | 'minor' | 'patch' | 'hotfix';
    published_at?: string;
    content?: {
        new_features?: string[];
        improvements?: string[];
        bug_fixes?: string[];
        breaking_changes?: string[];
    };
    reactions_count?: number;
}

interface PublicChangelogProps {
    releases?: ReleaseItem[];
}

export default function PublicChangelogPage({
    releases = [],
}: PublicChangelogProps) {
    const [selectedType, setSelectedType] = useState<string>('all');
    const [copiedVersion, setCopiedVersion] = useState<string | null>(null);
    const [reactionsMap, setReactionsMap] = useState<Record<string, Record<string, number>>>({});

    const handleCopy = (version: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/changelog#${version}`);
        setCopiedVersion(version);
        setTimeout(() => setCopiedVersion(null), 2000);
    };

    const handleReact = async (releaseId: string, emoji: string) => {
        setReactionsMap((prev) => {
            const relReactions = prev[releaseId] || {};
            const currentCount = relReactions[emoji] || 0;
            return {
                ...prev,
                [releaseId]: {
                    ...relReactions,
                    [emoji]: currentCount + 1,
                },
            };
        });

        try {
            await fetch(`/changelog/${releaseId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ emoji }),
            });
        } catch (e) {
            console.error('Error posting reaction:', e);
        }
    };

    const filteredReleases = releases.filter(
        (r) => selectedType === 'all' || r.type === selectedType
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            <Head title="Catatan Rilis & Changelog - Pandu Management" />

            {/* Public Header Nav */}
            <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border/80 h-16">
                <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs">
                                P
                            </div>
                            <span className="font-bold text-sm tracking-tight text-foreground">
                                Pandu System
                            </span>
                        </Link>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
                        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                            Beranda
                        </Link>
                        <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                            Tentang Kami
                        </Link>
                        <Link href="/news" className="text-muted-foreground hover:text-foreground transition-colors">
                            Berita
                        </Link>
                        <Link href="/changelog" className="text-primary font-bold transition-colors">
                            Changelog
                        </Link>
                        <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                            Kontak
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm" className="text-xs font-semibold">
                                Masuk
                            </Button>
                        </Link>
                        <Link href="/onboarding">
                            <Button size="sm" className="text-xs font-semibold gap-1.5 shadow-xs">
                                <span>Mulai Sekarang</span>
                                <ArrowRight className="size-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Timeline */}
            <main className="flex-1 pt-24 pb-16 px-6 max-w-4xl mx-auto w-full space-y-10 animate-fade-in">
                {/* Hero Header */}
                <div className="space-y-3 text-center max-w-xl mx-auto">
                    <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-primary/30 text-primary bg-primary/5">
                        Product Changelog & Updates
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                        Catatan Rilis & Pembaruan Sistem
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Ikuti perkembangan fitur baru, perbaikan bug, dan optimasi performa terbaru di Pandu Work Management System.
                    </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-b border-border pb-4">
                    {[
                        { id: 'all', label: 'Semua Rilis' },
                        { id: 'major', label: '🚀 Major' },
                        { id: 'minor', label: '✨ Minor' },
                        { id: 'patch', label: '🐞 Patch' },
                        { id: 'hotfix', label: '⚡ Hotfix' },
                    ].map((type) => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => setSelectedType(type.id)}
                            className={cn(
                                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                                selectedType === type.id
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Timeline Releases List */}
                <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 sm:before:left-8 before:w-0.5 before:bg-border/60 before:pointer-events-none">
                    {filteredReleases.length === 0 ? (
                        <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3 relative z-10">
                            <Rocket className="size-10 text-muted-foreground mx-auto" />
                            <h3 className="text-base font-bold text-foreground">Belum Ada Rilis Publik</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Belum ada catatan rilis yang dipublikasikan dalam kategori ini.
                            </p>
                        </div>
                    ) : (
                        filteredReleases.map((rel) => {
                            const relReactions = reactionsMap[rel.id] || {};
                            return (
                                <article
                                    key={rel.id}
                                    id={rel.version}
                                    className="bg-card rounded-3xl border border-border p-6 sm:p-8 space-y-6 shadow-sm hover:border-primary/40 transition-colors relative z-10 ml-6 sm:ml-14"
                                >
                                    {/* Timeline Pin Dot */}
                                    <div className="absolute -left-9 sm:-left-17 top-7 w-6 h-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-xs">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>

                                    {/* Header Release Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black font-mono text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
                                                {rel.version}
                                            </span>
                                            <div>
                                                <h2 className="text-base sm:text-lg font-bold text-foreground">{rel.title}</h2>
                                                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="size-3" /> {rel.published_at ? rel.published_at.slice(0, 10) : 'Baru Dirilis'}
                                                </span>
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

                                            <button
                                                type="button"
                                                onClick={() => handleCopy(rel.version)}
                                                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                                title="Salin Tautan Rilis"
                                            >
                                                {copiedVersion === rel.version ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {rel.description && (
                                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                            {rel.description}
                                        </p>
                                    )}

                                    {/* Categorized Changes List */}
                                    <div className="space-y-4 pt-1">
                                        {/* New Features */}
                                        {rel.content?.new_features && rel.content.new_features.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-primary" /> Fitur Baru
                                                </h3>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.new_features.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                                            <span className="text-primary font-bold mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Improvements */}
                                        {rel.content?.improvements && rel.content.improvements.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Zap className="size-3.5 text-blue-400" /> Peningkatan Kinerja & UX
                                                </h3>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.improvements.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                                            <span className="text-blue-400 font-bold mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Bug Fixes */}
                                        {rel.content?.bug_fixes && rel.content.bug_fixes.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <CheckCircle2 className="size-3.5 text-emerald-400" /> Perbaikan Bug
                                                </h3>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {rel.content.bug_fixes.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                                            <span className="text-emerald-400 font-bold mt-0.5">•</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Breaking Changes */}
                                        {rel.content?.breaking_changes && rel.content.breaking_changes.length > 0 && (
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                                                    <AlertTriangle className="size-3.5" /> Perubahan Berdampak (Breaking Changes)
                                                </h3>
                                                <ul className="space-y-1.5 text-xs text-destructive/90">
                                                    {rel.content.breaking_changes.map((f, i) => (
                                                        <li key={i} className="flex items-start gap-2 bg-destructive/5 p-2.5 rounded-xl border border-destructive/20">
                                                            <span className="font-bold mt-0.5">!</span>
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Emoji Reaction Bar */}
                                    <div className="pt-4 border-t border-border/80 flex items-center justify-between">
                                        <span className="text-[11px] font-mono text-muted-foreground">Reaksi Rilis:</span>
                                        <div className="flex items-center gap-2">
                                            {[
                                                { id: 'rocket', emoji: '🚀' },
                                                { id: 'heart', emoji: '❤️' },
                                                { id: 'party', emoji: '🎉' },
                                                { id: 'fire', emoji: '🔥' },
                                                { id: 'thumbs_up', emoji: '👍' },
                                            ].map((r) => {
                                                const count = relReactions[r.id] || 0;
                                                return (
                                                    <button
                                                        key={r.id}
                                                        type="button"
                                                        onClick={() => handleReact(rel.id, r.id)}
                                                        className="px-2.5 py-1 rounded-full bg-card hover:bg-muted border border-border text-xs flex items-center gap-1.5 transition-all hover:scale-110 active:scale-95"
                                                    >
                                                        <span>{r.emoji}</span>
                                                        {count > 0 && <span className="font-mono text-[10px] font-bold text-muted-foreground">{count}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Public Footer */}
            <footer className="border-t border-border/80 bg-card py-8 px-6">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p>© 2026 Pandu Work Management System. Seluruh hak cipta dilindungi.</p>
                    <div className="flex items-center gap-4">
                        <Link href="/about" className="hover:text-foreground">Tentang</Link>
                        <Link href="/news" className="hover:text-foreground">Berita</Link>
                        <Link href="/changelog" className="hover:text-foreground">Changelog</Link>
                        <Link href="/contact" className="hover:text-foreground">Kontak</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
