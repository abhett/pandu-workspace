import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Bot, Kanban, Shield, Sparkles } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { dashboard, login } from '@/routes';
import type { Auth } from '@/types';

export default function Welcome() {
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <>
            <Head title="Pandu AI - Enterprise Work Management System" />

            <div className="text-on-background selection:text-on-primary relative min-h-screen overflow-hidden bg-background font-sans selection:bg-primary">
                {/* Ambient Glowing Orbs */}
                <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary-container/20 mix-blend-screen blur-[140px]" />
                <div className="pointer-events-none absolute top-1/3 -right-20 h-[450px] w-[450px] rounded-full bg-secondary-container/20 mix-blend-screen blur-[130px]" />
                <div className="pointer-events-none absolute bottom-10 left-10 h-[400px] w-[400px] rounded-full bg-tertiary/10 mix-blend-screen blur-[120px]" />

                {/* Navigation Header */}
                <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-container shadow-md">
                                <AppLogoIcon className="size-5 fill-current text-primary" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-on-surface">
                                Pandu AI
                            </span>
                            <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary sm:inline-block">
                                Enterprise WMS
                            </span>
                        </div>

                        <nav className="hidden items-center gap-8 md:flex">
                            <a
                                href="#features"
                                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                            >
                                Fitur Utama
                            </a>
                            <a
                                href="#capabilities"
                                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                            >
                                Kapabilitas AI
                            </a>
                            <a
                                href="#architecture"
                                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                            >
                                Arsitektur
                            </a>
                        </nav>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />

                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="text-on-primary flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:bg-primary/90"
                                >
                                    <span>Buka Dashboard</span>
                                    <ArrowRight className="size-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                                    >
                                        Masuk
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="text-on-primary flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                                    >
                                        <span>Daftar Gratis</span>
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="relative px-6 pt-20 pb-24 text-center lg:px-8 lg:pt-28">
                    <div className="mx-auto max-w-4xl">
                        {/* Innovation Pill */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md">
                            <Sparkles className="size-3.5 text-primary" />
                            <span>
                                Generasi Baru Manajemen Kerja Berbasis AI
                            </span>
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl sm:leading-[1.15]">
                            Kelola Proyek, Sprint, dan Tim dengan{' '}
                            <span className="bg-gradient-to-r from-primary via-tertiary to-primary bg-clip-text text-transparent">
                                Kecerdasan Buatan Terpadu
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-base text-on-surface-variant sm:text-lg">
                            Platform work management enterprise generasi baru
                            yang menggabungkan papan Kanban cerdas, perencanaan
                            backlog, otomatisasi alur kerja, dan asisten AI
                            kontekstual.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="text-on-primary flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all hover:scale-105 hover:bg-primary/90"
                                >
                                    <span>Masuk ke Workspace Anda</span>
                                    <ArrowRight className="size-5" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/register"
                                        className="text-on-primary flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all hover:scale-105 hover:bg-primary/90"
                                    >
                                        <span>Mulai Sekarang Gratis</span>
                                        <ArrowRight className="size-5" />
                                    </Link>
                                    <Link
                                        href={login()}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-container/60 px-8 py-3.5 text-base font-semibold text-on-surface backdrop-blur-md transition-all hover:bg-surface-container"
                                    >
                                        <span>Masuk ke Akun</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* App Preview Mockup Container */}
                    <div className="relative mx-auto mt-16 max-w-5xl">
                        <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface-container/40 p-2 shadow-2xl backdrop-blur-2xl">
                            <div className="flex h-9 items-center gap-2 border-b border-white/5 bg-surface-container-lowest/80 px-4">
                                <div className="size-2.5 rounded-full bg-red-500/80" />
                                <div className="size-2.5 rounded-full bg-yellow-500/80" />
                                <div className="size-2.5 rounded-full bg-green-500/80" />
                                <div className="ml-4 flex items-center gap-2 rounded-md bg-surface-container px-3 py-0.5 font-mono text-[11px] text-on-surface-variant">
                                    <span>
                                        https://app.pandu.ai/workspace/board
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 rounded-b-2xl bg-surface-container-low/80 p-6 text-left md:grid-cols-4">
                                <div className="rounded-xl border border-white/5 bg-surface-container p-4">
                                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-status-backlog">
                                        <span>BACKLOG (4)</span>
                                        <span className="rounded bg-status-backlog/10 px-2 py-0.5 text-[10px]">
                                            Sprint 1
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="rounded-lg border border-white/5 bg-surface/80 p-3 text-xs text-on-surface">
                                            <div className="mb-1 font-semibold text-primary">
                                                PROJ-101
                                            </div>
                                            <div>
                                                Integrasi Vector Database
                                                pgvector
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-white/5 bg-surface/80 p-3 text-xs text-on-surface">
                                            <div className="mb-1 font-semibold text-primary">
                                                PROJ-102
                                            </div>
                                            <div>
                                                Otomatisasi Triage Tiket Support
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/5 bg-surface-container p-4">
                                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-status-todo">
                                        <span>TO DO (3)</span>
                                        <span className="rounded bg-status-todo/10 px-2 py-0.5 text-[10px]">
                                            In Queue
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="rounded-lg border border-white/5 bg-surface/80 p-3 text-xs text-on-surface">
                                            <div className="mb-1 font-semibold text-status-todo">
                                                PROJ-103
                                            </div>
                                            <div>
                                                Granular Role-Based Access
                                                Control
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/5 bg-surface-container p-4">
                                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-status-inprogress">
                                        <span>IN PROGRESS (2)</span>
                                        <span className="rounded bg-status-inprogress/10 px-2 py-0.5 text-[10px]">
                                            Active
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="rounded-lg border border-primary/30 bg-surface/80 p-3 text-xs text-on-surface shadow-sm">
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="font-semibold text-status-inprogress">
                                                    PROJ-104
                                                </span>
                                                <span className="flex items-center gap-1 font-mono text-[10px] text-tertiary">
                                                    <Sparkles className="size-2.5" />{' '}
                                                    AI Assisted
                                                </span>
                                            </div>
                                            <div>
                                                Arsitektur Multi-Tenancy &
                                                Organisasi
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/5 bg-surface-container p-4">
                                    <div className="mb-3 flex items-center justify-between text-xs font-semibold text-status-done">
                                        <span>DONE (8)</span>
                                        <span className="rounded bg-status-done/10 px-2 py-0.5 text-[10px]">
                                            Verified
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="rounded-lg border border-white/5 bg-surface/80 p-3 text-xs text-on-surface opacity-80">
                                            <div className="mb-1 font-semibold text-status-done">
                                                PROJ-100
                                            </div>
                                            <div>
                                                Autentikasi & Onboarding Setup
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Core Pillars Section */}
                <section
                    id="features"
                    className="border-t border-white/5 bg-surface-container-lowest/50 px-6 py-24 lg:px-8"
                >
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto mb-16 max-w-2xl text-center">
                            <h2 className="mb-2 text-xs font-bold tracking-widest text-primary uppercase">
                                Fitur Unggulan
                            </h2>
                            <p className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
                                Didesain Khusus untuk Skalabilitas Tim Modern
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/5 bg-surface-container/50 p-8 transition-all hover:border-white/10 hover:bg-surface-container/80">
                                <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Kanban className="size-6" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold text-on-surface">
                                    Papan Kanban Real-Time
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    Drag-and-drop lancar dengan algoritma
                                    ranking leksikografis (seperti Linear/Figma)
                                    untuk konsistensi konkurensi multi-user.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-surface-container/50 p-8 transition-all hover:border-white/10 hover:bg-surface-container/80">
                                <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                                    <Bot className="size-6" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold text-on-surface">
                                    Asisten AI & Otomasi
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    Ringkasan rapat & sprint otomatis, deteksi
                                    ketergantungan task bermasalah, serta
                                    rekomendasi estimasi berbasis machine
                                    learning.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-surface-container/50 p-8 transition-all hover:border-white/10 hover:bg-surface-container/80">
                                <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-secondary-container/50 text-secondary">
                                    <Shield className="size-6" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold text-on-surface">
                                    Keamanan Multi-Tenancy
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    Isolasi data organisasi berbasis PostgreSQL,
                                    pengidentifikasi aman UUIDv7, dan kontrol
                                    hak akses granular tingkat korporasi.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/5 bg-background py-10 text-center text-xs text-on-surface-variant/60">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <AppLogoIcon className="size-4 fill-current text-primary" />
                            <span className="font-semibold text-on-surface">
                                Pandu AI
                            </span>
                            <span>
                                &copy; {new Date().getFullYear()} Pandu
                                Management. All rights reserved.
                            </span>
                        </div>
                        <div className="flex gap-6">
                            <Link
                                href={login()}
                                className="transition-colors hover:text-on-surface"
                            >
                                Masuk
                            </Link>
                            <Link
                                href="/register"
                                className="transition-colors hover:text-on-surface"
                            >
                                Pendaftaran
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
