import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Save, CheckCircle2 } from 'lucide-react';
import { edit } from '@/routes/security';

interface NotificationPreferenceItem {
    event_type: string;
    title: string;
    description: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
}

interface Props {
    preferences: NotificationPreferenceItem[];
}

export default function NotificationPreferences({ preferences: initialPreferences }: Props) {
    const [preferences, setPreferences] = useState<NotificationPreferenceItem[]>(initialPreferences);
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const handleToggle = (eventType: string, channel: 'in_app' | 'email') => {
        setSavedSuccess(false);
        setPreferences((prev) =>
            prev.map((item) => {
                if (item.event_type === eventType) {
                    return {
                        ...item,
                        [channel === 'in_app' ? 'in_app_enabled' : 'email_enabled']: !item[
                            channel === 'in_app' ? 'in_app_enabled' : 'email_enabled'
                        ],
                    };
                }
                return item;
            })
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        fetch('/settings/notifications', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ preferences }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSaving(false);
                if (data.success) {
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 4000);
                }
            })
            .catch(() => setIsSaving(false));
    };

    return (
        <>
            <Head title="Pengaturan Notifikasi" />

            <h1 className="sr-only">Pengaturan Notifikasi</h1>

            <div className="space-y-8 max-w-3xl">
                <div>
                    <Heading
                        variant="small"
                        title="Preferensi Saluran Notifikasi"
                        description="Pilih bagaimana dan kapan Anda ingin menerima notifikasi untuk berbagai aktivitas di ruang kerja Anda."
                    />
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-muted/40 text-xs font-bold text-foreground">
                            <div className="col-span-8 flex items-center gap-2">
                                <span>Aktivitas & Peristiwa</span>
                            </div>
                            <div className="col-span-2 text-center flex items-center justify-center gap-1.5 text-muted-foreground">
                                <Smartphone className="size-3.5" />
                                <span>In-App</span>
                            </div>
                            <div className="col-span-2 text-center flex items-center justify-center gap-1.5 text-muted-foreground">
                                <Mail className="size-3.5" />
                                <span>Email</span>
                            </div>
                        </div>

                        {/* List items */}
                        {preferences.map((item) => (
                            <div
                                key={item.event_type}
                                className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors text-xs"
                            >
                                <div className="col-span-8 space-y-0.5">
                                    <p className="font-semibold text-foreground">{item.title}</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <Checkbox
                                        checked={item.in_app_enabled}
                                        onCheckedChange={() => handleToggle(item.event_type, 'in_app')}
                                        aria-label={`In-App untuk ${item.title}`}
                                    />
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <Checkbox
                                        checked={item.email_enabled}
                                        onCheckedChange={() => handleToggle(item.event_type, 'email')}
                                        aria-label={`Email untuk ${item.title}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {savedSuccess ? (
                            <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold animate-in fade-in">
                                <CheckCircle2 className="size-4" />
                                <span>Preferensi notifikasi berhasil disimpan.</span>
                            </div>
                        ) : <div />}

                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="text-xs font-semibold gap-1.5"
                        >
                            <Save className="size-3.5" />
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}</span>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

NotificationPreferences.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan Notifikasi',
            href: '/settings/notifications',
        },
    ],
};
