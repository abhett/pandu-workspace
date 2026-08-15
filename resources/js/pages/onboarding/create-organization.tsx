import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import { ThemeToggle } from '@/components/theme-toggle';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const INDUSTRIES = [
    'Teknologi & Perangkat Lunak',
    'Layanan Keuangan & Fintech',
    'Kreatif & Desain Agensi',
    'Konsultan & Layanan Bisnis',
    'E-Commerce & Ritel',
    'Kesehatan & Farmasi',
    'Pendidikan & Riset',
    'Lainnya',
];

const COMPANY_SIZES = [
    { label: '1 - 10', desc: 'Startup pemula' },
    { label: '11 - 50', desc: 'Tim berkembang' },
    { label: '51 - 200', desc: 'Perusahaan menengah' },
    { label: '201+', desc: 'Enterprise' },
];

export default function CreateOrganization() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugModified, setSlugModified] = useState(false);
    const [selectedSize, setSelectedSize] = useState('11 - 50');

    const handleNameChange = (newName: string) => {
        setName(newName);

        if (!slugModified) {
            const generated = newName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            setSlug(generated);
        }
    };

    return (
        <div className="flex min-h-screen flex-col justify-between bg-background font-sans text-foreground">
            <Head title="Buat Organisasi - Onboarding" />

            {/* Top Navigation Bar */}
            <header className="fixed top-0 z-50 w-full border-b border-border bg-background/80 shadow-xs backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
                            <AppLogoIcon className="size-5 fill-current text-primary" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">
                            Pandu AI
                        </span>
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            Onboarding
                        </span>
                    </div>

                    {/* Step progress */}
                    <div className="hidden max-w-xs flex-1 px-6 md:block">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                            <span>Langkah 1 dari 3</span>
                            <span className="font-semibold text-primary">
                                Organisasi
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-1.5 w-1/3 rounded-full bg-primary transition-all duration-500" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />

                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            Keluar
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="relative flex flex-1 items-center justify-center px-4 pt-24 pb-16 md:px-8">
                {/* Ambient glowing backdrop */}
                <div className="pointer-events-none absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-primary-container/20 mix-blend-screen blur-[140px]" />
                <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-secondary-container/20 mix-blend-screen blur-[120px]" />

                <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-xl md:p-10">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5 text-center">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                Buat Organisasi Anda
                            </h1>
                            <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
                                Langkah pertama untuk memulai kolaborasi kerja
                                berbasis kecerdasan buatan.
                            </p>
                        </div>

                        <Form
                            action="/onboarding/organization"
                            method="post"
                            className="mt-2 flex flex-col gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {/* Organization Name */}
                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="name"
                                            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                        >
                                            Nama Organisasi / Perusahaan
                                        </Label>
                                        <div className="relative">
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                autoFocus
                                                value={name}
                                                onChange={(e) =>
                                                    handleNameChange(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Contoh: Nusantara Digital Studio"
                                                className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-4 text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
                                            />
                                            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground/60">
                                                <span className="material-symbols-outlined text-lg">
                                                    corporate_fare
                                                </span>
                                            </div>
                                        </div>
                                        <InputError message={errors.name} />
                                    </div>

                                    {/* Workspace Domain Slug */}
                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="slug"
                                            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                        >
                                            URL Workspace Tim
                                        </Label>
                                        <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card transition-all focus-within:border-primary">
                                            <div className="flex items-center border-r border-border bg-muted px-3.5 font-mono text-xs text-muted-foreground select-none">
                                                app.pandu.ai/
                                            </div>
                                            <input
                                                id="slug"
                                                name="slug"
                                                type="text"
                                                value={slug}
                                                onChange={(e) => {
                                                    setSlugModified(true);
                                                    setSlug(e.target.value);
                                                }}
                                                placeholder="nama-organisasi"
                                                className="flex-1 bg-transparent px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                            />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Alamat unik untuk mengakses seluruh
                                            proyek dan workspace tim Anda.
                                        </p>
                                        <InputError message={errors.slug} />
                                    </div>

                                    {/* Industry Selection */}
                                    <div className="flex flex-col gap-1.5">
                                        <Label
                                            htmlFor="industry"
                                            className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                        >
                                            Industri / Sektor
                                        </Label>
                                        <select
                                            id="industry"
                                            name="industry"
                                            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none"
                                        >
                                            <option value="">
                                                Pilih Industri (Opsional)
                                            </option>
                                            {INDUSTRIES.map((ind) => (
                                                <option key={ind} value={ind}>
                                                    {ind}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Team Size Grid */}
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            Estimasi Ukuran Tim
                                        </Label>
                                        <input
                                            type="hidden"
                                            name="team_size"
                                            value={selectedSize}
                                        />
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {COMPANY_SIZES.map(
                                                ({ label, desc }) => {
                                                    const isSelected =
                                                        selectedSize === label;

                                                    return (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedSize(
                                                                    label,
                                                                )
                                                            }
                                                            className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all ${
                                                                isSelected
                                                                    ? 'border-primary bg-primary/10 shadow-xs'
                                                                    : 'border-border bg-card/60 hover:bg-card'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}
                                                            >
                                                                {label}
                                                            </span>
                                                            <span className="mt-0.5 text-[10px] text-muted-foreground">
                                                                {desc}
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="material-symbols-outlined text-[16px] text-tertiary">
                                                verified
                                            </span>
                                            <span>
                                                Gratis selama masa trial 14 hari
                                            </span>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {processing && (
                                                <Spinner className="size-4" />
                                            )}
                                            <span>Lanjutkan ke Workspace</span>
                                            <span className="material-symbols-outlined text-sm">
                                                arrow_forward
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-background py-4 text-center text-xs text-muted-foreground">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
                    <span>
                        &copy; {new Date().getFullYear()} Pandu AI Work
                        Management.
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-tertiary" />
                        <span>Sistem Aktif & Terlindungi</span>
                    </span>
                </div>
            </footer>
        </div>
    );
}
