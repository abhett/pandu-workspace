import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Calendar,
    CheckCircle2,
    Clock,
    Globe,
    Languages,
    MapPin,
    Save,
} from 'lucide-react';

interface RegionalPreferences {
    language: string;
    date_format: string;
    number_format: string;
    first_day_of_week: number;
    timezone: string;
    time_format_24h: boolean;
}

interface Props {
    regional_preferences: RegionalPreferences;
}

export default function LanguageTimezonePage({ regional_preferences }: Props) {
    const [language, setLanguage] = useState(regional_preferences.language);
    const [dateFormat, setDateFormat] = useState(regional_preferences.date_format);
    const [numberFormat, setNumberFormat] = useState(regional_preferences.number_format);
    const [firstDay, setFirstDay] = useState(regional_preferences.first_day_of_week);
    const [timezone, setTimezone] = useState(regional_preferences.timezone);
    const [timeFormat24h, setTimeFormat24h] = useState(regional_preferences.time_format_24h);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        fetch('/settings/language-timezone', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                language,
                date_format: dateFormat,
                number_format: numberFormat,
                first_day_of_week: firstDay,
                timezone,
                time_format_24h: timeFormat24h,
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

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pengaturan', href: '/settings/profile' },
                { title: 'Bahasa & Zona Waktu', href: '#' },
            ]}
        >
            <Head title="Bahasa & Zona Waktu - Pengaturan Pribadi" />

            <SettingsLayout>
                <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
                    {/* Header Section */}
                    <div className="space-y-1 pb-2 border-b border-border">
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Languages className="size-5 text-primary" /> Bahasa & Zona Waktu
                        </h1>
                        <p className="text-xs text-muted-foreground max-w-2xl">
                            Sesuaikan tampilan bahasa antarmuka, format tanggal, desimal angka, dan zona waktu lokal Anda.
                        </p>
                    </div>

                    <div className="space-y-6 max-w-2xl">
                        {/* Regional Preferences Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Globe className="size-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Preferensi Bahasa & Format</h2>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono">
                                    Aktif
                                </Badge>
                            </div>

                            <div className="space-y-4 text-xs">
                                {/* Language */}
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-foreground">Bahasa Antarmuka (Interface Language)</label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="id">Bahasa Indonesia</option>
                                        <option value="en">English (US)</option>
                                        <option value="en-gb">English (UK)</option>
                                        <option value="fr">Français</option>
                                        <option value="ja">日本語</option>
                                        <option value="es">Español</option>
                                    </select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Mengubah bahasa navigasi menu, tombol aksi, dan pesan bantuan.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    {/* Date Format */}
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-foreground">Format Tanggal</label>
                                        <select
                                            value={dateFormat}
                                            onChange={(e) => setDateFormat(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                        >
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
                                        </select>
                                    </div>

                                    {/* Number Format */}
                                    <div className="space-y-1.5">
                                        <label className="font-semibold text-foreground">Format Angka</label>
                                        <select
                                            value={numberFormat}
                                            onChange={(e) => setNumberFormat(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                        >
                                            <option value="EU">1.234,56 (Indonesia / EU)</option>
                                            <option value="US">1,234.56 (US / UK)</option>
                                            <option value="CH">1'234.56 (Swiss)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* First Day of Week */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="font-semibold text-foreground">Hari Pertama Mingguan (First Day of Week)</label>
                                    <select
                                        value={firstDay}
                                        onChange={(e) => setFirstDay(parseInt(e.target.value))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="1">Senin (Monday)</option>
                                        <option value="0">Minggu (Sunday)</option>
                                        <option value="6">Sabtu (Saturday)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Timezone Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-emerald-400" />
                                    <h2 className="text-sm font-bold text-foreground">Waktu & Zona Lokasi</h2>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-foreground">Zona Waktu (Timezone)</label>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="Asia/Jakarta">WIB - Asia/Jakarta (GMT+7)</option>
                                        <option value="Asia/Makassar">WITA - Asia/Makassar (GMT+8)</option>
                                        <option value="Asia/Jayapura">WIT - Asia/Jayapura (GMT+9)</option>
                                        <option value="Asia/Singapore">SGT - Asia/Singapore (GMT+8)</option>
                                        <option value="UTC">UTC (GMT+0)</option>
                                        <option value="Europe/London">GMT - Europe/London</option>
                                        <option value="America/New_York">EST - America/New_York (GMT-5)</option>
                                        <option value="Asia/Tokyo">JST - Asia/Tokyo (GMT+9)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                                    <div className="space-y-0.5">
                                        <span className="font-semibold text-foreground">Gunakan Format 24 Jam</span>
                                        <p className="text-[11px] text-muted-foreground">Tampilkan waktu seperti 14:30 alih-alih 02:30 PM.</p>
                                    </div>
                                    <Switch
                                        checked={timeFormat24h}
                                        onCheckedChange={setTimeFormat24h}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border max-w-2xl">
                        {saveSuccess && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fade-in mr-auto">
                                <CheckCircle2 className="size-4" /> Preferensi regional berhasil disimpan!
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
                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
