import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className = '' }: { className?: string }) {
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface-container text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-on-surface focus:outline-none',
                className,
            )}
            title={`Ganti ke mode ${resolvedAppearance === 'dark' ? 'terang' : 'gelap'}`}
            aria-label="Toggle theme"
        >
            {resolvedAppearance === 'dark' ? (
                <Sun className="size-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
                <Moon className="size-4 text-primary transition-transform duration-300 hover:-rotate-12" />
            )}
        </button>
    );
}
