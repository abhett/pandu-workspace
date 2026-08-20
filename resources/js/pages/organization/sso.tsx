import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Check,
    CheckCircle2,
    Copy,
    Download,
    Globe,
    Key,
    Lock,
    Plus,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    organization: {
        id: string;
        name: string;
    };
    sso_config: {
        id: string;
        provider_type: string;
        is_enabled: boolean;
        is_enforced: boolean;
        entity_id: string;
        sso_url: string;
        certificate: string;
        client_id: string;
        client_secret: string;
        issuer_url: string;
        allowed_domains: string[];
        sp_acs_url: string;
        sp_entity_id: string;
    };
}

export default function SsoManagementPage({ organization, sso_config }: Props) {
    const [activeTab, setActiveTab] = useState<'saml' | 'oidc'>((sso_config.provider_type as 'saml' | 'oidc') || 'saml');

    // SAML Form State
    const [samlEntityId, setSamlEntityId] = useState(sso_config.entity_id || '');
    const [samlSsoUrl, setSamlSsoUrl] = useState(sso_config.sso_url || '');
    const [samlCert, setSamlCert] = useState(sso_config.certificate || '');
    const [samlEnabled, setSamlEnabled] = useState(sso_config.is_enabled);

    // OIDC Form State
    const [oidcClientId, setOidcClientId] = useState(sso_config.client_id || '');
    const [oidcClientSecret, setOidcClientSecret] = useState('');
    const [oidcIssuerUrl, setOidcIssuerUrl] = useState(sso_config.issuer_url || '');
    const [oidcEnabled, setOidcEnabled] = useState(sso_config.is_enabled);

    // Domain State
    const [newDomain, setNewDomain] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSaveSaml = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/organization/sso/saml', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                entity_id: samlEntityId,
                sso_url: samlSsoUrl,
                certificate: samlCert,
                is_enabled: samlEnabled,
            }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleSaveOidc = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/organization/sso/oidc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                client_id: oidcClientId,
                client_secret: oidcClientSecret || undefined,
                issuer_url: oidcIssuerUrl,
                is_enabled: oidcEnabled,
            }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleToggleEnforce = () => {
        fetch('/organization/sso/toggle-enforce', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ is_enforced: !sso_config.is_enforced }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleAddDomain = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain.trim()) return;

        fetch('/organization/sso/domains', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ domain: newDomain }),
        })
            .then((res) => res.json())
            .then(() => {
                setNewDomain('');
                router.reload();
            });
    };

    const handleRemoveDomain = (domain: string) => {
        fetch('/organization/sso/domains', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ domain }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Akses & Keamanan', href: '/organization/security-settings' },
                { title: 'Single Sign-On (SSO)', href: '#' },
            ]}
        >
            <Head title={`Single Sign-On (SSO) - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Key className="size-6 text-primary" /> Identity & Single Sign-On (SSO)
                        </h1>
                        <p className="text-xs text-muted-foreground max-w-xl">
                            Konfigurasikan integrasi autentikasi SAML 2.0 atau OpenID Connect untuk mengamankan akses login seluruh organisasi Anda.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-xs">
                        <div
                            className={cn(
                                'size-2.5 rounded-full animate-pulse',
                                sso_config.is_enabled ? 'bg-emerald-400' : 'bg-muted-foreground'
                            )}
                        />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                            {sso_config.is_enabled ? 'SSO Aktif' : 'SSO Nonaktif'}
                        </span>
                    </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Protocol Tabs, Domain Restriction & SP Metadata */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Protocol Switcher */}
                        <div className="bg-card rounded-2xl p-2 border border-border space-y-1">
                            <button
                                onClick={() => setActiveTab('saml')}
                                className={cn(
                                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                                    activeTab === 'saml'
                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Shield className="size-4" />
                                    <span>SAML 2.0 (Okta, Azure, Google)</span>
                                </div>
                            </button>

                            <button
                                onClick={() => setActiveTab('oidc')}
                                className={cn(
                                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                                    activeTab === 'oidc'
                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                )}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Globe className="size-4" />
                                    <span>OpenID Connect (OIDC)</span>
                                </div>
                            </button>
                        </div>

                        {/* Domain Restrictions */}
                        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-emerald-400" /> Pembatasan Domain Email
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Hanya anggota dengan domain email berikut yang diizinkan login melalui SSO.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                {sso_config.allowed_domains && sso_config.allowed_domains.length > 0 ? (
                                    sso_config.allowed_domains.map((domain) => (
                                        <div
                                            key={domain}
                                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-mono"
                                        >
                                            <span className="text-foreground font-semibold">{domain}</span>
                                            <button
                                                onClick={() => handleRemoveDomain(domain)}
                                                className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                                                title="Hapus domain"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[11px] font-mono text-muted-foreground italic">
                                        Belum ada domain dibatasi (Terbuka).
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleAddDomain} className="flex gap-2">
                                <Input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="@perusahaan.co.id"
                                    className="text-xs font-mono h-8"
                                />
                                <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1">
                                    <Plus className="size-3.5" /> Tambah
                                </Button>
                            </form>
                        </div>

                        {/* SP Metadata Card */}
                        <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Download className="size-4 text-primary" /> Metadata Service Provider
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                Unduh file XML metadata Service Provider (SP) untuk diimpor ke IdP Anda (Okta, Azure AD, OneLogin).
                            </p>
                            <a href="/organization/sso/metadata" download className="block">
                                <Button variant="outline" className="w-full text-xs font-semibold h-8 gap-1.5">
                                    <Download className="size-3.5" /> Unduh Metadata XML (SP)
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Configuration Form */}
                    <div className="lg:col-span-8 space-y-6">
                        {activeTab === 'saml' ? (
                            <form onSubmit={handleSaveSaml} className="bg-card rounded-2xl p-6 border border-border space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <div className="space-y-0.5">
                                        <h2 className="text-base font-bold text-foreground">Konfigurasi SAML 2.0</h2>
                                        <p className="text-xs text-muted-foreground">
                                            Masukkan parameter integrasi dari Identity Provider (IdP) Anda.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono">SAML 2.0</Badge>
                                </div>

                                {/* SP Endpoints Copy Box */}
                                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider block">
                                        Informasi Service Provider (Pandu WMS)
                                    </span>

                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-[11px] font-semibold text-foreground block mb-1">
                                                Assertion Consumer Service (ACS) URL:
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    readOnly
                                                    value={sso_config.sp_acs_url}
                                                    className="text-xs font-mono h-8 bg-card"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopy(sso_config.sp_acs_url, 'acs')}
                                                    className="h-8 text-xs shrink-0"
                                                >
                                                    {copiedField === 'acs' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <span className="text-[11px] font-semibold text-foreground block mb-1">
                                                Entity ID / Audience URI:
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    readOnly
                                                    value={sso_config.sp_entity_id}
                                                    className="text-xs font-mono h-8 bg-card"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopy(sso_config.sp_entity_id, 'entity')}
                                                    className="h-8 text-xs shrink-0"
                                                >
                                                    {copiedField === 'entity' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* IdP Form Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            IdP Single Sign-On URL <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            type="url"
                                            value={samlSsoUrl}
                                            onChange={(e) => setSamlSsoUrl(e.target.value)}
                                            placeholder="https://identity.company.com/app/saml/sso"
                                            className="text-xs font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            IdP Entity ID / Issuer URI
                                        </label>
                                        <Input
                                            type="text"
                                            value={samlEntityId}
                                            onChange={(e) => setSamlEntityId(e.target.value)}
                                            placeholder="http://www.okta.com/exk123456789"
                                            className="text-xs font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            Sertifikat Publik X.509 (IdP Certificate)
                                        </label>
                                        <Textarea
                                            rows={5}
                                            value={samlCert}
                                            onChange={(e) => setSamlCert(e.target.value)}
                                            placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDpDCCAoygAwIBAgIGAX...&#10;-----END CERTIFICATE-----"
                                            className="text-xs font-mono"
                                        />
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-border">
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-semibold text-foreground block">Aktifkan SSO SAML</span>
                                            <span className="text-[11px] text-muted-foreground block">
                                                Izinkan anggota masuk menggunakan akun IdP SAML perusahaan.
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={samlEnabled}
                                            onChange={(e) => setSamlEnabled(e.target.checked)}
                                            className="size-4 accent-primary rounded cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" className="text-xs font-semibold">
                                        Simpan Konfigurasi SAML
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleSaveOidc} className="bg-card rounded-2xl p-6 border border-border space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <div className="space-y-0.5">
                                        <h2 className="text-base font-bold text-foreground">Konfigurasi OpenID Connect (OIDC)</h2>
                                        <p className="text-xs text-muted-foreground">
                                            Integrasi SSO via OIDC Auth 2.0 Discovery endpoint.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono">OIDC</Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            OIDC Issuer / Discovery URL <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            type="url"
                                            value={oidcIssuerUrl}
                                            onChange={(e) => setOidcIssuerUrl(e.target.value)}
                                            placeholder="https://accounts.google.com / https://login.microsoftonline.com/v2.0"
                                            className="text-xs font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            Client ID <span className="text-red-400">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={oidcClientId}
                                            onChange={(e) => setOidcClientId(e.target.value)}
                                            placeholder="client_id_dari_provider"
                                            className="text-xs font-mono"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground">
                                            Client Secret
                                        </label>
                                        <Input
                                            type="password"
                                            value={oidcClientSecret}
                                            onChange={(e) => setOidcClientSecret(e.target.value)}
                                            placeholder={sso_config.client_secret || 'Masukkan client secret baru'}
                                            className="text-xs font-mono"
                                        />
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-border">
                                        <div className="space-y-0.5">
                                            <span className="text-xs font-semibold text-foreground block">Aktifkan SSO OIDC</span>
                                            <span className="text-[11px] text-muted-foreground block">
                                                Izinkan anggota masuk via protokol OpenID Connect.
                                            </span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={oidcEnabled}
                                            onChange={(e) => setOidcEnabled(e.target.checked)}
                                            className="size-4 accent-primary rounded cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" className="text-xs font-semibold">
                                        Simpan Konfigurasi OIDC
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Enforcement Policy Card */}
                        <div className="bg-card rounded-2xl p-6 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Lock className="size-4 text-primary" /> Wajibkan Login Single Sign-On (Enforced SSO)
                                    </h3>
                                    <p className="text-xs text-muted-foreground max-w-lg">
                                        Ketika diaktifkan, login dengan email & kata sandi tradisional akan dinonaktifkan untuk seluruh anggota tim.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant={sso_config.is_enforced ? 'destructive' : 'outline'}
                                    onClick={handleToggleEnforce}
                                    className="text-xs font-semibold shrink-0"
                                >
                                    {sso_config.is_enforced ? 'Nonaktifkan Penegakan' : 'Wajibkan SSO'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
