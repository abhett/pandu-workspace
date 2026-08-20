import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    Clock,
    Globe,
    HardDrive,
    Key,
    Laptop,
    Lock,
    LogOut,
    Plus,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveSession {
    id: string;
    is_current: boolean;
    ip_address: string;
    user_agent: string;
    device_name: string;
    browser_name: string;
    location: string;
    last_active: string;
}

interface SecurityPolicy {
    id: string;
    mfa_enforced: boolean;
    min_password_length: number;
    password_rotation_days: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numeric: boolean;
    require_symbols: boolean;
    lockout_enabled: boolean;
    lockout_max_attempts: number;
    lockout_duration_minutes: number;
    session_timeout_minutes: number;
    ip_allowlist: string[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    policy: SecurityPolicy;
    sessions: ActiveSession[];
}

export default function SecuritySettingsPage({ organization, policy, sessions }: Props) {
    const [mfaEnforced, setMfaEnforced] = useState(policy.mfa_enforced);
    const [minLength, setMinLength] = useState(policy.min_password_length);
    const [rotationDays, setRotationDays] = useState(policy.password_rotation_days);
    const [reqUpper, setReqUpper] = useState(policy.require_uppercase);
    const [reqLower, setReqLower] = useState(policy.require_lowercase);
    const [reqNum, setReqNum] = useState(policy.require_numeric);
    const [reqSym, setReqSym] = useState(policy.require_symbols);
    const [lockout, setLockout] = useState(policy.lockout_enabled);
    const [timeoutMinutes, setTimeoutMinutes] = useState(policy.session_timeout_minutes);

    const [newIp, setNewIp] = useState('');

    const handleSavePolicy = (e: React.FormEvent) => {
        e.preventDefault();
        fetch('/organization/security-settings/policy', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                mfa_enforced: mfaEnforced,
                min_password_length: minLength,
                password_rotation_days: rotationDays,
                require_uppercase: reqUpper,
                require_lowercase: reqLower,
                require_numeric: reqNum,
                require_symbols: reqSym,
                lockout_enabled: lockout,
                lockout_max_attempts: policy.lockout_max_attempts,
                lockout_duration_minutes: policy.lockout_duration_minutes,
                session_timeout_minutes: timeoutMinutes,
            }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleAddIp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIp.trim()) return;

        fetch('/organization/security-settings/ip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ ip: newIp }),
        })
            .then((res) => res.json())
            .then(() => {
                setNewIp('');
                router.reload();
            });
    };

    const handleRemoveIp = (ip: string) => {
        fetch('/organization/security-settings/ip', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ ip }),
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleRevokeSession = (sessionId: string) => {
        if (!confirm('Putuskan sesi perangkat ini?')) return;

        fetch(`/organization/security-settings/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    const handleRevokeOtherSessions = () => {
        if (!confirm('Keluarkan akun dari semua perangkat lain?')) return;

        fetch('/organization/security-settings/sessions/revoke-others', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => router.reload());
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Akses & Keamanan', href: '#' },
                { title: 'Keamanan Sesi & Kebijakan', href: '#' },
            ]}
        >
            <Head title={`Keamanan Sesi & Kebijakan - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <ShieldCheck className="size-6 text-primary" /> Keamanan Sesi & Akses Organisasi
                        </h1>
                        <p className="text-xs text-muted-foreground max-w-xl">
                            Kelola kebijakan kata sandi global, penegakan MFA wajib, batas kedaluwarsa sesi tidak aktif, dan kontrol perangkat terhubung.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-xs">
                        <Shield className="size-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-foreground">
                            Proteksi Tingkat Enterprise
                        </span>
                    </div>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Password Policy, MFA & Session Timeout */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Password Policy & MFA Card */}
                        <form onSubmit={handleSavePolicy} className="bg-card rounded-2xl p-6 border border-border space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <div className="space-y-0.5">
                                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Lock className="size-4 text-primary" /> Kebijakan Kata Sandi & MFA
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Standar keamanan autentikasi bagi seluruh akun anggota organisasi.
                                    </p>
                                </div>
                            </div>

                            {/* MFA Enforcement Toggle */}
                            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-semibold text-foreground block">
                                        Wajibkan Autentikasi 2-Faktor (MFA / 2FA)
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block">
                                        Seluruh anggota wajib mengaktifkan 2FA sebelum dapat mengakses ruang kerja.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={mfaEnforced}
                                    onChange={(e) => setMfaEnforced(e.target.checked)}
                                    className="size-4 accent-primary rounded cursor-pointer"
                                />
                            </div>

                            {/* Length & Rotation Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">
                                        Panjang Minimum Sandi (Karakter)
                                    </label>
                                    <Input
                                        type="number"
                                        min={8}
                                        max={32}
                                        value={minLength}
                                        onChange={(e) => setMinLength(parseInt(e.target.value) || 8)}
                                        className="text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-foreground">
                                        Masa Rotasi Sandi (Hari)
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={365}
                                        value={rotationDays}
                                        onChange={(e) => setRotationDays(parseInt(e.target.value) || 0)}
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>

                            {/* Complexity Requirements */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Kriteria Kompleksitas Kata Sandi
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Huruf Besar (A-Z)', val: reqUpper, set: setReqUpper },
                                        { label: 'Huruf Kecil (a-z)', val: reqLower, set: setReqLower },
                                        { label: 'Angka (0-9)', val: reqNum, set: setReqNum },
                                        { label: 'Simbol Khusus (!@#$)', val: reqSym, set: setReqSym },
                                    ].map((req, idx) => (
                                        <label
                                            key={idx}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border text-xs cursor-pointer hover:bg-muted/60"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={req.val}
                                                onChange={(e) => req.set(e.target.checked)}
                                                className="size-3.5 accent-primary rounded cursor-pointer"
                                            />
                                            <span className="font-semibold text-foreground text-[11px]">{req.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Session Timeout */}
                            <div className="space-y-1 pt-2 border-t border-border">
                                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-primary" /> Batas Waktu Sesi Tidak Aktif (Auto-Logout)
                                </label>
                                <select
                                    value={timeoutMinutes}
                                    onChange={(e) => setTimeoutMinutes(parseInt(e.target.value))}
                                    className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                                >
                                    <option value={15}>15 Menit</option>
                                    <option value={30}>30 Menit</option>
                                    <option value={60}>1 Jam</option>
                                    <option value={120}>2 Jam</option>
                                    <option value={480}>8 Jam (1 Hari Kerja)</option>
                                    <option value={1440}>24 Jam</option>
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button type="submit" className="text-xs font-semibold">
                                    Simpan Kebijakan Keamanan
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT COLUMN: IP Allowlist & Active Sessions */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* IP Allowlist Card */}
                        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Globe className="size-4 text-primary" /> Daftar Putih IP (IP Allowlisting)
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Batasi akses login hanya dari IP kantor atau subnet VPN perusahaan (contoh: 192.168.1.0/24).
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                {policy.ip_allowlist && policy.ip_allowlist.length > 0 ? (
                                    policy.ip_allowlist.map((ip) => (
                                        <div
                                            key={ip}
                                            className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-mono"
                                        >
                                            <span className="text-foreground font-semibold">{ip}</span>
                                            <button
                                                onClick={() => handleRemoveIp(ip)}
                                                className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                                                title="Hapus IP"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[11px] font-mono text-muted-foreground italic">
                                        Tidak ada batasan IP (Akses terbuka dari mana saja).
                                    </p>
                                )}
                            </div>

                            <form onSubmit={handleAddIp} className="flex gap-2">
                                <Input
                                    type="text"
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder="203.0.113.0/24"
                                    className="text-xs font-mono h-8"
                                />
                                <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1">
                                    <Plus className="size-3.5" /> Tambah
                                </Button>
                            </form>
                        </div>

                        {/* Active Sessions Card */}
                        <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Laptop className="size-4 text-emerald-400" /> Sesi Perangkat Aktif
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Daftar perangkat yang saat ini masuk ke akun Anda.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRevokeOtherSessions}
                                    className="text-[11px] font-semibold h-7 text-red-400 hover:text-red-300"
                                >
                                    Cabut Semua Lainnya
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {sessions.map((sess) => (
                                    <div
                                        key={sess.id}
                                        className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs space-y-1"
                                    >
                                        <div className="space-y-0.5 min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-foreground truncate">
                                                    {sess.device_name}
                                                </span>
                                                {sess.is_current && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-mono">
                                                        Sesi Ini
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-mono text-muted-foreground truncate">
                                                {sess.browser_name} • {sess.ip_address} • {sess.last_active}
                                            </div>
                                        </div>

                                        {!sess.is_current && (
                                            <button
                                                onClick={() => handleRevokeSession(sess.id)}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                                title="Cabut sesi perangkat"
                                            >
                                                <LogOut className="size-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
