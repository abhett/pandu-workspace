import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Columns3,
    FolderKanban,
    Layers,
    LayoutDashboard,
    ListTodo,
    Plus,
    Settings,
    Shield,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

type MemberItem = {
    id: number;
    membership_id: string;
    name: string;
    email: string;
    role: 'lead' | 'admin' | 'member' | 'viewer';
    joined_at: string;
};

type StatusItem = {
    id: string;
    name: string;
    slug: string;
    category: 'unstarted' | 'started' | 'completed' | 'cancelled';
    color: string;
    position: number;
    is_initial: boolean;
    is_completed: boolean;
    wip_limit: number | null;
};

type ProjectDetail = {
    id: string;
    name: string;
    key: string;
    slug: string;
    type: 'scrum' | 'kanban' | 'bug_tracking' | 'general';
    color: string;
    icon: string;
    status: string;
    description: string | null;
    created_at: string;
    lead: {
        id: number;
        name: string;
        email: string;
    } | null;
    default_assignee: {
        id: number;
        name: string;
    } | null;
    members: MemberItem[];
    statuses: StatusItem[];
};

type OrgMember = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    project: ProjectDetail;
    availableOrgMembers: OrgMember[];
};

export default function ProjectOverview({
    organization,
    project,
    availableOrgMembers,
}: Props) {
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    const {
        data: addData,
        setData: setAddData,
        post: postAddMember,
        processing: isAdding,
        reset: resetAddMember,
        errors: addErrors,
    } = useForm({
        user_id: '',
        role: 'member',
    });

    const handleAddMemberSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postAddMember(`/projects/${project.id}/members`, {
            onSuccess: () => {
                setIsAddMemberOpen(false);
                resetAddMember();
            },
        });
    };

    const handleRemoveMember = (membershipId: string, memberName: string) => {
        if (
            confirm(
                `Keluarkan ${memberName} dari tim proyek "${project.name}"?`,
            )
        ) {
            router.delete(`/projects/${project.id}/members/${membershipId}`);
        }
    };

    const handleRoleChange = (membershipId: string, newRole: string) => {
        router.patch(`/projects/${project.id}/members/${membershipId}`, {
            role: newRole,
        });
    };

    const unassignedOrgMembers = availableOrgMembers.filter(
        (om) => !project.members.some((pm) => pm.id === om.id),
    );

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'unstarted':
                return (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400">
                        Antrean / Backlog
                    </span>
                );
            case 'started':
                return (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-sky-400">
                        Sedang Dikerjakan
                    </span>
                );
            case 'completed':
                return (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400">
                        Selesai
                    </span>
                );
            default:
                return (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-rose-400">
                        Dibatalkan
                    </span>
                );
        }
    };

    return (
        <>
            <Head title={`${project.name} (${project.key}) - Ringkasan Proyek`} />

            <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
                {/* Top Navigation & Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                        href="/projects"
                        className="hover:text-foreground transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft className="size-3.5" />
                        Direktori Proyek
                    </Link>
                    <span>/</span>
                    <span className="text-foreground font-medium">
                        {project.name}
                    </span>
                </div>

                {/* Project Header Banner */}
                <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div
                            className="size-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-md font-mono text-xl shrink-0"
                            style={{
                                backgroundColor: project.color || '#3b82f6',
                            }}
                        >
                            {project.key}
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                                    {project.name}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="font-mono text-xs text-primary border-primary/30 bg-primary/10"
                                >
                                    {project.key}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="capitalize text-xs"
                                >
                                    {project.type}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs"
                                >
                                    {project.status === 'active'
                                        ? 'Aktif'
                                        : project.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                {project.description ||
                                    'Tidak ada deskripsi detail untuk proyek ini.'}
                            </p>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Button asChild className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm">
                            <Link href={`/projects/${project.id}/board`}>
                                <Columns3 className="size-3.5" />
                                Buka Papan Kanban
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
                            <Link href={`/projects/${project.id}/tasks`}>
                                <ListTodo className="size-3.5" />
                                Daftar Tugas
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                            <Link href={`/projects/${project.id}/settings`}>
                                <Settings className="size-3.5" />
                                Pengaturan
                            </Link>
                        </Button>
                    </div>

                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                            Alur Status
                        </span>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {project.statuses.length} Kolom
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Pipeline alur kerja
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                            Anggota Tim
                        </span>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {project.members.length} Orang
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Kontributor aktif
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                            Project Lead
                        </span>
                        <p className="text-lg font-bold text-foreground mt-1 truncate">
                            {project.lead?.name || 'Belum ditentukan'}
                        </p>
                        <span className="text-[11px] text-muted-foreground truncate block">
                            {project.lead?.email || '-'}
                        </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                            Tanggal Dibuat
                        </span>
                        <p className="text-lg font-bold text-foreground mt-1 font-mono">
                            {project.created_at}
                        </p>
                        <span className="text-[11px] text-muted-foreground">
                            Inisiasi ruang kerja
                        </span>
                    </div>
                </div>

                {/* Workflow Status Pipeline Visualization */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Columns3 className="size-5 text-primary" />
                                Alur Kerja & Pipeline Kolom Status
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Representasi tahapan siklus kerja tugas dari
                                awal hingga selesai.
                            </p>
                        </div>

                        <Button asChild variant="ghost" size="sm">
                            <Link href={`/projects/${project.id}/settings`}>
                                Sesuaikan Alur →
                            </Link>
                        </Button>
                    </div>

                    {/* Pipeline Sequence */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                        {project.statuses.map((status, index) => (
                            <div
                                key={status.id}
                                className="rounded-xl border border-border bg-background p-3.5 space-y-2 relative overflow-hidden"
                            >
                                <div
                                    className="absolute top-0 left-0 right-0 h-1"
                                    style={{
                                        backgroundColor:
                                            status.color || '#3b82f6',
                                    }}
                                />
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                    {status.wip_limit && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[9px] font-mono px-1.5 py-0"
                                        >
                                            WIP: {status.wip_limit}
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="font-semibold text-sm text-foreground">
                                    {status.name}
                                </h3>
                                <div>{getCategoryBadge(status.category)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project Team Members Roster */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Users className="size-5 text-primary" />
                                Roster Anggota Proyek ({project.members.length})
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Anggota organisasi yang memiliki akses ke proyek
                                ini.
                            </p>
                        </div>

                        {/* Quick Add Member Modal */}
                        <Dialog
                            open={isAddMemberOpen}
                            onOpenChange={setIsAddMemberOpen}
                        >
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <UserPlus className="mr-1.5 size-4" />
                                    Tambah Anggota
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Tambah Anggota ke Proyek
                                    </DialogTitle>
                                    <DialogDescription>
                                        Pilih anggota dari organisasi{' '}
                                        <strong>{organization.name}</strong>{' '}
                                        untuk ditugaskan ke dalam proyek ini.
                                    </DialogDescription>
                                </DialogHeader>

                                <form
                                    onSubmit={handleAddMemberSubmit}
                                    className="space-y-4 pt-2"
                                >
                                    <div className="space-y-1.5">
                                        <Label htmlFor="member-select">
                                            Pilih Pengguna
                                        </Label>
                                        <Select
                                            value={addData.user_id}
                                            onValueChange={(val) =>
                                                setAddData('user_id', val)
                                            }
                                        >
                                            <SelectTrigger id="member-select">
                                                <SelectValue placeholder="Pilih anggota organisasi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {unassignedOrgMembers.map(
                                                    (m) => (
                                                        <SelectItem
                                                            key={m.id}
                                                            value={m.id.toString()}
                                                        >
                                                            {m.name} ({m.email})
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {addErrors.user_id && (
                                            <p className="text-xs text-destructive">
                                                {addErrors.user_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="role-select">
                                            Peran dalam Proyek
                                        </Label>
                                        <Select
                                            value={addData.role}
                                            onValueChange={(val) =>
                                                setAddData('role', val)
                                            }
                                        >
                                            <SelectTrigger id="role-select">
                                                <SelectValue placeholder="Pilih peran" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lead">
                                                    Project Lead
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    Project Admin
                                                </SelectItem>
                                                <SelectItem value="member">
                                                    Member (Kontributor)
                                                </SelectItem>
                                                <SelectItem value="viewer">
                                                    Viewer (Hanya-Lihat)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {addErrors.role && (
                                            <p className="text-xs text-destructive">
                                                {addErrors.role}
                                            </p>
                                        )}
                                    </div>

                                    <DialogFooter className="pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                setIsAddMemberOpen(false)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isAdding || !addData.user_id
                                            }
                                        >
                                            {isAdding && (
                                                <Spinner className="mr-2 size-4" />
                                            )}
                                            Tambahkan ke Proyek
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Members List Table */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground uppercase font-mono border-b border-border">
                                <tr>
                                    <th className="py-3 px-4">Nama Pengguna</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Peran Proyek</th>
                                    <th className="py-3 px-4">Bergabung</th>
                                    <th className="py-3 px-4 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {project.members.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="hover:bg-muted/20"
                                    >
                                        <td className="py-3 px-4 font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <span>{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                                            {member.email}
                                        </td>
                                        <td className="py-3 px-4">
                                            <Select
                                                value={member.role}
                                                onValueChange={(val) =>
                                                    handleRoleChange(
                                                        member.membership_id,
                                                        val,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-[120px] text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="lead">
                                                        Lead
                                                    </SelectItem>
                                                    <SelectItem value="admin">
                                                        Admin
                                                    </SelectItem>
                                                    <SelectItem value="member">
                                                        Member
                                                    </SelectItem>
                                                    <SelectItem value="viewer">
                                                        Viewer
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                                            {member.joined_at}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleRemoveMember(
                                                        member.membership_id,
                                                        member.name,
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

ProjectOverview.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Direktori Proyek',
        href: '/projects',
    },
];
