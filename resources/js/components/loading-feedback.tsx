import React from 'react';
import { cn } from '@/lib/utils';

export function CircularSpinner({ className }: { className?: string }) {
    return (
        <svg
            className={cn('animate-spin size-5 text-primary', className)}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
            />
        </svg>
    );
}

export function PulsingDots({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
    );
}

export function DeterminateProgressBar({
    label,
    value,
    className,
}: {
    label?: string;
    value: number;
    className?: string;
}) {
    const clamped = Math.min(Math.max(value, 0), 100);

    return (
        <div className={cn('space-y-1.5 w-full', className)}>
            {label && (
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>{label}</span>
                    <span className="font-bold text-foreground">{clamped}%</span>
                </div>
            )}
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    );
}

export function SkeletonCard({ count = 1 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card rounded-2xl p-5 border border-border space-y-4 animate-pulse"
                >
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-24 bg-muted rounded-md" />
                        <div className="h-6 w-6 rounded-full bg-muted" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-7 w-20 bg-muted rounded-md" />
                        <div className="h-3 w-36 bg-muted rounded-md" />
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full" />
                </div>
            ))}
        </>
    );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
    return (
        <div className="w-full border border-border rounded-2xl overflow-hidden animate-pulse bg-card p-4 space-y-3">
            <div className="h-4 w-1/3 bg-muted rounded-md mb-4" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/50">
                    <div className="h-4 w-1/4 bg-muted rounded-md" />
                    <div className="h-4 w-1/6 bg-muted rounded-md" />
                    <div className="h-4 w-1/6 bg-muted rounded-md" />
                    <div className="h-4 w-12 bg-muted rounded-md" />
                </div>
            ))}
        </div>
    );
}
