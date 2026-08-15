import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Check,
    Columns3,
    FolderKanban,
    Plus,
    Save,
    Settings,
    Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type MemberItem = {
    id: number;
    membership_id: string;
    name: string;
    email: string;
    role: 'lead' | 'admin' | 'member' | 'viewer';
    joined_at: string;
};

type StatusItem = {
    id?: string;
    name: string;
    slug?: string;
    category: 'unstarted' | 'started' | 'completed' | 'cancelled';
    color: string;
    position?: number;
    is_initial?: boolean;
    is_completed?: boolean;
    wip_limit?: number | null;
};

type ProjectDetail = {
    id: string;
    name: string;
    key: string;
    slug: string;
    type: string;
    color: string;
    icon: string;
    status: 'active' | 'archived' | 'on_hold';
    description: string | null;
    lead_user_id: number | null;
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

const COLOR_PALETTE = [
    { name: 'Indigo Brand', hex: '#6366f1' },
    { name: 'Sky Velocity', hex: '#0ea5e9' },
    { name: 'Emerald Flow', hex: '#10b981' },
    { name: 'Amber Sprint', hex: '#f59e0b' },
    { name: 'Rose Alert', hex: '#f43f5e' },
    { name: 'Violet Enterprise', hex: '#8b5cf6' },
];

export default function ProjectSettings({
    organization,
    project,
    availableOrgMembers,
}: Props) {
    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'workflow'>('general');
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    // General Form
    const {
        data: generalData,
        setData: setGeneralData,
        put: putGeneral,
        processing: isGeneralSaving,
        errors: generalErrors,
    } = useForm({
        name: project.name,
        key: project.key,
        description: project.description || '',
        color: project.color || '#6366f1',
        icon: project.icon || 'FolderKanban',
        lead_user_id: project.lead_user_id,
        status: project.status,
    });

    const handleGeneralSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        putGeneral(`/projects/${project.id}`);
    };

    // Add Member Form
    const {
        data: addMemberData,
        setData: setAddMemberData,
        post: postAddMember,
        processing: isAddingMember,
        reset: resetAddMember,
        errors: addMemberErrors,
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

    // Workflow Statuses state
    const [statusesList, setStatusesList] = useState<StatusItem[]>(
        project.statuses.map((s, idx) => ({ ...s, position: idx })),
    );
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);

    const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= statusesList.length) return;

        const updated = [...statusesList];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setStatusesList(updated);
    };

    const handleAddStatusRow = () => {
        const newRow: StatusItem = {
            id: `temp_${Date.now()}`,
            name: 'Status Baru',
            category: 'started',
            color: '#3b82f6',
            position: statusesList.length,
            wip_limit: null,
        };
        setStatusesList([...statusesList, newRow]);
    };

    const handleRemoveStatusRow = (index: number) => {
        if (statusesList.length <= 2) {
            alert('Minimal harus ada 2 status alur kerja dalam proyek.');
            return;
        }
        setStatusesList(statusesList.filter((_, idx) => idx !== index));
    };

    const handleSaveWorkflow = () => {
        setIsSavingWorkflow(true);
        router.put(
            `/projects/${project.id}/workflow/statuses`,
            {
                statuses: statusesList.map((s, idx) => ({
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    color: s.color,
                    position: idx,
                    wip_limit: s.wip_limit ? parseInt(s.wip_limit.toString(), 10) : null,
                })),
            },
            {
                onFinish: () => setIsSavingWorkflow(false),
            },
        );
    };

    const unassignedOrgMembers = availableOrgMembers.filter(
        (om) => !project.members.some((pm) => pm.id === om.id),
    );

    return (
        <>
            <Head title={`Pengaturan Proyek - ${project.name}`} />

            <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
                {/* Navigation Header */}
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link
                                href={`/projects/${project.id}`}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft className="size-3.5" />
                                {project.name}
                            </Link>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-mono text-xs text-primary font-semibold">
                                {project.key}
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                            Pengaturan Proyek
                        </h1>
                        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                            Atur detail umum, anggota tim, dan kustomisasi alur status workflow.
                        </p>
                    </div>

                    <Button asChild variant="outline" size="sm">
                        <Link href={`/projects/${project.id}`}>
                            Kembali ke Ringkasan
                        </Link>
                    </Button>
                </div>

                {/* Settings Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
                    <TabsList className="grid grid-cols-3 max-w-md h-10">
                        <TabsTrigger value="general" className="gap-1.5 text-xs">
                            <Settings className="size-3.5" />
                            Umum
                        </TabsTrigger>
                        <TabsTrigger value="members" className="gap-1.5 text-xs">
                            <Users className="size-3.5" />
                            Anggota ({project.members.length})
                        </TabsTrigger>
                        <TabsTrigger value="workflow" className="gap-1.5 text-xs">
                            <Columns3 className="size-3.5" />
                            Alur Status ({statusesList.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: General Settings */}
                    <TabsContent value="general" className="space-y-6">
                        <form onSubmit={handleGeneralSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">
                                    Informasi Proyek
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Detail dasar dan identitas proyek di dalam workspace organisasi.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-name">Nama Proyek</Label>
                                    <Input
                                        id="edit-name"
                                        value={generalData.name}
                                        onChange={(e) => setGeneralData('name', e.target.value)}
                                        className="h-10"
                                    />
                                    {generalErrors.name && (
                                        <p className="text-xs text-destructive">{generalErrors.name}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-key">Kode Proyek (Key)</Label>
                                        <Input
                                            id="edit-key"
                                            maxLength={8}
                                            value={generalData.key}
                                            onChange={(e) =>
                                                setGeneralData(
                                                    'key',
                                                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                                                )
                                            }
                                            className="font-mono uppercase font-semibold h-10"
                                        />
                                        {generalErrors.key && (
                                            <p className="text-xs text-destructive">{generalErrors.key}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-lead">Project Lead</Label>
                                        <Select
                                            value={generalData.lead_user_id?.toString() || ''}
                                            onValueChange={(val) =>
                                                setGeneralData('lead_user_id', parseInt(val, 10))
                                            }
                                        >
                                            <SelectTrigger id="edit-lead" className="h-10">
                                                <SelectValue placeholder="Pilih Project Lead" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableOrgMembers.map((m) => (
                                                    <SelectItem key={m.id} value={m.id.toString()}>
                                                        {m.name} ({m.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {generalErrors.lead_user_id && (
                                            <p className="text-xs text-destructive">{generalErrors.lead_user_id}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-desc">Deskripsi</Label>
                                    <Textarea
                                        id="edit-desc"
                                        value={generalData.description}
                                        onChange={(e) => setGeneralData('description', e.target.value)}
                                        rows={3}
                                    />
                                    {generalErrors.description && (
                                        <p className="text-xs text-destructive">{generalErrors.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-status">Status Proyek</Label>
                                        <Select
                                            value={generalData.status}
                                            onValueChange={(val) => setGeneralData('status', val as any)}
                                        >
                                            <SelectTrigger id="edit-status" className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Aktif (Aktif Dikerjakan)</SelectItem>
                                                <SelectItem value="on_hold">Ditangguhkan (On Hold)</SelectItem>
                                                <SelectItem value="archived">Diarsipkan (Archived)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Warna Aksen</Label>
                                        <div className="flex items-center gap-2">
                                            {COLOR_PALETTE.map((c) => (
                                                <button
                                                    key={c.hex}
                                                    type="button"
                                                    onClick={() => setGeneralData('color', c.hex)}
                                                    className={`size-7 rounded-full flex items-center justify-center transition-all ${
                                                        generalData.color === c.hex
                                                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                                            : 'hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: c.hex }}
                                                >
                                                    {generalData.color === c.hex && (
                                                        <Check className="size-3.5 text-white" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border">
                                <Button type="submit" disabled={isGeneralSaving}>
                                    {isGeneralSaving && <Spinner className="mr-2 size-4" />}
                                    Simpan Perubahan Umum
                                </Button>
                            </div>
                        </form>

                        {/* Danger Zone */}
                        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="size-5" />
                                <h3 className="text-base font-semibold">Zona Berbahaya</h3>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl">
                                Menghapus proyek akan mengarsipkan seluruh riwayat tugas, alur status, dan menghapus keterikatan anggota proyek ini.
                            </p>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    if (confirm(`Ketik 'HAPUS' jika Anda yakin ingin menghapus proyek "${project.name}"?`)) {
                                        router.delete(`/projects/${project.id}`);
                                    }
                                }}
                            >
                                <Trash2 className="mr-1.5 size-4" />
                                Hapus Proyek Ini
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Members Settings */}
                    <TabsContent value="members" className="space-y-6">
                        <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">
                                        Kelola Anggota Proyek
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Atur peran kontribusi dan akses anggota dalam proyek ini.
                                    </p>
                                </div>

                                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <UserPlus className="mr-1.5 size-4" />
                                            Tambah Anggota
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Tambah Anggota ke Proyek</DialogTitle>
                                            <DialogDescription>
                                                Pilih anggota dari organisasi <strong>{organization.name}</strong>.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleAddMemberSubmit} className="space-y-4 pt-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="add-member-user">Pilih Pengguna</Label>
                                                <Select
                                                    value={addMemberData.user_id}
                                                    onValueChange={(val) => setAddMemberData('user_id', val)}
                                                >
                                                    <SelectTrigger id="add-member-user">
                                                        <SelectValue placeholder="Pilih anggota" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {unassignedOrgMembers.map((m) => (
                                                            <SelectItem key={m.id} value={m.id.toString()}>
                                                                {m.name} ({m.email})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="add-member-role">Peran Proyek</Label>
                                                <Select
                                                    value={addMemberData.role}
                                                    onValueChange={(val) => setAddMemberData('role', val)}
                                                >
                                                    <SelectTrigger id="add-member-role">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="lead">Project Lead</SelectItem>
                                                        <SelectItem value="admin">Project Admin</SelectItem>
                                                        <SelectItem value="member">Member</SelectItem>
                                                        <SelectItem value="viewer">Viewer</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <DialogFooter className="pt-2">
                                                <Button type="button" variant="ghost" onClick={() => setIsAddMemberOpen(false)}>
                                                    Batal
                                                </Button>
                                                <Button type="submit" disabled={isAddingMember || !addMemberData.user_id}>
                                                    {isAddingMember && <Spinner className="mr-2 size-4" />}
                                                    Tambahkan
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Members Table */}
                            <div className="rounded-xl border border-border overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/40 text-xs text-muted-foreground uppercase font-mono border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Pengguna</th>
                                            <th className="py-3 px-4">Email</th>
                                            <th className="py-3 px-4">Peran</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {project.members.map((member) => (
                                            <tr key={member.id} className="hover:bg-muted/20">
                                                <td className="py-3 px-4 font-medium text-foreground">
                                                    {member.name}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                                                    {member.email}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Select
                                                        value={member.role}
                                                        onValueChange={(val) =>
                                                            router.patch(`/projects/${project.id}/members/${member.membership_id}`, { role: val })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 w-[120px] text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="lead">Lead</SelectItem>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="member">Member</SelectItem>
                                                            <SelectItem value="viewer">Viewer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm(`Keluarkan ${member.name} dari proyek?`)) {
                                                                router.delete(`/projects/${project.id}/members/${member.membership_id}`);
                                                            }
                                                        }}
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
                    </TabsContent>

                    {/* Tab 3: Workflow & Statuses Settings */}
                    <TabsContent value="workflow" className="space-y-6">
                        <div className="rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">
                                        Konfigurasi Alur Status (Workflow)
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Urutan tahapan status tugas, kategori siklus, warna label, dan batas WIP (Work in Progress).
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddStatusRow}>
                                        <Plus className="mr-1.5 size-4" />
                                        Tambah Status
                                    </Button>

                                    <Button type="button" size="sm" onClick={handleSaveWorkflow} disabled={isSavingWorkflow}>
                                        {isSavingWorkflow ? <Spinner className="mr-2 size-4" /> : <Save className="mr-1.5 size-4" />}
                                        Simpan Alur Status
                                    </Button>
                                </div>
                            </div>

                            {/* Statuses List Builder */}
                            <div className="space-y-3">
                                {statusesList.map((status, index) => (
                                    <div
                                        key={status.id || index}
                                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-background"
                                    >
                                        {/* Left: Position arrows & Name */}
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="flex items-center gap-0.5">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={index === 0}
                                                    onClick={() => handleMoveStatus(index, 'up')}
                                                >
                                                    <ArrowUp className="size-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={index === statusesList.length - 1}
                                                    onClick={() => handleMoveStatus(index, 'down')}
                                                >
                                                    <ArrowDown className="size-3.5" />
                                                </Button>
                                            </div>

                                            <div className="font-mono text-xs text-muted-foreground w-6">
                                                #{index + 1}
                                            </div>

                                            {/* Color dot picker */}
                                            <input
                                                type="color"
                                                value={status.color}
                                                onChange={(e) => {
                                                    const updated = [...statusesList];
                                                    updated[index].color = e.target.value;
                                                    setStatusesList(updated);
                                                }}
                                                className="size-7 rounded-md border border-border cursor-pointer bg-transparent"
                                                title="Ubah warna status"
                                            />

                                            {/* Status Name */}
                                            <Input
                                                value={status.name}
                                                onChange={(e) => {
                                                    const updated = [...statusesList];
                                                    updated[index].name = e.target.value;
                                                    setStatusesList(updated);
                                                }}
                                                className="h-8 max-w-[200px] text-xs font-semibold"
                                            />
                                        </div>

                                        {/* Right: Category, WIP limit, Delete */}
                                        <div className="flex items-center gap-3">
                                            {/* Category Select */}
                                            <div className="space-y-0.5">
                                                <Select
                                                    value={status.category}
                                                    onValueChange={(val) => {
                                                        const updated = [...statusesList];
                                                        updated[index].category = val as any;
                                                        setStatusesList(updated);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-[140px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unstarted">Antrean / Backlog</SelectItem>
                                                        <SelectItem value="started">Sedang Dikerjakan</SelectItem>
                                                        <SelectItem value="completed">Selesai (Done)</SelectItem>
                                                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* WIP Limit Input */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-mono text-muted-foreground">WIP:</span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={99}
                                                    placeholder="∞"
                                                    value={status.wip_limit ?? ''}
                                                    onChange={(e) => {
                                                        const updated = [...statusesList];
                                                        const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                                        updated[index].wip_limit = val;
                                                        setStatusesList(updated);
                                                    }}
                                                    className="h-8 w-14 text-xs font-mono text-center"
                                                />
                                            </div>

                                            {/* Delete status */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveStatusRow(index)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

ProjectSettings.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Direktori Proyek',
        href: '/projects',
    },
    {
        title: 'Pengaturan Proyek',
        href: '#',
    },
];
