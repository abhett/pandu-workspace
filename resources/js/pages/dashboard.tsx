import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Bot,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FolderKanban,
    Layers,
    Plus,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { Auth } from '@/types';

interface TaskItem {
    id: string;
    key: string;
    title: string;
    priority: string;
    due_date?: string | null;
    is_overdue: boolean;
    project: {
        id: string;
        name: string;
        key: string;
        color: string;
    } | null;
    status: {
        id: string;
        name: string;
        color?: string;
        category: string;
    };
    sprint_name?: string | null;
    assignees: Array<{ id: number; name: string }>;
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    time_ago: string;
    type: string;
}

interface MilestoneItem {
    id: string;
    name: string;
    project_name?: string | null;
    project_key?: string | null;
    status: string;
    time_label: string;
}

interface DashboardProps {
    stats?: {
        due_this_week: number;
        overdue_count: number;
        active_tasks_count: number;
        total_tasks_count: number;
        completed_tasks_count: number;
        completion_rate: number;
        active_sprint_name: string;
        ai_insight: string;
    };
    priorityTasks?: TaskItem[];
    recentActivities?: ActivityItem[];
    sprintMilestones?: MilestoneItem[];
    summary?: {
        organization_name: string;
        organization_slug: string;
        organization_plan: string;
        total_members: number;
        total_projects: number;
        user_role: string;
        user_title: string;
    };
}

export default function Dashboard({
    stats = {
        due_this_week: 0,
        overdue_count: 0,
        active_tasks_count: 0,
        total_tasks_count: 0,
        completed_tasks_count: 0,
        completion_rate: 100,
        active_sprint_name: 'Workspace Siap',
        ai_insight: 'Beban kerja terdistribusi dengan seimbang.',
    },
    priorityTasks = [],
    recentActivities = [],
    sprintMilestones = [],
    summary = {
        organization_name: 'Pandu AI',
        organization_slug: 'org',
        organization_plan: 'Enterprise',
        total_members: 1,
        total_projects: 0,
        user_role: 'member',
        user_title: 'Team Member',
    },
}: DashboardProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth?.user;
    const org = auth?.organization;

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
                                {summary.organization_name || org?.name || 'Organisasi Utama'}
                            </span>
                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                {summary.organization_plan}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Selamat Datang, {user?.name}!
                        </h1>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Pantau kemajuan sprint, distribusi beban kerja tim,
                            dan insight rekomendasi kecerdasan buatan secara real-time.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <Link
                            href="/search"
                            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent"
                        >
                            <Bot className="size-4 text-tertiary" />
                            <span>Tanya Asisten AI</span>
                        </Link>
                        <Link
                            href="/projects/create"
                            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
                        >
                            <Plus className="size-4" />
                            <span>Buat Proyek</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats Row (Dynamic Metrics) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Stat Card 1: Due Tasks */}
                    <Link
                        href="/inbox"
                        className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-destructive/40 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                <AlertCircle className="size-5" />
                            </div>
                            <span
                                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                    stats.overdue_count > 0
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}
                            >
                                <TrendingUp className="size-3" />
                                {stats.overdue_count > 0
                                    ? `${stats.overdue_count} Lewat Tenggat`
                                    : 'Tepat Waktu'}
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                {stats.due_this_week}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                Tugas Jatuh Tempo Minggu Ini
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    stats.overdue_count > 0
                                        ? 'bg-destructive w-3/4 group-hover:w-full'
                                        : 'bg-emerald-500 w-full'
                                }`}
                            />
                        </div>
                    </Link>

                    {/* Stat Card 2: Active Tasks */}
                    <Link
                        href="/projects"
                        className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FolderKanban className="size-5" />
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {stats.active_sprint_name}
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                {stats.active_tasks_count}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                                Total Tugas Aktif di Papan ({stats.total_tasks_count} total)
                            </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(10, stats.completion_rate))}%` }}
                            />
                        </div>
                    </Link>

                    {/* Stat Card 3: AI Intelligence Card */}
                    <Link
                        href="/reports"
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-tertiary/40 hover:shadow-md"
                    >
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                                <Sparkles className="size-5" />
                            </div>
                            <span className="flex items-center gap-1 rounded-md bg-tertiary/10 px-2 py-0.5 font-mono text-xs font-semibold text-tertiary">
                                {stats.completion_rate}% Selesai
                            </span>
                        </div>
                        <div className="relative z-10 mt-4">
                            <div className="text-3xl font-bold text-foreground">
                                AI Insight
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground line-clamp-2">
                                {stats.ai_insight}
                            </div>
                        </div>
                        <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-medium text-tertiary">
                            <span>Lihat analisa sprint</span>
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                </div>

                {/* Main Content Grid: 8 Cols & 4 Cols */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column (8 cols): Priority Tasks & Workspace Summary */}
                    <div className="flex flex-col gap-6 lg:col-span-8">
                        {/* Priority Tasks Table / Kanban Preview Card */}
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-foreground">
                                        Papan Tugas Prioritas
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Tugas aktif yang memerlukan perhatian dalam workspace berjalan
                                    </p>
                                </div>
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                    {stats.active_sprint_name}
                                </span>
                            </div>

                            {priorityTasks.length > 0 ? (
                                <div className="mt-4 divide-y divide-border">
                                    {priorityTasks.map((task) => {
                                        const isDone =
                                            task.status?.category === 'done';
                                        const isInProgress =
                                            task.status?.category === 'inprogress';

                                        const statusDotColor = isDone
                                            ? 'bg-status-done'
                                            : isInProgress
                                              ? 'bg-status-inprogress'
                                              : 'bg-status-todo';

                                        const statusBadgeBg = isDone
                                            ? 'bg-status-done/10 text-status-done'
                                            : isInProgress
                                              ? 'bg-status-inprogress/10 text-status-inprogress'
                                              : 'bg-status-todo/10 text-status-todo';

                                        const targetHref = task.project
                                            ? `/projects/${task.project.id}/board`
                                            : '/projects';

                                        return (
                                            <Link
                                                key={task.id}
                                                href={targetHref}
                                                className="group flex items-center justify-between rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className={`size-2 shrink-0 rounded-full ${statusDotColor}`}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-primary shrink-0">
                                                                {task.key}
                                                            </span>
                                                            <span
                                                                className={`text-sm font-semibold truncate ${
                                                                    isDone
                                                                        ? 'line-through text-muted-foreground opacity-75'
                                                                        : 'text-foreground'
                                                                }`}
                                                            >
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span>
                                                                {task.project?.name ||
                                                                    task.sprint_name ||
                                                                    'Proyek'}
                                                            </span>
                                                            {task.due_date && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span
                                                                        className={`flex items-center gap-1 font-medium ${
                                                                            task.is_overdue
                                                                                ? 'text-destructive font-bold'
                                                                                : ''
                                                                        }`}
                                                                    >
                                                                        <Clock className="size-3" />
                                                                        {task.due_date}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {task.priority && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="capitalize text-muted-foreground">
                                                                        {task.priority}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                                    <span
                                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusBadgeBg}`}
                                                    >
                                                        {task.status?.name || (isDone ? 'Done' : 'To Do')}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="mt-6 flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl">
                                    <CheckCircle2 className="size-8 text-muted-foreground/50 mb-2" />
                                    <p className="text-sm font-medium text-foreground">
                                        Tidak ada tugas prioritas saat ini
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                        Semua tugas prioritas telah selesai atau belum ada tugas aktif.
                                    </p>
                                    <Link
                                        href="/projects"
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                                    >
                                        <Plus className="size-3.5" /> Buat Tugas Baru
                                    </Link>
                                </div>
                            )}
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
                                    {summary.organization_name}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Slug:</span>
                                    <span className="font-mono text-primary">
                                        {summary.organization_slug}
                                    </span>
                                    <span>•</span>
                                    <span>{summary.total_projects} Proyek</span>
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
                                    {summary.total_members} Anggota Aktif
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Peran Anda:{' '}
                                    <span className="font-semibold text-foreground capitalize">
                                        {summary.user_title || summary.user_role}
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
                                    Aktivitas & Log Terkini
                                </h3>
                            </div>

                            <div className="mt-4 space-y-4">
                                {recentActivities.map((act) => (
                                    <div
                                        key={act.id}
                                        className="flex items-start gap-3 text-xs"
                                    >
                                        <div
                                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                                act.type === 'ai'
                                                    ? 'bg-tertiary'
                                                    : act.type === 'system'
                                                      ? 'bg-primary'
                                                      : 'bg-emerald-500'
                                            }`}
                                        />
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {act.title}
                                            </p>
                                            <p className="mt-0.5 text-muted-foreground line-clamp-2">
                                                {act.description}
                                            </p>
                                            <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">
                                                {act.time_ago}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Milestone Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-border pb-3">
                                <Calendar className="size-4 text-primary" />
                                <h3 className="text-sm font-bold text-foreground">
                                    Tenggat Waktu Sprint & Milestone
                                </h3>
                            </div>
                            <div className="mt-4 space-y-3">
                                {sprintMilestones.length > 0 ? (
                                    sprintMilestones.map((m) => {
                                        const isDone = m.status === 'completed';
                                        const isActive = m.status === 'active';

                                        const badgeBg = isDone
                                            ? 'bg-status-done/10 text-status-done'
                                            : isActive
                                              ? 'bg-primary/10 text-primary'
                                              : 'bg-muted text-muted-foreground';

                                        return (
                                            <div
                                                key={m.id}
                                                className="flex items-center justify-between rounded-xl bg-muted/60 p-2.5 text-xs"
                                            >
                                                <div className="min-w-0 mr-2">
                                                    <div className="font-semibold text-foreground truncate">
                                                        {m.name}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground truncate">
                                                        {m.project_name
                                                            ? `${m.project_name} • `
                                                            : ''}
                                                        {m.time_label}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold capitalize ${badgeBg}`}
                                                >
                                                    {m.status === 'completed'
                                                        ? 'Done'
                                                        : m.status === 'active'
                                                          ? 'Active'
                                                          : 'Planned'}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        Belum ada sprint aktif.
                                    </div>
                                )}
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
