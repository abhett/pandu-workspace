import { Link, router, usePage } from '@inertiajs/react';
import { Building2, Check, LogOut, Plus, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User, Auth } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { auth } = usePage<{ auth: Auth }>().props;

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const handleSwitchOrg = (orgId: string) => {
        cleanup();
        router.post(`/organizations/${orgId}/switch`);
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Organizations list */}
            {auth?.organizations && auth.organizations.length > 0 && (
                <>
                    <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Organisasi Anda
                    </DropdownMenuLabel>
                    <DropdownMenuGroup>
                        {auth.organizations.map((org) => {
                            const isCurrent = auth.organization?.id === org.id;

                            return (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() =>
                                        !isCurrent && handleSwitchOrg(org.id)
                                    }
                                    className="flex cursor-pointer items-center justify-between"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        <span className="truncate">
                                            {org.name}
                                        </span>
                                    </div>
                                    {isCurrent && (
                                        <Check className="ml-2 size-4 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            );
                        })}
                        <DropdownMenuItem asChild>
                            <Link
                                href="/onboarding/organization"
                                className="flex cursor-pointer items-center gap-2 text-xs text-primary"
                                onClick={cleanup}
                            >
                                <Plus className="size-3.5" />
                                <span>Tambah Organisasi</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                </>
            )}

            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
