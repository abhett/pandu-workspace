import { Head, router } from '@inertiajs/react';
import React, { useState } from 'react';
import {
    Bot,
    Cpu,
    Zap,
    ShieldCheck,
    Save,
    Key,
    Server,
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Lock,
    Sparkles,
    Gauge,
    DollarSign,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AiSettingData {
    id: string;
    default_provider: string;
    has_openai_key: boolean;
    has_gemini_key: boolean;
    ollama_base_url: string;
    default_model: string;
    monthly_token_budget: number;
    current_month_tokens_used: number;
    current_month_cost_estimate: number;
    budget_usage_percent: number;
    is_budget_exceeded: boolean;
    is_enabled: boolean;
}

interface UsageLog {
    id: string;
    capability: string;
    provider: string;
    model: string;
    total_tokens: number;
    cost_estimate: number;
    latency_ms: number;
    status: string;
    user_name: string;
    project_name: string;
    created_at: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    aiSetting: AiSettingData;
    usageLogs: UsageLog[];
}

export default function AiSettingsPage({
    organization,
    aiSetting,
    usageLogs,
}: Props) {
    const [provider, setProvider] = useState(aiSetting.default_provider);
    const [openaiKey, setOpenaiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [ollamaUrl, setOllamaUrl] = useState(aiSetting.ollama_base_url || 'http://localhost:11434');
    const [model, setModel] = useState(aiSetting.default_model);
    const [monthlyBudget, setMonthlyBudget] = useState(String(aiSetting.monthly_token_budget));
    const [isEnabled, setIsEnabled] = useState(aiSetting.is_enabled);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.put(
            '/organization/ai-settings',
            {
                default_provider: provider,
                openai_api_key: openaiKey || undefined,
                gemini_api_key: geminiKey || undefined,
                ollama_base_url: ollamaUrl,
                default_model: model,
                monthly_token_budget: parseInt(monthlyBudget, 10) || 500000,
                is_enabled: isEnabled,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    setOpenaiKey('');
                    setGeminiKey('');
                },
                onError: () => setIsSaving(false),
            }
        );
    };

    const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n);

    return (
        <>
            <Head title={`Pengaturan AI Gateway - ${organization.name}`} />

            <div className="flex flex-col gap-6 p-4 font-sans md:p-6 lg:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Sparkles className="size-6" />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    AI Gateway & Pengaturan Model
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Kelola provider AI (OpenAI, Gemini, Ollama), kuota token bulanan, dan privasi data organisasi {organization.name}.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant={isEnabled ? 'default' : 'secondary'}
                            className="px-3 py-1 text-xs gap-1.5 font-semibold"
                        >
                            {isEnabled ? (
                                <>
                                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>AI Gateway Aktif</span>
                                </>
                            ) : (
                                <>
                                    <span className="size-2 rounded-full bg-muted-foreground" />
                                    <span>AI Gateway Nonaktif</span>
                                </>
                            )}
                        </Badge>
                    </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Active Provider */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Provider Aktif</span>
                            <Bot className="size-4 text-primary" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-lg font-bold capitalize text-foreground">{aiSetting.default_provider}</h3>
                            <span className="text-[11px] font-mono text-muted-foreground">{aiSetting.default_model}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            {aiSetting.default_provider === 'mock' && 'Mode simulasi offline (0 direct cost)'}
                            {aiSetting.default_provider === 'openai' && 'Cloud API OpenAI terenkripsi'}
                            {aiSetting.default_provider === 'gemini' && 'Google Gemini Flash model'}
                            {aiSetting.default_provider === 'ollama' && 'Private self-hosted local instance'}
                        </p>
                    </div>

                    {/* Token Quota Progress */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Penggunaan Token</span>
                            <Gauge className="size-4 text-primary" />
                        </div>
                        <div className="flex items-baseline justify-between">
                            <h3 className="text-lg font-bold text-foreground">
                                {formatNumber(aiSetting.current_month_tokens_used)}
                            </h3>
                            <span className="text-xs font-mono text-muted-foreground">
                                / {formatNumber(aiSetting.monthly_token_budget)}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full transition-all duration-300 ${
                                    aiSetting.budget_usage_percent > 90
                                        ? 'bg-destructive'
                                        : aiSetting.budget_usage_percent > 70
                                        ? 'bg-amber-500'
                                        : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(100, aiSetting.budget_usage_percent)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Bulan Ini</span>
                            <span className="font-bold text-foreground">{aiSetting.budget_usage_percent}%</span>
                        </div>
                    </div>

                    {/* Cost Estimate */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Estimasi Biaya</span>
                            <DollarSign className="size-4 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            ${aiSetting.current_month_cost_estimate.toFixed(4)}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Akumulasi estimasi pemakaian API pihak ketiga bulan ini.
                        </p>
                    </div>

                    {/* Security & Redaction */}
                    <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur space-y-2">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Keamanan Data</span>
                            <ShieldCheck className="size-4 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-sm">
                            <CheckCircle2 className="size-4" />
                            <span>PII Redaction Aktif</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Email, kunci API, dan data privat otomatis disaring sebelum dikirim ke AI.
                        </p>
                    </div>
                </div>

                {/* Configuration Tabs */}
                <Tabs defaultValue="settings" className="w-full space-y-4">
                    <TabsList className="bg-muted/60 text-xs">
                        <TabsTrigger value="settings" className="gap-1.5">
                            <Cpu className="size-3.5" />
                            <span>Konfigurasi Provider</span>
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="gap-1.5">
                            <Activity className="size-3.5" />
                            <span>Riwayat Audit AI ({usageLogs.length})</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Settings Form */}
                    <TabsContent value="settings">
                        <form onSubmit={handleSave} className="p-6 rounded-2xl border border-border/80 bg-card space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Provider Selector */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Default AI Provider</Label>
                                    <Select value={provider} onValueChange={setProvider}>
                                        <SelectTrigger className="bg-background text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mock">Mock Engine (Simulasi Cepat & Offline)</SelectItem>
                                            <SelectItem value="openai">OpenAI (GPT-4o, GPT-4o-mini)</SelectItem>
                                            <SelectItem value="gemini">Google Gemini (Gemini 1.5 Flash, Pro)</SelectItem>
                                            <SelectItem value="ollama">Ollama / vLLM (Private Local AI)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Pilih provider yang akan memproses seluruh request AI di organisasi ini.
                                    </p>
                                </div>

                                {/* Default Model */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">Nama Model Utama</Label>
                                    <Input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="gpt-4o-mini, gemini-1.5-flash, llama3"
                                        className="text-xs bg-background"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Nama spesifik model yang dipanggil dari provider.
                                    </p>
                                </div>

                                {/* OpenAI API Key */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                                            <Key className="size-3.5" />
                                            <span>OpenAI API Key</span>
                                        </Label>
                                        {aiSetting.has_openai_key && (
                                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                                                Tersimpan & Terenkripsi
                                            </Badge>
                                        )}
                                    </div>
                                    <Input
                                        type="password"
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        placeholder={aiSetting.has_openai_key ? '•••••••••••••••••••••••••••• (Isi untuk mengganti)' : 'sk-...'}
                                        className="text-xs bg-background font-mono"
                                    />
                                </div>

                                {/* Gemini API Key */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold flex items-center gap-1.5">
                                            <Key className="size-3.5" />
                                            <span>Google Gemini API Key</span>
                                        </Label>
                                        {aiSetting.has_gemini_key && (
                                            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                                                Tersimpan & Terenkripsi
                                            </Badge>
                                        )}
                                    </div>
                                    <Input
                                        type="password"
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder={aiSetting.has_gemini_key ? '•••••••••••••••••••••••••••• (Isi untuk mengganti)' : 'AIzaSy...'}
                                        className="text-xs bg-background font-mono"
                                    />
                                </div>

                                {/* Ollama Base URL */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                                        <Server className="size-3.5" />
                                        <span>Ollama / Local Server Base URL</span>
                                    </Label>
                                    <Input
                                        value={ollamaUrl}
                                        onChange={(e) => setOllamaUrl(e.target.value)}
                                        placeholder="http://localhost:11434"
                                        className="text-xs bg-background font-mono"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Endpoint server Ollama atau vLLM untuk inferensi model mandiri tanpa egress ke cloud publik.
                                    </p>
                                </div>

                                {/* Monthly Token Budget Limit */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                                        <Gauge className="size-3.5" />
                                        <span>Batas Anggaran Token Bulanan</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="10000"
                                        value={monthlyBudget}
                                        onChange={(e) => setMonthlyBudget(e.target.value)}
                                        className="text-xs bg-background font-mono"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Permintaan AI otomatis ditolak jika penggunaan melebihi batas ini (masukkan 0 untuk tak terbatas).
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={(e) => setIsEnabled(e.target.checked)}
                                        className="rounded border-border size-4"
                                    />
                                    <span className="font-semibold text-foreground">Aktifkan seluruh kapabilitas AI untuk organisasi ini</span>
                                </label>

                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="text-xs gap-1.5 font-semibold"
                                >
                                    <Save className="size-3.5" />
                                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    {/* Tab 2: Audit Logs */}
                    <TabsContent value="logs">
                        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Riwayat Panggilan AI Gateway
                                </h3>
                                <span className="text-[11px] text-muted-foreground">Menampilkan 20 pemanggilan terakhir</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                                        <tr>
                                            <th className="p-3">Waktu</th>
                                            <th className="p-3">Kapabilitas</th>
                                            <th className="p-3">Provider & Model</th>
                                            <th className="p-3">Tokens</th>
                                            <th className="p-3">Biaya</th>
                                            <th className="p-3">Latensi</th>
                                            <th className="p-3">User & Proyek</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {usageLogs.length > 0 ? (
                                            usageLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="p-3 text-muted-foreground whitespace-nowrap">{log.created_at}</td>
                                                    <td className="p-3 font-mono font-semibold capitalize text-foreground">{log.capability.replace('_', ' ')}</td>
                                                    <td className="p-3">
                                                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                                                            {log.provider} / {log.model}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 font-mono">{formatNumber(log.total_tokens)}</td>
                                                    <td className="p-3 font-mono text-emerald-500">${log.cost_estimate.toFixed(5)}</td>
                                                    <td className="p-3 font-mono text-muted-foreground">{log.latency_ms}ms</td>
                                                    <td className="p-3">
                                                        <span className="font-semibold text-foreground">{log.user_name}</span>
                                                        <span className="text-[10px] text-muted-foreground block">{log.project_name}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge
                                                            variant={log.status === 'success' ? 'default' : 'destructive'}
                                                            className="text-[10px] capitalize"
                                                        >
                                                            {log.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-muted-foreground italic">
                                                    Belum ada riwayat audit AI yang tercatat.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
