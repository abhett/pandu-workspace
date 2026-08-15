import { Form, Head, Link } from '@inertiajs/react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <>
            <Head title="Daftar Akun Baru" />

            <Form
                action="/register"
                method="post"
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        {/* Nama Lengkap */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="name"
                                className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                Nama Lengkap
                            </Label>
                            <div className="group/input relative">
                                <User className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    placeholder="Nama Lengkap Anda"
                                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none"
                                />
                            </div>
                            <InputError message={errors.name} />
                        </div>

                        {/* Email Perusahaan */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="email"
                                className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                Email Perusahaan
                            </Label>
                            <div className="group/input relative">
                                <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    placeholder="nama@perusahaan.com"
                                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Kata Sandi */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="password"
                                className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                Kata Sandi
                            </Label>
                            <div className="group/input relative">
                                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    placeholder="Minimal 8 karakter"
                                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pr-10 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    tabIndex={-1}
                                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        {/* Konfirmasi Kata Sandi */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="password_confirmation"
                                className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                Konfirmasi Kata Sandi
                            </Label>
                            <div className="group/input relative">
                                <ShieldCheck className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
                                <input
                                    id="password_confirmation"
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    name="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    placeholder="Ulangi kata sandi"
                                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pr-10 pl-10 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword,
                                        )
                                    }
                                    tabIndex={-1}
                                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </button>
                            </div>
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        {/* Checkbox Terms */}
                        <div className="flex items-center gap-2 py-1">
                            <Checkbox
                                id="terms"
                                name="terms"
                                required
                                tabIndex={5}
                            />
                            <Label
                                htmlFor="terms"
                                className="cursor-pointer text-xs leading-normal text-muted-foreground"
                            >
                                Saya menyetujui Ketentuan Layanan & Kebijakan
                                Privasi
                            </Label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            tabIndex={6}
                            disabled={processing}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            {processing && <Spinner className="size-4" />}
                            <span>Daftar Akun Baru</span>
                        </button>

                        {/* Back to login */}
                        <div className="mt-2 text-center text-xs text-muted-foreground">
                            Sudah memiliki akun?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-primary transition-colors hover:underline"
                            >
                                Masuk ke akun
                            </Link>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Daftar Akun Baru',
    description: 'Mulai kelola proyek dan sprint tim Anda dengan bantuan AI',
};
