import { Bell, Plus, Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1 text-on-surface-variant hover:bg-surface-container" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-3">
                {/* Search trigger */}
                <button
                    type="button"
                    className="hidden items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:border-primary/50 sm:flex"
                >
                    <Search className="size-3.5" />
                    <span>Cari...</span>
                    <kbd className="ml-2 rounded border border-outline-variant/50 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant opacity-70">
                        Cmd+K
                    </kbd>
                </button>

                {/* Theme Toggle Button */}
                <ThemeToggle />

                {/* Notifications Button */}
                <button
                    type="button"
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    aria-label="Notifikasi"
                >
                    <Bell className="size-4" />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
                </button>

                {/* Quick Add Button */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Tambah</span>
                </button>
            </div>
        </header>
    );
}
