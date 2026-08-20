import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    Eye,
    Flag,
    Globe,
    Layers,
    Lightbulb,
    Lock,
    Rocket,
    ShieldCheck,
    Sparkles,
    Target,
    Users,
    Zap,
} from 'lucide-react';

export default function PublicAboutPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            <Head title="Tentang Kami & Visi Perusahaan - Pandu Management" />

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
                        <Link href="/about" className="text-primary font-bold transition-colors">
                            Tentang Kami
                        </Link>
                        <Link href="/news" className="text-muted-foreground hover:text-foreground transition-colors">
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
                                <span>Mulai Sekarang</span>
                                <ArrowRight className="size-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full space-y-16 animate-fade-in">
                {/* Section 1: Vision & Mission */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                        <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-primary/30 text-primary bg-primary/5">
                            Visi & Misi Perusahaan
                        </Badge>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                            Membentuk Masa Depan <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Kerja Kolaboratif</span>.
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Kami percaya bahwa kecerdasan buatan bukan sekadar alat, melainkan mitra kerja strategis. Visi kami adalah mengotomatisasi kompleksitas operasional agar tim rekayasa perangkat lunak dan manajemen proyek dapat fokus pada inovasi sejati.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="bg-card rounded-2xl border border-border p-5 space-y-2 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Eye className="size-4" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground">Visi Utama</h3>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Menjadi platform manajemen kerja berbasis AI terdepan di Asia Tenggara pada tahun 2028.
                                </p>
                            </div>

                            <div className="bg-card rounded-2xl border border-border p-5 space-y-2 shadow-xs">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                    <Flag className="size-4" />
                                </div>
                                <h3 className="text-sm font-bold text-foreground">Misi Kami</h3>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Menyediakan platform kolaborasi cerdas, aman, andal, dan terjangkau untuk setiap pengembang.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats & SLA Showcase Card */}
                    <div className="bg-card rounded-3xl border border-border p-8 space-y-6 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-bl-full blur-2xl pointer-events-none" />

                        <div className="space-y-2">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                                Enterprise Reliability
                            </Badge>
                            <h2 className="text-2xl font-bold text-foreground">
                                Performa & Skalabilitas Teruji
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Dipercaya oleh berbagai tim lintas industri untuk kelancaran eksekusi sprint dan tata kelola tugas harian.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-muted/30 rounded-2xl p-4 space-y-1 border border-border/60">
                                <span className="text-2xl font-black font-mono text-emerald-400">99.9%</span>
                                <span className="text-[11px] text-muted-foreground block font-mono">Uptime SLA</span>
                            </div>
                            <div className="bg-muted/30 rounded-2xl p-4 space-y-1 border border-border/60">
                                <span className="text-2xl font-black font-mono text-primary">50jt+</span>
                                <span className="text-[11px] text-muted-foreground block font-mono">Tugas Selesai</span>
                            </div>
                            <div className="bg-muted/30 rounded-2xl p-4 space-y-1 border border-border/60">
                                <span className="text-2xl font-black font-mono text-purple-400">&lt; 45ms</span>
                                <span className="text-[11px] text-muted-foreground block font-mono">API Gateway P99</span>
                            </div>
                            <div className="bg-muted/30 rounded-2xl p-4 space-y-1 border border-border/60">
                                <span className="text-2xl font-black font-mono text-amber-400">SOC-2</span>
                                <span className="text-[11px] text-muted-foreground block font-mono">Kepatuhan Data</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Why Choose Us */}
                <section className="space-y-8 pt-6 border-t border-border">
                    <div className="text-center space-y-2 max-w-2xl mx-auto">
                        <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                            Keunggulan Sistem
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Mengapa Memilih Pandu Management?
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Dibangun untuk skala enterprise, dirancang untuk kecepatan startup dengan fondasi AI kinetik.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Feature 1: Security */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <ShieldCheck className="size-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-foreground">Keamanan Fin-Grade</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Enkripsi end-to-end, sesi berbasis MFA, kontrol akses berbasis peran (RBAC), dan audit logging lengkap.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2: Scalability */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <Rocket className="size-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-foreground">Skalabilitas Elastis</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Arsitektur modern yang mampu menangani ribuan sprint concurrent dan sinkronisasi websocket berlatensi rendah.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3: AI Co-Pilot */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 hover:border-primary/40 transition-colors shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                <Sparkles className="size-6" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-base font-bold text-foreground">Inovasi AI Cerdas</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Dukungan multi-model (Gemini, OpenAI, Claude, Ollama) untuk penguraian backlog dan rekomendasi tugas otomatis.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
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
