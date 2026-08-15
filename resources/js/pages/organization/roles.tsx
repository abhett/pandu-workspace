import { Head, router } from '@inertiajs/react';
import {
    Check,
    Info,
    Lock,
    Plus,
    Save,
    Search,
    Shield,
    Trash2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type RoleItem = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
    organization_id: string | null;
    permissions: string[];
};

type PermissionItem = {
    id: string;
    name: string;
    description: string;
};

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    groupedPermissions: Record<string, PermissionItem[]>;
    roles: RoleItem[];
};

export default function RolesMatrix({
    organization,
    groupedPermissions,
    roles,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        null,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDescription, setNewRoleDescription] = useState('');
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    // Track matrix state: roleId -> Set of permission IDs
    const [rolePermissions, setRolePermissions] = useState<
        Record<string, Set<string>>
    >(() => {
        const initial: Record<string, Set<string>> = {};
        roles.forEach((role) => {
            initial[role.id] = new Set(role.permissions);
        });

        return initial;
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Toggle a single permission for a role
    const togglePermission = (roleId: string, permissionId: string) => {
        const role = roles.find((r) => r.id === roleId);

        if (role?.slug === 'owner') {
            return;
        } // Owner permissions cannot be modified

        setRolePermissions((prev) => {
            const next = { ...prev };
            const currentSet = new Set(next[roleId] || []);

            if (currentSet.has(permissionId)) {
                currentSet.delete(permissionId);
            } else {
                currentSet.add(permissionId);
            }

            next[roleId] = currentSet;

            return next;
        });
        setHasUnsavedChanges(true);
    };

    // Toggle all visible permissions for a role
    const toggleAllForRole = (roleId: string) => {
        const role = roles.find((r) => r.id === roleId);

        if (role?.slug === 'owner') {
            return;
        }

        const allVisiblePermIds: string[] = [];
        Object.entries(groupedPermissions).forEach(([, items]) => {
            items.forEach((item) => allVisiblePermIds.push(item.id));
        });

        setRolePermissions((prev) => {
            const next = { ...prev };
            const currentSet = new Set(next[roleId] || []);
            const allChecked = allVisiblePermIds.every((id) =>
                currentSet.has(id),
            );

            if (allChecked) {
                allVisiblePermIds.forEach((id) => currentSet.delete(id));
            } else {
                allVisiblePermIds.forEach((id) => currentSet.add(id));
            }

            next[roleId] = currentSet;

            return next;
        });
        setHasUnsavedChanges(true);
    };

    // Save changes to backend
    const saveChanges = () => {
        setIsSaving(true);
        const matrixPayload = roles.map((role) => ({
            role_id: role.id,
            permissions: Array.from(rolePermissions[role.id] || []),
        }));

        router.put(
            '/organization/roles/matrix',
            { matrix: matrixPayload },
            {
                onSuccess: () => {
                    setHasUnsavedChanges(false);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    // Create custom role
    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newRoleName.trim()) {
            return;
        }

        setIsCreatingRole(true);
        router.post(
            '/organization/roles',
            {
                name: newRoleName,
                description: newRoleDescription,
                permissions: [],
            },
            {
                onSuccess: () => {
                    setIsCreateOpen(false);
                    setNewRoleName('');
                    setNewRoleDescription('');
                    setIsCreatingRole(false);
                },
                onError: () => {
                    setIsCreatingRole(false);
                },
            },
        );
    };

    // Delete custom role
    const handleDeleteRole = (roleId: string, roleName: string) => {
        if (
            confirm(
                `Apakah Anda yakin ingin menghapus peran kustom "${roleName}"?`,
            )
        ) {
            router.delete(`/organization/roles/${roleId}`);
        }
    };

    // Filter categories and permissions
    const filteredCategories = useMemo(() => {
        const result: Record<string, PermissionItem[]> = {};

        Object.entries(groupedPermissions).forEach(([category, items]) => {
            if (selectedCategory && selectedCategory !== category) {
                return;
            }

            const filteredItems = items.filter(
                (item) =>
                    item.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    item.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    item.id.toLowerCase().includes(searchQuery.toLowerCase()),
            );

            if (filteredItems.length > 0) {
                result[category] = filteredItems;
            }
        });

        return result;
    }, [groupedPermissions, searchQuery, selectedCategory]);

    const categories = Object.keys(groupedPermissions);

    return (
        <>
            <Head title="Manajemen Peran & Izin - Pandu AI" />

            <div className="flex flex-col gap-6 p-4 font-sans md:p-6 lg:p-8">
                {/* Page Title & Actions */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                            <Shield className="size-3.5" />
                            <span>{organization.name}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Manajemen Peran & Izin
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Kelola tingkat akses dan kemampuan hak akses
                            granular untuk pengguna di seluruh organisasi.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog
                            open={isCreateOpen}
                            onOpenChange={setIsCreateOpen}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl"
                                >
                                    <Plus className="size-4" />
                                    <span>Buat Peran Baru</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Buat Peran Kustom</DialogTitle>
                                    <DialogDescription>
                                        Tambahkan peran baru ke organisasi Anda
                                        dan sesuaikan matriks izinnya.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={handleCreateRole}
                                    className="space-y-4 py-2"
                                >
                                    <div className="space-y-1.5">
                                        <Label htmlFor="role-name">
                                            Nama Peran
                                        </Label>
                                        <Input
                                            id="role-name"
                                            placeholder="contoh: QA Lead / DevOps"
                                            value={newRoleName}
                                            onChange={(e) =>
                                                setNewRoleName(e.target.value)
                                            }
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="role-desc">
                                            Deskripsi Singkat
                                        </Label>
                                        <Input
                                            id="role-desc"
                                            placeholder="Tanggung jawab dan cakupan peran ini..."
                                            value={newRoleDescription}
                                            onChange={(e) =>
                                                setNewRoleDescription(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                setIsCreateOpen(false)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isCreatingRole ||
                                                !newRoleName.trim()
                                            }
                                        >
                                            {isCreatingRole && (
                                                <Spinner className="mr-2 size-4" />
                                            )}
                                            Simpan Peran
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={saveChanges}
                            disabled={!hasUnsavedChanges || isSaving}
                            className="relative gap-2 rounded-xl bg-primary shadow-sm hover:bg-primary/90"
                        >
                            {hasUnsavedChanges && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                                </span>
                            )}
                            {isSaving ? (
                                <Spinner className="size-4" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            <span>Simpan Perubahan</span>
                        </Button>
                    </div>
                </div>

                {/* Unsaved Changes Banner */}
                {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Info className="size-4 shrink-0" />
                        <span>
                            Ada perubahan izin yang belum disimpan. Klik tombol{' '}
                            <strong>"Simpan Perubahan"</strong> di atas untuk
                            menerapkannya.
                        </span>
                    </div>
                )}

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau kode izin..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                selectedCategory === null
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                        >
                            Semua Kategori
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Roles & Permissions Matrix Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <th className="sticky left-0 z-20 min-w-[280px] bg-muted/90 px-6 py-4 backdrop-blur-sm">
                                        Izin (Permission)
                                    </th>
                                    {roles.map((role) => (
                                        <th
                                            key={role.id}
                                            className="min-w-[130px] px-4 py-4 text-center align-top"
                                        >
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-bold text-foreground capitalize">
                                                        {role.name}
                                                    </span>
                                                    {role.slug === 'owner' ? (
                                                        <Lock className="size-3.5 text-primary" />
                                                    ) : !role.is_system ? (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteRole(
                                                                    role.id,
                                                                    role.name,
                                                                )
                                                            }
                                                            className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
                                                            title="Hapus Peran Kustom"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    ) : null}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground lowercase">
                                                    {role.is_system
                                                        ? 'System Role'
                                                        : 'Custom'}
                                                </span>
                                                {role.slug !== 'owner' && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleAllForRole(
                                                                role.id,
                                                            )
                                                        }
                                                        className="mt-1 text-[11px] font-medium text-primary hover:underline"
                                                    >
                                                        Pilih Semua
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Object.entries(filteredCategories).map(
                                    ([categoryName, permList]) => (
                                        <>
                                            {/* Category Section Row */}
                                            <tr
                                                key={categoryName}
                                                className="bg-muted/30"
                                            >
                                                <td
                                                    colSpan={roles.length + 1}
                                                    className="px-6 py-2 text-xs font-bold tracking-wider text-primary uppercase"
                                                >
                                                    {categoryName}
                                                </td>
                                            </tr>

                                            {/* Permission Rows */}
                                            {permList.map((perm) => (
                                                <tr
                                                    key={perm.id}
                                                    className="transition-colors hover:bg-muted/20"
                                                >
                                                    <td className="sticky left-0 z-10 bg-card px-6 py-3.5 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                        <div className="font-medium text-foreground">
                                                            {perm.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {perm.description}
                                                        </div>
                                                        <code className="mt-0.5 inline-block font-mono text-[10px] text-muted-foreground/80">
                                                            {perm.id}
                                                        </code>
                                                    </td>

                                                    {roles.map((role) => {
                                                        const isOwner =
                                                            role.slug ===
                                                            'owner';
                                                        const isChecked =
                                                            isOwner ||
                                                            rolePermissions[
                                                                role.id
                                                            ]?.has(perm.id) ||
                                                            false;

                                                        return (
                                                            <td
                                                                key={`${role.id}-${perm.id}`}
                                                                className="px-4 py-3.5 text-center align-middle"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        isOwner
                                                                    }
                                                                    onClick={() =>
                                                                        togglePermission(
                                                                            role.id,
                                                                            perm.id,
                                                                        )
                                                                    }
                                                                    className={`inline-flex size-6 items-center justify-center rounded-md border transition-all ${
                                                                        isChecked
                                                                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                                            : 'border-border bg-background hover:border-primary/50'
                                                                    } ${isOwner ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105'}`}
                                                                >
                                                                    {isChecked && (
                                                                        <Check className="size-3.5 stroke-[3]" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

RolesMatrix.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Peran & Izin',
        href: '/organization/roles',
    },
];
