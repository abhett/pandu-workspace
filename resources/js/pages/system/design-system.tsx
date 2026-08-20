import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Bot,
    Boxes,
    Check,
    CheckCircle2,
    Clock,
    Code,
    Copy,
    Cpu,
    ExternalLink,
    Eye,
    FileCode,
    FileSpreadsheet,
    FileText,
    HelpCircle,
    Info,
    Layers,
    LayoutGrid,
    Lightbulb,
    MessageSquare,
    Palette,
    Play,
    Plus,
    Rocket,
    Search,
    Send,
    Settings,
    Shield,
    Sparkles,
    Trash2,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DesignSystemPage() {
    const [activeTab, setActiveTab] = useState<'foundations' | 'buttons' | 'forms' | 'ai' | 'feedback' | 'cards'>('ai');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [switchState, setSwitchState] = useState(true);
    const [checkState, setCheckState] = useState(true);
    const [simulatedToast, setSimulatedToast] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(text);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const triggerToast = (msg: string) => {
        setSimulatedToast(msg);
        setTimeout(() => setSimulatedToast(null), 3000);
    };

    return (
        <AppLayout>
            <Head title="Sistem Desain UI & Living Component Library" />

            <div className="space-y-8 animate-fade-in pb-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono py-0.5 border-primary/30 text-primary bg-primary/5">
                                Living Styleguide & Primitives
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">v3.4.0</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                            <Layers className="size-7 text-primary" /> Pandu Kinetic Design System
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Pustaka komponen antarmuka, token desain warna HSL, dan primitives AI terintegrasi.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-mono text-muted-foreground">
                            <Code className="size-3.5 text-primary" /> TailwindCSS v4 + Radix UI
                        </div>
                    </div>
                </div>

                {/* Simulated Toast Overlay */}
                {simulatedToast && (
                    <div className="fixed bottom-6 right-6 z-50 bg-card border border-primary/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
                        <Sparkles className="size-4 text-primary animate-spin" />
                        <div className="text-xs">
                            <p className="font-bold text-foreground">Toast Triggered</p>
                            <p className="text-muted-foreground font-mono text-[11px]">{simulatedToast}</p>
                        </div>
                    </div>
                )}

                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border custom-scrollbar">
                    {[
                        { id: 'ai', label: 'Specialized AI Primitives', icon: Sparkles },
                        { id: 'foundations', label: 'Foundations & Tokens', icon: Palette },
                        { id: 'buttons', label: 'Buttons & Badges', icon: Zap },
                        { id: 'forms', label: 'Forms & Controls', icon: FileCode },
                        { id: 'feedback', label: 'Feedback & Indicators', icon: Activity },
                        { id: 'cards', label: 'Cards & Board Elements', icon: LayoutGrid },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                            >
                                <Icon className="size-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: SPECIALIZED AI PRIMITIVES */}
                {activeTab === 'ai' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* AI Response Streaming Component */}
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Bot className="size-4 text-primary" /> AI Response Streaming Block
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-mono">Live Simulation</Badge>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-4 relative overflow-hidden border border-border/80 space-y-3">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Sparkles className="size-4 animate-spin text-primary" />
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-mono text-primary font-bold uppercase tracking-wider">
                                                    Generating Sprint Workload Optimization...
                                                </span>
                                                <span className="text-[10px] font-mono text-muted-foreground">42ms latency</span>
                                            </div>
                                            <p className="text-xs text-foreground leading-relaxed">
                                                Berdasarkan velocity historis sprint sebelumnya, merealokasikan 3 tugas dari modul autentikasi ke developer backend cadangan akan menurunkan risiko keterlambatan milestone hingga 24%.
                                            </p>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Automated Decision Approval Card */}
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle2 className="size-4 text-emerald-400" /> Automated Decision Approval
                                    </h3>
                                    <Badge variant="outline" className="text-[10px] font-mono">Actionable Trigger</Badge>
                                </div>

                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                            <Shield className="size-4" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground">Auto-Rollback Triggered</span>
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">High Confidence</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Deteksi anomali error rate &gt; 5% pada build #892. AI merekomendasikan rollback ke commit rilis stabil `v2.4.1`.
                                            </p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => triggerToast('Rollback telah disetujui')}>
                                                    <Check className="size-3.5" /> Setujui Rollback
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => triggerToast('Detail log dibuka')}>
                                                    Tinjau Log Insiden
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Citations & Provider Badges */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                Citation Pills & AI Model Provider Badges
                            </h3>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-muted/40 hover:bg-muted/80 border border-border px-3.5 py-1.5 rounded-full text-xs font-mono text-foreground cursor-pointer transition-colors">
                                    <FileText className="size-3.5 text-primary" />
                                    <span>Sprint_Velocity_Q3.csv</span>
                                </div>

                                <div className="flex items-center gap-2 bg-muted/40 hover:bg-muted/80 border border-border px-3.5 py-1.5 rounded-full text-xs font-mono text-foreground cursor-pointer transition-colors">
                                    <FileSpreadsheet className="size-3.5 text-emerald-400" />
                                    <span>Architecture_ADR_004.md</span>
                                </div>

                                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full text-xs font-mono text-primary">
                                    <Cpu className="size-3.5" />
                                    <span>Powered by Google Gemini 1.5 Pro</span>
                                </div>

                                <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3.5 py-1.5 rounded-full text-xs font-mono text-purple-400">
                                    <Sparkles className="size-3.5" />
                                    <span>Claude 3.5 Sonnet Engine</span>
                                </div>

                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-mono text-amber-400">
                                    <Zap className="size-3.5" />
                                    <span>Ollama Local Llama-3</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: FOUNDATIONS & TOKENS */}
                {activeTab === 'foundations' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Color Tokens */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Palette className="size-4 text-primary" /> Status & Theme Color Tokens
                                </h3>
                                <span className="text-xs text-muted-foreground font-mono">Click code to copy</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {[
                                    { name: 'Primary (Indigo)', hex: '#4f46e5', var: 'var(--primary)', class: 'bg-primary' },
                                    { name: 'Done (Emerald)', hex: '#10b981', var: '--status-done', class: 'bg-emerald-500' },
                                    { name: 'In Progress (Blue)', hex: '#3b82f6', var: '--status-todo', class: 'bg-blue-500' },
                                    { name: 'Review (Purple)', hex: '#8b5cf6', var: '--status-review', class: 'bg-purple-500' },
                                    { name: 'Warning (Amber)', hex: '#f59e0b', var: '--warning-amber', class: 'bg-amber-500' },
                                    { name: 'Blocked (Red)', hex: '#ef4444', var: '--status-blocked', class: 'bg-red-500' },
                                ].map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => handleCopy(color.hex)}
                                        className="text-left bg-muted/20 hover:bg-muted/40 border border-border rounded-xl p-3 space-y-2 transition-all hover:scale-105"
                                    >
                                        <div className={cn('w-full h-10 rounded-lg shadow-inner', color.class)} />
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{color.name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground">
                                                {copiedToken === color.hex ? 'Copied!' : color.hex}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Typography Hierarchy */}
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                Typography Hierarchy
                            </h3>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/60 pb-3 gap-2">
                                    <span className="text-3xl font-extrabold text-foreground">Display Heading (48px / 3xl)</span>
                                    <span className="text-xs font-mono text-muted-foreground">font-extrabold text-3xl</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/60 pb-3 gap-2">
                                    <span className="text-2xl font-bold text-foreground">Headline Large (24px / 2xl)</span>
                                    <span className="text-xs font-mono text-muted-foreground">font-bold text-2xl</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/60 pb-3 gap-2">
                                    <span className="text-base font-bold text-foreground">Section Subheading (16px / base)</span>
                                    <span className="text-xs font-mono text-muted-foreground">font-bold text-base</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/60 pb-3 gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">Monospace / Metadata / Badges (12px / xs)</span>
                                    <span className="text-xs font-mono text-muted-foreground">font-mono text-xs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: BUTTONS & BADGES */}
                {activeTab === 'buttons' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                Button Variants & Actions
                            </h3>

                            <div className="flex flex-wrap items-center gap-3">
                                <Button size="sm" className="font-semibold shadow-xs">
                                    Primary Button
                                </Button>
                                <Button size="sm" variant="secondary" className="font-semibold">
                                    Secondary Button
                                </Button>
                                <Button size="sm" variant="outline" className="font-semibold">
                                    Outline Button
                                </Button>
                                <Button size="sm" variant="ghost" className="font-semibold">
                                    Ghost Button
                                </Button>
                                <Button size="sm" variant="destructive" className="font-semibold shadow-xs">
                                    Destructive Action
                                </Button>
                                <Button size="sm" className="bg-gradient-to-r from-primary to-purple-500 font-semibold gap-1.5 shadow-xs">
                                    <Sparkles className="size-3.5" /> AI Magic Button
                                </Button>
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                Status Badges
                            </h3>

                            <div className="flex flex-wrap items-center gap-3">
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-xs">
                                    <CheckCircle2 className="size-3 mr-1" /> Selesai (Done)
                                </Badge>
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-xs">
                                    <Clock className="size-3 mr-1" /> Sedang Dikerjakan (In Progress)
                                </Badge>
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-xs">
                                    <Eye className="size-3 mr-1" /> Dalam Review (Review)
                                </Badge>
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 font-mono text-xs">
                                    <AlertCircle className="size-3 mr-1" /> Terhalang (Blocked)
                                </Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    Backlog Queue
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: FORMS & CONTROLS */}
                {activeTab === 'forms' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-xs max-w-2xl">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                Form Controls & Inputs
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Standard Text Input</label>
                                    <Input placeholder="Ketik nama proyek..." className="h-9 text-xs" />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Search Input with Keybinding Badge</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                        <Input placeholder="Cari tugas, sprint, atau anggota..." className="pl-9 pr-14 h-9 text-xs" />
                                        <span className="absolute right-2.5 top-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
                                            ⌘K
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Dropdown Selector</label>
                                    <select className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary h-9">
                                        <option>Scrum Sprint Framework</option>
                                        <option>Kanban Continuous Flow</option>
                                        <option>Bug Tracker & QA Escalation</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                                    <div>
                                        <p className="text-xs font-bold text-foreground">AI Auto-Triage Suggestions</p>
                                        <p className="text-[11px] text-muted-foreground">Otomatis rekomendasikan estimasi story point saat pembuatan tugas.</p>
                                    </div>
                                    <Switch checked={switchState} onCheckedChange={setSwitchState} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: FEEDBACK & INDICATORS */}
                {activeTab === 'feedback' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Toast Triggers */}
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                    Toast Dispatch Simulator
                                </h3>

                                <div className="flex flex-col gap-2.5">
                                    <Button size="sm" variant="outline" className="justify-start gap-2 text-xs" onClick={() => triggerToast('Data sprint berhasil disinkronisasi!')}>
                                        <CheckCircle2 className="size-4 text-emerald-400" /> Success Toast
                                    </Button>
                                    <Button size="sm" variant="outline" className="justify-start gap-2 text-xs" onClick={() => triggerToast('Koneksi database websocket terputus')}>
                                        <AlertTriangle className="size-4 text-amber-400" /> Warning Toast
                                    </Button>
                                    <Button size="sm" variant="outline" className="justify-start gap-2 text-xs" onClick={() => triggerToast('Gagal memproses query AI')}>
                                        <AlertCircle className="size-4 text-red-400" /> Error Toast
                                    </Button>
                                </div>
                            </div>

                            {/* Progress Bars */}
                            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                    Determinate Progress Bars
                                </h3>

                                <div className="space-y-4 pt-1">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                            <span>Sprint 33 Goal</span>
                                            <span className="text-primary font-bold">78%</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: '78%' }} />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                            <span>Test Coverage</span>
                                            <span className="text-emerald-400 font-bold">96%</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: CARDS & BOARDS */}
                {activeTab === 'cards' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-xs max-w-xl">
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pb-3 border-b border-border">
                                Kanban Task Card Primitive
                            </h3>

                            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3 relative group hover:border-primary/40 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono text-muted-foreground">TSK-8492</span>
                                    <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-mono">
                                        High Priority
                                    </Badge>
                                </div>
                                <h4 className="text-xs font-bold text-foreground">
                                    Implementasi Streaming AI Co-Pilot Token Callback
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Sinkronisasi output buffer websocket dengan visualizer komponen UI.
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                        <Clock className="size-3" /> 5 Story Points
                                    </span>
                                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                                        JD
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
