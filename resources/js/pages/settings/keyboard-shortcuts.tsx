import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Accessibility,
    CheckCircle2,
    CheckSquare,
    Compass,
    Eye,
    Globe,
    Keyboard,
    LayoutGrid,
    Save,
    Search,
    Sliders,
    Zap,
} from 'lucide-react';

interface Preferences {
    single_key_shortcuts_enabled: boolean;
    reduce_motion: boolean;
    high_contrast: boolean;
}

interface ShortcutCategory {
    title: string;
    icon: string;
    shortcuts: Array<{
        label: string;
        keys: string[];
    }>;
}

interface Props {
    preferences: Preferences;
    shortcuts: Record<string, ShortcutCategory>;
}

export default function KeyboardShortcutsPage({ preferences, shortcuts }: Props) {
    const [singleKey, setSingleKey] = useState(preferences.single_key_shortcuts_enabled);
    const [reduceMotion, setReduceMotion] = useState(preferences.reduce_motion);
    const [highContrast, setHighContrast] = useState(preferences.high_contrast);

    const [search, setSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        fetch('/settings/keyboard-shortcuts', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                single_key_shortcuts_enabled: singleKey,
                reduce_motion: reduceMotion,
                high_contrast: highContrast,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                router.reload();
            })
            .catch(() => {
                setIsSaving(false);
            });
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'compass':
                return <Compass className="size-4 text-emerald-400" />;
            case 'check-square':
                return <CheckSquare className="size-4 text-blue-400" />;
            case 'layout-grid':
                return <LayoutGrid className="size-4 text-amber-400" />;
            default:
                return <Globe className="size-4 text-primary" />;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pengaturan', href: '/settings/profile' },
                { title: 'Pintasan Keyboard', href: '#' },
            ]}
        >
            <Head title="Pintasan Keyboard & Aksesibilitas - Pengaturan Pribadi" />

            <SettingsLayout>
                <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
                    {/* Header Section */}
                    <div className="space-y-1 pb-2 border-b border-border">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Keyboard className="size-5 text-primary" /> Pintasan Keyboard & Aksesibilitas
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-mono gap-1">
                                Tekan <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">Shift</kbd> + <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">?</kbd>
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-2xl">
                            Kelola preferensi tombol pintasan cepat, kenyamanan navigasi, dan setelan aksesibilitas visual Anda.
                        </p>
                    </div>

                    {/* Accessibility Preferences Card */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <Accessibility className="size-4 text-primary" />
                            <h2 className="text-sm font-bold text-foreground">Setelan Aksesibilitas & Kontrol Keyboard</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            {/* Single Key Shortcuts */}
                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">Pintasan Satu Tombol</span>
                                        <Switch checked={singleKey} onCheckedChange={setSingleKey} />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Aktifkan tombol tunggal seperti <code className="font-mono bg-muted px-1 rounded">C</code>, <code className="font-mono bg-muted px-1 rounded">E</code>, <code className="font-mono bg-muted px-1 rounded">S</code>.
                                    </p>
                                </div>
                            </div>

                            {/* Reduce Motion */}
                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">Kurangi Animasi</span>
                                        <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Meminimalkan transisi dan animasi visual antarmuka untuk performa halus.
                                    </p>
                                </div>
                            </div>

                            {/* High Contrast */}
                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">Kontras Tinggi</span>
                                        <Switch checked={highContrast} onCheckedChange={setHighContrast} />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Meningkatkan batas kontras warna teks dan elemen UI untuk kenyamanan mata.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shortcuts Reference Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h2 className="text-sm font-bold text-foreground">Katalog Pintasan Keyboard</h2>
                            <div className="relative w-full sm:w-72">
                                <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    type="text"
                                    placeholder="Cari perintah atau kombinasi..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 text-xs h-8"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(shortcuts).map(([key, category]) => {
                                const filteredShortcuts = category.shortcuts.filter((s) =>
                                    s.label.toLowerCase().includes(search.toLowerCase()) ||
                                    s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase()))
                                );

                                if (filteredShortcuts.length === 0) return null;

                                return (
                                    <div
                                        key={key}
                                        className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-3"
                                    >
                                        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground flex items-center gap-2 pb-1 border-b border-border">
                                            {getIcon(category.icon)}
                                            {category.title}
                                        </h3>

                                        <ul className="space-y-2 text-xs">
                                            {filteredShortcuts.map((item, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                                                >
                                                    <span className="text-foreground">{item.label}</span>
                                                    <div className="flex items-center gap-1">
                                                        {item.keys.map((k, kIdx) => (
                                                            <React.Fragment key={kIdx}>
                                                                <kbd className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded border border-border shadow-2xs font-semibold text-foreground">
                                                                    {k}
                                                                </kbd>
                                                                {kIdx < item.keys.length - 1 && (
                                                                    <span className="text-[10px] text-muted-foreground">+</span>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                        {saveSuccess && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fade-in mr-auto">
                                <CheckCircle2 className="size-4" /> Preferensi aksesibilitas berhasil disimpan!
                            </span>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.reload()}
                            className="text-xs"
                        >
                            Batalkan
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="text-xs font-semibold gap-1.5"
                        >
                            <Save className="size-3.5" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}
                        </Button>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
