import { Link } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-background px-4 py-10 font-sans text-foreground sm:px-6">
            {/* Top Right Theme Toggle */}
            <div className="fixed top-5 right-5 z-50">
                <ThemeToggle />
            </div>

            {/* Ambient glowing orbs */}
            <div className="pointer-events-none fixed top-0 left-1/4 h-96 w-96 rounded-full bg-primary-container/20 mix-blend-screen blur-[140px]" />
            <div className="pointer-events-none fixed right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-secondary-container/20 mix-blend-screen blur-[120px]" />

            <div className="relative z-10 my-auto flex w-full max-w-md flex-col gap-6">
                {/* Single Unified Card */}
                <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 md:p-8">
                    {/* Brand Header inside the Card */}
                    <div className="mb-6 flex flex-col items-center gap-3 text-center">
                        <Link
                            href={home()}
                            className="group flex items-center gap-2"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-container shadow-sm transition-transform duration-300 group-hover:scale-105">
                                <AppLogoIcon className="size-7 fill-current text-primary" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Pandu AI
                            </span>
                        </Link>

                        <div className="mt-1 space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {title}
                            </h1>
                            {description && (
                                <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Form Body */}
                    {children}
                </div>

                {/* Single Enterprise Security Badge */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
                    <ShieldCheck className="size-4 shrink-0 text-tertiary" />
                    <span className="font-mono text-[11px] tracking-wide uppercase">
                        Data Anda aman dengan enkripsi enterprise
                    </span>
                </div>
            </div>
        </div>
    );
}
