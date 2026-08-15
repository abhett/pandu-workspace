import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    Archive,
    CheckCircle2,
    Clock,
    FolderKanban,
    Grid3X3,
    Layers,
    List,
    MoreHorizontal,
    Plus,
    Search,
    Shield,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type MemberPreview = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type ProjectItem = {
    id: string;
    name: string;
    key: string;
    slug: string;
    type: 'scrum' | 'kanban' | 'bug_tracking' | 'general';
    color: string;
    icon: string;
    status: 'active' | 'archived' | 'on_hold';
    description: string | null;
    lead: {
        id: number;
        name: string;
        email: string;
    } | null;
    members_count: number;
    members: MemberPreview[];
    statuses_count: number;
    created_at: string;
};

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    projects: ProjectItem[];
    filters: {
        search?: string;
        status?: string;
        type?: string;
    };
    stats: {
        total: number;
        active: number;
        archived: number;
        scrum: number;
        kanban: number;
    };
};

export default function ProjectsIndex({
    organization,
    projects,
    filters,
    stats,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedType, setSelectedType] = useState<string>(
        filters.type ?? 'all',
    );
    const [selectedStatus, setSelectedStatus] = useState<string>(
        filters.status ?? 'active',
    );

    const handleFilterChange = (typeVal: string, statusVal: string) => {
        router.get(
            '/projects',
            {
                search: searchQuery || undefined,
                type: typeVal === 'all' ? undefined : typeVal,
                status: statusVal,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange(selectedType, selectedStatus);
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'scrum':
                return (
                    <Badge
                        variant="outline"
                        className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-mono text-[11px]"
                    >
                        <Layers className="mr-1 size-3" />
                        Scrum
                    </Badge>
                );
            case 'kanban':
                return (
                    <Badge
                        variant="outline"
                        className="border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-[11px]"
                    >
                        <FolderKanban className="mr-1 size-3" />
                        Kanban
                    </Badge>
                );
            case 'bug_tracking':
                return (
                    <Badge
                        variant="outline"
                        className="border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono text-[11px]"
                    >
                        <Shield className="mr-1 size-3" />
                        Bug Tracker
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="border-slate-500/30 bg-slate-500/10 text-slate-300 font-mono text-[11px]"
                    >
                        <CheckCircle2 className="mr-1 size-3" />
                        General
                    </Badge>
                );
        }
    };

    return (
        <>
            <Head title="Direktori Proyek" />

            <div className="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
                                {organization.name}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                                Work Management
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Direktori Proyek
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kelola ruang kerja, alur workflow, dan kolaborasi
                            tim lintas proyek aktif.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button asChild size="default" className="shadow-sm">
                            <Link href="/projects/create">
                                <Plus className="mr-1.5 size-4" />
                                Buat Proyek Baru
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Proyek
                            </span>
                            <FolderKanban className="size-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground mt-2">
                            {stats.total}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Seluruh riwayat workspace
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Proyek Aktif
                            </span>
                            <Activity className="size-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold text-foreground mt-2">
                            {stats.active}
                        </p>
                        <span className="text-[11px] text-emerald-500 font-medium">
                            Siap dikerjakan
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Alur Scrum
                            </span>
                            <Layers className="size-4 text-indigo-400" />
                        </div>
                        <p className="text-2xl font-bold text-foreground mt-2">
                            {stats.scrum}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Sprint & Backlog ready
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Alur Kanban
                            </span>
                            <Sparkles className="size-4 text-sky-400" />
                        </div>
                        <p className="text-2xl font-bold text-foreground mt-2">
                            {stats.kanban}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Continuous delivery
                        </span>
                    </div>
                </div>

                {/* Filter and View Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between rounded-xl border border-border bg-card/60 p-3">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="relative flex-1 max-w-md"
                    >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari berdasarkan nama atau kode proyek (PRJ)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background/80"
                        />
                    </form>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Type filter */}
                        <Select
                            value={selectedType}
                            onValueChange={(val) => {
                                setSelectedType(val);
                                handleFilterChange(val, selectedStatus);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[130px] text-xs">
                                <SelectValue placeholder="Metodologi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua Tipe
                                </SelectItem>
                                <SelectItem value="scrum">Scrum</SelectItem>
                                <SelectItem value="kanban">Kanban</SelectItem>
                                <SelectItem value="bug_tracking">
                                    Bug Tracker
                                </SelectItem>
                                <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status filter */}
                        <Select
                            value={selectedStatus}
                            onValueChange={(val) => {
                                setSelectedStatus(val);
                                handleFilterChange(selectedType, val);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[120px] text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="archived">
                                    Diarsipkan
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* View Switcher */}
                        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'grid'
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Grid View"
                            >
                                <Grid3X3 className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'table'
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                title="Table View"
                            >
                                <List className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Section: Grid or Table */}
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
                        <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                            <FolderKanban className="size-7" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Belum Ada Proyek Ditemukan
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                            {searchQuery || selectedType !== 'all'
                                ? 'Tidak ada proyek yang sesuai dengan kriteria filter pencarian Anda.'
                                : 'Mulai workspace organisasi Anda dengan membuat proyek pertama dari template pilihan.'}
                        </p>
                        <Button asChild>
                            <Link href="/projects/create">
                                <Plus className="mr-1.5 size-4" />
                                Buat Proyek Baru
                            </Link>
                        </Button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
                            >
                                <div>
                                    {/* Top Bar: Icon, Key, Type, Menu */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="size-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                                                style={{
                                                    backgroundColor:
                                                        project.color ||
                                                        '#3b82f6',
                                                }}
                                            >
                                                <span className="font-mono text-xs">
                                                    {project.key}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-mono text-xs font-semibold text-primary">
                                                    {project.key}
                                                </span>
                                                <div className="mt-0.5">
                                                    {getTypeBadge(project.type)}
                                                </div>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-foreground"
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>
                                                    Opsi Proyek
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`/projects/${project.id}`}
                                                    >
                                                        Ringkasan Proyek
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`/projects/${project.id}/settings`}
                                                    >
                                                        Pengaturan & Workflow
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => {
                                                        if (
                                                            confirm(
                                                                `Yakin ingin menghapus proyek "${project.name}"?`,
                                                            )
                                                        ) {
                                                            router.delete(
                                                                `/projects/${project.id}`,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Hapus Proyek
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Title & Description */}
                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="block group-hover:text-primary transition-colors"
                                    >
                                        <h2 className="text-base font-semibold text-foreground line-clamp-1">
                                            {project.name}
                                        </h2>
                                    </Link>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                                        {project.description ||
                                            'Tidak ada deskripsi proyek.'}
                                    </p>
                                </div>

                                {/* Bottom Metadata: Lead, Members, Statuses */}
                                <div className="pt-4 mt-4 border-t border-border/60 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <UserCheck className="size-3.5 text-primary" />
                                            <span className="truncate max-w-[120px]">
                                                {project.lead?.name ||
                                                    'Tanpa Lead'}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[11px]">
                                            {project.statuses_count} Alur Kolom
                                        </span>
                                    </div>

                                    {/* Member Avatars and CTA */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex -space-x-2 overflow-hidden">
                                            {project.members
                                                .slice(0, 4)
                                                .map((m) => (
                                                    <div
                                                        key={m.id}
                                                        title={`${m.name} (${m.role})`}
                                                        className="size-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-semibold text-foreground"
                                                    >
                                                        {m.name.charAt(0)}
                                                    </div>
                                                ))}
                                            {project.members_count > 4 && (
                                                <div className="size-6 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary">
                                                    +
                                                    {project.members_count - 4}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-primary hover:text-primary/90"
                                        >
                                            <Link
                                                href={`/projects/${project.id}`}
                                            >
                                                Buka Workspace →
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Table View */
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-mono">
                                    <tr>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Proyek
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Key
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Tipe
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Lead
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Anggota
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Dibuat
                                        </th>
                                        <th className="py-3.5 px-4 text-right font-semibold">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {projects.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="size-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                p.color ||
                                                                '#3b82f6',
                                                        }}
                                                    >
                                                        {p.key.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            href={`/projects/${p.id}`}
                                                            className="font-medium text-foreground hover:text-primary transition-colors block"
                                                        >
                                                            {p.name}
                                                        </Link>
                                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                                            {p.description ||
                                                                'Tanpa deskripsi'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-semibold text-xs text-primary">
                                                {p.key}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {getTypeBadge(p.type)}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-foreground">
                                                {p.lead?.name || '-'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users className="size-3.5" />
                                                    <span>
                                                        {p.members_count} orang
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                                                {p.created_at}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs"
                                                >
                                                    <Link
                                                        href={`/projects/${p.id}`}
                                                    >
                                                        Buka
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

ProjectsIndex.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Direktori Proyek',
        href: '/projects',
    },
];
