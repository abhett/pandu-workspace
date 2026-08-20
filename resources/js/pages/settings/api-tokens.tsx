import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Cloud,
    Code,
    Copy,
    Check,
    Globe,
    Key,
    Link as LinkIcon,
    PlusCircle,
    Shield,
    Tag,
    Trash2,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenItem {
    id: number | string;
    name: string;
    token_mask: string;
    abilities: string[];
    last_used_at: string;
    last_used_ip: string;
    created_at_formatted: string;
    expires_at_formatted: string;
}

interface ConnectedAccountItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    is_connected: boolean;
    username?: string;
    connected_at?: string;
}

interface Props {
    tokens: TokenItem[];
    connected_accounts: ConnectedAccountItem[];
}

export default function ApiTokensPage({ tokens, connected_accounts }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [abilities, setAbilities] = useState<string[]>(['read', 'write']);
    const [expiryDays, setExpiryDays] = useState<string>('90');

    const [createdPlainToken, setCreatedPlainToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateToken = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/settings/api-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: tokenName,
                abilities,
                expires_in_days: expiryDays ? parseInt(expiryDays) : null,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setShowCreateModal(false);
                setTokenName('');
                if (data.plain_text_token) {
                    setCreatedPlainToken(data.plain_text_token);
                }
                router.reload();
            });
    };

    const handleRevokeToken = (tokenId: string | number) => {
        if (!confirm('Apakah Anda yakin ingin mencabut token API ini? Aplikasi terkait akan kehilangan akses.')) {
            return;
        }

        fetch(`/settings/api-tokens/${tokenId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => {
            router.reload();
        });
    };

    const handleToggleAccount = (provider: string, connect: boolean) => {
        fetch('/settings/connected-accounts/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                provider,
                connect,
            }),
        }).then(() => {
            router.reload();
        });
    };

    const handleCopyToken = () => {
        if (createdPlainToken) {
            navigator.clipboard.writeText(createdPlainToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getProviderIcon = (icon: string) => {
        switch (icon) {
            case 'code':
                return <Code className="size-6 text-foreground" />;
            case 'tag':
                return <Tag className="size-6 text-emerald-400" />;
            case 'cloud':
                return <Cloud className="size-6 text-blue-400" />;
            default:
                return <Globe className="size-6 text-primary" />;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pengaturan', href: '/settings/profile' },
                { title: 'Integrasi & API', href: '#' },
            ]}
        >
            <Head title="Integrasi & Token API - Pengaturan Pribadi" />

            <SettingsLayout>
                <div className="space-y-8 animate-fade-in">
                    {/* Header Section */}
                    <div className="space-y-1 pb-2 border-b border-border">
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <LinkIcon className="size-5 text-primary" /> Integrasi Akun & Token API
                        </h1>
                        <p className="text-xs text-muted-foreground max-w-2xl">
                            Kelola tautan akun pihak ketiga Anda dan buat token akses API developer untuk otomasi alur kerja aman.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Connected Accounts Section */}
                        <section className="xl:col-span-7 space-y-4">
                            <div className="flex items-center justify-between pb-1">
                                <h2 className="text-sm font-bold text-foreground">Aplikasi Terhubung</h2>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    {connected_accounts.filter((a) => a.is_connected).length} Terhubung
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {connected_accounts.map((app) => (
                                    <div
                                        key={app.id}
                                        className={cn(
                                            'bg-card rounded-2xl p-5 border flex flex-col justify-between space-y-4 shadow-xs transition-all',
                                            app.is_connected
                                                ? 'border-border hover:border-primary/40'
                                                : 'border-border/60 opacity-75 hover:opacity-100'
                                        )}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center border border-border">
                                                    {getProviderIcon(app.icon)}
                                                </div>

                                                {app.is_connected ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono gap-1">
                                                        <span className="size-1.5 rounded-full bg-emerald-400" /> Terhubung
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                                                        Belum Tertaut
                                                    </Badge>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-sm text-foreground">{app.name}</h3>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                    {app.description}
                                                </p>
                                                {app.is_connected && app.username && (
                                                    <div className="mt-2 text-[11px] font-mono text-primary flex items-center gap-1">
                                                        <span>@</span>
                                                        <span>{app.username}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            {app.is_connected ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggleAccount(app.id, false)}
                                                    className="w-full text-xs h-7 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                                >
                                                    Cabut Akses
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleToggleAccount(app.id, true)}
                                                    className="w-full text-xs h-7"
                                                >
                                                    Hubungkan Akun
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* API Tokens Section */}
                        <section className="xl:col-span-5 space-y-4">
                            <div className="flex items-center justify-between pb-1">
                                <h2 className="text-sm font-bold text-foreground">Personal API Tokens</h2>
                                <Button
                                    size="sm"
                                    onClick={() => setShowCreateModal(true)}
                                    className="text-xs h-7 font-semibold gap-1.5 shadow-xs"
                                >
                                    <PlusCircle className="size-3.5" /> Buat Token
                                </Button>
                            </div>

                            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
                                {tokens.length === 0 ? (
                                    <div className="p-8 text-center space-y-2">
                                        <Key className="size-8 text-muted-foreground/40 mx-auto" />
                                        <p className="text-xs text-muted-foreground">Belum ada API Token aktif.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {tokens.map((token) => (
                                            <div
                                                key={token.id}
                                                className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-foreground">
                                                            {token.name}
                                                        </span>
                                                        <span className="size-1.5 rounded-full bg-emerald-400" title="Aktif" />
                                                    </div>

                                                    <div className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded w-max border border-border">
                                                        {token.token_mask}
                                                    </div>

                                                    <div className="flex items-center gap-1 pt-1">
                                                        {token.abilities.map((ability) => (
                                                            <Badge
                                                                key={ability}
                                                                variant="secondary"
                                                                className="text-[9px] font-mono px-1 py-0"
                                                            >
                                                                {ability}
                                                            </Badge>
                                                        ))}
                                                        <span className="text-[10px] text-muted-foreground ml-1">
                                                            • Digunakan: {token.last_used_at}
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRevokeToken(token.id)}
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8 rounded-lg"
                                                    title="Cabut Token"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Security Notice Box */}
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                                <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-1 text-xs">
                                    <h4 className="font-bold text-foreground">Jaga Keamanan Kunci Token Anda</h4>
                                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                                        Token dengan izin <code className="font-mono text-primary bg-muted px-1 py-0.5 rounded">write</code> dan <code className="font-mono text-primary bg-muted px-1 py-0.5 rounded">admin</code> memiliki akses penuh ke resource workspace. Jangan pernah menyematkan token langsung di repositori publik.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Create Token Modal */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold flex items-center gap-2">
                                <Key className="size-4 text-primary" /> Buat Personal API Token
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleCreateToken} className="space-y-4 py-2 text-xs">
                            <div className="space-y-1">
                                <label className="font-semibold text-foreground">Nama Token / Keterangan</label>
                                <Input
                                    type="text"
                                    value={tokenName}
                                    onChange={(e) => setTokenName(e.target.value)}
                                    placeholder="misal: CI/CD Pipeline, GitHub Action Sync"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="font-semibold text-foreground">Cakupan Kemampuan (Abilities / Scopes)</label>
                                <div className="space-y-2 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={abilities.includes('read')}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setAbilities([...abilities, 'read']);
                                                } else {
                                                    setAbilities(abilities.filter((a) => a !== 'read'));
                                                }
                                            }}
                                        />
                                        <div>
                                            <span className="font-semibold text-foreground">read</span>
                                            <p className="text-[11px] text-muted-foreground">Membaca daftar tugas, proyek, dan anggota</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={abilities.includes('write')}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setAbilities([...abilities, 'write']);
                                                } else {
                                                    setAbilities(abilities.filter((a) => a !== 'write'));
                                                }
                                            }}
                                        />
                                        <div>
                                            <span className="font-semibold text-foreground">write</span>
                                            <p className="text-[11px] text-muted-foreground">Membuat dan mengubah tugas, alur kerja, dan komentar</p>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={abilities.includes('admin')}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setAbilities([...abilities, 'admin']);
                                                } else {
                                                    setAbilities(abilities.filter((a) => a !== 'admin'));
                                                }
                                            }}
                                        />
                                        <div>
                                            <span className="font-semibold text-foreground">admin</span>
                                            <p className="text-[11px] text-muted-foreground">Akses penuh konfigurasi workspace dan webhook</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-foreground">Masa Berlaku Token</label>
                                <select
                                    value={expiryDays}
                                    onChange={(e) => setExpiryDays(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono"
                                >
                                    <option value="30">30 Hari</option>
                                    <option value="90">90 Hari (Rekomendasi)</option>
                                    <option value="365">1 Tahun</option>
                                    <option value="">Tanpa Batas Waktu</option>
                                </select>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="text-xs">
                                    Batal
                                </Button>
                                <Button type="submit" className="text-xs font-semibold">
                                    Buat Token Sekarang
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Display Plain Token Modal */}
                <Dialog open={!!createdPlainToken} onOpenChange={() => setCreatedPlainToken(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="size-5" /> Token API Berhasil Dibuat
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-2 text-xs">
                            <p className="text-muted-foreground leading-relaxed">
                                Harap salin token akses pribadi ini sekarang. Demi alasan keamanan, token ini <strong>tidak akan pernah ditampilkan lagi</strong>.
                            </p>

                            <div className="p-3 bg-muted/60 rounded-xl border border-border flex items-center justify-between gap-2">
                                <code className="font-mono text-xs text-foreground break-all select-all">
                                    {createdPlainToken}
                                </code>
                                <Button
                                    size="sm"
                                    onClick={handleCopyToken}
                                    className="shrink-0 text-xs h-8 gap-1.5 font-semibold"
                                >
                                    {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                                    {copied ? 'Tersalin' : 'Salin'}
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setCreatedPlainToken(null)} className="text-xs font-semibold">
                                Saya Sudah Menyimpan Token Ini
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    );
}
