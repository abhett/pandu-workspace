import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Brain,
    Bot,
    CheckCircle2,
    Cpu,
    Lock,
    Save,
    Sliders,
    Sparkles,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiPreferences {
    default_model: string;
    context_window: number;
    tone_style: number;
    custom_system_prompt: string | null;
    auto_summarize_notifications: boolean;
    inline_suggestions: boolean;
    suggestion_density: string;
    model_training_opt_in: boolean;
}

interface Props {
    ai_preferences: AiPreferences;
}

export default function AiPreferencesPage({ ai_preferences }: Props) {
    const [defaultModel, setDefaultModel] = useState(ai_preferences.default_model);
    const [contextWindow, setContextWindow] = useState(ai_preferences.context_window);
    const [toneStyle, setToneStyle] = useState(ai_preferences.tone_style);
    const [systemPrompt, setSystemPrompt] = useState(ai_preferences.custom_system_prompt || '');
    const [autoSummarize, setAutoSummarize] = useState(ai_preferences.auto_summarize_notifications);
    const [inlineSuggestions, setInlineSuggestions] = useState(ai_preferences.inline_suggestions);
    const [suggestionDensity, setSuggestionDensity] = useState(ai_preferences.suggestion_density);
    const [modelTraining, setModelTraining] = useState(ai_preferences.model_training_opt_in);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        fetch('/settings/ai-preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                default_model: defaultModel,
                context_window: contextWindow,
                tone_style: toneStyle,
                custom_system_prompt: systemPrompt,
                auto_summarize_notifications: autoSummarize,
                inline_suggestions: inlineSuggestions,
                suggestion_density: suggestionDensity,
                model_training_opt_in: modelTraining,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSaving(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                router.reload();
            })
            .catch(() => {
                setIsSaving(false);
            });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pengaturan', href: '/settings/profile' },
                { title: 'Preferensi AI', href: '#' },
            ]}
        >
            <Head title="Preferensi AI Pribadi - Pengaturan" />

            <SettingsLayout>
                <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
                    {/* Header Banner */}
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                        <div className="space-y-1 relative z-10">
                            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Sparkles className="size-5 text-primary" /> Preferensi & Persona Asisten AI
                            </h1>
                            <p className="text-xs text-muted-foreground max-w-2xl">
                                Sesuaikan cara AI Kinetic berinteraksi dengan tugas Anda, gaya komunikasi, instruksi permanen, dan kebijakan privasi data akun.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Left Column: Core Intelligence & Personality */}
                        <div className="xl:col-span-8 space-y-6">
                            {/* Core Intelligence */}
                            <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Cpu className="size-4 text-primary" />
                                    <h2 className="text-sm font-bold text-foreground">Mesin Inteligensi Inti (Core Engine)</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-foreground">
                                            Model AI Default
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Pilih model AI utama yang digunakan untuk percakapan, peringkasan, dan penulisan tugas.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                            {/* Gemini */}
                                            <div
                                                onClick={() => setDefaultModel('gemini')}
                                                className={cn(
                                                    'p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
                                                    defaultModel === 'gemini'
                                                        ? 'bg-primary/5 border-primary shadow-xs'
                                                        : 'bg-muted/30 border-border hover:border-border/80'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground">Gemini Pro 1.5</span>
                                                    {defaultModel === 'gemini' && (
                                                        <CheckCircle2 className="size-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                    Respon paling cepat, kemampuan multimodal dan analisis dokumen luas.
                                                </p>
                                            </div>

                                            {/* GPT-4 */}
                                            <div
                                                onClick={() => setDefaultModel('gpt4')}
                                                className={cn(
                                                    'p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
                                                    defaultModel === 'gpt4'
                                                        ? 'bg-primary/5 border-primary shadow-xs'
                                                        : 'bg-muted/30 border-border hover:border-border/80'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground">GPT-4 Turbo</span>
                                                    {defaultModel === 'gpt4' && (
                                                        <CheckCircle2 className="size-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                    Penalaran logis mendalam, pemecahan masalah teknis & arsitektur.
                                                </p>
                                            </div>

                                            {/* Claude 3 */}
                                            <div
                                                onClick={() => setDefaultModel('claude3')}
                                                className={cn(
                                                    'p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2',
                                                    defaultModel === 'claude3'
                                                        ? 'bg-primary/5 border-primary shadow-xs'
                                                        : 'bg-muted/30 border-border hover:border-border/80'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-foreground">Claude 3.5 Sonnet</span>
                                                    {defaultModel === 'claude3' && (
                                                        <CheckCircle2 className="size-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                    Gaya penulisan natural, pemahaman konteks panjang, dan ketelitian bahasa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Context Window Slider */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <label className="font-semibold text-foreground">Kapasitas Memori Konteks</label>
                                            <span className="font-mono text-[11px] text-primary font-bold">
                                                {contextWindow <= 35 ? 'Standar (32k)' : contextWindow <= 70 ? 'Ekspansi (64k)' : 'Maksimal (128k)'}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={contextWindow}
                                            onChange={(e) => setContextWindow(parseInt(e.target.value))}
                                            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Personality & Tone */}
                            <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Brain className="size-4 text-emerald-400" />
                                    <h2 className="text-sm font-bold text-foreground">Persona & Gaya Komunikasi</h2>
                                </div>

                                <div className="space-y-4">
                                    {/* Tone Style Slider */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <label className="font-semibold text-foreground">Gaya Respons AI</label>
                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                {toneStyle < 30 ? 'Analitis & Ringkas' : toneStyle < 70 ? 'Seimbang & Profesional' : 'Kreatif & Eksploratif'}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={toneStyle}
                                            onChange={(e) => setToneStyle(parseInt(e.target.value))}
                                            className="w-full accent-emerald-400 h-2 bg-muted rounded-lg cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                            <span>Analitis & To-The-Point</span>
                                            <span>Kreatif & Percakapan</span>
                                        </div>
                                    </div>

                                    {/* Global System Prompt */}
                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-semibold text-foreground">
                                            Instruksi Khusus Global (System Directives)
                                        </label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Instruksi ini akan disisipkan ke setiap interaksi AI di akun Anda.
                                        </p>
                                        <Textarea
                                            value={systemPrompt}
                                            onChange={(e) => setSystemPrompt(e.target.value)}
                                            placeholder="misal: Selalu gunakan format poin-poin Markdown. Sorot tenggat waktu dan penanggung jawab dengan huruf tebal."
                                            className="text-xs font-mono min-h-[90px]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Workflow & Privacy */}
                        <div className="xl:col-span-4 space-y-6">
                            {/* Workflow Integration */}
                            <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Sliders className="size-4 text-blue-400" />
                                    <h2 className="text-sm font-bold text-foreground">Integrasi Alur Kerja</h2>
                                </div>

                                <div className="space-y-4 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-foreground">Ringkasan Notifikasi</span>
                                            <p className="text-[11px] text-muted-foreground">Peringkasan email dan obrolan panjang.</p>
                                        </div>
                                        <Switch
                                            checked={autoSummarize}
                                            onCheckedChange={setAutoSummarize}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-foreground">Saran Autokomplit Editor</span>
                                            <p className="text-[11px] text-muted-foreground">Saran teks inline saat mengetik dokumen.</p>
                                        </div>
                                        <Switch
                                            checked={inlineSuggestions}
                                            onCheckedChange={setInlineSuggestions}
                                        />
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <label className="font-semibold text-foreground">Kepadatan Saran Teks</label>
                                        <select
                                            value={suggestionDensity}
                                            onChange={(e) => setSuggestionDensity(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono"
                                        >
                                            <option value="low">Minimal (Hanya kata yang jelas)</option>
                                            <option value="medium">Seimbang (Kalimat standar)</option>
                                            <option value="high">Agresif (Satu paragraf penuh)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Data Privacy */}
                            <div className="bg-card rounded-2xl p-6 border border-border shadow-xs space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                    <Lock className="size-4 text-destructive" />
                                    <h2 className="text-sm font-bold text-foreground">Privasi & Pelatihan Model</h2>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-foreground">Pelatihan Model (Opt-in)</span>
                                            <p className="text-[11px] text-muted-foreground">Izinkan data anonim untuk menyempurnakan model.</p>
                                        </div>
                                        <Switch
                                            checked={modelTraining}
                                            onCheckedChange={setModelTraining}
                                        />
                                    </div>

                                    <div className="p-3 bg-muted/60 rounded-xl border border-border text-[11px] text-muted-foreground leading-relaxed">
                                        Workspace Enterprise menerapkan <strong>Zero Data Retention</strong> secara bawaan. Data Anda tidak akan pernah digunakan untuk melatih model publik.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                        {saveSuccess && (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fade-in mr-auto">
                                <CheckCircle2 className="size-4" /> Preferensi AI berhasil disimpan!
                            </span>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.reload()}
                            className="text-xs"
                        >
                            Batalkan
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="text-xs font-semibold gap-1.5"
                        >
                            <Save className="size-3.5" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}
                        </Button>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
