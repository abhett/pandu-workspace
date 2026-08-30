import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Search,
    Plus,
    CheckSquare,
    FolderPlus,
    BookOpen,
    Sun,
    Upload,
    Zap,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { GlobalSearchDialog } from '@/components/global-search-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [searchOpen, setSearchOpen] = useState(false);

    // Global keyboard listener for Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
                <div className="flex items-center gap-3">
                    <SidebarTrigger className="-ml-1 text-on-surface-variant hover:bg-surface-container" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Search Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground shadow-2xs"
                        title="Cari Global (Cmd+K)"
                    >
                        <Search className="size-3.5" />
                        <span className="hidden sm:inline">Cari...</span>
                        <kbd className="hidden ml-2 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground opacity-80 sm:inline-block">
                            ⌘K
                        </kbd>
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Notifications Dropdown */}
                    <NotificationDropdown />

                    {/* Quick Create Dropdown Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-95"
                                title="Buat Cepat"
                            >
                                <Plus className="size-3.5" />
                                <span className="hidden sm:inline">Tambah</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1 shadow-xl rounded-2xl border-border bg-card">
                            <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                                Buat Baru
                            </DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <CheckSquare className="size-4 text-emerald-500" />
                                    <span className="font-semibold">Tugas Baru</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <FolderPlus className="size-4 text-blue-500" />
                                    <span className="font-semibold">Proyek Baru</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/wiki"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <BookOpen className="size-4 text-purple-500" />
                                    <span className="font-semibold">Dokumen Wiki</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/scrum/daily-standup"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <Sun className="size-4 text-amber-500" />
                                    <span className="font-semibold">Daily Standup</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/files"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <Upload className="size-4 text-indigo-500" />
                                    <span className="font-semibold">Unggah Berkas</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 bg-border/60" />
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/automations"
                                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl cursor-pointer hover:bg-muted/60"
                                >
                                    <Zap className="size-4 text-primary" />
                                    <span className="font-semibold">Aturan Otomasi</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Global Spotlight Search Modal */}
            <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </>
    );
}
