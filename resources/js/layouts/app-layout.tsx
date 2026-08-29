import {
    createContext,
    useContext,
    useEffect,
    useState,
    type PropsWithChildren,
    type ReactNode,
} from 'react';
import KeyboardShortcutsModal from '@/components/keyboard-shortcuts-modal';
import { KineticToastContainer } from '@/components/kinetic-toast';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

interface LayoutContextType {
    breadcrumbs: BreadcrumbItem[];
    setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
    isInsideLayout: boolean;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function useLayoutContext() {
    return useContext(LayoutContext);
}

export default function AppLayout({
    breadcrumbs,
    children,
}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[];
}>) {
    const parentLayout = useContext(LayoutContext);

    useEffect(() => {
        if (parentLayout && breadcrumbs && breadcrumbs.length > 0) {
            parentLayout.setBreadcrumbs(breadcrumbs);
        }
    }, [parentLayout, breadcrumbs]);

    if (parentLayout) {
        return <>{children}</>;
    }

    const pageComponent = (children as any)?.type;
    const initialBreadcrumbs =
        breadcrumbs ||
        pageComponent?.breadcrumbs ||
        pageComponent?.layout?.breadcrumbs ||
        [];

    return (
        <AppLayoutRoot initialBreadcrumbs={initialBreadcrumbs}>
            {children}
        </AppLayoutRoot>
    );
}

function AppLayoutRoot({
    initialBreadcrumbs,
    children,
}: {
    initialBreadcrumbs: BreadcrumbItem[];
    children: ReactNode;
}) {
    const [currentBreadcrumbs, setCurrentBreadcrumbs] =
        useState<BreadcrumbItem[]>(initialBreadcrumbs);

    useEffect(() => {
        if (initialBreadcrumbs && initialBreadcrumbs.length > 0) {
            setCurrentBreadcrumbs(initialBreadcrumbs);
        }
    }, [initialBreadcrumbs]);

    return (
        <LayoutContext.Provider
            value={{
                breadcrumbs: currentBreadcrumbs,
                setBreadcrumbs: setCurrentBreadcrumbs,
                isInsideLayout: true,
            }}
        >
            <AppLayoutTemplate breadcrumbs={currentBreadcrumbs}>
                {children}
                <KeyboardShortcutsModal />
                <KineticToastContainer />
            </AppLayoutTemplate>
        </LayoutContext.Provider>
    );
}

