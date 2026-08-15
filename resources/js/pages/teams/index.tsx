import { Head, router } from '@inertiajs/react';
import {
    Crown,
    Layers,
    MoreHorizontal,
    Plus,
    Search,
    UserCheck,
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

type MemberSummary = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type TeamItem = {
    id: string;
    name: string;
    slug: string;
    department: string;
    description: string;
    lead: {
        id: number;
        name: string;
        email: string;
    } | null;
    members_count: number;
    members: MemberSummary[];
    created_at: string;
};

type AvailableMember = {
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
    teams: TeamItem[];
    departments: string[];
    availableMembers: AvailableMember[];
};

export default function TeamsIndex({
    organization,
    teams,
    departments,
    availableMembers,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
        null,
    );

    // Create Team state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('Engineering');
    const [description, setDescription] = useState('');
    const [leadUserId, setLeadUserId] = useState<string>('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Team state
    const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);

    // Filter teams
    const filteredTeams = useMemo(() => {
        return teams.filter((t) => {
            const matchesDept =
                !selectedDepartment || t.department === selectedDepartment;
            const matchesSearch =
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                t.department
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                (t.lead &&
                    t.lead.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()));

            return matchesDept && matchesSearch;
        });
    }, [teams, searchQuery, selectedDepartment]);

    // Handle create team
    const handleCreateTeam = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/teams',
            {
                name,
                department,
                description,
                lead_user_id: leadUserId ? parseInt(leadUserId, 10) : null,
                member_user_ids: selectedMemberIds,
            },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setName('');
                    setDescription('');
                    setLeadUserId('');
                    setSelectedMemberIds([]);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    // Handle update team
    const handleUpdateTeam = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingTeam || !editingTeam.name.trim()) {
            return;
        }

        setIsSubmitting(true);
        router.put(
            `/teams/${editingTeam.id}`,
            {
                name: editingTeam.name,
                department: editingTeam.department,
                description: editingTeam.description,
                lead_user_id: editingTeam.lead?.id ?? null,
                member_user_ids: editingTeam.members.map((m) => m.id),
            },
            {
                onSuccess: () => {
                    setEditingTeam(null);
                    setIsSubmitting(false);
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    // Handle delete team
    const handleDeleteTeam = (team: TeamItem) => {
        if (confirm(`Apakah Anda yakin ingin menghapus tim "${team.name}"?`)) {
            router.delete(`/teams/${team.id}`);
        }
    };

    // Toggle member in multi-select
    const toggleMemberSelection = (userId: number) => {
        setSelectedMemberIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    return (
        <>
            <Head title="Direktori Tim - Pandu AI" />

            <div className="flex flex-col gap-6 p-4 font-sans md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                            <Layers className="size-3.5" />
                            <span>{organization.name}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Direktori Tim & Departemen
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Kelola struktur divisi, penugasan tim lintas fungsi,
                            dan kapabilitas departemen organisasi.
                        </p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                                <Plus className="size-4" />
                                <span>Tambah Tim Baru</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Buat Tim Baru</DialogTitle>
                                <DialogDescription>
                                    Bentuk unit kerja baru dan tentukan ketua
                                    serta anggotanya.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleCreateTeam}
                                className="space-y-4 py-2"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="team-name">Nama Tim</Label>
                                    <Input
                                        id="team-name"
                                        placeholder="contoh: Core Platform / UI Engineering"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="team-dept">
                                            Departemen
                                        </Label>
                                        <Input
                                            id="team-dept"
                                            placeholder="contoh: Engineering, Product"
                                            value={department}
                                            onChange={(e) =>
                                                setDepartment(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="team-lead">
                                            Ketua Tim (Team Lead)
                                        </Label>
                                        <Select
                                            value={leadUserId}
                                            onValueChange={setLeadUserId}
                                        >
                                            <SelectTrigger id="team-lead">
                                                <SelectValue placeholder="Pilih Ketua Tim" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableMembers.map((m) => (
                                                    <SelectItem
                                                        key={m.id}
                                                        value={m.id.toString()}
                                                    >
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="team-desc">
                                        Deskripsi Fokus Tim
                                    </Label>
                                    <Input
                                        id="team-desc"
                                        placeholder="Tujuan sprint dan lingkup tanggung jawab..."
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Pilih Anggota Tim</Label>
                                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
                                        {availableMembers.map((m) => {
                                            const isSelected =
                                                selectedMemberIds.includes(
                                                    m.id,
                                                );

                                            return (
                                                <div
                                                    key={m.id}
                                                    onClick={() =>
                                                        toggleMemberSelection(
                                                            m.id,
                                                        )
                                                    }
                                                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                                                        isSelected
                                                            ? 'bg-primary/10 font-semibold text-primary'
                                                            : 'text-foreground hover:bg-accent'
                                                    }`}
                                                >
                                                    <div>
                                                        <div>{m.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {m.email}
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

                                <DialogFooter className="pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsCreateOpen(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !name.trim()}
                                    >
                                        {isSubmitting && (
                                            <Spinner className="mr-2 size-4" />
                                        )}
                                        Simpan Tim
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari tim, divisi, atau nama ketua..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setSelectedDepartment(null)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                selectedDepartment === null
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            Semua Departemen ({teams.length})
                        </button>
                        {departments.map((dept) => (
                            <button
                                key={dept}
                                onClick={() => setSelectedDepartment(dept)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    selectedDepartment === dept
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Team Grid Cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTeams.map((team) => (
                        <div
                            key={team.id}
                            className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md"
                        >
                            <div>
                                {/* Header badge & menu */}
                                <div className="flex items-start justify-between gap-2">
                                    <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                        {team.department}
                                    </span>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
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
                                            className="w-40"
                                        >
                                            <DropdownMenuLabel>
                                                Aksi Tim
                                            </DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setEditingTeam(team)
                                                }
                                            >
                                                Edit Tim
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleDeleteTeam(team)
                                                }
                                                className="text-destructive focus:text-destructive"
                                            >
                                                Hapus Tim
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Team Title & Description */}
                                <h3 className="mt-3 text-lg font-bold text-foreground">
                                    {team.name}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {team.description}
                                </p>

                                {/* Team Lead */}
                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/30 p-2.5 text-xs">
                                    <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                                        <Crown className="size-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                                            Team Lead
                                        </div>
                                        <div className="truncate font-semibold text-foreground">
                                            {team.lead?.name ??
                                                'Belum ditentukan'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Member Stack */}
                            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                                <div className="flex items-center -space-x-2 overflow-hidden">
                                    {team.members.slice(0, 4).map((member) => (
                                        <div
                                            key={member.id}
                                            title={member.name}
                                            className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary/20 text-[10px] font-bold text-primary"
                                        >
                                            {member.name.charAt(0)}
                                        </div>
                                    ))}
                                    {team.members_count > 4 && (
                                        <div className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                                            +{team.members_count - 4}
                                        </div>
                                    )}
                                </div>

                                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                    <Users className="size-3.5" />
                                    <span>{team.members_count} Anggota</span>
                                </span>
                            </div>
                        </div>
                    ))}

                    {filteredTeams.length === 0 && (
                        <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                            Tidak ada tim yang cocok dengan kriteria pencarian.
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Team Dialog */}
            <Dialog
                open={editingTeam !== null}
                onOpenChange={(open) => !open && setEditingTeam(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Tim</DialogTitle>
                        <DialogDescription>
                            Perbarui konfigurasi tim {editingTeam?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTeam && (
                        <form
                            onSubmit={handleUpdateTeam}
                            className="space-y-4 py-2"
                        >
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-team-name">Nama Tim</Label>
                                <Input
                                    id="edit-team-name"
                                    value={editingTeam.name}
                                    onChange={(e) =>
                                        setEditingTeam({
                                            ...editingTeam,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-team-dept">
                                        Departemen
                                    </Label>
                                    <Input
                                        id="edit-team-dept"
                                        value={editingTeam.department}
                                        onChange={(e) =>
                                            setEditingTeam({
                                                ...editingTeam,
                                                department: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-team-lead">
                                        Ketua Tim (Lead)
                                    </Label>
                                    <Select
                                        value={
                                            editingTeam.lead?.id?.toString() ??
                                            ''
                                        }
                                        onValueChange={(val) => {
                                            const found = availableMembers.find(
                                                (m) => m.id.toString() === val,
                                            );
                                            setEditingTeam({
                                                ...editingTeam,
                                                lead: found
                                                    ? {
                                                          id: found.id,
                                                          name: found.name,
                                                          email: found.email,
                                                      }
                                                    : null,
                                            });
                                        }}
                                    >
                                        <SelectTrigger id="edit-team-lead">
                                            <SelectValue placeholder="Pilih Ketua Tim" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableMembers.map((m) => (
                                                <SelectItem
                                                    key={m.id}
                                                    value={m.id.toString()}
                                                >
                                                    {m.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-team-desc">
                                    Deskripsi
                                </Label>
                                <Input
                                    id="edit-team-desc"
                                    value={editingTeam.description}
                                    onChange={(e) =>
                                        setEditingTeam({
                                            ...editingTeam,
                                            description: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingTeam(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && (
                                        <Spinner className="mr-2 size-4" />
                                    )}
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

TeamsIndex.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Tim & Departemen',
        href: '/teams',
    },
];
