import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Copy,
    Link as LinkIcon,
    Mail,
    Plus,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    inviteCode: string;
    inviteUrl: string;
};

export default function InviteMembersOnboarding({
    organization,
    inviteUrl,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rows, setRows] = useState<
        Array<{ id: number; email: string; role: string }>
    >([
        { id: 1, email: '', role: 'member' },
        { id: 2, email: '', role: 'member' },
        { id: 3, email: '', role: 'manager' },
    ]);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            { id: Date.now(), email: '', role: 'member' },
        ]);
    };

    const removeRow = (id: number) => {
        if (rows.length <= 1) {
            return;
        }

        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const updateRow = (id: number, field: 'email' | 'role', val: string) => {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validInvites = rows.filter((r) => r.email.trim() !== '');

        if (validInvites.length === 0) {
            router.visit(dashboard());

            return;
        }

        setIsSubmitting(true);
        router.post(
            '/organization/invitations',
            {
                invites: validInvites,
            },
            {
                onSuccess: () => {
                    router.visit(dashboard());
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    return (
        <>
            <Head title="Undang Anggota - Pandu AI" />

            <div className="relative min-h-screen bg-background font-sans text-foreground">
                {/* Header Top Bar */}
                <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-primary-container text-on-primary-container shadow-sm">
                                <AppLogoIcon className="size-5 fill-current text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-foreground">
                                Pandu AI
                            </span>
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                Onboarding
                            </span>
                        </div>

                        {/* Step indicator */}
                        <div className="hidden items-center gap-2 sm:flex">
                            <span className="text-xs font-medium text-muted-foreground">
                                Langkah 2 dari 2:
                            </span>
                            <span className="text-xs font-bold text-foreground">
                                Undang Tim
                            </span>
                            <div className="ml-2 h-1.5 w-24 rounded-full bg-muted">
                                <div className="h-1.5 w-full rounded-full bg-primary" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link
                                href={dashboard()}
                                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Lewati untuk sekarang &rarr;
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Ambient glow */}
                <div className="pointer-events-none fixed top-10 left-1/4 h-96 w-96 rounded-full bg-primary-container/15 mix-blend-screen blur-[140px]" />
                <div className="pointer-events-none fixed right-1/4 bottom-10 h-80 w-80 rounded-full bg-secondary-container/15 mix-blend-screen blur-[120px]" />

                {/* Main Content Card */}
                <main className="relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-12 sm:px-6">
                    <div className="w-full rounded-3xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-xl md:p-10">
                        {/* Title */}
                        <div className="text-center">
                            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                <Sparkles className="size-3.5" />
                                <span>{organization.name}</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                Undang Rekan Tim Anda
                            </h1>
                            <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground sm:text-sm">
                                Ajak kolega Anda untuk berkolaborasi dan
                                tingkatkan kecepatan sprint tim dengan bantuan
                                AI.
                            </p>
                        </div>

                        {/* Copy Link Box */}
                        <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
                            <div className="flex items-center gap-2.5 overflow-hidden text-xs text-muted-foreground">
                                <LinkIcon className="size-4 shrink-0 text-primary" />
                                <span className="truncate font-mono text-[11px]">
                                    {inviteUrl}
                                </span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCopy}
                                className="shrink-0 gap-1.5 rounded-xl text-xs font-semibold"
                            >
                                {copied ? (
                                    <>
                                        <Check className="size-3.5 text-status-done" />
                                        <span>Tersalin!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-3.5" />
                                        <span>Salin Link</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-3 font-semibold tracking-wider text-muted-foreground uppercase">
                                    atau undang melalui email
                                </span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {rows.map((row, index) => (
                                <div
                                    key={row.id}
                                    className="flex items-center gap-2"
                                >
                                    <div className="relative flex-1">
                                        <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder={`email.rekan${index + 1}@perusahaan.com`}
                                            value={row.email}
                                            onChange={(e) =>
                                                updateRow(
                                                    row.id,
                                                    'email',
                                                    e.target.value,
                                                )
                                            }
                                            className="rounded-xl pl-10 text-xs"
                                        />
                                    </div>
                                    <div className="w-36 shrink-0">
                                        <Select
                                            value={row.role}
                                            onValueChange={(val) =>
                                                updateRow(row.id, 'role', val)
                                            }
                                        >
                                            <SelectTrigger className="rounded-xl text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">
                                                    Admin
                                                </SelectItem>
                                                <SelectItem value="manager">
                                                    Manager
                                                </SelectItem>
                                                <SelectItem value="member">
                                                    Member
                                                </SelectItem>
                                                <SelectItem value="guest">
                                                    Guest
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {rows.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRow(row.id)}
                                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addRow}
                                className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary transition-colors hover:underline"
                            >
                                <Plus className="size-3.5" />
                                <span>Tambah baris undangan lain</span>
                            </button>

                            {/* Submit & Skip */}
                            <div className="mt-8 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={dashboard()}
                                    className="text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Lewati langkah ini
                                </Link>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="gap-2 rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                                >
                                    {isSubmitting ? (
                                        <Spinner className="size-4" />
                                    ) : (
                                        <>
                                            <span>Kirim Undangan & Lanjut</span>
                                            <ArrowRight className="size-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </>
    );
}
