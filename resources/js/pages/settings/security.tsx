import { Form, Head, router } from '@inertiajs/react';
import React, { useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ShieldCheck,
    Smartphone,
    Laptop,
    Trash2,
    RefreshCw,
    CheckCircle2,
    KeyRound,
    Lock,
    QrCode,
} from 'lucide-react';
import { edit } from '@/routes/security';

interface SessionItem {
    id: string;
    ip_address: string;
    is_current_device: boolean;
    browser: string;
    platform: string;
    device: string;
    last_active: string;
}

type Props = {
    passwordRules: string;
    twoFactorEnabled: boolean;
    hasTwoFactorSecret?: boolean;
    recoveryCodes: string[];
    sessions: SessionItem[];
};

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    // 2FA Setup State
    const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState<string | null>(null);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [currentRecoveryCodes, setCurrentRecoveryCodes] = useState<string[]>(props.recoveryCodes || []);

    // 2FA Disable State
    const [disableModalOpen, setDisableModalOpen] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableError, setDisableError] = useState<string | null>(null);
    const [isDisabling2fa, setIsDisabling2fa] = useState(false);

    // Other Sessions Logout State
    const [logoutSessionsModalOpen, setLogoutSessionsModalOpen] = useState(false);
    const [logoutPassword, setLogoutPassword] = useState('');
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [isLoggingOutSessions, setIsLoggingOutSessions] = useState(false);

    const handleEnable2fa = () => {
        setOtpError(null);
        fetch('/settings/two-factor-authentication', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setTwoFactorSecret(data.secret);
                setTwoFactorQrUrl(data.qr_url);
                setTwoFactorModalOpen(true);
            });
    };

    const handleConfirmOtp = (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError(null);
        setIsVerifyingOtp(true);

        fetch('/settings/two-factor-authentication/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ code: otpCode }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsVerifyingOtp(false);
                if (data.success) {
                    setCurrentRecoveryCodes(data.recovery_codes || []);
                    setTwoFactorModalOpen(false);
                    setOtpCode('');
                    router.reload();
                } else {
                    setOtpError(data.errors?.code?.[0] || data.message || 'Kode OTP tidak valid.');
                }
            })
            .catch(() => {
                setIsVerifyingOtp(false);
                setOtpError('Terjadi kesalahan jaringan.');
            });
    };

    const handleDisable2fa = (e: React.FormEvent) => {
        e.preventDefault();
        setDisableError(null);
        setIsDisabling2fa(true);

        fetch('/settings/two-factor-authentication', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ password: disablePassword }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsDisabling2fa(false);
                if (data.success) {
                    setDisableModalOpen(false);
                    setDisablePassword('');
                    router.reload();
                } else {
                    setDisableError(data.errors?.password?.[0] || data.message || 'Password salah.');
                }
            })
            .catch(() => {
                setIsDisabling2fa(false);
                setDisableError('Terjadi kesalahan jaringan.');
            });
    };

    const handleRegenerateRecoveryCodes = () => {
        if (!confirm('Buat ulang kode pemulihan? Kode lama tidak akan berlaku lagi.')) return;

        fetch('/settings/two-factor-authentication/recovery-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setCurrentRecoveryCodes(data.recovery_codes || []);
                    alert('Kode pemulihan baru berhasil dibuat.');
                }
            });
    };

    const handleLogoutOtherSessions = (e: React.FormEvent) => {
        e.preventDefault();
        setLogoutError(null);
        setIsLoggingOutSessions(true);

        fetch('/settings/sessions/other', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ password: logoutPassword }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsLoggingOutSessions(false);
                if (data.success) {
                    setLogoutSessionsModalOpen(false);
                    setLogoutPassword('');
                    router.reload();
                } else {
                    setLogoutError(data.errors?.password?.[0] || data.message || 'Password salah.');
                }
            })
            .catch(() => {
                setIsLoggingOutSessions(false);
                setLogoutError('Terjadi kesalahan jaringan.');
            });
    };

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <div className="space-y-10">
                {/* 1. Update Password Section */}
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Perbarui Kata Sandi"
                        description="Pastikan akun Anda menggunakan kata sandi yang panjang dan acak untuk menjaga keamanan."
                    />

                    <Form
                        {...SecurityController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-6 max-w-xl"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        Kata Sandi Saat Ini
                                    </Label>

                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className="mt-1 block w-full"
                                        autoComplete="current-password"
                                        placeholder="Kata sandi saat ini"
                                    />

                                    <InputError message={errors.current_password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">Kata Sandi Baru</Label>

                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        placeholder="Kata sandi baru"
                                        passwordrules={props.passwordRules}
                                    />

                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Konfirmasi Kata Sandi Baru
                                    </Label>

                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        placeholder="Konfirmasi kata sandi baru"
                                        passwordrules={props.passwordRules}
                                    />

                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        className="text-xs font-semibold"
                                    >
                                        Simpan Kata Sandi
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <hr className="border-border" />

                {/* 2. Two-Factor Authentication (2FA) Section */}
                <div className="space-y-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <Heading
                                variant="small"
                                title="Autentikasi Dua Faktor (2FA / MFA)"
                                description="Tambahkan lapisan keamanan ekstra pada akun Anda menggunakan aplikasi autentikator (Google Authenticator / Authy)."
                            />
                        </div>
                        <Badge
                            variant={props.twoFactorEnabled ? 'default' : 'secondary'}
                            className="text-xs font-semibold px-3 py-1 gap-1.5"
                        >
                            <ShieldCheck className="size-3.5" />
                            <span>{props.twoFactorEnabled ? '2FA Aktif' : '2FA Nonaktif'}</span>
                        </Badge>
                    </div>

                    {!props.twoFactorEnabled ? (
                        <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 max-w-xl">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Ketika 2FA aktif, Anda akan diminta memasukkan token 6-digit acak dari aplikasi autentikator setiap kali melakukan login.
                            </p>
                            <Button
                                onClick={handleEnable2fa}
                                size="sm"
                                className="text-xs font-semibold gap-1.5"
                            >
                                <KeyRound className="size-3.5" />
                                <span>Aktifkan 2FA Sekarang</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-xl">
                            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                    <CheckCircle2 className="size-4" />
                                    <span>Akun Anda dilindungi dengan autentikasi dua faktor.</span>
                                </div>

                                {currentRecoveryCodes.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground">
                                                Kode Pemulihan Cadangan (Recovery Codes)
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRegenerateRecoveryCodes}
                                                className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                            >
                                                <RefreshCw className="size-3" />
                                                <span>Buat Ulang Kode</span>
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Simpan kode-kode ini di tempat aman. Kode ini digunakan untuk masuk jika Anda kehilangan akses ke perangkat autentikator.
                                        </p>
                                        <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg bg-background border border-border font-mono text-xs">
                                            {currentRecoveryCodes.map((code, idx) => (
                                                <span key={idx} className="text-foreground tracking-wider">{code}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDisableModalOpen(true)}
                                className="text-xs font-semibold"
                            >
                                Nonaktifkan 2FA
                            </Button>
                        </div>
                    )}
                </div>

                <hr className="border-border" />

                {/* 3. Browser Sessions Management Section */}
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Sesi Browser Aktif"
                        description="Kelola dan putuskan sesi aktif di peramban dan perangkat lain yang terhubung dengan akun Anda."
                    />

                    <div className="space-y-3 max-w-2xl">
                        {props.sessions && props.sessions.length > 0 ? (
                            props.sessions.map((sess) => (
                                <div
                                    key={sess.id}
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-card border border-border">
                                            {sess.device === 'Mobile' ? (
                                                <Smartphone className="size-4 text-primary" />
                                            ) : (
                                                <Laptop className="size-4 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-foreground">
                                                    {sess.platform} - {sess.browser}
                                                </span>
                                                {sess.is_current_device && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                                                        Perangkat Ini
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                {sess.ip_address} • Aktif {sess.last_active}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground italic">
                                Hanya ada 1 sesi aktif saat ini.
                            </p>
                        )}

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLogoutSessionsModalOpen(true)}
                                className="text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                                Cabut Sesi Perangkat Lain
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2FA Setup Dialog */}
            <Dialog open={twoFactorModalOpen} onOpenChange={setTwoFactorModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleConfirmOtp}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <QrCode className="size-5 text-primary" />
                                <span>Konfigurasi Two-Factor Authentication</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Pindai QR code di bawah menggunakan Google Authenticator atau Authy, lalu masukkan 6-digit kode OTP untuk konfirmasi.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4 text-xs">
                            <div className="p-4 rounded-xl border border-border bg-card text-center space-y-2">
                                <p className="text-muted-foreground font-semibold text-[11px]">Kunci Rahasia (Manual Entry Key):</p>
                                <span className="font-mono font-bold text-primary tracking-widest text-sm select-all">
                                    {twoFactorSecret}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="otp" className="text-xs font-semibold">Kode Verifikasi 6-Digit</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="font-mono text-center tracking-widest text-base bg-background"
                                    required
                                />
                                {otpError && (
                                    <p className="text-[11px] text-destructive font-semibold">{otpError}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTwoFactorModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isVerifyingOtp || otpCode.length !== 6}
                                className="text-xs font-semibold"
                            >
                                {isVerifyingOtp ? 'Memverifikasi...' : 'Konfirmasi & Aktifkan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 2FA Disable Dialog */}
            <Dialog open={disableModalOpen} onOpenChange={setDisableModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleDisable2fa}>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-destructive">
                                Nonaktifkan Two-Factor Authentication
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Masukkan kata sandi Anda untuk mengonfirmasi penonaktifan proteksi 2FA.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="disable_pass" className="text-xs font-semibold">Kata Sandi Akun</Label>
                                <Input
                                    id="disable_pass"
                                    type="password"
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    placeholder="Masukkan kata sandi..."
                                    className="text-xs bg-background"
                                    required
                                />
                                {disableError && (
                                    <p className="text-[11px] text-destructive font-semibold">{disableError}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDisableModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                size="sm"
                                disabled={isDisabling2fa || !disablePassword}
                                className="text-xs font-semibold"
                            >
                                {isDisabling2fa ? 'Memproses...' : 'Nonaktifkan 2FA'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Logout Other Sessions Dialog */}
            <Dialog open={logoutSessionsModalOpen} onOpenChange={setLogoutSessionsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleLogoutOtherSessions}>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">
                                Cabut Sesi Perangkat Lain
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Masukkan kata sandi akun untuk mencabut dan mengeluarkan akun Anda dari semua browser/perangkat lain.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="logout_pass" className="text-xs font-semibold">Kata Sandi Akun</Label>
                                <Input
                                    id="logout_pass"
                                    type="password"
                                    value={logoutPassword}
                                    onChange={(e) => setLogoutPassword(e.target.value)}
                                    placeholder="Masukkan kata sandi..."
                                    className="text-xs bg-background"
                                    required
                                />
                                {logoutError && (
                                    <p className="text-[11px] text-destructive font-semibold">{logoutError}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setLogoutSessionsModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                size="sm"
                                disabled={isLoggingOutSessions || !logoutPassword}
                                className="text-xs font-semibold"
                            >
                                {isLoggingOutSessions ? 'Memproses...' : 'Cabut Semua Sesi Lain'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
