import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Filter,
    FolderKanban,
    Layers,
    PieChart,
    Search,
    Sparkles,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectLead {
    name: string;
    email: string;
    avatar?: string;
}

interface ProjectNextMilestone {
    title: string;
    target_date: string;
    is_past_due: boolean;
}

interface PortfolioProject {
    id: string;
    name: string;
    key: string;
    type: string;
    category: string;
    lead: ProjectLead;
    health: 'on_track' | 'at_risk' | 'delayed';
    risk: 'low' | 'med' | 'high';
    progress: number;
    total_tasks: number;
    completed_tasks: number;
    active_blockers: number;
    overdue_tasks: number;
    next_milestone: ProjectNextMilestone | null;
}

interface MilestoneRoadmapItem {
    id: string;
    title: string;
    project_name: string;
    project_key: string;
    target_date: string;
    is_completed: boolean;
    is_past_due: boolean;
}

interface PortfolioData {
    total_projects: number;
    on_track_count: number;
    on_track_percent: number;
    at_risk_count: number;
    at_risk_percent: number;
    delayed_count: number;
    delayed_percent: number;
    resource_utilization: Array<{ quarter: string; utilization: number }>;
    health_matrix: {
        high_risk: number;
        med_risk: number;
        low_risk: number;
    };
    projects: PortfolioProject[];
    milestones_roadmap: MilestoneRoadmapItem[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    portfolio: PortfolioData;
}

export default function PortfolioOverview({ organization, portfolio }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [healthFilter, setHealthFilter] = useState<string>('all');

    const filteredProjects = portfolio.projects.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.lead.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesHealth = healthFilter === 'all' || p.health === healthFilter;

        return matchesSearch && matchesHealth;
    });

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Portofolio Eksekutif', href: '#' },
            ]}
        >
            <Head title={`Portofolio Eksekutif - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                            STRATEGIC OVERVIEW & CROSS-PROJECT HEALTH
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Ringkasan Portofolio Eksekutif
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/timeline">
                            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
                                <Calendar className="size-3.5" />
                                <span>Timeline Roadmap</span>
                            </Button>
                        </Link>
                        <Link href="/reports">
                            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
                                <BarChart3 className="size-3.5" />
                                <span>Laporan Agile</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Top Row: KPI Cards & Resource Utilization */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {/* Left: 4 KPI Cards */}
                    <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Total Projects */}
                        <div className="bg-card rounded-2xl p-4 border border-border flex flex-col justify-between relative overflow-hidden shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono uppercase text-muted-foreground font-bold">Total Proyek</span>
                                <FolderKanban className="size-4 text-primary" />
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-bold font-mono text-foreground">{portfolio.total_projects}</div>
                                <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1 mt-1 font-mono">
                                    <TrendingUp className="size-3" /> Portofolio Aktif
                                </div>
                            </div>
                        </div>

                        {/* On Track */}
                        <div className="bg-card rounded-2xl p-4 border border-border flex flex-col justify-between relative overflow-hidden shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono uppercase text-muted-foreground font-bold">On Track</span>
                                <CheckCircle2 className="size-4 text-emerald-500" />
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-bold font-mono text-emerald-500">{portfolio.on_track_count}</div>
                                <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${portfolio.on_track_percent}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* At Risk */}
                        <div className="bg-card rounded-2xl p-4 border border-border flex flex-col justify-between relative overflow-hidden shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono uppercase text-muted-foreground font-bold">At Risk</span>
                                <AlertTriangle className="size-4 text-amber-500" />
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-bold font-mono text-amber-500">{portfolio.at_risk_count}</div>
                                <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${portfolio.at_risk_percent}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Delayed */}
                        <div className="bg-card rounded-2xl p-4 border border-border flex flex-col justify-between relative overflow-hidden shadow-xs">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono uppercase text-muted-foreground font-bold">Delayed</span>
                                <AlertCircle className="size-4 text-red-500" />
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-bold font-mono text-red-500">{portfolio.delayed_count}</div>
                                <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${portfolio.delayed_percent}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Resource Utilization Rollup */}
                    <div className="bg-card rounded-2xl p-4 border border-border flex flex-col justify-between shadow-xs">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-mono uppercase text-muted-foreground font-bold">Utilisasi Sumber Daya</span>
                            <Users className="size-4 text-primary" />
                        </div>

                        <div className="flex items-end gap-2 h-16 mt-3">
                            {portfolio.resource_utilization.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    <div
                                        className={cn(
                                            'w-full rounded-t-sm transition-all',
                                            item.utilization > 80 ? 'bg-primary' : 'bg-primary/50 group-hover:bg-primary'
                                        )}
                                        style={{ height: `${item.utilization}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground text-[10px] py-0.5 px-1.5 rounded border border-border shadow-xs pointer-events-none font-mono z-10 whitespace-nowrap">
                                        {item.quarter}: {item.utilization}%
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between w-full mt-1 text-[10px] font-mono text-muted-foreground uppercase">
                            {portfolio.resource_utilization.map((item, idx) => (
                                <span key={idx}>{item.quarter}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Split Row: Active Portfolio Table (Left) & Health Matrix / Roadmap (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left 2 Cols: Active Portfolio Table */}
                    <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden shadow-xs flex flex-col">
                        {/* Table Controls */}
                        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Layers className="size-4 text-primary" />
                                <h3 className="font-bold text-sm text-foreground">Portofolio Proyek Aktif</h3>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-48">
                                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari proyek..."
                                        className="h-8 pl-8 text-xs bg-card"
                                    />
                                </div>

                                <select
                                    value={healthFilter}
                                    onChange={(e) => setHealthFilter(e.target.value)}
                                    className="h-8 px-2 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="on_track">On Track</option>
                                    <option value="at_risk">At Risk</option>
                                    <option value="delayed">Delayed</option>
                                </select>
                            </div>
                        </div>

                        {/* Table Body */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/30 text-muted-foreground font-mono text-[10px] uppercase tracking-wider border-b border-border">
                                        <th className="py-3 px-4 font-semibold">Proyek</th>
                                        <th className="py-3 px-3 font-semibold">Lead</th>
                                        <th className="py-3 px-3 font-semibold">Kesehatan</th>
                                        <th className="py-3 px-3 font-semibold w-28">Progres</th>
                                        <th className="py-3 px-3 font-semibold">Risiko</th>
                                        <th className="py-3 px-4 font-semibold text-right">Milestone Terdekat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredProjects.length > 0 ? (
                                        filteredProjects.map((p) => (
                                            <tr
                                                key={p.id}
                                                onClick={() => router.get(`/projects/${p.id}/overview`)}
                                                className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {p.name}
                                                    </div>
                                                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                                        {p.key} • {p.category}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="size-6 rounded-full">
                                                            <AvatarImage src={p.lead.avatar} alt={p.lead.name} />
                                                            <AvatarFallback className="text-[10px] font-bold">
                                                                {p.lead.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-muted-foreground truncate max-w-[90px]">
                                                            {p.lead.name}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3">
                                                    {p.health === 'on_track' && (
                                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold gap-1">
                                                            <span className="size-1.5 rounded-full bg-emerald-500" /> On Track
                                                        </Badge>
                                                    )}
                                                    {p.health === 'at_risk' && (
                                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] font-bold gap-1">
                                                            <span className="size-1.5 rounded-full bg-amber-500" /> At Risk
                                                        </Badge>
                                                    )}
                                                    {p.health === 'delayed' && (
                                                        <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px] font-bold gap-1">
                                                            <span className="size-1.5 rounded-full bg-red-500" /> Delayed
                                                        </Badge>
                                                    )}
                                                </td>

                                                <td className="py-3 px-3">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                                                            <span>{p.completed_tasks}/{p.total_tasks}</span>
                                                            <span className="font-bold text-foreground">{p.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full',
                                                                    p.progress === 100
                                                                        ? 'bg-emerald-500'
                                                                        : p.health === 'delayed'
                                                                        ? 'bg-red-500'
                                                                        : p.health === 'at_risk'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-primary'
                                                                )}
                                                                style={{ width: `${p.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 font-mono font-semibold">
                                                    {p.risk === 'low' && <span className="text-emerald-500">Low</span>}
                                                    {p.risk === 'med' && <span className="text-amber-500">Med</span>}
                                                    {p.risk === 'high' && <span className="text-red-500">High</span>}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    {p.next_milestone ? (
                                                        <div>
                                                            <div className="font-semibold text-foreground truncate max-w-[140px] ml-auto">
                                                                {p.next_milestone.title}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    'text-[10px] font-mono mt-0.5',
                                                                    p.next_milestone.is_past_due ? 'text-red-500 font-bold' : 'text-muted-foreground'
                                                                )}
                                                            >
                                                                {p.next_milestone.target_date} {p.next_milestone.is_past_due && '(Past Due)'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px]">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                                                Tidak ada proyek yang sesuai dengan kriteria filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right 1 Col: Health Matrix & Strategic Roadmap */}
                    <div className="space-y-6">
                        {/* Health Matrix Card */}
                        <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-4">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Activity className="size-4 text-primary" /> Matriks Risiko Kesehatan
                            </h3>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                    <span className="text-[10px] font-mono text-red-500 uppercase font-bold block">Tinggi</span>
                                    <span className="text-2xl font-bold font-mono text-red-500 mt-1 block">
                                        {portfolio.health_matrix.high_risk}%
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                    <span className="text-[10px] font-mono text-amber-500 uppercase font-bold block">Sedang</span>
                                    <span className="text-2xl font-bold font-mono text-amber-500 mt-1 block">
                                        {portfolio.health_matrix.med_risk}%
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold block">Rendah</span>
                                    <span className="text-2xl font-bold font-mono text-emerald-500 mt-1 block">
                                        {portfolio.health_matrix.low_risk}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Cross-Project Strategic Roadmap */}
                        <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <Calendar className="size-4 text-primary" /> Roadmap Milestone Strategis
                                </h3>
                                <Link href="/timeline" className="text-xs text-primary hover:underline font-semibold">
                                    Timeline
                                </Link>
                            </div>

                            {portfolio.milestones_roadmap.length > 0 ? (
                                <div className="relative pl-6 space-y-5">
                                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />

                                    {portfolio.milestones_roadmap.map((m) => (
                                        <div key={m.id} className="relative group">
                                            <div
                                                className={cn(
                                                    'absolute -left-6 top-1 size-3 rounded-full border-2 bg-background',
                                                    m.is_completed
                                                        ? 'border-emerald-500 bg-emerald-500'
                                                        : m.is_past_due
                                                        ? 'border-red-500 bg-red-500'
                                                        : 'border-primary'
                                                )}
                                            />
                                            <div className="space-y-0.5">
                                                <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                                                    {m.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                                    <span className="text-muted-foreground">[{m.project_key}] {m.project_name}</span>
                                                    <span
                                                        className={cn(
                                                            'font-bold',
                                                            m.is_past_due ? 'text-red-500' : 'text-primary'
                                                        )}
                                                    >
                                                        • {m.target_date}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    Belum ada milestone strategis yang ditandai pada proyek.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
