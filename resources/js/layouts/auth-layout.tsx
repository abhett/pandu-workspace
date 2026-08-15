import type { PropsWithChildren } from 'react';
import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title,
    description,
    children,
}: PropsWithChildren<{
    title?: string;
    description?: string;
}>) {
    const pageComponent = (children as any)?.type;
    const layoutConfig = pageComponent?.layout;

    const finalTitle = title || layoutConfig?.title || '';
    const finalDescription = description || layoutConfig?.description || '';

    return (
        <AuthLayoutTemplate title={finalTitle} description={finalDescription}>
            {children}
        </AuthLayoutTemplate>
    );
}
