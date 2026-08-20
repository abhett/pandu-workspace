import React, { useState, useEffect } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Bot,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Flame,
    History,
    Layers,
    MessageSquare,
    Mic,
    Pause,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Send,
    Smile,
    Sparkles,
    TrendingUp,
    UserCheck,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandupItem {
    id: string;
    yesterday_work: string;
    today_work: string;
    blockers?: string | null;
    mood: 'great' | 'good' | 'neutral' | 'blocked';
    date: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
    };
    project?: {
        id: string;
        name: string;
        key: string;
    };
}

interface ProjectOption {
    id: string;
    name: string;
    key: string;
}

interface AiSynthesis {
    summary: string;
    blockers_count: number;
    blockers_list: Array<{ user: string; blocker: string }>;
    velocity_health: 'optimal' | 'moderate' | 'critical' | 'neutral';
}

interface PageProps {
    feed?: StandupItem[];
    myStandup?: StandupItem | null;
    projects?: ProjectOption[];
    selectedProjectId?: string | null;
    selectedDate?: string;
    aiSynthesis?: AiSynthesis | null;
}

export default function DailyStandupPage({
    feed = [],
    myStandup = null,
    projects = [],
    selectedProjectId = '',
    selectedDate = new Date().toISOString().split('T')[0],
    aiSynthesis = null,
}: PageProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    const [activeTab, setActiveTab] = useState<'checkin' | 'feed' | 'ai' | 'timer'>('checkin');
    const [currentProject, setCurrentProject] = useState(selectedProjectId || '');
    const [currentDate, setCurrentDate] = useState(selectedDate);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [localSynthesis, setLocalSynthesis] = useState<AiSynthesis | null>(aiSynthesis);

    // Live Timer State
    const [speakerTime, setSpeakerTime] = useState(60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);

    const { data, setData, post, processing, errors } = useForm({
        yesterday_work: myStandup?.yesterday_work || '',
        today_work: myStandup?.today_work || '',
        blockers: myStandup?.blockers || '',
        mood: (myStandup?.mood || 'good') as 'great' | 'good' | 'neutral' | 'blocked',
        project_id: selectedProjectId || '',
        date: selectedDate,
    });

    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && speakerTime > 0) {
            interval = setInterval(() => {
                setSpeakerTime((prev) => prev - 1);
            }, 1000);
        } else if (speakerTime === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, speakerTime]);

    const handleFilterChange = (projId: string, dateVal: string) => {
        setCurrentProject(projId);
        setCurrentDate(dateVal);
        router.get(
            '/scrum/daily-standup',
            { project_id: projId || undefined, date: dateVal },
            { preserveState: true, replace: true }
        );
    };

    const handleSubmitStandup = (e: React.FormEvent) => {
        e.preventDefault();
        post('/scrum/daily-standup', {
            preserveScroll: true,
        });
    };

    const handleSynthesizeAi = async () => {
        setIsSynthesizing(true);
        try {
            const response = await fetch('/scrum/daily-standup/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    project_id: currentProject || undefined,
                    date: currentDate,
                }),
            });
            const result = await response.json();
            setLocalSynthesis(result);
            setActiveTab('ai');
        } catch (err) {
            console.error('Error synthesizing standup:', err);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const nextSpeaker = () => {
        if (feed.length > 0) {
            setCurrentSpeakerIndex((prev) => (prev + 1) % feed.length);
            setSpeakerTime(60);
            setIsTimerRunning(true);
        }
    };

    const resetTimer = () => {
        setSpeakerTime(60);
        setIsTimerRunning(false);
    };

    const currentSpeaker = feed[currentSpeakerIndex];

    return (
        <AppLayout>
            <Head title="Async Daily Standup & AI Executive Briefing - Pandu" />

            <div className="space-y-8 animate-fade-in pb-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono py-0.5 border-primary/30 text-primary bg-primary/5">
                                Scrum & Agile Operations
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground">Async Check-in</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
                            <Users className="size-7 text-primary" /> Daily Standup Tim & AI Briefing
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Check-in progres harian 3 pertanyaan, sintesis blocker otomatis dengan AI Co-Pilot, dan timer giliran bicara live.
                        </p>
                    </div>

                    {/* Filter & Action Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-xs">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            <input
                                type="date"
                                value={currentDate}
                                onChange={(e) => handleFilterChange(currentProject, e.target.value)}
                                className="bg-transparent text-xs font-mono text-foreground focus:outline-none cursor-pointer"
                            />
                        </div>

                        <select
                            value={currentProject}
                            onChange={(e) => handleFilterChange(e.target.value, currentDate)}
                            className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary h-9 shadow-xs"
                        >
                            <option value="">Semua Proyek Organisasi</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.key})
                                </option>
                            ))}
                        </select>

                        <Button
                            size="sm"
                            onClick={handleSynthesizeAi}
                            disabled={isSynthesizing}
                            className="bg-gradient-to-r from-primary to-purple-500 font-semibold gap-1.5 shadow-xs h-9"
                        >
                            <Sparkles className={cn('size-3.5', isSynthesizing && 'animate-spin')} />
                            <span>{isSynthesizing ? 'Mensintesis...' : 'Sintesis AI'}</span>
                        </Button>
                    </div>
                </div>

                {/* Flash Success Notification */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                        <CheckCircle2 className="size-4" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border custom-scrollbar">
                    {[
                        { id: 'checkin', label: 'Check-in Saya Hari Ini', icon: UserCheck },
                        { id: 'feed', label: `Feed Tim (${feed.length})`, icon: MessageSquare },
                        { id: 'ai', label: 'Ringkasan AI & Blocker Radar', icon: Bot },
                        { id: 'timer', label: 'Live Standup Timer', icon: Mic },
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

                {/* TAB 1: FORM CHECK-IN STANDUP */}
                {activeTab === 'checkin' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                        {/* Left Form */}
                        <div className="lg:col-span-8 bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-md">
                            <div className="space-y-1 pb-3 border-b border-border">
                                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <UserCheck className="size-4 text-primary" /> Formulir Standup 3 Pertanyaan
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Kirimkan progres kerja Anda untuk hari {currentDate}. Tim lain dapat melihat komitmen Anda secara asinkron.
                                </p>
                            </div>

                            <form onSubmit={handleSubmitStandup} className="space-y-5">
                                {/* Q1: Yesterday */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</span>
                                        Apa yang berhasil Anda selesaikan kemarin?
                                    </label>
                                    <Textarea
                                        value={data.yesterday_work}
                                        onChange={(e) => setData('yesterday_work', e.target.value)}
                                        placeholder="Contoh: Menyelesaikan API endpoint user profile, merge PR #12 ke staging..."
                                        className="text-xs min-h-[90px]"
                                        required
                                    />
                                    {errors.yesterday_work && <p className="text-xs text-destructive">{errors.yesterday_work}</p>}
                                </div>

                                {/* Q2: Today */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                                        Apa fokus dan komitmen utama Anda hari ini?
                                    </label>
                                    <Textarea
                                        value={data.today_work}
                                        onChange={(e) => setData('today_work', e.target.value)}
                                        placeholder="Contoh: Menguji integrasi OAuth2, menulis Pest test suite untuk laporan..."
                                        className="text-xs min-h-[90px]"
                                        required
                                    />
                                    {errors.today_work && <p className="text-xs text-destructive">{errors.today_work}</p>}
                                </div>

                                {/* Q3: Blockers */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px]">3</span>
                                        Apakah ada kendala atau blocker yang dialami? (Opsional)
                                    </label>
                                    <Textarea
                                        value={data.blockers}
                                        onChange={(e) => setData('blockers', e.target.value)}
                                        placeholder="Tulis kendala dependensi atau ketik 'Tidak ada' jika lancar..."
                                        className="text-xs min-h-[75px]"
                                    />
                                    {errors.blockers && <p className="text-xs text-destructive">{errors.blockers}</p>}
                                </div>

                                {/* Mood Selector */}
                                <div className="space-y-2 pt-2 border-t border-border">
                                    <label className="text-xs font-bold text-foreground">Kondisi & Mood Kerja Hari Ini</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {[
                                            { id: 'great', label: '🔥 Sangat Produktif', desc: 'Siap rilis cepat' },
                                            { id: 'good', label: '⚡ Lancar & Stabil', desc: 'Fokus pengerjaan' },
                                            { id: 'neutral', label: '☕ Normal / Standar', desc: 'Sesuai jadwal' },
                                            { id: 'blocked', label: '🛑 Terhambat / Butuh Bantuan', desc: 'Ada blocker' },
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setData('mood', m.id as any)}
                                                className={cn(
                                                    'p-3 rounded-xl border text-left transition-all space-y-0.5',
                                                    data.mood === m.id
                                                        ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary'
                                                        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                                )}
                                            >
                                                <p className="text-xs font-bold">{m.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="font-semibold gap-2 shadow-xs"
                                >
                                    <Send className="size-3.5" />
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Check-in Standup'}</span>
                                </Button>
                            </form>
                        </div>

                        {/* Right Quick Summary */}
                        <div className="lg:col-span-4 space-y-4">
                            <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-xs">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-400" /> Status Check-in Anda
                                </h3>
                                {myStandup ? (
                                    <div className="space-y-2">
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                                            ✓ Sudah Terkirim ({myStandup.created_at?.slice(11, 16) || 'Hari Ini'})
                                        </Badge>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Standup Anda telah tersimpan dan dimasukkan dalam analisis sintesis AI tim. Anda dapat mengedit formulir di samping kapan saja.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-xs font-mono text-amber-400 border-amber-500/30">
                                            Belum Check-in Hari Ini
                                        </Badge>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Luangkan waktu 1 menit untuk mengisi 3 pertanyaan di samping agar tim mengetahui progres Anda.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-xs">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Bot className="size-4 text-primary" /> Manfaat Standup Asinkron
                                </h3>
                                <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
                                    <li>Mengurangi meeting sinkron hingga 40%.</li>
                                    <li>Mencegah blocker terlewat sebelum rilis sprint.</li>
                                    <li>AI otomatis merangkum status untuk lead tim.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: FEED STANDUP TIM */}
                {activeTab === 'feed' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {feed.length === 0 ? (
                            <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3">
                                <Users className="size-10 text-muted-foreground mx-auto" />
                                <h3 className="text-base font-bold text-foreground">Belum Ada Check-in Tim</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Belum ada anggota tim yang mengirimkan standup untuk tanggal {currentDate}. Jadilah yang pertama mengirimkan check-in!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {feed.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs hover:border-primary/40 transition-colors"
                                    >
                                        {/* User Header */}
                                        <div className="flex items-center justify-between pb-3 border-b border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {item.user.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-foreground">{item.user.name}</h4>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {item.project ? `${item.project.name} (${item.project.key})` : 'Umum'}
                                                    </span>
                                                </div>
                                            </div>

                                            <Badge
                                                className={cn(
                                                    'font-mono text-[10px] capitalize',
                                                    item.mood === 'great' && 'bg-primary/10 text-primary border-primary/20',
                                                    item.mood === 'good' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                    item.mood === 'neutral' && 'bg-muted text-muted-foreground',
                                                    item.mood === 'blocked' && 'bg-red-500/10 text-red-400 border-red-500/20'
                                                )}
                                            >
                                                {item.mood}
                                            </Badge>
                                        </div>

                                        {/* 3 Answers */}
                                        <div className="space-y-2.5 text-xs">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-mono text-muted-foreground block font-semibold uppercase">
                                                    Kemarin:
                                                </span>
                                                <p className="text-foreground leading-relaxed bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                                    {item.yesterday_work}
                                                </p>
                                            </div>

                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-mono text-primary block font-semibold uppercase">
                                                    Hari Ini:
                                                </span>
                                                <p className="text-foreground leading-relaxed bg-muted/20 p-2.5 rounded-xl border border-border/60">
                                                    {item.today_work}
                                                </p>
                                            </div>

                                            {item.blockers && item.blockers.toLowerCase() !== 'tidak ada' && (
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono text-destructive block font-semibold uppercase flex items-center gap-1">
                                                        <AlertTriangle className="size-3" /> Blocker / Kendala:
                                                    </span>
                                                    <p className="text-destructive leading-relaxed bg-destructive/5 p-2.5 rounded-xl border border-destructive/20">
                                                        {item.blockers}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: RINGKASAN AI & BLOCKER RADAR */}
                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {localSynthesis ? (
                            <div className="space-y-6">
                                {/* AI Executive Summary Card */}
                                <div className="bg-card rounded-3xl border border-primary/30 p-6 sm:p-8 space-y-5 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-bl-full blur-2xl pointer-events-none" />

                                    <div className="flex items-center justify-between pb-3 border-b border-border">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <Bot className="size-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">
                                                    AI Standup Executive Briefing
                                                </h3>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                    Tanggal: {currentDate}
                                                </span>
                                            </div>
                                        </div>

                                        <Badge
                                            className={cn(
                                                'font-mono text-xs',
                                                localSynthesis.velocity_health === 'optimal' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                localSynthesis.velocity_health === 'moderate' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                localSynthesis.velocity_health === 'critical' && 'bg-red-500/10 text-red-400 border-red-500/20',
                                                localSynthesis.velocity_health === 'neutral' && 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            Kesehatan Sprint: {localSynthesis.velocity_health.toUpperCase()}
                                        </Badge>
                                    </div>

                                    <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-muted/20 p-4 rounded-2xl border border-border/60">
                                        {localSynthesis.summary}
                                    </p>

                                    {/* Blockers Radar */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <AlertTriangle className="size-3.5 text-amber-400" /> Daftar Kendala Terdeteksi ({localSynthesis.blockers_count})
                                        </h4>

                                        {localSynthesis.blockers_list.length === 0 ? (
                                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                                                <CheckCircle2 className="size-4" />
                                                <span>Tidak ada blocker kritis yang dilaporkan hari ini. Tim bergerak dengan kecepatan optimal!</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {localSynthesis.blockers_list.map((b, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-card rounded-xl border border-border p-3 flex items-start gap-3 shadow-xs"
                                                    >
                                                        <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                            !
                                                        </span>
                                                        <div className="space-y-0.5 text-xs">
                                                            <p className="font-bold text-foreground">{b.user}</p>
                                                            <p className="text-muted-foreground leading-snug">{b.blocker}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-3">
                                <Sparkles className="size-10 text-primary mx-auto" />
                                <h3 className="text-base font-bold text-foreground">Sintesis AI Belum Dijalankan</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Klik tombol 'Sintesis AI' di pojok kanan atas untuk mengekstrak ringkasan komprehensif standup hari ini.
                                </p>
                                <Button size="sm" onClick={handleSynthesizeAi} className="font-semibold gap-1.5">
                                    <Sparkles className="size-3.5" /> Jalankan Sintesis Sekarang
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: LIVE SPEAKER TIMER */}
                {activeTab === 'timer' && (
                    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="bg-card rounded-3xl border border-border p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
                            <div className="space-y-1">
                                <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                                    Live Standup Meeting Mode
                                </Badge>
                                <h2 className="text-xl font-bold text-foreground">Timer Giliran Pembicara</h2>
                                <p className="text-xs text-muted-foreground">
                                    Jaga efisiensi standup sinkron maksimal 60 detik per anggota tim.
                                </p>
                            </div>

                            {/* Circular Countdown Display */}
                            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                                <div className={cn(
                                    'w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center transition-colors shadow-inner',
                                    speakerTime > 15 ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5 animate-pulse'
                                )}>
                                    <span className="text-4xl font-black font-mono text-foreground">
                                        {speakerTime}s
                                    </span>
                                    <span className="text-[11px] font-mono text-muted-foreground">tersisa</span>
                                </div>
                            </div>

                            {/* Current Speaker Display */}
                            {currentSpeaker && (
                                <div className="bg-muted/20 rounded-2xl p-4 border border-border space-y-1">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Pembicara Aktif:</span>
                                    <h3 className="text-base font-bold text-foreground">{currentSpeaker.user.name}</h3>
                                    <p className="text-xs text-muted-foreground italic">"{currentSpeaker.today_work}"</p>
                                </div>
                            )}

                            {/* Control Buttons */}
                            <div className="flex items-center justify-center gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={resetTimer}
                                    className="gap-1.5 text-xs font-semibold"
                                >
                                    <RotateCcw className="size-3.5" /> Reset (60s)
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    className={cn(
                                        'gap-1.5 text-xs font-semibold px-6 shadow-xs',
                                        isTimerRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-primary'
                                    )}
                                >
                                    {isTimerRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                                    <span>{isTimerRunning ? 'Jeda Timer' : 'Mulai Bicara'}</span>
                                </Button>

                                <Button
                                    size="sm"
                                    onClick={nextSpeaker}
                                    className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                                >
                                    <span>Lanjut Pembicara</span>
                                    <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
