import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import EmptyState, { EmptyStateVariant } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import {
    Bell,
    FolderKanban,
    HardDrive,
    Inbox,
    Layers,
    LayoutGrid,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyStatesGalleryPage() {
    const [activeCategory, setActiveCategory] = useState<'all' | 'workspace' | 'inbox' | 'search'>('all');
    const [simulatedSearch, setSimulatedSearch] = useState('Desain Q3 Microservice');

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Sistem', href: '#' },
                { title: 'Galeri Status Kosong', href: '#' },
            ]}
        >
            <Head title="Galeri Komponen Status Kosong - Pandu Management" />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="size-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Galeri Komponen Status Kosong (Empty States)
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Visualisasi kondisi saat data belum tersedia, memberikan panduan jelas dan aksi awal (*FTUX*) bagi pengguna.
                        </p>
                    </div>

                    {/* Filter Category Pills */}
                    <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border shrink-0 self-start sm:self-auto text-xs">
                        <button
                            type="button"
                            onClick={() => setActiveCategory('all')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg font-semibold transition-all',
                                activeCategory === 'all'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Semua
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('workspace')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg font-semibold transition-all',
                                activeCategory === 'workspace'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Proyek & Tugas
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('inbox')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg font-semibold transition-all',
                                activeCategory === 'inbox'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Kotak Masuk
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveCategory('search')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg font-semibold transition-all',
                                activeCategory === 'search'
                                    ? 'bg-card text-foreground shadow-xs border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Pencarian
                        </button>
                    </div>
                </div>

                {/* Grid Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 1. No Projects */}
                    {(activeCategory === 'all' || activeCategory === 'workspace') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <FolderKanban className="size-3.5 text-primary" /> Varian: no_projects
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">Workspace FTUX</Badge>
                            </div>
                            <EmptyState variant="no_projects" />
                        </div>
                    )}

                    {/* 2. Inbox Clear */}
                    {(activeCategory === 'all' || activeCategory === 'inbox') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Inbox className="size-3.5 text-emerald-400" /> Varian: inbox_clear
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">Inbox Zero</Badge>
                            </div>
                            <EmptyState variant="inbox_clear" />
                        </div>
                    )}

                    {/* 3. No Search Results */}
                    {(activeCategory === 'all' || activeCategory === 'search') && (
                        <div className="lg:col-span-2 space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Search className="size-3.5 text-amber-400" /> Varian: no_search_results
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">Interactive Filter</Badge>
                            </div>
                            <EmptyState
                                variant="no_search_results"
                                searchValue={simulatedSearch}
                                onSearchChange={setSimulatedSearch}
                                onClearSearch={() => setSimulatedSearch('')}
                            />
                        </div>
                    )}

                    {/* 4. No Tasks */}
                    {(activeCategory === 'all' || activeCategory === 'workspace') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Layers className="size-3.5 text-primary" /> Varian: no_tasks
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">Board / Sprint</Badge>
                            </div>
                            <EmptyState variant="no_tasks" />
                        </div>
                    )}

                    {/* 5. No Members */}
                    {(activeCategory === 'all' || activeCategory === 'workspace') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Users className="size-3.5 text-blue-400" /> Varian: no_members
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">Team Collaboration</Badge>
                            </div>
                            <EmptyState variant="no_members" />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
