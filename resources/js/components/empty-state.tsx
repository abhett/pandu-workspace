import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bell,
    CheckCircle2,
    Clock,
    FileText,
    FolderKanban,
    HardDrive,
    Inbox,
    Plus,
    Search,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmptyStateVariant =
    | 'no_projects'
    | 'inbox_clear'
    | 'no_search_results'
    | 'no_tasks'
    | 'no_members'
    | 'no_files'
    | 'no_notifications';

interface ActionConfig {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

interface Props {
    variant: EmptyStateVariant;
    title?: string;
    description?: string;
    primaryAction?: ActionConfig;
    secondaryAction?: ActionConfig;
    searchValue?: string;
    onSearchChange?: (val: string) => void;
    onClearSearch?: () => void;
    className?: string;
}

export default function EmptyState({
    variant,
    title,
    description,
    primaryAction,
    secondaryAction,
    searchValue,
    onSearchChange,
    onClearSearch,
    className,
}: Props) {
    const getDefaults = () => {
        switch (variant) {
            case 'no_projects':
                return {
                    title: title || 'Belum Ada Proyek',
                    description:
                        description ||
                        'Mulai dengan membuat proyek pertama Anda untuk berkolaborasi dengan tim dan melacak progres pekerjaan.',
                    primaryAction: primaryAction || {
                        label: 'Buat Proyek Baru',
                        href: '/projects/create',
                        icon: <Plus className="size-3.5" />,
                    },
                    secondaryAction: secondaryAction || {
                        label: 'Jelajahi Template',
                        href: '/projects/create?tab=templates',
                    },
                };
            case 'inbox_clear':
                return {
                    title: title || 'Kotak Masuk Bersih (Inbox Zero)',
                    description:
                        description ||
                        'Bagus sekali! Anda telah membaca semua notifikasi, tugas, dan pembaruan. Nikmati waktu tenang Anda.',
                    primaryAction: primaryAction || {
                        label: 'Atur Preferensi Notifikasi',
                        href: '/settings/notifications',
                    },
                    secondaryAction,
                };
            case 'no_search_results':
                return {
                    title: title || `Tidak ada hasil untuk "${searchValue || 'pencarian'}"`,
                    description:
                        description ||
                        'Kami tidak dapat menemukan apa pun yang cocok dengan kriteria pencarian Anda. Coba periksa ejaan atau gunakan kata kunci yang lebih umum.',
                    primaryAction,
                    secondaryAction: secondaryAction || {
                        label: 'Hapus Filter & Pencarian',
                        onClick: onClearSearch,
                    },
                };
            case 'no_tasks':
                return {
                    title: title || 'Belum Ada Tugas di Papan Ini',
                    description:
                        description ||
                        'Buat tugas pertama untuk memulai sprint atau alur kerja tim Anda.',
                    primaryAction: primaryAction || {
                        label: 'Buat Tugas Baru',
                        icon: <Plus className="size-3.5" />,
                    },
                    secondaryAction,
                };
            case 'no_members':
                return {
                    title: title || 'Belum Ada Anggota Tim Tambahan',
                    description:
                        description ||
                        'Undang rekan kerja dan developer Anda untuk mulai berkolaborasi di ruang kerja ini.',
                    primaryAction: primaryAction || {
                        label: 'Undang Anggota Baru',
                        href: '/organization/members',
                        icon: <Users className="size-3.5" />,
                    },
                    secondaryAction,
                };
            case 'no_files':
                return {
                    title: title || 'Belum Ada Berkas yang Diunggah',
                    description:
                        description ||
                        'Unggah dokumen spesifikasi, aset desain, atau lampiran untuk dibagikan ke tim.',
                    primaryAction: primaryAction || {
                        label: 'Unggah Berkas Baru',
                        icon: <HardDrive className="size-3.5" />,
                    },
                    secondaryAction,
                };
            case 'no_notifications':
                return {
                    title: title || 'Semua Pemberitahuan Telah Dibaca',
                    description:
                        description ||
                        'Tidak ada pembaruan baru yang memerlukan perhatian Anda saat ini.',
                    primaryAction,
                    secondaryAction,
                };
        }
    };

    const config = getDefaults();

    const renderIllustration = () => {
        switch (variant) {
            case 'no_projects':
                return (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 text-muted-foreground group-hover:text-primary transition-colors duration-500">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                            <rect height="72" rx="8" stroke="currentColor" strokeDasharray="16 8" strokeLinecap="round" strokeWidth="4" width="80" x="24" y="32" />
                            <path d="M48 68H80M48 84H64" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                            <circle cx="88" cy="40" fill="currentColor" fillOpacity="0.1" r="16" stroke="currentColor" strokeWidth="4" />
                            <path d="M80 40H96M88 32V48" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                        </svg>
                    </div>
                );
            case 'inbox_clear':
                return (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 text-muted-foreground group-hover:text-emerald-400 transition-colors duration-500">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 40C24 35.5817 27.5817 32 32 32H96C100.418 32 104 35.5817 104 40V88C104 92.4183 100.418 96 96 96H32C27.5817 96 24 92.4183 24 88V40Z" stroke="currentColor" strokeWidth="4" />
                            <path d="M24 40L64 72L104 40" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                            <circle cx="96" cy="32" fill="currentColor" r="12" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <path d="M90 32L94 36L102 28" stroke="var(--background)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </svg>
                    </div>
                );
            case 'no_search_results':
                return (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 text-muted-foreground group-hover:text-amber-400 transition-colors duration-500">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="64" cy="64" r="40" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
                            <path d="M92 92L132 132" stroke="currentColor" strokeLinecap="round" strokeWidth="6" />
                            <path d="M52 64H76M64 52V76" stroke="currentColor" strokeLinecap="round" strokeWidth="4" className="group-hover:rotate-45 transition-transform duration-700 origin-center opacity-60" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                        <FolderKanban className="size-8" />
                    </div>
                );
        }
    };

    const renderButton = (act: ActionConfig, isPrimary: boolean) => {
        const btnVariant = act.variant || (isPrimary ? 'default' : 'outline');

        if (act.href) {
            return (
                <Link href={act.href} key={act.label}>
                    <Button
                        variant={btnVariant}
                        className="text-xs font-semibold gap-1.5 shadow-xs"
                    >
                        {act.icon}
                        {act.label}
                    </Button>
                </Link>
            );
        }

        return (
            <Button
                key={act.label}
                variant={btnVariant}
                onClick={act.onClick}
                className="text-xs font-semibold gap-1.5 shadow-xs"
            >
                {act.icon}
                {act.label}
            </Button>
        );
    };

    return (
        <div
            className={cn(
                'bg-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center border border-border hover:border-primary/40 transition-colors duration-300 relative overflow-hidden group shadow-xs',
                className
            )}
        >
            {/* Subtle Gradient Hover Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 mb-6 flex items-center justify-center">
                {renderIllustration()}
            </div>

            <div className="relative z-10 max-w-md space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {config.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {config.description}
                </p>

                {variant === 'no_search_results' && onSearchChange && (
                    <div className="pt-3 pb-1 w-full max-w-sm mx-auto">
                        <div className="relative">
                            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                type="text"
                                value={searchValue || ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Coba kata kunci lain..."
                                className="pl-8 pr-8 text-xs font-mono"
                            />
                            {searchValue && onClearSearch && (
                                <button
                                    type="button"
                                    onClick={onClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {(config.primaryAction || config.secondaryAction) && (
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                        {config.primaryAction && renderButton(config.primaryAction, true)}
                        {config.secondaryAction && renderButton(config.secondaryAction, false)}
                    </div>
                )}
            </div>
        </div>
    );
}
