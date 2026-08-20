import React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock,
    HelpCircle,
    Mail,
    MapPin,
    Phone,
    Send,
    Sparkles,
} from 'lucide-react';

export default function PublicContactPage() {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;

    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        email: '',
        subject: 'sales' as 'sales' | 'support' | 'partnership' | 'other',
        message: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/contact', {
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            <Head title="Hubungi Kami & Konsultasi Transformasi Digital - Pandu Management" />

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
                        <Link href="/news" className="text-muted-foreground hover:text-foreground transition-colors">
                            Berita & Wawasan
                        </Link>
                        <Link href="/contact" className="text-primary font-bold transition-colors">
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
            <main className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full space-y-10 animate-fade-in">
                {/* Header Title */}
                <div className="space-y-3 max-w-2xl">
                    <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-primary/30 text-primary bg-primary/5">
                        Hubungi Tim Kami
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                        Diskusikan Kebutuhan Kolaborasi & AI Anda
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Tim spesialis Pandu System siap membantu Anda. Kirimkan pertanyaan teknis, konsultasi demo enterprise, atau kunjungi kantor kami.
                    </p>
                </div>

                {/* Success Flash Banner */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                        <CheckCircle2 className="size-4" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Form (7 Cols) */}
                    <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-md">
                        <div className="space-y-1 pb-2 border-b border-border">
                            <h2 className="text-lg font-bold text-foreground">Kirim Pesan Langsung</h2>
                            <p className="text-xs text-muted-foreground">
                                Isi formulir di bawah ini dan kami akan merespon dalam waktu maksimal 1x24 jam.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Nama Lengkap</label>
                                    <Input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="John Doe"
                                        className="h-10 text-xs"
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Email Perusahaan</label>
                                    <Input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="john@company.com"
                                        className="h-10 text-xs"
                                        required
                                    />
                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Kategori Subjek</label>
                                <select
                                    value={data.subject}
                                    onChange={(e) => setData('subject', e.target.value as any)}
                                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary h-10"
                                >
                                    <option value="sales">Pertanyaan Penjualan & Demo Enterprise</option>
                                    <option value="support">Dukungan Teknis & API</option>
                                    <option value="partnership">Kemitraan & Integrasi</option>
                                    <option value="other">Lainnya</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">Isi Pesan</label>
                                <Textarea
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    placeholder="Jelaskan kebutuhan tim Anda atau pertanyaan yang ingin disampaikan..."
                                    className="text-xs min-h-[120px]"
                                    required
                                />
                                {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto font-semibold gap-2 shadow-xs"
                            >
                                <Send className="size-3.5" />
                                <span>{processing ? 'Mengirim Pesan...' : 'Kirim Pesan'}</span>
                            </Button>
                        </form>
                    </div>

                    {/* Right Info Cards (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-card rounded-2xl border border-border p-5 space-y-2 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <MapPin className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-foreground">Kantor Pusat</h3>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        SCBD Tower, Lt 24<br />
                                        Jl. Jend. Sudirman Kav 52-53, Jakarta Selatan 12190
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border p-5 space-y-2 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                    <Mail className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-foreground">Email Resmi</h3>
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                        support@pandu.id<br />
                                        sales@pandu.id
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border p-5 space-y-2 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                                    <Clock className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-foreground">Jam Operasional</h3>
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        Senin - Jumat, 09:00 - 18:00 WIB<br />
                                        (Dukungan Server 24/7 untuk Enterprise SLA)
                                    </p>
                                </div>
                            </div>
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
