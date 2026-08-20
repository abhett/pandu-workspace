import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    ChevronRight,
    Clock,
    Flame,
    Layers,
    Newspaper,
    Sparkles,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicNewsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const articles = [
        {
            id: 1,
            category: 'product',
            categoryLabel: 'Pembaruan Produk',
            date: '24 Okt 2024',
            title: 'Integrasi Baru dengan Google Gemini: Meningkatkan Analisis Prediktif',
            description:
                'Kami mengumumkan peluncuran integrasi mendalam dengan model AI terbaru Google Gemini 1.5 Pro. Pembaruan ini membawa lompatan besar dalam kemampuan sistem kami untuk memprediksi kemacetan proyek dan sprint.',
            readTime: '4 menit baca',
            featured: true,
        },
        {
            id: 2,
            category: 'scrum',
            categoryLabel: 'Manajemen Proyek',
            date: '18 Okt 2024',
            title: 'Tips Mengoptimalkan Alur Kerja Scrum dengan Bantuan AI Co-Pilot',
            description:
                'Pelajari bagaimana kecerdasan buatan dapat secara otomatis mengurutkan backlog dan mengestimasi poin cerita untuk sprint planning yang lebih efisien.',
            readTime: '5 menit baca',
            featured: false,
        },
        {
            id: 3,
            category: 'ai',
            categoryLabel: 'Wawasan AI',
            date: '12 Okt 2024',
            title: 'Masa Depan AI dalam Manajemen Proyek Skala Enterprise',
            description:
                'Mengeksplorasi tren otomasi, pengambilan keputusan algoritmik, dan bagaimana tech lead dapat beradaptasi dengan alat generasi berikutnya.',
            readTime: '6 menit baca',
            featured: false,
        },
        {
            id: 4,
            category: 'case-study',
            categoryLabel: 'Studi Kasus',
            date: '05 Okt 2024',
            title: 'Bagaimana TechCorp Mengurangi Waktu Rapat Hingga 40%',
            description:
                'Transformasi manajemen agile dan integrasi asynchronous standup otomatis membantu ratusan engineer tetap produktif tanpa meeting berlebih.',
            readTime: '3 menit baca',
            featured: false,
        },
    ];

    const filtered = articles.filter(
        (a) => selectedCategory === 'all' || a.category === selectedCategory
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            <Head title="Berita & Artikel Terbaru - Pandu Management" />

            {/* Public Header Nav */}
            <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border/80 h-16">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
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
                        <Link href="/news" className="text-primary font-bold transition-colors">
                            Berita & Wawasan
                        </Link>
                        <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                            Kontak & Konsultasi
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
                                <span>Mulai Gratis</span>
                                <ArrowRight className="size-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full space-y-10 animate-fade-in">
                {/* Hero Header */}
                <div className="space-y-3 max-w-2xl">
                    <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-primary/30 text-primary bg-primary/5">
                        Wawasan & Inovasi
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                        Berita, Rilis & Artikel Terbaru
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Wawasan terkini seputar inovasi AI, pembaruan produk, dan strategi manajemen proyek agile untuk tim modern berkinerja tinggi.
                    </p>
                </div>

                {/* Filter Categories */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-b border-border pb-4">
                    {[
                        { id: 'all', label: 'Semua Kategori' },
                        { id: 'product', label: 'Pembaruan Produk' },
                        { id: 'ai', label: 'Wawasan AI' },
                        { id: 'scrum', label: 'Manajemen Proyek' },
                        { id: 'case-study', label: 'Studi Kasus' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                                selectedCategory === cat.id
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Featured / Articles Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Featured Hero Article (8 Cols) */}
                    <div className="lg:col-span-8 bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-5 relative overflow-hidden group hover:border-primary/40 transition-colors shadow-xs">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                                Pembaruan Produk Unggulan
                            </Badge>
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                <Calendar className="size-3" /> 24 Okt 2024
                            </span>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                                Integrasi Baru dengan Google Gemini: Meningkatkan Analisis Prediktif
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                Kami sangat antusias mengumumkan peluncuran integrasi mendalam dengan model AI terbaru Google Gemini 1.5 Pro. Pembaruan ini membawa lompatan besar dalam kemampuan sistem kami untuk memprediksi kemacetan proyek sebelum terjadi.
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/80">
                            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                                <Clock className="size-3.5" /> 4 menit baca
                            </span>
                            <Button variant="ghost" size="sm" className="text-xs text-primary font-bold gap-1 group-hover:translate-x-1 transition-transform">
                                <span>Baca Selengkapnya</span>
                                <ArrowRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Secondary Articles List (4 Cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        {filtered.slice(1, 3).map((art) => (
                            <div
                                key={art.id}
                                className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:border-primary/40 transition-colors group shadow-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {art.categoryLabel}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground">
                                        {art.date}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                    {art.title}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {art.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Popular Case Studies Section */}
                <div className="space-y-4 pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <TrendingUp className="size-4 text-primary" /> Studi Kasus & Riset Populer
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                                Perbankan Digital
                            </span>
                            <h4 className="text-xs font-bold text-foreground leading-snug">
                                Bagaimana Bank Digital Menghasilkan 120+ Rilis Sprint Tanpa Insiden Kritis
                            </h4>
                        </div>
                        <div className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                                E-Commerce Scale
                            </span>
                            <h4 className="text-xs font-bold text-foreground leading-snug">
                                Otomatisasi Alur Pengujian Regresi & Backlog Triage untuk 80+ Pengembang
                            </h4>
                        </div>
                        <div className="bg-card rounded-2xl border border-border p-5 space-y-3 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                                AI Governance
                            </span>
                            <h4 className="text-xs font-bold text-foreground leading-snug">
                                Penerapan Tata Kelola Audit Log & GDPR Compliance untuk Startup Seri B
                            </h4>
                        </div>
                    </div>
                </div>
            </main>

            {/* Public Footer */}
            <footer className="border-t border-border/80 bg-card py-8 px-6">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p>© 2026 Pandu Work Management System. Seluruh hak cipta dilindungi.</p>
                    <div className="flex items-center gap-4">
                        <Link href="/about" className="hover:text-foreground">Tentang</Link>
                        <Link href="/news" className="hover:text-foreground">Berita</Link>
                        <Link href="/contact" className="hover:text-foreground">Kontak</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
