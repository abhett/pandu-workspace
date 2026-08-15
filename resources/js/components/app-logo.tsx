import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { Auth } from '@/types/auth';

export default function AppLogo() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const orgName = auth?.organization?.name ?? 'Pandu AI';
    const role = auth?.organization?.role;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-sm">
                <AppLogoIcon className="size-5 fill-current text-white" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold text-on-surface">
                    {orgName}
                </span>
                {role && (
                    <span className="truncate text-[10px] text-on-surface-variant capitalize">
                        {role}
                    </span>
                )}
            </div>
        </>
    );
}
