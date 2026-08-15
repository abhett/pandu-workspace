import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Building2,
    Calendar,
    FolderKanban,
    Plus,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { Auth } from '@/types';

export default function Dashboard() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const org = auth.organization;

    return (
        <>
            <Head title="Dashboard - Pandu AI" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 font-sans md:p-6 lg:p-8">
                {/* Header Welcome Bar */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span className="flex items-center gap-1 font-semibold text-tertiary">
                                <Sparkles className="size-3.5" />
                                <span>AI Work Management</span>
                            </span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="font-semibold text-primary">
                                {org?.name ?? 'Organisasi Utama'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Selamat Datang, {user?.name}!
                        </h1>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Pantau kemajuan sprint, distribusi beban kerja tim,
                            dan insight rekomendasi kecerdasan buatan.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent"
                        >
                            <Bot className="size-4 text-tertiary" />
                            <span>Tanya Asisten AI</span>
                        </button>
                        <Link
                            href="/onboarding/organization"
                            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            <span>Buat Proyek</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats Row (Design Slicing) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Stat Card 1: Due Tasks */}
                    <div className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-destructive/30">
                        <div className="flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                <AlertCircle className="size-5" />
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                <TrendingUp className="size-3" /> +2
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                14
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                Tugas Jatuh Tempo Minggu Ini
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-3/4 rounded-full bg-destructive transition-all duration-500 group-hover:w-full" />
                        </div>
                    </div>

                    {/* Stat Card 2: New Tasks */}
                    <div className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/30">
                        <div className="flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FolderKanban className="size-5" />
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                Active Sprint
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                28
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                Total Tugas Aktif di Papan
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-1/2 rounded-full bg-primary transition-all duration-500 group-hover:w-3/4" />
                        </div>
                    </div>

                    {/* Stat Card 3: AI Intelligence Card */}
                    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-tertiary/40">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                                <Sparkles className="size-5" />
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-tertiary/10 px-2 py-0.5 font-mono text-xs font-semibold text-tertiary">
                                98.4% On Track
                            </span>
                        </div>
                        <div className="relative z-10 mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                AI Insight
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                Beban kerja sprint terdistribusi seimbang
                            </div>
                        </div>
                        <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-medium text-tertiary">
                            <span>Lihat analisa sprint</span>
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid: 8 Cols & 4 Cols */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column (8 cols): Active Work & Priority Tasks */}
                    <div className="flex flex-col gap-6 lg:col-span-8">
                        {/* Priority Tasks Table / Kanban Preview Card */}
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">
                                        Papan Tugas Prioritas
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Tugas yang memerlukan perhatian dalam
                                        sprint berjalan
                                    </p>
                                </div>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                    Sprint 1 Aktif
                                </span>
                            </div>

                            <div className="mt-4 divide-y divide-border">
                                <div className="flex items-center justify-between rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-status-inprogress" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-primary">
                                                    WMS-101
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    Konfigurasi Multi-Tenancy &
                                                    Isolasi Data Organisasi
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>Sprint 1</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 font-mono text-tertiary">
                                                    <Sparkles className="size-3" />{' '}
                                                    AI Validated
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-md bg-status-inprogress/10 px-2.5 py-1 text-xs font-semibold text-status-inprogress">
                                            In Progress
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-status-todo" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-primary">
                                                    WMS-102
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    Implementasi Role & Granular
                                                    Permissions (RBAC)
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>Sprint 2 Siap</span>
                                                <span>•</span>
                                                <span className="font-medium text-amber-500">
                                                    Prioritas Tinggi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-md bg-status-todo/10 px-2.5 py-1 text-xs font-semibold text-status-todo">
                                            To Do
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="size-2 rounded-full bg-status-done" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                                    WMS-100
                                                </span>
                                                <span className="text-sm font-semibold text-foreground line-through opacity-75">
                                                    Design System & Alur
                                                    Onboarding Organisasi
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>Sprint 0 & 1</span>
                                                <span>•</span>
                                                <span className="text-status-done">
                                                    Selesai Diverifikasi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-md bg-status-done/10 px-2.5 py-1 text-xs font-semibold text-status-done">
                                            Done
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workspace Summary Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <div className="mb-3 flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold tracking-wider uppercase">
                                        Organisasi Aktif
                                    </span>
                                    <Building2 className="size-4 text-primary" />
                                </div>
                                <div className="truncate text-xl font-bold text-foreground">
                                    {org?.name ?? 'Belum ada organisasi'}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Slug:{' '}
                                    <span className="font-mono text-primary">
                                        {org?.slug ?? '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <div className="mb-3 flex items-center justify-between text-muted-foreground">
                                    <span className="text-xs font-semibold tracking-wider uppercase">
                                        Anggota Tim
                                    </span>
                                    <Users className="size-4 text-tertiary" />
                                </div>
                                <div className="text-xl font-bold text-foreground">
                                    1 Anggota Aktif
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Peran Anda:{' '}
                                    <span className="font-semibold text-foreground">
                                        Owner
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (4 cols): AI Activity & Milestones */}
                    <div className="flex flex-col gap-6 lg:col-span-4">
                        {/* AI Feed Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border pb-3">
                                <Bot className="size-4 text-tertiary" />
                                <h3 className="text-sm font-bold text-foreground">
                                    Aktivitas Asisten AI
                                </h3>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="flex items-start gap-3 text-xs">
                                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-tertiary" />
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            Sprint 0 & 1 Verification Complete
                                        </p>
                                        <p className="mt-0.5 text-muted-foreground">
                                            38 unit & feature tests
                                            terverifikasi 100% lulus.
                                        </p>
                                        <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">
                                            Baru saja
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-xs">
                                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            Optimasi Papan Kanban
                                        </p>
                                        <p className="mt-0.5 text-muted-foreground">
                                            Algoritma lexicographic ranking siap
                                            untuk multi-assignee junction.
                                        </p>
                                        <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">
                                            15 menit lalu
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Milestone Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border pb-3">
                                <Calendar className="size-4 text-primary" />
                                <h3 className="text-sm font-bold text-foreground">
                                    Tenggat Waktu Sprint
                                </h3>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center justify-between rounded-xl bg-muted/60 p-2.5 text-xs">
                                    <div>
                                        <div className="font-semibold text-foreground">
                                            Sprint 1: IAM & Tenant
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Hari ini
                                        </div>
                                    </div>
                                    <span className="rounded bg-status-done/10 px-2 py-0.5 text-[10px] font-bold text-status-done">
                                        Done
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-muted/60 p-2.5 text-xs">
                                    <div>
                                        <div className="font-semibold text-foreground">
                                            Sprint 2: Roles & Permissions
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Target berikutnya
                                        </div>
                                    </div>
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                        Next
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];
