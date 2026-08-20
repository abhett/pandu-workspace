import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    HeartHandshake,
    Smile,
    Flame,
    Zap,
    Users,
    Shield,
    Activity,
    Plus,
    Calendar,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Target,
    Trophy,
    Sparkles,
    BookOpen,
    HelpCircle,
    Bug,
    Shuffle,
    TrendingUp,
    MessageSquare,
    Check,
    Trash2,
    BarChart3,
    Heart,
} from 'lucide-react';

interface Organization {
    id: string;
    name: string;
}

interface MyTodayPulse {
    id: string;
    mood_score: number;
    energy_level: number;
    workload_feeling: string;
    tags: string[];
    notes: string | null;
    is_anonymous: boolean;
}

interface PulseFeedItem {
    id: string;
    mood_score: number;
    energy_level: number;
    workload_feeling: string;
    tags: string[];
    notes: string | null;
    is_anonymous: boolean;
    author: {
        name: string;
        avatar: string | null;
    };
    pulse_date: string;
    created_at: string;
}

interface DailyTrendItem {
    date: string;
    label: string;
    avg_mood: number | null;
    avg_energy: number | null;
    checkin_count: number;
}

interface WellnessInitiativeItem {
    id: string;
    title: string;
    category: string;
    status: string;
    impact_summary: string | null;
    target_date: string | null;
    creator: {
        id: number;
        name: string;
        avatar: string | null;
    };
    created_at: string;
}

interface TagItem {
    key: string;
    label: string;
    icon: string;
}

interface Props {
    organization: Organization;
    range: string;
    my_today_pulse: MyTodayPulse | null;
    metrics: {
        today_avg_mood: number;
        today_checkins: number;
        total_members: number;
        participation_rate: number;
        period_avg_mood: number;
        period_avg_energy: number;
        burnout_risk_rate: number;
        total_submissions: number;
    };
    distributions: {
        mood: Record<number, number>;
        workload: Record<string, number>;
    };
    tag_frequency: Record<string, number>;
    tag_catalog: {
        positives: TagItem[];
        frictions: TagItem[];
    };
    daily_trends: DailyTrendItem[];
    recent_feed: PulseFeedItem[];
    initiatives: WellnessInitiativeItem[];
}

const MOOD_EMOJIS = [
    { score: 1, emoji: '😫', label: 'Lelah / Kritis', desc: 'Exhausted & Overwhelmed', color: 'rose' },
    { score: 2, emoji: '😕', label: 'Kurang Baik', desc: 'Stressed & Under Pressure', color: 'amber' },
    { score: 3, emoji: '😐', label: 'Biasa Saja', desc: 'Neutral & Steady', color: 'blue' },
    { score: 4, emoji: '😊', label: 'Baik & Senang', desc: 'Good & Motivated', color: 'emerald' },
    { score: 5, emoji: '🚀', label: 'Luar Biasa', desc: 'Energized & Focused', color: 'purple' },
];

export default function TeamMoodPulseIndex({
    organization,
    range,
    my_today_pulse,
    metrics,
    distributions,
    tag_frequency,
    tag_catalog,
    daily_trends,
    recent_feed,
    initiatives,
}: Props) {
    const [activeTab, setActiveTab] = useState<'radar' | 'feed' | 'initiatives'>('radar');
    const [isEditingCheckIn, setIsEditingCheckIn] = useState(!my_today_pulse);

    // Check-in form state
    const [selectedMood, setSelectedMood] = useState<number>(my_today_pulse?.mood_score || 4);
    const [selectedEnergy, setSelectedEnergy] = useState<number>(my_today_pulse?.energy_level || 4);
    const [selectedWorkload, setSelectedWorkload] = useState<string>(my_today_pulse?.workload_feeling || 'manageable');
    const [selectedTags, setSelectedTags] = useState<string[]>(my_today_pulse?.tags || []);
    const [reflectionNotes, setReflectionNotes] = useState<string>(my_today_pulse?.notes || '');
    const [isAnonymous, setIsAnonymous] = useState<boolean>(my_today_pulse?.is_anonymous || false);
    const [isSubmittingPulse, setIsSubmittingPulse] = useState(false);

    // Initiative modal
    const [initiativeModalOpen, setInitiativeModalOpen] = useState(false);
    const [initiativeTitle, setInitiativeTitle] = useState('');
    const [initiativeCategory, setInitiativeCategory] = useState('workload_adjustment');
    const [initiativeImpact, setInitiativeImpact] = useState('');
    const [initiativeTargetDate, setInitiativeTargetDate] = useState('');
    const [isSubmittingInitiative, setIsSubmittingInitiative] = useState(false);

    const handleRangeChange = (newRange: string) => {
        router.get('/organization/pulse', { range: newRange }, { preserveState: true });
    };

    const handleToggleTag = (tagKey: string) => {
        if (selectedTags.includes(tagKey)) {
            setSelectedTags(selectedTags.filter((t) => t !== tagKey));
        } else {
            setSelectedTags([...selectedTags, tagKey]);
        }
    };

    const handleSubmitCheckIn = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingPulse(true);

        fetch('/organization/pulse/check-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                mood_score: selectedMood,
                energy_level: selectedEnergy,
                workload_feeling: selectedWorkload,
                tags: selectedTags,
                notes: reflectionNotes || null,
                is_anonymous: isAnonymous,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingPulse(false);
                setIsEditingCheckIn(false);
                router.reload();
            })
            .catch(() => setIsSubmittingPulse(false));
    };

    const handleCreateInitiative = (e: React.FormEvent) => {
        e.preventDefault();
        if (!initiativeTitle.trim()) return;
        setIsSubmittingInitiative(true);

        fetch('/organization/pulse/initiatives', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                title: initiativeTitle,
                category: initiativeCategory,
                impact_summary: initiativeImpact || null,
                target_date: initiativeTargetDate || null,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingInitiative(false);
                setInitiativeModalOpen(false);
                setInitiativeTitle('');
                setInitiativeImpact('');
                setInitiativeTargetDate('');
                router.reload();
            })
            .catch(() => setIsSubmittingInitiative(false));
    };

    const handleDeleteInitiative = (id: string) => {
        fetch(`/organization/pulse/initiatives/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const getMoodEmojiInfo = (score: number) => {
        return MOOD_EMOJIS.find((m) => m.score === score) || MOOD_EMOJIS[2];
    };

    return (
        <AppLayout>
            <Head title="Radar Kesehatan & Mood Tim - Pandu" />

            <div className="space-y-6 pb-16">
                {/* Header Title & Range Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-sm">
                                <HeartHandshake className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Radar Kesehatan, Mood & Daily Pulse Tim
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Deteksi dini risiko burnout, tren energi kerja, dan inisiatif kesejahteraan agile organisasi
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs font-semibold">
                            {['7d', '14d', '30d'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => handleRangeChange(r)}
                                    className={`px-3 py-1 rounded-lg uppercase transition-all ${
                                        range === r
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {r === '7d' ? '7 Hari' : r === '14d' ? '14 Hari' : '30 Hari'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bento KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Mood Tim Hari Ini</span>
                            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                <Smile className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.today_avg_mood > 0 ? `${metrics.today_avg_mood} / 5.0` : 'N/A'}
                            </span>
                            {metrics.today_avg_mood > 0 && (
                                <span className="text-lg">
                                    {getMoodEmojiInfo(Math.round(metrics.today_avg_mood)).emoji}
                                </span>
                            )}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.today_checkins} dari {metrics.total_members} anggota telah check-in
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Level Energi</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.period_avg_energy > 0 ? `${metrics.period_avg_energy} / 5.0` : 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground">Stamina Kerja</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Rata-rata energi dalam periode {range}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Indeks Risiko Burnout</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span
                                className={`text-2xl font-bold tracking-tight font-mono ${
                                    metrics.burnout_risk_rate > 25
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : metrics.burnout_risk_rate > 10
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                            >
                                {metrics.burnout_risk_rate}%
                            </span>
                            <Badge
                                className={`text-[10px] ${
                                    metrics.burnout_risk_rate > 25
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                        : metrics.burnout_risk_rate > 10
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                }`}
                            >
                                {metrics.burnout_risk_rate > 25
                                    ? 'Perhatian Diperlukan'
                                    : metrics.burnout_risk_rate > 10
                                    ? 'Waspada'
                                    : 'Aman & Seimbang'}
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Persentase laporan kelelahan atau beban berlebih
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Partisipasi</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.participation_rate}%
                            </span>
                            <span className="text-xs text-muted-foreground">Hari Ini</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.total_submissions} total respon terkumpul ({range})
                        </div>
                    </div>
                </div>

                {/* Interactive Daily Pulse Check-In Hero Card */}
                <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Smile className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Check-In Mood & Refleksi Harian Anda
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Bagikan perasaan dan kondisi kerja Anda hari ini dalam 30 detik
                                </p>
                            </div>
                        </div>

                        {my_today_pulse && !isEditingCheckIn && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingCheckIn(true)}
                                className="text-xs h-8"
                            >
                                <span>Perbarui Refleksi Hari Ini</span>
                            </Button>
                        )}
                    </div>

                    {!isEditingCheckIn && my_today_pulse ? (
                        <div className="bg-muted/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">{getMoodEmojiInfo(my_today_pulse.mood_score).emoji}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">
                                            {getMoodEmojiInfo(my_today_pulse.mood_score).label}
                                        </span>
                                        <Badge variant="outline" className="text-[10px]">
                                            Energi: {my_today_pulse.energy_level}/5 ⚡
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] capitalize">
                                            Beban: {my_today_pulse.workload_feeling}
                                        </Badge>
                                        {my_today_pulse.is_anonymous && (
                                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">
                                                <Shield className="h-3 w-3 mr-1" />
                                                Anonim
                                            </Badge>
                                        )}
                                    </div>
                                    {my_today_pulse.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                            "{my_today_pulse.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                {my_today_pulse.tags.map((t) => (
                                    <Badge key={t} variant="secondary" className="text-[10px]">
                                        #{t}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitCheckIn} className="space-y-5">
                            {/* Mood Selection */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-2.5">
                                    1. Bagaimana suasana hati (mood) Anda hari ini?
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                    {MOOD_EMOJIS.map((m) => (
                                        <button
                                            key={m.score}
                                            type="button"
                                            onClick={() => setSelectedMood(m.score)}
                                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                                                selectedMood === m.score
                                                    ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40'
                                                    : 'border-border bg-card hover:bg-muted/40'
                                            }`}
                                        >
                                            <span className="text-3xl">{m.emoji}</span>
                                            <span className="font-bold text-xs text-foreground mt-1">{m.label}</span>
                                            <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Energy & Workload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl border border-border bg-card">
                                    <label className="text-xs font-semibold text-foreground block mb-2">
                                        2. Level Energi Stamina (1 - 5)
                                    </label>
                                    <div className="flex items-center justify-between gap-2">
                                        {[1, 2, 3, 4, 5].map((lvl) => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => setSelectedEnergy(lvl)}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                                                    selectedEnergy === lvl
                                                        ? 'bg-amber-500 text-white shadow-xs'
                                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                                }`}
                                            >
                                                {lvl} ⚡
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-border bg-card">
                                    <label className="text-xs font-semibold text-foreground block mb-2">
                                        3. Bagaimana perasaan Anda terhadap beban kerja saat ini?
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { key: 'underworked', label: 'Ringan' },
                                            { key: 'manageable', label: 'Terkendali' },
                                            { key: 'heavy', label: 'Cukup Berat' },
                                            { key: 'overwhelmed', label: 'Kewalahan' },
                                        ].map((w) => (
                                            <button
                                                key={w.key}
                                                type="button"
                                                onClick={() => setSelectedWorkload(w.key)}
                                                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                                                    selectedWorkload === w.key
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                                }`}
                                            >
                                                {w.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tag Selection */}
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-2">
                                    4. Faktor yang mempengaruhi kondisi Anda hari ini (Pilih yang relevan):
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mr-1">
                                            Positif:
                                        </span>
                                        {tag_catalog.positives.map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => handleToggleTag(t.key)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    selectedTags.includes(t.key)
                                                        ? 'bg-emerald-500 text-white font-semibold'
                                                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                                                }`}
                                            >
                                                + {t.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mr-1">
                                            Tantangan:
                                        </span>
                                        {tag_catalog.frictions.map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => handleToggleTag(t.key)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    selectedTags.includes(t.key)
                                                        ? 'bg-rose-500 text-white font-semibold'
                                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                                                }`}
                                            >
                                                + {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Reflection Notes & Anonymous Toggle */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                                        5. Catatan Refleksi / Konteks Tambahan (Opsional)
                                    </label>
                                    <Textarea
                                        placeholder="Apa yang membuat hari Anda terasa baik atau apa yang bisa dibantu rekan tim?"
                                        value={reflectionNotes}
                                        onChange={(e) => setReflectionNotes(e.target.value)}
                                        className="text-xs min-h-[60px]"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="pulseAnonymous"
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <label htmlFor="pulseAnonymous" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Kirim sebagai masukan anonim (Nama tidak ditampilkan di feed)</span>
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {my_today_pulse && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditingCheckIn(false)}
                                                className="text-xs"
                                            >
                                                Batal
                                            </Button>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={isSubmittingPulse}
                                            className="bg-primary text-primary-foreground text-xs font-semibold"
                                        >
                                            {isSubmittingPulse ? 'Menyimpan...' : 'Simpan Check-In Mood'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('radar')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'radar'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            <span>Radar Kesehatan & Tren Harian</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'feed'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span>Feed Refleksi Tim ({recent_feed.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('initiatives')}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'initiatives'
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Target className="h-4 w-4" />
                            <span>Inisiatif Kesejahteraan ({initiatives.length})</span>
                        </button>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => setInitiativeModalOpen(true)}
                        className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Inisiatif Kesejahteraan Baru</span>
                    </Button>
                </div>

                {/* TAB 1: Radar & Analytics */}
                {activeTab === 'radar' && (
                    <div className="space-y-6">
                        {/* Daily Historical Trend Timeline */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <span>Riwayat Tren Mood & Energi Harian ({range})</span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 mb-6">
                                Fluktuasi skor mood rata-rata harian organisasi dari waktu ke waktu
                            </p>

                            <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
                                {daily_trends.map((day) => (
                                    <div
                                        key={day.date}
                                        className="flex flex-col items-center justify-end p-2.5 rounded-xl border border-border bg-muted/20 min-h-[140px] text-center"
                                    >
                                        {day.avg_mood !== null ? (
                                            <>
                                                <span className="text-xl mb-1">
                                                    {getMoodEmojiInfo(Math.round(day.avg_mood)).emoji}
                                                </span>
                                                <div
                                                    className="w-full bg-primary/80 rounded-lg transition-all"
                                                    style={{ height: `${(day.avg_mood / 5) * 50}px` }}
                                                />
                                                <span className="text-[11px] font-bold font-mono mt-1 text-foreground">
                                                    {day.avg_mood}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground font-mono">
                                                    {day.checkin_count} respon
                                                </span>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground/50">
                                                -
                                            </div>
                                        )}
                                        <span className="text-[10px] font-semibold text-muted-foreground mt-2 border-t border-border/50 pt-1 w-full truncate">
                                            {day.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Breakdown Distributions & Tags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Mood & Workload Distribution */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                    <span>Distribusi Mood & Persepsi Beban</span>
                                </h3>

                                <div className="mt-4 space-y-3 text-xs">
                                    <div className="font-semibold text-muted-foreground mb-1">Distribusi Skor Mood:</div>
                                    {MOOD_EMOJIS.map((m) => {
                                        const count = distributions.mood[m.score] || 0;
                                        const pct = metrics.total_submissions > 0
                                            ? Math.round((count / metrics.total_submissions) * 100)
                                            : 0;

                                        return (
                                            <div key={m.score} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="flex items-center gap-1.5">
                                                        <span>{m.emoji}</span>
                                                        <span className="font-medium">{m.label}</span>
                                                    </span>
                                                    <span className="font-mono text-muted-foreground">
                                                        {count} ({pct}%)
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Factors & Tags Frequency */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <span>Faktor Pendorong & Friksi Terpopuler</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                                    Frekuensi faktor yang paling sering dilaporkan oleh tim
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(tag_frequency).length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">Belum ada tag yang dilaporkan.</p>
                                    ) : (
                                        Object.entries(tag_frequency).map(([tagKey, count]) => (
                                            <div
                                                key={tagKey}
                                                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-xs font-semibold flex items-center gap-2"
                                            >
                                                <span className="text-foreground">#{tagKey}</span>
                                                <Badge className="text-[10px] font-mono px-1.5 py-0 bg-primary text-primary-foreground">
                                                    {count}x
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Feed of Reflections */}
                {activeTab === 'feed' && (
                    <div className="space-y-4">
                        {recent_feed.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                                <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-foreground">Belum Ada Refleksi Terkumpul</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                                    Lakukan check-in mood harian dengan mengisi catatan atau tag untuk memulai feed tim.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recent_feed.map((feed) => (
                                    <div
                                        key={feed.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="text-3xl">
                                                    {getMoodEmojiInfo(feed.mood_score).emoji}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-foreground">
                                                            {feed.author.name}
                                                        </span>
                                                        {feed.is_anonymous && (
                                                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[9px]">
                                                                <Shield className="h-2.5 w-2.5 mr-0.5" />
                                                                Anonim
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {feed.pulse_date} • Energi: {feed.energy_level}/5 ⚡ • Beban: {feed.workload_feeling}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {feed.notes && (
                                            <p className="text-xs text-foreground bg-muted/20 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                                                "{feed.notes}"
                                            </p>
                                        )}

                                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                            {feed.tags.map((t) => (
                                                <Badge key={t} variant="secondary" className="text-[10px]">
                                                    #{t}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: Wellness Action Initiatives */}
                {activeTab === 'initiatives' && (
                    <div className="space-y-4">
                        {initiatives.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
                                <Target className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                                <h3 className="text-sm font-bold text-foreground">Belum Ada Inisiatif Kesejahteraan</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                    Luncurkan program kesejahteraan tim (misal: Focus Time, No-Meeting Friday, Workload Rebalancing) untuk meningkatkan produktivitas dan moral tim.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => setInitiativeModalOpen(true)}
                                    className="text-xs gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Buat Inisiatif Pertama</span>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {initiatives.map((init) => (
                                    <div
                                        key={init.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                                    {init.category.replace('_', ' ')}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {init.status}
                                                </Badge>
                                            </div>

                                            <h4 className="font-bold text-sm text-foreground mt-3">
                                                {init.title}
                                            </h4>

                                            {init.impact_summary && (
                                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                                    {init.impact_summary}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Oleh: {init.creator?.name || 'Admin'}</span>
                                            <button
                                                onClick={() => handleDeleteInitiative(init.id)}
                                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Inisiatif Kesejahteraan Baru */}
            <Dialog open={initiativeModalOpen} onOpenChange={setInitiativeModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span>Buat Inisiatif Kesejahteraan Tim</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Luncurkan program atau penyesuaian kerja untuk menjaga moral dan kesehatan tim.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateInitiative} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Inisiatif *
                            </label>
                            <Input
                                placeholder="Contoh: No-Meeting Friday Afternoon Focus Time"
                                value={initiativeTitle}
                                onChange={(e) => setInitiativeTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Kategori Program
                                </label>
                                <Select value={initiativeCategory} onValueChange={setInitiativeCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="workload_adjustment">Penyesuaian Beban Kerja</SelectItem>
                                        <SelectItem value="no_meeting_day">Hari Bebas Rapat (Focus Day)</SelectItem>
                                        <SelectItem value="team_building">Aktivitas Bonding & Rekreasi</SelectItem>
                                        <SelectItem value="training_wellness">Sesi Edukasi & Kesehatan Mental</SelectItem>
                                        <SelectItem value="process_simplification">Penyederhanaan Alur Kerja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Tanggal Implementasi
                                </label>
                                <Input
                                    type="date"
                                    value={initiativeTargetDate}
                                    onChange={(e) => setInitiativeTargetDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Dampak yang Diharapkan / Rencana Pelaksanaan
                            </label>
                            <Textarea
                                placeholder="Jelaskan bagaimana inisiatif ini akan membantu tim..."
                                value={initiativeImpact}
                                onChange={(e) => setInitiativeImpact(e.target.value)}
                                className="text-xs min-h-[70px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setInitiativeModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingInitiative}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSubmittingInitiative ? 'Menyimpan...' : 'Luncurkan Inisiatif'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
