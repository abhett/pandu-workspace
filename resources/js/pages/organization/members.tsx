import { Head, router } from '@inertiajs/react';
import {
    Lock,
    Mail,
    MoreHorizontal,
    Plus,
    Search,
    Shield,
    ShieldCheck,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
    id: string;
    user_id: number;
    name: string;
    email: string;
    role: string;
    role_id: string | null;
    role_name: string;
    title: string;
    status: string;
    has_2fa: boolean;
    last_login_at: string;
    joined_at: string;
    teams: Array<{
        id: string;
        name: string;
        department: string;
    }>;
};

type PendingInvite = {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
};

type RoleOption = {
    id: string;
    name: string;
    slug: string;
    is_system: boolean;
};

type TeamOption = {
    id: string;
    name: string;
    department: string;
};

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    members: MemberItem[];
    pendingInvitations: PendingInvite[];
    availableRoles: RoleOption[];
    availableTeams?: TeamOption[];
    stats: {
        total_members: number;
        active_now: number;
        pending_invitations: number;
    };
};

export default function OrganizationMembers({
    organization,
    members,
    pendingInvitations,
    availableRoles,
    availableTeams = [],
    stats,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
        'members',
    );

    // Invite Modal state
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isSendingInvite, setIsSendingInvite] = useState(false);

    // Manual Add Member state
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualPassword, setManualPassword] = useState('password123');
    const [manualRole, setManualRole] = useState('member');
    const [manualTitle, setManualTitle] = useState('Software Engineer');
    const [manualSelectedTeamIds, setManualSelectedTeamIds] = useState<
        string[]
    >([]);
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);

    // Edit Role state
    const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
    const [editRole, setEditRole] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    // Filter members
    const filteredMembers = useMemo(() => {
        return members.filter(
            (m) =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.teams.some((t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
                ),
        );
    }, [members, searchQuery]);

    // Send Invite
    const handleSendInvite = (e: React.FormEvent) => {
        e.preventDefault();

        if (!inviteEmail.trim()) {
            return;
        }

        setIsSendingInvite(true);
        router.post(
            '/organization/invitations',
            {
                email: inviteEmail,
                role: inviteRole,
            },
            {
                onSuccess: () => {
                    setIsInviteOpen(false);
                    setInviteEmail('');
                    setInviteRole('member');
                    setIsSendingInvite(false);
                },
                onError: () => {
                    setIsSendingInvite(false);
                },
            },
        );
    };

    // Manual Add Member Submit
    const handleManualAddMember = (e: React.FormEvent) => {
        e.preventDefault();

        if (!manualName.trim() || !manualEmail.trim()) {
            return;
        }

        setIsSubmittingManual(true);
        router.post(
            '/organization/members',
            {
                name: manualName,
                email: manualEmail,
                password: manualPassword,
                role: manualRole,
                title: manualTitle,
                team_ids: manualSelectedTeamIds,
            },
            {
                onSuccess: () => {
                    setIsManualAddOpen(false);
                    setManualName('');
                    setManualEmail('');
                    setManualPassword('password123');
                    setManualRole('member');
                    setManualTitle('Software Engineer');
                    setManualSelectedTeamIds([]);
                    setIsSubmittingManual(false);
                },
                onError: () => {
                    setIsSubmittingManual(false);
                },
            },
        );
    };

    // Update member role
    const handleUpdateRole = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingMember) {
            return;
        }

        setIsUpdatingRole(true);
        router.patch(
            `/organization/members/${editingMember.id}/role`,
            {
                role: editRole,
                title: editTitle,
            },
            {
                onSuccess: () => {
                    setEditingMember(null);
                    setIsUpdatingRole(false);
                },
                onError: () => {
                    setIsUpdatingRole(false);
                },
            },
        );
    };

    // Remove member
    const handleRemoveMember = (member: MemberItem) => {
        if (
            confirm(
                `Apakah Anda yakin ingin mengeluarkan "${member.name}" dari organisasi ${organization.name}?`,
            )
        ) {
            router.delete(`/organization/members/${member.id}`);
        }
    };

    // Cancel invite
    const handleCancelInvite = (inviteId: string) => {
        if (confirm('Batalkan undangan ini?')) {
            router.delete(`/organization/invitations/${inviteId}`);
        }
    };

    // Toggle team selection for manual add
    const toggleTeamSelection = (teamId: string) => {
        setManualSelectedTeamIds((prev) =>
            prev.includes(teamId)
                ? prev.filter((id) => id !== teamId)
                : [...prev, teamId],
        );
    };

    return (
        <>
            <Head title="Manajemen Anggota - Pandu AI" />

            <div className="flex flex-col gap-6 p-4 font-sans md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                            <Users className="size-3.5" />
                            <span>{organization.name}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Anggota Tim & Direktori
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Kelola akses, peran hak istimewa, dan tim anggota
                            dalam satu tampilan terpusat.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Manual Add Member Dialog */}
                        <Dialog
                            open={isManualAddOpen}
                            onOpenChange={setIsManualAddOpen}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-border hover:bg-muted"
                                >
                                    <Plus className="size-4" />
                                    <span>Tambah Anggota Manual</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>
                                        Tambah Anggota Manual
                                    </DialogTitle>
                                    <DialogDescription>
                                        Daftarkan dan masukkan anggota tim
                                        secara langsung ke dalam organisasi
                                        tanpa menunggu konfirmasi email.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={handleManualAddMember}
                                    className="space-y-4 py-2"
                                >
                                    <div className="space-y-1.5">
                                        <Label htmlFor="manual-name">
                                            Nama Lengkap
                                        </Label>
                                        <Input
                                            id="manual-name"
                                            placeholder="contoh: Budi Santoso"
                                            value={manualName}
                                            onChange={(e) =>
                                                setManualName(e.target.value)
                                            }
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="manual-email">
                                            Email Perusahaan
                                        </Label>
                                        <Input
                                            id="manual-email"
                                            type="email"
                                            placeholder="budi@perusahaan.com"
                                            value={manualEmail}
                                            onChange={(e) =>
                                                setManualEmail(e.target.value)
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-role">
                                                Peran Sistem
                                            </Label>
                                            <Select
                                                value={manualRole}
                                                onValueChange={setManualRole}
                                            >
                                                <SelectTrigger id="manual-role">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableRoles
                                                        .filter(
                                                            (r) =>
                                                                r.slug !==
                                                                'owner',
                                                        )
                                                        .map((r) => (
                                                            <SelectItem
                                                                key={r.id}
                                                                value={r.slug}
                                                            >
                                                                {r.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-title">
                                                Jabatan / Posisi
                                            </Label>
                                            <Input
                                                id="manual-title"
                                                placeholder="contoh: Frontend Dev"
                                                value={manualTitle}
                                                onChange={(e) =>
                                                    setManualTitle(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="manual-password">
                                            Kata Sandi Awal
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="manual-password"
                                                type="text"
                                                placeholder="password123"
                                                value={manualPassword}
                                                onChange={(e) =>
                                                    setManualPassword(
                                                        e.target.value,
                                                    )
                                                }
                                                className="pl-9 font-mono text-xs"
                                                required
                                            />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Anggota dapat mengubah kata sandi
                                            ini setelah login.
                                        </p>
                                    </div>

                                    {availableTeams.length > 0 && (
                                        <div className="space-y-1.5">
                                            <Label>
                                                Tugaskan ke Tim (Opsional)
                                            </Label>
                                            <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
                                                {availableTeams.map((team) => {
                                                    const isSelected =
                                                        manualSelectedTeamIds.includes(
                                                            team.id,
                                                        );

                                                    return (
                                                        <div
                                                            key={team.id}
                                                            onClick={() =>
                                                                toggleTeamSelection(
                                                                    team.id,
                                                                )
                                                            }
                                                            className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
                                                                isSelected
                                                                    ? 'bg-primary/10 font-semibold text-primary'
                                                                    : 'text-foreground hover:bg-accent'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div>
                                                                    {team.name}
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {
                                                                        team.department
                                                                    }
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <UserCheck className="size-4" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <DialogFooter className="pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                setIsManualAddOpen(false)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isSubmittingManual ||
                                                !manualName.trim() ||
                                                !manualEmail.trim()
                                            }
                                        >
                                            {isSubmittingManual && (
                                                <Spinner className="mr-2 size-4" />
                                            )}
                                            Tambah Anggota
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Invite Member Dialog */}
                        <Dialog
                            open={isInviteOpen}
                            onOpenChange={setIsInviteOpen}
                        >
                            <DialogTrigger asChild>
                                <Button className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                                    <UserPlus className="size-4" />
                                    <span>Undang Anggota</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        Undang Anggota Tim
                                    </DialogTitle>
                                    <DialogDescription>
                                        Kirim email undangan untuk bergabung
                                        dengan workspace {organization.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={handleSendInvite}
                                    className="space-y-4 py-2"
                                >
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-email">
                                            Email Anggota
                                        </Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            placeholder="rekan@perusahaan.com"
                                            value={inviteEmail}
                                            onChange={(e) =>
                                                setInviteEmail(e.target.value)
                                            }
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-role">
                                            Peran Awal
                                        </Label>
                                        <Select
                                            value={inviteRole}
                                            onValueChange={setInviteRole}
                                        >
                                            <SelectTrigger id="invite-role">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableRoles
                                                    .filter(
                                                        (r) =>
                                                            r.slug !== 'owner',
                                                    )
                                                    .map((r) => (
                                                        <SelectItem
                                                            key={r.id}
                                                            value={r.slug}
                                                        >
                                                            {r.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                setIsInviteOpen(false)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isSendingInvite ||
                                                !inviteEmail.trim()
                                            }
                                        >
                                            {isSendingInvite && (
                                                <Spinner className="mr-2 size-4" />
                                            )}
                                            Kirim Undangan
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Total Anggota
                            </span>
                            <div className="text-2xl font-bold text-foreground">
                                {stats.total_members}
                            </div>
                            <span className="text-[11px] font-medium text-tertiary">
                                Anggota terdaftar aktif
                            </span>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Users className="size-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Status Aktif
                            </span>
                            <div className="text-2xl font-bold text-foreground">
                                {stats.active_now}
                            </div>
                            <span className="flex items-center gap-1 text-[11px] font-medium text-status-done">
                                <span className="inline-block size-1.5 animate-pulse rounded-full bg-status-done" />
                                Siap berkolaborasi
                            </span>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-xl bg-status-done/10 text-status-done">
                            <UserCheck className="size-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Undangan Pending
                            </span>
                            <div className="text-2xl font-bold text-foreground">
                                {stats.pending_invitations}
                            </div>
                            <span className="text-[11px] font-medium text-amber-500">
                                Menunggu konfirmasi email
                            </span>
                        </div>
                        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                            <Mail className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Filter & Tabs */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                                activeTab === 'members'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            Semua Anggota ({members.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('invitations')}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                                activeTab === 'invitations'
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            Undangan Pending ({pendingInvitations.length})
                        </button>
                    </div>

                    {activeTab === 'members' && (
                        <div className="relative max-w-xs flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama, email, peran..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="rounded-xl pl-9"
                            />
                        </div>
                    )}
                </div>

                {/* Main Table Content */}
                {activeTab === 'members' ? (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="px-6 py-4">Anggota</th>
                                        <th className="px-4 py-4">Peran</th>
                                        <th className="px-4 py-4">
                                            Tim & Departemen
                                        </th>
                                        <th className="px-4 py-4 text-center">
                                            2FA
                                        </th>
                                        <th className="px-4 py-4">Bergabung</th>
                                        <th className="px-6 py-4 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredMembers.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            {/* Member Name & Email */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                                                        {member.name
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .join('')
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-foreground">
                                                            {member.name}
                                                        </div>
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {member.email}
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                                                            {member.title}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Badge */}
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                                                        member.role === 'owner'
                                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                            : member.role ===
                                                                'admin'
                                                              ? 'bg-primary/10 text-primary'
                                                              : member.role ===
                                                                  'manager'
                                                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                                : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {member.role_name}
                                                </span>
                                            </td>

                                            {/* Teams */}
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {member.teams.length > 0 ? (
                                                        member.teams.map(
                                                            (team) => (
                                                                <span
                                                                    key={
                                                                        team.id
                                                                    }
                                                                    className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                                                                >
                                                                    {team.name}
                                                                </span>
                                                            ),
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground/60 italic">
                                                            Belum ada tim
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 2FA Status */}
                                            <td className="px-4 py-4 text-center">
                                                {member.has_2fa ? (
                                                    <span
                                                        title="2FA Aktif"
                                                        className="inline-flex text-status-done"
                                                    >
                                                        <ShieldCheck className="size-4" />
                                                    </span>
                                                ) : (
                                                    <span
                                                        title="2FA Tidak Aktif"
                                                        className="inline-flex text-muted-foreground/40"
                                                    >
                                                        <Shield className="size-4" />
                                                    </span>
                                                )}
                                            </td>

                                            {/* Joined & Last login */}
                                            <td className="px-4 py-4 text-xs text-muted-foreground">
                                                <div>{member.joined_at}</div>
                                                <div className="text-[10px] text-muted-foreground/60">
                                                    {member.last_login_at}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                        >
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-44"
                                                    >
                                                        <DropdownMenuLabel>
                                                            Aksi Anggota
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingMember(
                                                                    member,
                                                                );
                                                                setEditRole(
                                                                    member.role,
                                                                );
                                                                setEditTitle(
                                                                    member.title,
                                                                );
                                                            }}
                                                        >
                                                            Ubah Peran & Jabatan
                                                        </DropdownMenuItem>
                                                        {member.role !==
                                                            'owner' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleRemoveMember(
                                                                            member,
                                                                        )
                                                                    }
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    Keluarkan
                                                                    Anggota
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Pending Invitations Table */
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        <th className="px-6 py-4">
                                            Email Penerima
                                        </th>
                                        <th className="px-4 py-4">
                                            Peran Ditugaskan
                                        </th>
                                        <th className="px-4 py-4">
                                            Tanggal Dikirim
                                        </th>
                                        <th className="px-4 py-4">
                                            Kedaluwarsa
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pendingInvitations.length > 0 ? (
                                        pendingInvitations.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                className="transition-colors hover:bg-muted/20"
                                            >
                                                <td className="px-6 py-4 font-medium text-foreground">
                                                    {inv.email}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground capitalize">
                                                    {inv.role}
                                                </td>
                                                <td className="px-4 py-4 text-xs text-muted-foreground">
                                                    {inv.created_at}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-medium text-amber-500">
                                                    {inv.expires_at}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleCancelInvite(
                                                                inv.id,
                                                            )
                                                        }
                                                        className="text-xs text-destructive hover:bg-destructive/10"
                                                    >
                                                        Batalkan
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-8 text-center text-sm text-muted-foreground"
                                            >
                                                Tidak ada undangan yang sedang
                                                menunggu konfirmasi.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Role Dialog */}
            <Dialog
                open={editingMember !== null}
                onOpenChange={(open) => !open && setEditingMember(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Peran Anggota</DialogTitle>
                        <DialogDescription>
                            Perbarui peran dan jabatan untuk{' '}
                            <strong>{editingMember?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleUpdateRole}
                        className="space-y-4 py-2"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-role">Peran Sistem</Label>
                            <Select
                                value={editRole}
                                onValueChange={setEditRole}
                            >
                                <SelectTrigger id="edit-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map((r) => (
                                        <SelectItem key={r.id} value={r.slug}>
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-title">
                                Jabatan / Posisi Kerja
                            </Label>
                            <Input
                                id="edit-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="contoh: Lead Backend Engineer"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEditingMember(null)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isUpdatingRole}>
                                {isUpdatingRole && (
                                    <Spinner className="mr-2 size-4" />
                                )}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

OrganizationMembers.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Anggota Tim',
        href: '/organization/members',
    },
];
