import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Bug,
    Check,
    CheckCircle2,
    Columns3,
    FolderKanban,
    Layers,
    Shield,
    Sparkles,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type WorkflowStatusConfig = {
    name: string;
    slug: string;
    category: string;
    color: string;
    position: number;
    wip_limit?: number | null;
};

type TemplateItem = {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    icon: string;
    color: string;
    workflow_config: WorkflowStatusConfig[] | null;
    default_views: string[] | null;
};

type MemberItem = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    templates: TemplateItem[];
    members: MemberItem[];
    currentUser: {
        id: number;
        name: string;
    };
};

const COLOR_PALETTE = [
    { name: 'Indigo Brand', hex: '#6366f1' },
    { name: 'Sky Velocity', hex: '#0ea5e9' },
    { name: 'Emerald Flow', hex: '#10b981' },
    { name: 'Amber Sprint', hex: '#f59e0b' },
    { name: 'Rose Alert', hex: '#f43f5e' },
    { name: 'Violet Enterprise', hex: '#8b5cf6' },
];

export default function CreateProject({
    organization,
    templates,
    members,
    currentUser,
}: Props) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
        templates[0]?.id || '',
    );

    const selectedTemplate = useMemo(() => {
        return (
            templates.find((t) => t.id === selectedTemplateId) ||
            templates[0] ||
            null
        );
    }, [templates, selectedTemplateId]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        key: '',
        description: '',
        template_id: templates[0]?.id || '',
        type: templates[0]?.slug || 'kanban',
        color: templates[0]?.color || '#6366f1',
        icon: templates[0]?.icon || 'FolderKanban',
        lead_user_id: currentUser.id,
    });

    const handleTemplateSelect = (template: TemplateItem) => {
        setSelectedTemplateId(template.id);
        setData((prev) => ({
            ...prev,
            template_id: template.id,
            type: template.slug,
            color: template.color || prev.color,
            icon: template.icon || prev.icon,
        }));
    };

    const handleNameChange = (name: string) => {
        let generatedKey = '';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            generatedKey = words
                .slice(0, 3)
                .map((w) => w.charAt(0))
                .join('');
        } else {
            generatedKey = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
        }

        setData((prev) => ({
            ...prev,
            name: name,
            key:
                prev.key === '' ||
                prev.key ===
                    prev.name
                        .replace(/[^A-Za-z0-9]/g, '')
                        .slice(0, 4)
                        .toUpperCase()
                    ? generatedKey.toUpperCase()
                    : prev.key,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/projects');
    };

    const getTemplateIcon = (slug: string) => {
        switch (slug) {
            case 'scrum':
                return <Layers className="size-6 text-indigo-400" />;
            case 'kanban':
                return <FolderKanban className="size-6 text-sky-400" />;
            case 'bug_tracking':
                return <Bug className="size-6 text-rose-400" />;
            default:
                return <CheckCircle2 className="size-6 text-emerald-400" />;
        }
    };

    return (
        <>
            <Head title="Buat Proyek Baru" />

            <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-8">
                {/* Header & Breadcrumb Info */}
                <div className="flex items-center justify-between border-b border-border pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link
                                href="/projects"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft className="size-3.5" />
                                Direktori Proyek
                            </Link>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-mono text-xs text-primary font-semibold">
                                {organization.name}
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                            Buat Proyek Baru
                        </h1>
                        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                            Pilih metodologi kerja, sesuaikan alur status, dan
                            bentuk ruang kerja tim.
                        </p>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                        <div
                            className={`size-7 rounded-full flex items-center justify-center font-bold ${
                                step === 1
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-emerald-500 text-white'
                            }`}
                        >
                            {step === 1 ? '1' : <Check className="size-4" />}
                        </div>
                        <div
                            className={`h-0.5 w-6 ${step === 2 ? 'bg-primary' : 'bg-muted'}`}
                        />
                        <div
                            className={`size-7 rounded-full flex items-center justify-center font-bold ${
                                step === 2
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            2
                        </div>
                    </div>
                </div>

                {/* Step 1: Template Selection */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Langkah 1: Pilih Template Proyek
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Setiap template dilengkapi alur status bawaan
                                yang dapat Anda ubah kapan saja.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((template) => {
                                const isSelected =
                                    selectedTemplateId === template.id;
                                return (
                                    <div
                                        key={template.id}
                                        onClick={() =>
                                            handleTemplateSelect(template)
                                        }
                                        className={`group relative rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                                                : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="size-11 rounded-xl bg-background border border-border flex items-center justify-center shadow-xs">
                                                {getTemplateIcon(template.slug)}
                                            </div>
                                            {isSelected && (
                                                <Badge
                                                    variant="default"
                                                    className="bg-primary text-primary-foreground font-mono text-[10px]"
                                                >
                                                    Dipilih
                                                </Badge>
                                            )}
                                        </div>

                                        <h3 className="text-base font-semibold text-foreground mt-3">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 min-h-[36px]">
                                            {template.description}
                                        </p>

                                        {/* Status Pipeline Preview */}
                                        <div className="mt-4 pt-3 border-t border-border/50">
                                            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                                                Alur Kolom Bawaan:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(
                                                    template.workflow_config ||
                                                    []
                                                ).map((st, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-background border border-border"
                                                    >
                                                        <span
                                                            className="size-1.5 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    st.color,
                                                            }}
                                                        />
                                                        {st.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="button"
                                size="lg"
                                onClick={() => setStep(2)}
                                className="gap-2"
                            >
                                Lanjut ke Pengaturan Proyek
                                <ArrowRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Project Configuration Form */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Langkah 2: Konfigurasi Proyek
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Menggunakan template:{' '}
                                <strong className="text-primary font-medium">
                                    {selectedTemplate?.name}
                                </strong>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Form Inputs (2 Cols) */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="project-name">
                                        Nama Proyek{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="project-name"
                                        placeholder="Contoh: Platform Core Redesign, Mobile App v2"
                                        value={data.name}
                                        onChange={(e) =>
                                            handleNameChange(e.target.value)
                                        }
                                        autoFocus
                                        className="h-10"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="project-key">
                                            Kode Proyek (Key){' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="project-key"
                                                placeholder="Contoh: PCR, KNT"
                                                maxLength={8}
                                                value={data.key}
                                                onChange={(e) =>
                                                    setData(
                                                        'key',
                                                        e.target.value
                                                            .toUpperCase()
                                                            .replace(
                                                                /[^A-Z0-9]/g,
                                                                '',
                                                            ),
                                                    )
                                                }
                                                className="font-mono uppercase tracking-wider font-semibold h-10"
                                            />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Digunakan sebagai prefix nomor
                                            tugas (cth:{' '}
                                            <span className="font-mono text-primary">
                                                {data.key || 'PRJ'}-101
                                            </span>
                                            ).
                                        </p>
                                        {errors.key && (
                                            <p className="text-xs text-destructive">
                                                {errors.key}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="project-lead">
                                            Ketua Proyek (Project Lead)
                                        </Label>
                                        <Select
                                            value={data.lead_user_id.toString()}
                                            onValueChange={(val) =>
                                                setData(
                                                    'lead_user_id',
                                                    parseInt(val, 10),
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="project-lead"
                                                className="h-10"
                                            >
                                                <SelectValue placeholder="Pilih Project Lead" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members.map((m) => (
                                                    <SelectItem
                                                        key={m.id}
                                                        value={m.id.toString()}
                                                    >
                                                        {m.name} ({m.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.lead_user_id && (
                                            <p className="text-xs text-destructive">
                                                {errors.lead_user_id}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="project-description">
                                        Deskripsi Proyek (Opsional)
                                    </Label>
                                    <Textarea
                                        id="project-description"
                                        placeholder="Jelaskan tujuan, ruang lingkup, atau fokus deliverables proyek ini..."
                                        value={data.description}
                                        onChange={(e) =>
                                            setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-destructive">
                                            {errors.description}
                                        </p>
                                    )}
                                </div>

                                {/* Color Palette */}
                                <div className="space-y-2 pt-2">
                                    <Label>Warna Aksen Proyek</Label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {COLOR_PALETTE.map((c) => (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                onClick={() =>
                                                    setData('color', c.hex)
                                                }
                                                title={c.name}
                                                className={`size-8 rounded-full flex items-center justify-center transition-all ${
                                                    data.color === c.hex
                                                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                                        : 'hover:scale-105'
                                                }`}
                                                style={{
                                                    backgroundColor: c.hex,
                                                }}
                                            >
                                                {data.color === c.hex && (
                                                    <Check className="size-4 text-white" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview Card (1 Col) */}
                            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm h-fit">
                                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
                                    Pratinjau Kartu Proyek
                                </span>

                                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="size-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs font-mono text-xs"
                                            style={{
                                                backgroundColor:
                                                    data.color || '#6366f1',
                                            }}
                                        >
                                            {data.key || 'PRJ'}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground text-sm line-clamp-1">
                                                {data.name ||
                                                    'Nama Proyek Anda'}
                                            </h4>
                                            <span className="font-mono text-[10px] text-primary">
                                                {data.key || 'PRJ'} •{' '}
                                                {selectedTemplate?.name}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {data.description ||
                                            'Deskripsi proyek akan ditampilkan di sini.'}
                                    </p>

                                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
                                        <span>
                                            Lead:{' '}
                                            {members.find(
                                                (m) =>
                                                    m.id === data.lead_user_id,
                                            )?.name || currentUser.name}
                                        </span>
                                        <span className="text-emerald-500 font-medium">
                                            Aktif
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <span className="font-mono text-[10px] uppercase font-semibold block">
                                        Alur Kolom Terbuat:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {(
                                            selectedTemplate?.workflow_config ||
                                            []
                                        ).map((st, i) => (
                                            <span
                                                key={i}
                                                className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-mono"
                                            >
                                                {st.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-6 border-t border-border">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft className="mr-1.5 size-4" />
                                Kembali ke Pilih Template
                            </Button>

                            <Button
                                type="submit"
                                size="lg"
                                disabled={processing || !data.name.trim()}
                            >
                                {processing && (
                                    <Spinner className="mr-2 size-4" />
                                )}
                                Buat Proyek & Siapkan Workspace
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
}

CreateProject.breadcrumbs = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Direktori Proyek',
        href: '/projects',
    },
    {
        title: 'Buat Proyek',
        href: '/projects/create',
    },
];
