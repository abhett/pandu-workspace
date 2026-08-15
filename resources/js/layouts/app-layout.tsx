import type { PropsWithChildren } from 'react';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs,
    children,
}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>) {
    const pageComponent = (children as any)?.type;
    const finalBreadcrumbs =
        breadcrumbs ||
        pageComponent?.breadcrumbs ||
        pageComponent?.layout?.breadcrumbs ||
        [];

    return (
        <AppLayoutTemplate breadcrumbs={finalBreadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
