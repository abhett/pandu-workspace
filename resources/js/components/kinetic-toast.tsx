import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Info,
    RotateCcw,
    Undo2,
    X,
    XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'undo';
export type ToastPosition =
    | 'top-right'
    | 'top-left'
    | 'top-center'
    | 'bottom-right'
    | 'bottom-left'
    | 'bottom-center';

export interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number; // in ms, default 5000
    action?: {
        label: string;
        onClick: () => void;
    };
    onUndo?: () => void;
}

type ToastListener = (toasts: ToastItem[], position: ToastPosition) => void;

let activeToasts: ToastItem[] = [];
let currentPosition: ToastPosition = 'bottom-right';
const listeners = new Set<ToastListener>();

const notifyListeners = () => {
    listeners.forEach((listener) => listener([...activeToasts], currentPosition));
};

export const kineticToast = {
    show: (item: Omit<ToastItem, 'id'>) => {
        const id = 'toast_' + Math.random().toString(36).substring(2, 9);
        const newToast: ToastItem = {
            id,
            duration: item.duration || (item.type === 'undo' ? 7000 : 5000),
            ...item,
        };
        activeToasts = [newToast, ...activeToasts].slice(0, 5);
        notifyListeners();
        return id;
    },
    success: (title: string, description?: string, action?: ToastItem['action']) => {
        return kineticToast.show({ type: 'success', title, description, action });
    },
    error: (title: string, description?: string, action?: ToastItem['action']) => {
        return kineticToast.show({ type: 'error', title, description, action });
    },
    warning: (title: string, description?: string, action?: ToastItem['action']) => {
        return kineticToast.show({ type: 'warning', title, description, action });
    },
    info: (title: string, description?: string, action?: ToastItem['action']) => {
        return kineticToast.show({ type: 'info', title, description, action });
    },
    undo: (title: string, description?: string, onUndo?: () => void) => {
        return kineticToast.show({
            type: 'undo',
            title,
            description,
            onUndo,
            action: {
                label: 'Batal / Undo',
                onClick: () => {
                    if (onUndo) onUndo();
                },
            },
        });
    },
    dismiss: (id: string) => {
        activeToasts = activeToasts.filter((t) => t.id !== id);
        notifyListeners();
    },
    clearAll: () => {
        activeToasts = [];
        notifyListeners();
    },
    setPosition: (pos: ToastPosition) => {
        currentPosition = pos;
        notifyListeners();
    },
};

export function KineticToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>(activeToasts);
    const [position, setPosition] = useState<ToastPosition>(currentPosition);

    useEffect(() => {
        const handler: ToastListener = (newToasts, newPos) => {
            setToasts(newToasts);
            setPosition(newPos);
        };
        listeners.add(handler);
        return () => {
            listeners.delete(handler);
        };
    }, []);

    if (toasts.length === 0) return null;

    const getPositionClasses = () => {
        switch (position) {
            case 'top-right':
                return 'top-4 right-4 items-end';
            case 'top-left':
                return 'top-4 left-4 items-start';
            case 'top-center':
                return 'top-4 left-1/2 -translate-x-1/2 items-center';
            case 'bottom-left':
                return 'bottom-4 left-4 items-start';
            case 'bottom-center':
                return 'bottom-4 left-1/2 -translate-x-1/2 items-center';
            case 'bottom-right':
            default:
                return 'bottom-4 right-4 items-end';
        }
    };

    return (
        <div
            className={cn(
                'fixed z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none p-2 sm:p-0',
                getPositionClasses()
            )}
        >
            {toasts.map((toast) => (
                <ToastCard key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function ToastCard({ toast }: { toast: ToastItem }) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = toast.duration || 5000;
        const interval = 50;
        const decrement = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    kineticToast.dismiss(toast.id);
                    return 0;
                }
                return prev - decrement;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [toast]);

    const getIconAndColors = () => {
        switch (toast.type) {
            case 'success':
                return {
                    icon: <CheckCircle2 className="size-4 text-emerald-400" />,
                    bgBadge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                    progressBar: 'bg-emerald-400',
                };
            case 'error':
                return {
                    icon: <XCircle className="size-4 text-red-400" />,
                    bgBadge: 'bg-red-500/10 border-red-500/20 text-red-400',
                    progressBar: 'bg-red-400',
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="size-4 text-amber-400" />,
                    bgBadge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    progressBar: 'bg-amber-400',
                };
            case 'undo':
                return {
                    icon: <Undo2 className="size-4 text-purple-400" />,
                    bgBadge: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                    progressBar: 'bg-purple-400',
                };
            case 'info':
            default:
                return {
                    icon: <Info className="size-4 text-blue-400" />,
                    bgBadge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                    progressBar: 'bg-blue-400',
                };
        }
    };

    const styling = getIconAndColors();

    return (
        <div className="pointer-events-auto w-full bg-card rounded-xl p-3.5 border border-border shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 group">
            <div className="flex items-start gap-3">
                {/* Type Icon Badge */}
                <div
                    className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                        styling.bgBadge
                    )}
                >
                    {styling.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                    <p className="text-xs font-bold text-foreground leading-tight tracking-tight">
                        {toast.title}
                    </p>
                    {toast.description && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            {toast.description}
                        </p>
                    )}
                </div>

                {/* Optional Action Button */}
                {toast.action && (
                    <button
                        type="button"
                        onClick={() => {
                            toast.action?.onClick();
                            kineticToast.dismiss(toast.id);
                        }}
                        className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[10px] font-mono font-bold uppercase tracking-wider transition-colors shrink-0"
                    >
                        {toast.action.label}
                    </button>
                )}

                {/* Close Button */}
                <button
                    type="button"
                    onClick={() => kineticToast.dismiss(toast.id)}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted transition-colors shrink-0"
                >
                    <X className="size-3.5" />
                </button>
            </div>

            {/* Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/40 overflow-hidden">
                <div
                    className={cn('h-full transition-all linear', styling.progressBar)}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
