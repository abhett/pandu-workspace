import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle2,
    Code,
    ExternalLink,
    Folder,
    Globe,
    Layers,
    MessageSquare,
    Palette,
    Plug,
    Plus,
    RefreshCw,
    Search,
    Send,
    Settings,
    Shield,
    Trash2,
    Webhook,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'checkbox';
    placeholder?: string;
    default?: any;
}

interface IntegrationItem {
    provider: string;
    name: string;
    category: string;
    description: string;
    docs_url: string;
    icon: string;
    config_fields: ConfigField[];
    is_installed: boolean;
    is_active: boolean;
    installed_id?: string;
    config: Record<string, any>;
    last_synced_at?: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    integrations: IntegrationItem[];
    filters: {
        category: string;
        search?: string;
    };
}

export default function IntegrationsMarketplace({ organization, integrations, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [activeCategory, setActiveCategory] = useState(filters.category || 'all');

    // Configuration Modal
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
    const [formConfig, setFormConfig] = useState<Record<string, any>>({});
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPinging, setIsPinging] = useState(false);
    const [pingResult, setPingResult] = useState<{ success: boolean; message: string } | null>(null);

    // Custom App Modal
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customCategory, setCustomCategory] = useState('automation');
    const [customWebhookUrl, setCustomWebhookUrl] = useState('');
    const [customDesc, setCustomDesc] = useState('');

    const categories = [
        { id: 'all', label: 'Semua' },
        { id: 'development', label: 'Development' },
        { id: 'communication', label: 'Komunikasi' },
        { id: 'calendar', label: 'Kalender' },
        { id: 'storage', label: 'Penyimpanan' },
        { id: 'design', label: 'Desain' },
        { id: 'automation', label: 'Automasi' },
    ];

    const applyFilter = (cat: string) => {
        setActiveCategory(cat);
        router.get(
            '/integrations',
            {
                category: cat !== 'all' ? cat : undefined,
                search: search || undefined,
            },
            { preserveState: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/integrations',
            {
                category: activeCategory !== 'all' ? activeCategory : undefined,
                search: search || undefined,
            },
            { preserveState: true }
        );
    };

    const openConfigModal = (item: IntegrationItem) => {
        setSelectedIntegration(item);
        setFormConfig(item.config || {});
        setIsActive(item.is_installed ? item.is_active : true);
        setPingResult(null);
    };

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedIntegration) return;

        setIsSaving(true);

        fetch('/integrations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                provider: selectedIntegration.provider,
                name: selectedIntegration.name,
                category: selectedIntegration.category,
                config: formConfig,
                is_active: isActive,
                id: selectedIntegration.installed_id,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setSelectedIntegration(null);
                router.reload();
            })
            .catch(() => setIsSaving(false));
    };

    const handleTestPing = () => {
        if (!selectedIntegration?.installed_id) {
            setPingResult({
                success: true,
                message: 'Silakan simpan konfigurasi terlebih dahulu untuk menjalankan pengujian ping aktif.',
            });
            return;
        }

        setIsPinging(true);
        setPingResult(null);

        fetch(`/integrations/${selectedIntegration.installed_id}/test-ping`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setIsPinging(false);
                setPingResult(data);
            })
            .catch((err) => {
                setIsPinging(false);
                setPingResult({ success: false, message: err.message || 'Gagal terhubung ke webhook.' });
            });
    };

    const handleDisconnect = () => {
        if (!selectedIntegration?.installed_id) return;
        if (!confirm(`Putuskan integrasi ${selectedIntegration.name}?`)) return;

        fetch(`/integrations/${selectedIntegration.installed_id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setSelectedIntegration(null);
                router.reload();
            });
    };

    const handleCreateCustom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName || !customWebhookUrl) return;

        fetch('/integrations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                provider: 'custom_webhook',
                name: customName,
                category: customCategory,
                config: {
                    webhook_url: customWebhookUrl,
                    description: customDesc,
                },
                is_active: true,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setShowCustomModal(false);
                setCustomName('');
                setCustomWebhookUrl('');
                setCustomDesc('');
                router.reload();
            });
    };

    const getProviderIcon = (icon: string) => {
        switch (icon) {
            case 'github':
                return (
                    <svg className="size-6 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                );
            case 'gitlab':
                return (
                    <svg className="size-6 text-[#E24329]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.136-.423-.731-.423-.867 0L1.388 9.452.045 13.587c-.121.375.014.789.331 1.023L12 23.054l11.625-8.443c.318-.235.453-.647.33-.1.024z" />
                    </svg>
                );
            case 'slack':
                return (
                    <svg className="size-6 text-[#E01E5A]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.52h-6.313z" />
                    </svg>
                );
            case 'discord':
                return (
                    <svg className="size-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                );
            case 'figma':
                return (
                    <svg className="size-6" viewBox="0 0 24 24" fill="none">
                        <path d="M8 11.5C8 13.433 6.433 15 4.5 15C2.567 15 1 13.433 1 11.5C1 9.567 2.567 8 4.5 8H8V11.5Z" fill="#0ACF83" />
                        <path d="M1 4.5C1 2.567 2.567 1 4.5 1H8V8H4.5C2.567 8 1 6.433 1 4.5Z" fill="#F24E1E" />
                        <path d="M8 1V8H11.5C13.433 8 15 6.433 15 4.5C15 2.567 13.433 1 11.5 1H8V1Z" fill="#FF7262" />
                        <path d="M15 11.5C15 13.433 13.433 15 11.5 15H8V8H11.5C13.433 8 15 9.567 15 11.5Z" fill="#1ABCFE" />
                        <path d="M8 15V22.5C8 24.433 9.567 26 11.5 26C13.433 26 15 24.433 15 22.5C15 20.567 13.433 19 11.5 19H8V15Z" fill="#A259FF" />
                    </svg>
                );
            case 'calendar':
                return <Calendar className="size-6 text-blue-400" />;
            case 'google_drive':
                return <Folder className="size-6 text-amber-400" />;
            case 'zapier':
                return <Zap className="size-6 text-orange-500" />;
            default:
                return <Webhook className="size-6 text-primary" />;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Ekosistem & Integrasi', href: '#' },
                { title: 'Marketplace Integrasi', href: '#' },
            ]}
        >
            <Head title={`Marketplace Integrasi - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <div className="flex items-center gap-2">
                            <Plug className="size-5 text-primary" />
                            <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                                EXTENSIONS & API ECOSYSTEM
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
                            Marketplace Integrasi
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                            Hubungkan sistem Pandu dengan ekosistem perangkat tim Anda untuk mengotomatiskan alur kerja dan memusatkan data proyek.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
                            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari integrasi..."
                                className="pl-8 text-xs font-mono h-8 bg-card"
                            />
                        </form>

                        <Button
                            onClick={() => setShowCustomModal(true)}
                            className="text-xs font-semibold h-8 gap-1.5 shrink-0 shadow-2xs"
                        >
                            <Plus className="size-3.5" />
                            <span>Aplikasi Kustom</span>
                        </Button>
                    </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => applyFilter(cat.id)}
                            className={cn(
                                'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors',
                                activeCategory === cat.id
                                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Integrations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {integrations.map((item) => (
                        <div
                            key={item.provider + (item.installed_id || '')}
                            className="bg-card hover:bg-muted/20 border border-border rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md relative overflow-hidden group"
                        >
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="size-12 rounded-xl bg-muted/60 flex items-center justify-center p-2.5 border border-border/80 shadow-2xs">
                                        {getProviderIcon(item.icon)}
                                    </div>

                                    {item.is_installed ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-mono">
                                            <span className="size-1.5 rounded-full bg-emerald-400" />
                                            {item.is_active ? 'Terhubung' : 'Non-aktif'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                                            Tersedia
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-foreground tracking-tight flex items-center gap-1.5">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
                                {item.docs_url !== '#' ? (
                                    <a
                                        href={item.docs_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-mono"
                                    >
                                        <span>Dokumentasi</span>
                                        <ExternalLink className="size-3" />
                                    </a>
                                ) : (
                                    <span className="text-[11px] font-mono text-muted-foreground capitalize">
                                        {item.category}
                                    </span>
                                )}

                                <Button
                                    size="sm"
                                    variant={item.is_installed ? 'outline' : 'default'}
                                    onClick={() => openConfigModal(item)}
                                    className="text-xs h-7 font-semibold"
                                >
                                    {item.is_installed ? 'Konfigurasi' : 'Instal'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Configuration Dialog Modal */}
            <Dialog open={selectedIntegration !== null} onOpenChange={(open) => !open && setSelectedIntegration(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            {selectedIntegration && getProviderIcon(selectedIntegration.icon)}
                            <span>Konfigurasi {selectedIntegration?.name}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedIntegration && (
                        <form onSubmit={handleSaveConfig} className="space-y-4 py-2">
                            <p className="text-xs text-muted-foreground">
                                {selectedIntegration.description}
                            </p>

                            {/* Dynamic Fields */}
                            <div className="space-y-3">
                                {selectedIntegration.config_fields.map((field) => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">{field.label}</label>

                                        {field.type === 'checkbox' ? (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id={field.key}
                                                    checked={formConfig[field.key] ?? field.default ?? false}
                                                    onChange={(e) =>
                                                        setFormConfig((prev) => ({ ...prev, [field.key]: e.target.checked }))
                                                    }
                                                    className="rounded border-border"
                                                />
                                                <label htmlFor={field.key} className="text-xs text-muted-foreground">
                                                    Aktifkan opsi ini
                                                </label>
                                            </div>
                                        ) : (
                                            <Input
                                                type={field.type}
                                                value={formConfig[field.key] || ''}
                                                onChange={(e) =>
                                                    setFormConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                }
                                                placeholder={field.placeholder}
                                                className="text-xs font-mono"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-foreground block">Status Integrasi</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        {isActive ? 'Aktif mengirim dan menerima data' : 'Non-aktif sementara'}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-border"
                                />
                            </div>

                            {/* Test Ping Response Box */}
                            {pingResult && (
                                <div
                                    className={cn(
                                        'p-3 rounded-xl text-xs font-mono space-y-1 border',
                                        pingResult.success
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 font-bold">
                                        {pingResult.success ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                                        <span>{pingResult.success ? 'Koneksi Berhasil' : 'Koneksi Bermasalah'}</span>
                                    </div>
                                    <p className="text-[11px]">{pingResult.message}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestPing}
                                        disabled={isPinging}
                                        className="text-xs gap-1.5 font-mono"
                                    >
                                        <Send className="size-3" />
                                        <span>{isPinging ? 'Menguji...' : 'Uji Ping'}</span>
                                    </Button>

                                    {selectedIntegration.is_installed && (
                                        <button
                                            type="button"
                                            onClick={handleDisconnect}
                                            className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Putuskan integrasi"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelectedIntegration(null)}
                                        className="text-xs"
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSaving} className="text-xs font-semibold">
                                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Custom Webhook Dialog Modal */}
            <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Webhook className="size-4 text-primary" /> Buat Integrasi Webhook Kustom
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateCustom} className="space-y-4 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Nama Aplikasi</label>
                            <Input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="Contoh: Internal ERP Webhook"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Kategori</label>
                            <select
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="automation">Automasi</option>
                                <option value="development">Development</option>
                                <option value="communication">Komunikasi</option>
                                <option value="storage">Penyimpanan</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Target Webhook URL</label>
                            <Input
                                type="url"
                                value={customWebhookUrl}
                                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                                placeholder="https://api.yourdomain.com/webhooks/pandu"
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground">Deskripsi (Opsional)</label>
                            <Input
                                type="text"
                                value={customDesc}
                                onChange={(e) => setCustomDesc(e.target.value)}
                                placeholder="Keterangan singkat fungsi webhook..."
                                className="text-xs font-mono"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCustomModal(false)} className="text-xs">
                                Batal
                            </Button>
                            <Button type="submit" className="text-xs font-semibold">
                                Buat Integrasi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
