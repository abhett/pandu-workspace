import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ShieldCheck,
    ShieldAlert,
    Lock,
    Key,
    UserCheck,
    UserX,
    Clock,
    AlertTriangle,
    Flame,
    CheckCircle2,
    Send,
    LogOut,
    Sliders,
    Search,
    Shield,
    Sparkles,
    Check,
    RefreshCw,
    Award,
    Activity,
} from 'lucide-react';

interface MemberAuditItem {
    user_id: number;
    membership_id: string;
    name: string;
    email: string;
    role: string;
    is_privileged: boolean;
    is_required: boolean;
    has_2fa: boolean;
    mfa_status: 'enrolled' | 'grace_period' | 'non_compliant' | 'exempt';
    days_left_in_grace: number;
    grace_deadline_formatted: string;
    two_factor_confirmed_at_formatted: string | null;
    active_sessions_count: number;
    exemption: {
        id: string;
        reason: string;
        expires_at_formatted: string;
    } | null;
}

interface MfaSettings {
    id: string;
    enforcement_mode: 'disabled' | 'privileged_roles_only' | 'all_members';
    grace_period_days: number;
    remember_device_days: number;
    allowed_methods: string[];
    kill_switch_last_triggered_at_formatted: string | null;
    kill_switch_triggered_by_name: string | null;
}

interface Metrics {
    total_members: number;
    enrolled_members: number;
    adoption_rate_pct: number;
    grace_period_members: number;
    non_compliant_members: number;
    privileged_adoption_rate_pct: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    settings: MfaSettings;
    metrics: Metrics;
    members: MemberAuditItem[];
}

export default function MfaEnforcementPage({
    organization,
    settings: initialSettings,
    metrics,
    members,
}: Props) {
    // Policy settings form
    const [enforcementMode, setEnforcementMode] = useState(initialSettings.enforcement_mode);
    const [gracePeriodDays, setGracePeriodDays] = useState(initialSettings.grace_period_days.toString());
    const [rememberDeviceDays, setRememberDeviceDays] = useState(initialSettings.remember_device_days.toString());
    const [allowedMethods, setAllowedMethods] = useState<string[]>(initialSettings.allowed_methods || ['totp_authenticator']);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);

    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    // Grace Exemption Modal
    const [exemptionModalOpen, setExemptionModalOpen] = useState(false);
    const [selectedMemberForExemption, setSelectedMemberForExemption] = useState<MemberAuditItem | null>(null);
    const [extraDays, setExtraDays] = useState('14');
    const [exemptionReason, setExemptionReason] = useState('');
    const [isSavingExemption, setIsSavingExemption] = useState(false);

    // Emergency Kill-Switch Modal
    const [killSwitchModalOpen, setKillSwitchModalOpen] = useState(false);
    const [isTriggeringKillSwitch, setIsTriggeringKillSwitch] = useState(false);

    const toggleMethod = (method: string) => {
        setAllowedMethods((prev) =>
            prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
        );
    };

    const handleSavePolicy = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPolicy(true);

        fetch('/organization/security/mfa-enforcement', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                enforcement_mode: enforcementMode,
                grace_period_days: Number(gracePeriodDays),
                remember_device_days: Number(rememberDeviceDays),
                allowed_methods: allowedMethods,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingPolicy(false);
                router.reload();
            })
            .catch(() => setIsSavingPolicy(false));
    };

    const handleSendReminder = (userId: number) => {
        fetch(`/organization/security/mfa-enforcement/remind/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                alert(data.message || 'Pengingat berhasil dikirim.');
            });
    };

    const openExemptionModal = (member: MemberAuditItem) => {
        setSelectedMemberForExemption(member);
        setExtraDays('14');
        setExemptionReason('Device replacement / hardware token transition');
        setExemptionModalOpen(true);
    };

    const handleSaveExemption = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberForExemption) return;
        setIsSavingExemption(true);

        fetch(`/organization/security/mfa-enforcement/exempt/${selectedMemberForExemption.user_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                extra_days: Number(extraDays),
                reason: exemptionReason,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingExemption(false);
                setExemptionModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingExemption(false));
    };

    const handleRevokeExemption = (exemptionId: string) => {
        fetch(`/organization/security/mfa-enforcement/exemptions/${exemptionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const handleExecuteKillSwitch = () => {
        setIsTriggeringKillSwitch(true);

        fetch('/organization/security/mfa-enforcement/kill-switch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setIsTriggeringKillSwitch(false);
                setKillSwitchModalOpen(false);
                alert(data.message || 'Emergency Session Kill-Switch selesai dijalankan.');
                router.reload();
            })
            .catch(() => setIsTriggeringKillSwitch(false));
    };

    const renderMfaStatusBadge = (status: string, member: MemberAuditItem) => {
        switch (status) {
            case 'enrolled':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>MFA Aktif</span>
                    </Badge>
                );
            case 'exempt':
                return (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] gap-1 font-mono">
                        <Shield className="h-3 w-3" />
                        <span>Pengecualian Khusus</span>
                    </Badge>
                );
            case 'grace_period':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-mono font-semibold">
                        <Clock className="h-3 w-3" />
                        <span>Masa Tenggang ({member.days_left_in_grace}h)</span>
                    </Badge>
                );
            case 'non_compliant':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-mono font-bold">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Non-Patuh (Wajib MFA)</span>
                    </Badge>
                );
            default:
                return null;
        }
    };

    const filteredMembers = members.filter((m) => {
        const matchesSearch =
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.mfa_status === statusFilter;
        const matchesRole = roleFilter === 'all' || m.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    });

    return (
        <AppLayout>
            <Head title="Enterprise MFA Enforcement & Session Security Gate" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md">
                            <Key className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Enterprise Multi-Factor Authentication Enforcement
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    Zero Trust & SOC2
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Penegakan wajib 2FA/MFA berbasis peran (*Role-Based Enforcement*), audit kepatuhan anggota, dan pemutusan sesi darurat
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => setKillSwitchModalOpen(true)}
                            className="h-9 text-xs px-3 gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 font-semibold"
                        >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Emergency Kill-Switch</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Adoption Rate */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Adopsi MFA</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.adoption_rate_pct}%
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                                ({metrics.enrolled_members} / {metrics.total_members})
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Anggota telah mengaktifkan 2FA
                        </div>
                    </div>

                    {/* Privileged Roles Adoption */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Adopsi Role Istimewa</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.privileged_adoption_rate_pct}%
                            </span>
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                Owner / Admin
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Kepatuhan hak akses administratif
                        </div>
                    </div>

                    {/* Grace Period */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Dalam Masa Tenggang</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.grace_period_members}
                            </span>
                            <span className="text-xs text-muted-foreground">Anggota Baru</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Masih dalam batas {initialSettings.grace_period_days} hari onboarding
                        </div>
                    </div>

                    {/* Non-Compliant */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Anggota Non-Patuh</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.non_compliant_members}
                            </span>
                            <span className="text-xs text-muted-foreground">Perlu Tindakan</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Masa tenggang kedaluwarsa tanpa 2FA
                        </div>
                    </div>
                </div>

                {/* Section 1: Policy Configuration Form */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                        <Sliders className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">Kebijakan Penegakan MFA Organisasi</h3>
                    </div>

                    <form onSubmit={handleSavePolicy} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Mode Penegakan Wajib MFA
                                </label>
                                <Select
                                    value={enforcementMode}
                                    onValueChange={(val: any) => setEnforcementMode(val)}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="disabled">⚪ Opsional (Tidak Dipaksakan)</SelectItem>
                                        <SelectItem value="privileged_roles_only">
                                            🛡️ Role Istimewa Saja (Owner, Admin, Manager)
                                        </SelectItem>
                                        <SelectItem value="all_members">
                                            🔒 Seluruh Anggota Organisasi (Zero Trust)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Mode *Role Istimewa* direkomendasikan untuk sertifikasi standar SOC 2.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Masa Tenggang Onboarding (Grace Period)
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={gracePeriodDays}
                                        onChange={(e) => setGracePeriodDays(e.target.value)}
                                        className="h-9 text-xs font-mono"
                                        required
                                    />
                                    <span className="text-xs text-muted-foreground">Hari</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Waktu yang diberikan pada anggota baru sebelum akses terkunci.
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Ingat Perangkat Tepercaya (Remember Device)
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={rememberDeviceDays}
                                        onChange={(e) => setRememberDeviceDays(e.target.value)}
                                        className="h-9 text-xs font-mono"
                                        required
                                    />
                                    <span className="text-xs text-muted-foreground">Hari</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Frekuensi verifikasi ulang OTP pada browser terdaftar.
                                </p>
                            </div>
                        </div>

                        {/* Allowed Methods Checkboxes */}
                        <div className="pt-2">
                            <label className="text-xs font-semibold text-foreground block mb-2">
                                Metode Otentikasi 2FA yang Diizinkan
                            </label>
                            <div className="flex items-center gap-3 flex-wrap">
                                {[
                                    { id: 'totp_authenticator', label: '📱 Aplikasi Authenticator (Google / Microsoft)' },
                                    { id: 'backup_recovery_codes', label: '🔑 Kode Pemulihan Cadangan (Recovery Codes)' },
                                    { id: 'security_keys_webauthn', label: '🛡️ Hardware Security Key (FIDO2 / WebAuthn)' },
                                ].map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        onClick={() => toggleMethod(item.id)}
                                        className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                                            allowedMethods.includes(item.id)
                                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                : 'border-border text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <div
                                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                                allowedMethods.includes(item.id)
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-muted-foreground'
                                            }`}
                                        >
                                            {allowedMethods.includes(item.id) && <Check className="h-2.5 w-2.5" />}
                                        </div>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSavingPolicy}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSavingPolicy ? 'Menyimpan...' : 'Simpan Kebijakan MFA'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Section 2: Member MFA Compliance Audit Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama atau email anggota..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-8 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 text-xs w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status MFA</SelectItem>
                                    <SelectItem value="enrolled">MFA Aktif (Patuh)</SelectItem>
                                    <SelectItem value="grace_period">Masa Tenggang</SelectItem>
                                    <SelectItem value="non_compliant">Non-Patuh</SelectItem>
                                    <SelectItem value="exempt">Pengecualian</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="h-8 text-xs w-32 font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Role</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="guest">Guest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                                        <th className="py-3 px-4">Anggota</th>
                                        <th className="py-3 px-3">Role</th>
                                        <th className="py-3 px-3">Status Kepatuhan MFA</th>
                                        <th className="py-3 px-3">Tenggat Waktu / Terkonfirmasi</th>
                                        <th className="py-3 px-3 text-center">Sesi Aktif</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                Tidak ada data anggota yang sesuai filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMembers.map((m) => (
                                            <tr key={m.user_id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-foreground">{m.name}</div>
                                                    <div className="text-[11px] text-muted-foreground font-mono">
                                                        {m.email}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                                        {m.role}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {renderMfaStatusBadge(m.mfa_status, m)}
                                                </td>
                                                <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                                                    {m.two_factor_confirmed_at_formatted ? (
                                                        <span className="text-foreground">
                                                            {m.two_factor_confirmed_at_formatted}
                                                        </span>
                                                    ) : m.exemption ? (
                                                        <span className="text-purple-600">
                                                            Hingga {m.exemption.expires_at_formatted}
                                                        </span>
                                                    ) : (
                                                        <span>Batas: {m.grace_deadline_formatted}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                                                    {m.active_sessions_count}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {!m.has_2fa && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleSendReminder(m.user_id)}
                                                                className="h-6 text-[10px] px-2 gap-1"
                                                                title="Kirim email pengingat aktivasi MFA"
                                                            >
                                                                <Send className="h-3 w-3" />
                                                                <span>Ingatkan</span>
                                                            </Button>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openExemptionModal(m)}
                                                            className="h-6 text-[10px] px-1.5 gap-1 text-purple-600 hover:bg-purple-500/10"
                                                            title="Beri perpanjangan masa tenggang (Grace Exemption)"
                                                        >
                                                            <Clock className="h-3 w-3" />
                                                            <span>Pengecualian</span>
                                                        </Button>

                                                        {m.exemption && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleRevokeExemption(m.exemption!.id)}
                                                                className="h-6 text-[10px] px-1 text-rose-500 hover:bg-rose-500/10"
                                                                title="Cabut pengecualian"
                                                            >
                                                                ×
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Perpanjangan Masa Tenggang (Grace Exemption) */}
            <Dialog open={exemptionModalOpen} onOpenChange={setExemptionModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-600" />
                            <span>Pengecualian Masa Tenggang MFA</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Berikan perpanjangan waktu aktivasi 2FA khusus untuk {selectedMemberForExemption?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveExemption} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Tambahan Masa Tenggang (Hari) *
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="30"
                                value={extraDays}
                                onChange={(e) => setExtraDays(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Alasan Bisnis / Teknis *
                            </label>
                            <Textarea
                                placeholder="Contoh: Penggantian ponsel dan token otentikator baru..."
                                value={exemptionReason}
                                onChange={(e) => setExemptionReason(e.target.value)}
                                className="text-xs min-h-[60px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setExemptionModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingExemption}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                            >
                                {isSavingExemption ? 'Menyimpan...' : 'Simpan Pengecualian'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Konfirmasi Emergency Kill-Switch */}
            <Dialog open={killSwitchModalOpen} onOpenChange={setKillSwitchModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <Flame className="h-5 w-5" />
                            <span>Konfirmasi Emergency Session Kill-Switch</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            Tindakan darurat ini akan **secara instan memutuskan seluruh sesi aktif** milik seluruh anggota di organisasi ini. Seluruh pengguna akan dipaksa login dan memverifikasi ulang OTP.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 space-y-1">
                        <div className="font-bold">⚠️ Perhatian Keamanan:</div>
                        <div>Gunakan hanya saat terdeteksi kebocoran kredensial atau insiden anomali sesi kritis.</div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setKillSwitchModalOpen(false)}
                            className="text-xs"
                        >
                            Batalkan
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExecuteKillSwitch}
                            disabled={isTriggeringKillSwitch}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                        >
                            {isTriggeringKillSwitch ? 'Memutuskan Sesi...' : 'Ya, Putus Seluruh Sesi Sekarang'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
