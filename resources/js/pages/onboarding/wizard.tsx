import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    ArrowRight,
    Bot,
    Building2,
    Check,
    CheckCircle2,
    Code2,
    FolderKanban,
    HardDrive,
    Layers,
    Lock,
    Plus,
    RefreshCw,
    Repeat,
    Sparkles,
    Trash2,
    Upload,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    user: {
        name: string;
        email: string;
    };
}

interface InviteItem {
    email: string;
    role: 'admin' | 'member' | 'viewer';
}

export default function OnboardingWizardPage({ user }: Props) {
    const [step, setStep] = useState(1);
    const totalSteps = 7;

    const { data, setData, post, processing, errors } = useForm({
        org_name: 'Nusantara Digital',
        methodology: 'kanban' as 'kanban' | 'scrum' | 'scrumban',
        project_name: 'WMS Platform v1',
        project_key: 'WMS',
        project_description: 'Platform manajemen kerja AI dan kolaborasi tim.',
        invites: [
            { email: '', role: 'member' as const },
        ],
        ai_provider: 'openai' as 'openai' | 'anthropic' | 'gemini' | 'ollama',
    });

    const addInviteRow = () => {
        setData('invites', [...data.invites, { email: '', role: 'member' }]);
    };

    const removeInviteRow = (index: number) => {
        const updated = [...data.invites];
        updated.splice(index, 1);
        setData('invites', updated);
    };

    const updateInviteRow = (index: number, field: keyof InviteItem, val: any) => {
        const updated = [...data.invites];
        updated[index] = { ...updated[index], [field]: val };
        setData('invites', updated);
    };

    const handleComplete = (e: React.FormEvent) => {
        e.preventDefault();
        // Filter out empty invite emails
        const cleanInvites = data.invites.filter((i) => i.email.trim() !== '');
        data.invites = cleanInvites;

        post('/onboarding/complete');
    };

    const progressPercentage = Math.round((step / totalSteps) * 100);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            <Head title="Pandu Management Onboarding - Setup Workspace" />

            {/* Top Navigation Bar */}
            <header className="h-16 border-b border-border/80 bg-card/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-xs">
                        P
                    </div>
                    <span className="font-bold text-sm tracking-tight text-foreground">
                        Pandu Setup Wizard
                    </span>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center gap-3 max-w-xs w-full hidden sm:flex">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {step} / {totalSteps}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </header>

            {/* Main Step Container */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                {/* Background Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

                <div className="w-full max-w-2xl mx-auto">
                    {/* STEP 1: WELCOME SCREEN */}
                    {step === 1 && (
                        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                <div className="relative w-20 h-20 bg-card rounded-2xl border border-primary/30 shadow-lg flex items-center justify-center">
                                    <Sparkles className="size-10 text-primary animate-bounce" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Badge variant="outline" className="text-xs font-mono py-1 px-3 border-primary/30 text-primary bg-primary/5">
                                    First-Time User Setup
                                </Badge>
                                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                                    Selamat Datang di <br />
                                    <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        Pandu Work Management
                                    </span>
                                </h1>
                                <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                    Mari mulai dengan menyiapkan workspace untuk organisasi dan proyek pertama Anda. Sistem cerdas kami akan membantu mengoptimalkan alur kerja dari hari pertama.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                                <Button
                                    type="button"
                                    size="lg"
                                    onClick={() => setStep(2)}
                                    className="w-full sm:w-auto font-semibold gap-2 shadow-md rounded-xl px-8"
                                >
                                    <span>Mulai Konfigurasi</span>
                                    <ArrowRight className="size-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CREATE ORGANIZATION */}
                    {step === 2 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                                    Langkah 2 dari 7
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Building2 className="size-5 text-primary" /> Buat Organisasi & Workspace
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Nama organisasi akan menjadi identitas ruang kerja utama Anda.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Nama Organisasi</label>
                                    <Input
                                        type="text"
                                        value={data.org_name}
                                        onChange={(e) => setData('org_name', e.target.value)}
                                        placeholder="Contoh: Nusantara Digital, PT Inovasi Solusi"
                                        className="h-10 text-sm"
                                        required
                                    />
                                    {errors.org_name && (
                                        <p className="text-xs text-destructive">{errors.org_name}</p>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono text-muted-foreground flex items-center justify-between">
                                    <span>URL Workspace:</span>
                                    <span className="font-bold text-primary">
                                        app.pandu.id/{data.org_name.toLowerCase().replace(/\s+/g, '-') || 'organisasi'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    <ArrowLeft className="size-3.5" /> Kembali
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    disabled={!data.org_name.trim()}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    Lanjut <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: WORK METHODOLOGY */}
                    {step === 3 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                                    Langkah 3 dari 7
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Layers className="size-5 text-primary" /> Pilih Metodologi Kerja
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Bagaimana tim Anda biasanya mengelola tugas dan alur kerja?
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Kanban Card */}
                                <div
                                    onClick={() => setData('methodology', 'kanban')}
                                    className={cn(
                                        'p-4 rounded-xl border text-left cursor-pointer transition-all space-y-3 relative group',
                                        data.methodology === 'kanban'
                                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                                            : 'bg-card border-border hover:border-primary/40'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                        <FolderKanban className="size-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-foreground">Kanban</h3>
                                        <p className="text-[11px] text-muted-foreground leading-snug">
                                            Aliran kerja berkelanjutan untuk penanganan tugas harian dinamis.
                                        </p>
                                    </div>
                                    {data.methodology === 'kanban' && (
                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] absolute top-2 right-2">
                                            <Check className="size-3" />
                                        </div>
                                    )}
                                </div>

                                {/* Scrum Card */}
                                <div
                                    onClick={() => setData('methodology', 'scrum')}
                                    className={cn(
                                        'p-4 rounded-xl border text-left cursor-pointer transition-all space-y-3 relative group',
                                        data.methodology === 'scrum'
                                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                                            : 'bg-card border-border hover:border-primary/40'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                        <Repeat className="size-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-foreground">Scrum</h3>
                                        <p className="text-[11px] text-muted-foreground leading-snug">
                                            Iterasi berulang dalam siklus sprint 1-4 minggu yang terencana.
                                        </p>
                                    </div>
                                    {data.methodology === 'scrum' && (
                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] absolute top-2 right-2">
                                            <Check className="size-3" />
                                        </div>
                                    )}
                                </div>

                                {/* Scrumban Card */}
                                <div
                                    onClick={() => setData('methodology', 'scrumban')}
                                    className={cn(
                                        'p-4 rounded-xl border text-left cursor-pointer transition-all space-y-3 relative group',
                                        data.methodology === 'scrumban'
                                            ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                                            : 'bg-card border-border hover:border-primary/40'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                        <Zap className="size-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-foreground">Scrumban</h3>
                                        <p className="text-[11px] text-muted-foreground leading-snug">
                                            Gabungan fleksibilitas kanban dengan estimasi story point scrum.
                                        </p>
                                    </div>
                                    {data.methodology === 'scrumban' && (
                                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] absolute top-2 right-2">
                                            <Check className="size-3" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    <ArrowLeft className="size-3.5" /> Kembali
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(4)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    Lanjut <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: FIRST PROJECT SETUP */}
                    {step === 4 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                                    Langkah 4 dari 7
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <FolderKanban className="size-5 text-primary" /> Setup Proyek Pertama
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Tentukan nama proyek dan kode prefix untuk penomoran tugas (task key).
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Nama Proyek</label>
                                        <Input
                                            type="text"
                                            value={data.project_name}
                                            onChange={(e) => {
                                                const name = e.target.value;
                                                setData('project_name', name);
                                                if (name && !data.project_key) {
                                                    const key = name.substring(0, 3).toUpperCase();
                                                    setData('project_key', key);
                                                }
                                            }}
                                            placeholder="Contoh: Redesign Aplikasi Mobile"
                                            className="h-10 text-sm"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground">Project Key</label>
                                        <Input
                                            type="text"
                                            value={data.project_key}
                                            onChange={(e) => setData('project_key', e.target.value.toUpperCase())}
                                            placeholder="WMS"
                                            maxLength={10}
                                            className="h-10 text-sm font-mono uppercase"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Deskripsi Proyek (Opsional)</label>
                                    <Textarea
                                        value={data.project_description}
                                        onChange={(e) => setData('project_description', e.target.value)}
                                        placeholder="Jelaskan tujuan atau ruang lingkup proyek ini..."
                                        className="text-xs min-h-[80px]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(3)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    <ArrowLeft className="size-3.5" /> Kembali
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(5)}
                                    disabled={!data.project_name.trim() || !data.project_key.trim()}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    Lanjut <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: INVITE MEMBERS */}
                    {step === 5 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                                    Langkah 5 dari 7
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Users className="size-5 text-primary" /> Undang Rekan Tim
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Undang anggota tim Anda untuk mulai berkolaborasi. Anda juga bisa melewatinya sekarang.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {data.invites.map((invite, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            type="email"
                                            value={invite.email}
                                            onChange={(e) => updateInviteRow(index, 'email', e.target.value)}
                                            placeholder="email.rekan@perusahaan.com"
                                            className="text-xs h-9 flex-1"
                                        />
                                        <select
                                            value={invite.role}
                                            onChange={(e) => updateInviteRow(index, 'role', e.target.value)}
                                            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        {data.invites.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeInviteRow(index)}
                                                className="text-muted-foreground hover:text-destructive p-2 h-9"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addInviteRow}
                                    className="text-xs font-semibold gap-1.5 mt-2"
                                >
                                    <Plus className="size-3.5" /> Tambah Baris Email
                                </Button>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(4)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    <ArrowLeft className="size-3.5" /> Kembali
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setStep(6)}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Lewati Langkah Ini
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setStep(6)}
                                        className="text-xs font-semibold gap-1.5"
                                    >
                                        Lanjut <ArrowRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: AI PROVIDER */}
                    {step === 6 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider">
                                    Langkah 6 dari 7
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <Bot className="size-5 text-primary" /> Konfigurasi AI Co-Pilot
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Pilih penyedia model kecerdasan buatan utama untuk otomasi dan saran cerdas.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'openai', name: 'OpenAI GPT-4o', desc: 'Analisis tugas & otomatisasi alur kerja' },
                                    { id: 'anthropic', name: 'Anthropic Claude 3.5', desc: 'Pemecahan masalah kode & dokumentasi' },
                                    { id: 'gemini', name: 'Google Gemini 1.5 Pro', desc: 'Multimodal, konteks panjang & kecepatan' },
                                    { id: 'ollama', name: 'Ollama Local Host', desc: 'Model mandiri offline pada server lokal' },
                                ].map((prov) => (
                                    <div
                                        key={prov.id}
                                        onClick={() => setData('ai_provider', prov.id as any)}
                                        className={cn(
                                            'p-4 rounded-xl border text-left cursor-pointer transition-all space-y-1.5 relative',
                                            data.ai_provider === prov.id
                                                ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-xs'
                                                : 'bg-card border-border hover:border-primary/40'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground">{prov.name}</span>
                                            {data.ai_provider === prov.id && (
                                                <CheckCircle2 className="size-3.5 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-snug">
                                            {prov.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(5)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    <ArrowLeft className="size-3.5" /> Kembali
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setStep(7)}
                                    className="text-xs font-semibold gap-1.5"
                                >
                                    Lanjut ke Ringkasan <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 7: SUMMARY & COMPLETION */}
                    {step === 7 && (
                        <div className="bg-card rounded-2xl p-8 border border-border shadow-xl space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                            {/* Confetti Background Layer */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                                <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                                    <defs>
                                        <pattern height="10" id="confetti" patternUnits="userSpaceOnUse" width="10" x="0" y="0">
                                            <circle cx="2" cy="2" fill="#c3c0ff" opacity="0.8" r="1" />
                                            <rect fill="#4edea3" height="3" opacity="0.6" transform="rotate(45 6 8)" width="2" x="5" y="7" />
                                            <circle cx="8" cy="4" fill="#3B82F6" opacity="0.7" r="1.5" />
                                            <polygon fill="#F59E0B" opacity="0.9" points="1,8 3,10 0,9" />
                                        </pattern>
                                    </defs>
                                    <rect fill="url(#confetti)" height="100%" width="100%" />
                                </svg>
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
                                    <div className="relative z-10 w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                        <CheckCircle2 className="size-8" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                        Workspace Anda Siap Digunakan!
                                    </h1>
                                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                                        Semua konfigurasi telah berhasil diatur. Anda kini dapat mulai berkolaborasi, melacak sprint, dan bekerja dengan bantuan AI Co-Pilot.
                                    </p>
                                </div>

                                {/* Configuration Summary Card */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 text-left grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] font-mono text-muted-foreground block">Organisasi</span>
                                        <span className="font-bold text-foreground">{data.org_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono text-muted-foreground block">Metodologi</span>
                                        <span className="font-bold text-foreground uppercase">{data.methodology}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono text-muted-foreground block">Proyek</span>
                                        <span className="font-bold text-foreground">[{data.project_key}] {data.project_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono text-muted-foreground block">AI Engine</span>
                                        <span className="font-bold text-primary uppercase">{data.ai_provider}</span>
                                    </div>
                                </div>

                                <form onSubmit={handleComplete} className="pt-2">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={processing}
                                        className="w-full font-bold gap-2 shadow-lg rounded-xl h-11 text-sm"
                                    >
                                        {processing ? (
                                            <>
                                                <RefreshCw className="size-4 animate-spin" /> Menyiapkan Workspace...
                                            </>
                                        ) : (
                                            <>
                                                <span>Masuk ke Dashboard</span>
                                                <ArrowRight className="size-4" />
                                            </>
                                        )}
                                    </Button>
                                </form>

                                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                                    <Lock className="size-3 text-muted-foreground" />
                                    <span>Koneksi aman & terenkripsi</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="h-12 border-t border-border/40 px-6 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Pandu Work Management System v2.5</span>
                <span>Enterprise FTUX Onboarding Engine</span>
            </footer>
        </div>
    );
}
