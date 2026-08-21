import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Brain,
    Clock,
    Zap,
    AlertTriangle,
    Flame,
    CheckCircle2,
    Calendar,
    Users,
    Activity,
    Layers,
    Coffee,
    Smile,
    Frown,
    Meh,
    Sparkles,
    Check,
    Eye,
    Shield,
} from 'lucide-react';

interface DeveloperRadarItem {
    user_id: number;
    name: string;
    email: string;
    deep_work_hours: number;
    context_switches: number;
    active_wip_tasks: number;
    burnout_risk_score: number;
    burnout_risk_level: 'low' | 'moderate' | 'high' | 'critical';
}

interface TrendItem {
    date: string;
    deep_work_hours: number;
    meeting_hours: number;
    context_switches: number;
}

interface RecommendationItem {
    id: string;
    type: 'no_meeting_block' | 'wip_limit_alert' | 'async_standup_shift' | 'batch_pr_review';
    title: string;
    description: string;
    suggested_schedule: string | null;
    status: 'active' | 'acknowledged' | 'applied';
    user_name: string | null;
    created_at_formatted: string;
}

interface Metrics {
    avg_deep_work_hours: number;
    avg_context_switches: number;
    team_burnout_risk_score: number;
    meeting_fragmentation_ratio: number;
    active_focus_blocks_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    dailyTrend: TrendItem[];
    developerRadar: DeveloperRadarItem[];
    recommendations: RecommendationItem[];
    members: Array<{ id: number; name: string; email: string }>;
    selectedUserId: number | null;
}

export default function DeveloperFocusPage({
    organization,
    metrics,
    dailyTrend,
    developerRadar,
    recommendations,
    members,
    selectedUserId,
}: Props) {
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const handleSelectMember = (userIdStr: string) => {
        const params = new URLSearchParams();
        if (userIdStr !== 'all') params.append('user_id', userIdStr);
        router.get(`/organization/productivity/focus?${params.toString()}`);
    };

    const handleApplyRecommendation = (rec: RecommendationItem) => {
        setActionLoadingId(rec.id);
        fetch(`/organization/productivity/focus/recommendations/${rec.id}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const handleAcknowledgeRecommendation = (rec: RecommendationItem) => {
        setActionLoadingId(rec.id);
        fetch(`/organization/productivity/focus/recommendations/${rec.id}/acknowledge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const renderBurnoutBadge = (level: string, score: number) => {
        switch (level) {
            case 'critical':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Flame className="h-3 w-3" />
                        <span>Kritis ({score}%)</span>
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Tinggi ({score}%)</span>
                    </Badge>
                );
            case 'moderate':
                return (
                    <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-[10px] gap-1 font-mono uppercase">
                        <Meh className="h-3 w-3" />
                        <span>Sedang ({score}%)</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-mono uppercase">
                        <Smile className="h-3 w-3" />
                        <span>Sehat ({score}%)</span>
                    </Badge>
                );
        }
    };

    const renderRecTypeBadge = (type: string) => {
        switch (type) {
            case 'no_meeting_block':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">No-Meeting Block</Badge>;
            case 'wip_limit_alert':
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">WIP Limit Rule</Badge>;
            case 'batch_pr_review':
                return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]">Batch PR Review</Badge>;
            default:
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">Async Standup Shift</Badge>;
        }
    };

    return (
        <AppLayout>
            <Head title="Developer Focus & Context Switching Radar" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Developer Focus & Context Switching Radar
                                </h1>
                                <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/30 text-xs font-mono">
                                    Cognitive Health
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Analisis beban kognitif developer, fragmentasi jam meeting vs deep work, dan indeks pencegahan burnout tim
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Select
                            value={selectedUserId ? selectedUserId.toString() : 'all'}
                            onValueChange={handleSelectMember}
                        >
                            <SelectTrigger className="h-9 text-xs w-48">
                                <SelectValue placeholder="Seluruh Tim Rekayasa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">👥 Seluruh Tim Rekayasa</SelectItem>
                                {members.map((m) => (
                                    <SelectItem key={m.id} value={m.id.toString()}>
                                        👤 {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Deep Work Hours */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rata-rata Deep Work Harian</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_deep_work_hours}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">jam / hari</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Waktu fokus tanpa interupsi meeting &gt;90 menit
                        </div>
                    </div>

                    {/* Context Switches */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Frekuensi Context Switching</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.avg_context_switches}x
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ hari</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Pergantian konteks antara PR, bug, dan task
                        </div>
                    </div>

                    {/* Team Burnout Risk */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Indeks Risiko Burnout</span>
                            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <Brain className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.team_burnout_risk_score}
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Beban Sehat
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Skor gabungan lembur, WIP, & fragmentasi
                        </div>
                    </div>

                    {/* Meeting Fragmentation Ratio */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Rasio Fragmentasi Meeting</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.meeting_fragmentation_ratio}%
                            </span>
                            <span className="text-xs text-muted-foreground">dari jam kerja</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Terbagi menjadi micro-interval &lt;30 menit
                        </div>
                    </div>
                </div>

                {/* 14-day Trend Visualizer */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground">
                                Tren Keseimbangan Waktu Kerja Developer (14 Hari Terakhir)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Perbandingan proporsi jam Deep Work (Hijau) versus Meeting & Interupsi (Ungu)
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                                <span>Deep Work (Jam)</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                                <span>Meeting (Jam)</span>
                            </span>
                        </div>
                    </div>

                    {/* Visual Bar Chart */}
                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2 items-end h-44">
                        {dailyTrend.map((item, idx) => {
                            const deepHeight = Math.min(100, Math.max(15, (item.deep_work_hours / 8) * 100));
                            const meetHeight = Math.min(100, Math.max(10, (item.meeting_hours / 8) * 100));
                            return (
                                <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                                    <div className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.deep_work_hours}j
                                    </div>
                                    <div className="w-full flex items-end gap-0.5 h-32 justify-center">
                                        <div
                                            style={{ height: `${deepHeight}%` }}
                                            className="w-1/2 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all"
                                            title={`${item.date}: ${item.deep_work_hours} jam Deep Work`}
                                        />
                                        <div
                                            style={{ height: `${meetHeight}%` }}
                                            className="w-1/2 bg-purple-500/70 rounded-t-md hover:bg-purple-600 transition-all"
                                            title={`${item.date}: ${item.meeting_hours} jam Meeting`}
                                        />
                                    </div>
                                    <div className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                                        {item.date}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Developer Cognitive Health Radar Table & Focus Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Team Cognitive Health Radar (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-violet-600" />
                                    <h3 className="font-bold text-sm text-foreground">
                                        Radar Beban Kognitif Anggota Tim ({developerRadar.length})
                                    </h3>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                            <th className="p-3.5">Developer</th>
                                            <th className="p-3.5">Deep Work (Rata-rata)</th>
                                            <th className="p-3.5">Context Switches</th>
                                            <th className="p-3.5">WIP Tasks</th>
                                            <th className="p-3.5">Risiko Burnout</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {developerRadar.map((dev) => (
                                            <tr key={dev.user_id} className="hover:bg-muted/10 transition-colors">
                                                <td className="p-3.5">
                                                    <div className="font-bold text-foreground">{dev.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">{dev.email}</div>
                                                </td>
                                                <td className="p-3.5 font-mono">
                                                    <span className="font-semibold text-emerald-600">
                                                        {dev.deep_work_hours} jam
                                                    </span>
                                                    <span className="text-muted-foreground">/hari</span>
                                                </td>
                                                <td className="p-3.5 font-mono text-muted-foreground">
                                                    {dev.context_switches}x per hari
                                                </td>
                                                <td className="p-3.5 font-mono">
                                                    <span className={`px-2 py-0.5 rounded font-semibold ${dev.active_wip_tasks > 4 ? 'bg-rose-500/20 text-rose-600' : 'bg-muted text-foreground'}`}>
                                                        {dev.active_wip_tasks} Tasks
                                                    </span>
                                                </td>
                                                <td className="p-3.5">
                                                    {renderBurnoutBadge(dev.burnout_risk_level, dev.burnout_risk_score)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Focus Time Recommendations (5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-600" />
                                <h3 className="font-bold text-sm text-foreground">
                                    Rekomendasi Optimasi Jam Fokus ({recommendations.length})
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {recommendations.map((rec) => (
                                <div
                                    key={rec.id}
                                    className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        {renderRecTypeBadge(rec.type)}
                                        <span className="text-[10px] font-mono text-muted-foreground capitalize">
                                            Status: {rec.status}
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-xs text-foreground">
                                        {rec.title}
                                    </h4>

                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {rec.description}
                                    </p>

                                    {rec.suggested_schedule && (
                                        <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
                                            📅 <span className="font-semibold text-foreground">{rec.suggested_schedule}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                                        {rec.status === 'active' ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionLoadingId === rec.id}
                                                    onClick={() => handleAcknowledgeRecommendation(rec)}
                                                    className="h-6 text-[10px] px-2 gap-1"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    <span>Mengerti</span>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    disabled={actionLoadingId === rec.id}
                                                    onClick={() => handleApplyRecommendation(rec)}
                                                    className="h-6 text-[10px] px-2 gap-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                                                >
                                                    <Check className="h-3 w-3" />
                                                    <span>Terapkan Blok Fokus</span>
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px]">
                                                {rec.status === 'applied' ? '✅ Diterapkan' : 'Dikonfirmasi'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
