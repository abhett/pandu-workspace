import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Bot,
    Check,
    CheckCircle2,
    Clock,
    Code,
    Filter,
    Layers,
    Play,
    Plus,
    Power,
    Settings,
    Sparkles,
    Trash2,
    Users,
    Webhook,
    Workflow,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationRule {
    id: string;
    organization_id: string;
    project_id: string | null;
    project?: { id: string; name: string; key: string };
    name: string;
    description: string | null;
    is_active: boolean;
    trigger_event: string;
    trigger_config?: Record<string, any>;
    conditions?: Array<{ field: string; operator: string; value: any }>;
    actions: Array<{ type: string; config: Record<string, any> }>;
    execution_count: number;
    last_executed_at: string | null;
    created_at: string;
}

interface AutomationLog {
    id: string;
    automation_rule_id: string;
    rule?: { id: string; name: string };
    event_name: string;
    status: 'success' | 'failed' | 'skipped';
    input_payload?: Record<string, any>;
    output_summary?: Record<string, any>;
    error_message?: string;
    executed_at: string;
}

interface Project {
    id: string;
    name: string;
    key: string;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    rules: AutomationRule[];
    recent_logs: AutomationLog[];
    projects: Project[];
}

export default function AutomationIndex({ organization, rules, recent_logs, projects }: Props) {
    const [filterProject, setFilterProject] = useState<string>('all');
    const [isToggling, setIsToggling] = useState<string | null>(null);

    const handleToggleRule = (rule: AutomationRule) => {
        setIsToggling(rule.id);
        fetch(`/automation/${rule.id}/toggle`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsToggling(null);
                router.reload();
            })
            .catch(() => setIsToggling(null));
    };

    const handleDeleteRule = (rule: AutomationRule) => {
        if (!confirm(`Hapus aturan otomasi "${rule.name}"?`)) return;

        fetch(`/automation/${rule.id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                router.reload();
            });
    };

    const filteredRules = rules.filter((r) => {
        if (filterProject === 'all') return true;
        return r.project_id === filterProject;
    });

    const getTriggerBadge = (event: string) => {
        switch (event) {
            case 'task.created':
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Tugas Dibuat</Badge>;
            case 'task.status_changed':
                return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Status Berubah</Badge>;
            case 'task.priority_changed':
                return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Prioritas Berubah</Badge>;
            case 'sprint.started':
                return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">Sprint Dimulai</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{event}</Badge>;
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Otomasi Alur Kerja', href: '#' },
            ]}
        >
            <Head title={`Otomasi Alur Kerja - ${organization.name}`} />

            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                    <div>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono font-bold">
                            WORKFLOW AUTOMATION ENGINE
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Otomasi Alur Kerja
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                        >
                            <option value="all">Semua Proyek & Global</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.key})
                                </option>
                            ))}
                        </select>

                        <Link href="/automation/create">
                            <Button className="text-xs font-semibold gap-1.5 shadow-sm">
                                <Plus className="size-4" />
                                <span>Buat Aturan Otomasi</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Preset Templates Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-2xl border border-border space-y-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Users className="size-4" />
                            </div>
                            <h3 className="font-bold text-xs text-foreground">Auto-Assign to Lead</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Otomatis tugaskan tugas baru ke Pimpinan Proyek saat tugas dibuat.
                        </p>
                        <Link href="/automation/create" className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                            Gunakan Template <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    <div className="bg-card p-4 rounded-2xl border border-border space-y-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                                <Zap className="size-4" />
                            </div>
                            <h3 className="font-bold text-xs text-foreground">Auto-Notify High Priority</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Kirim notifikasi in-app instan ke tim saat tugas Urgent dibuat.
                        </p>
                        <Link href="/automation/create" className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                            Gunakan Template <ArrowRight className="size-3" />
                        </Link>
                    </div>

                    <div className="bg-card p-4 rounded-2xl border border-border space-y-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <Webhook className="size-4" />
                            </div>
                            <h3 className="font-bold text-xs text-foreground">Sprint Webhook Trigger</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Kirim payload HTTP Webhook saat sprint baru resmi dimulai.
                        </p>
                        <Link href="/automation/create" className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
                            Gunakan Template <ArrowRight className="size-3" />
                        </Link>
                    </div>
                </div>

                {/* Rules List Section */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Aturan Otomasi Aktif ({filteredRules.length})
                    </h2>

                    {filteredRules.length > 0 ? (
                        <div className="space-y-3">
                            {filteredRules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={cn(
                                        'bg-card rounded-2xl border p-5 shadow-xs transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4',
                                        rule.is_active ? 'border-border' : 'border-border/40 opacity-60 bg-muted/10'
                                    )}
                                >
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h3 className="font-bold text-sm text-foreground">{rule.name}</h3>
                                            {getTriggerBadge(rule.trigger_event)}
                                            {rule.project ? (
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    Proyek: {rule.project.name}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                                                    Global Organisasi
                                                </Badge>
                                            )}
                                        </div>

                                        {rule.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{rule.description}</p>
                                        )}

                                        {/* Actions Badges */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-muted-foreground">
                                            <span className="font-mono font-semibold">Aksi:</span>
                                            {rule.actions.map((act, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono text-[10px]">
                                                    {act.type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons & Counters */}
                                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                        <div className="text-right font-mono text-xs pr-2 hidden md:block">
                                            <span className="text-muted-foreground text-[10px] block uppercase">Eksekusi</span>
                                            <span className="font-bold text-foreground">{rule.execution_count}x</span>
                                        </div>

                                        {/* Active Toggle Switch */}
                                        <button
                                            onClick={() => handleToggleRule(rule)}
                                            disabled={isToggling === rule.id}
                                            className={cn(
                                                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                                                rule.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : 'bg-muted text-muted-foreground border-border'
                                            )}
                                        >
                                            <Power className="size-3.5" />
                                            <span>{rule.is_active ? 'Aktif' : 'Non-aktif'}</span>
                                        </button>

                                        <Link href={`/automation/${rule.id}/edit`}>
                                            <Button variant="outline" size="sm" className="text-xs gap-1">
                                                <Settings className="size-3.5" />
                                                <span>Edit</span>
                                            </Button>
                                        </Link>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteRule(rule)}
                                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border border-border p-12 text-center space-y-4">
                            <Workflow className="size-10 text-muted-foreground mx-auto" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm text-foreground">Belum ada aturan otomasi</h3>
                                <p className="text-xs text-muted-foreground">
                                    Mulai buat aturan alur kerja otomatis untuk menghemat waktu dan menyederhanakan proses tim.
                                </p>
                            </div>
                            <Link href="/automation/create">
                                <Button className="text-xs font-semibold gap-1.5">
                                    <Plus className="size-4" />
                                    <span>Buat Aturan Pertama</span>
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Execution History Section */}
                {recent_logs.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <Clock className="size-4 text-primary" /> Riwayat Eksekusi Terakhir
                        </h3>

                        <div className="divide-y divide-border/60 text-xs">
                            {recent_logs.map((log) => (
                                <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {log.status === 'success' ? (
                                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                                        ) : log.status === 'skipped' ? (
                                            <Activity className="size-4 text-muted-foreground shrink-0" />
                                        ) : (
                                            <AlertCircle className="size-4 text-red-500 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <span className="font-semibold text-foreground truncate block">
                                                {log.rule?.name || 'Aturan Otomasi'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                Event: {log.event_name}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge
                                            className={cn(
                                                'text-[10px] uppercase font-mono',
                                                log.status === 'success'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                    : log.status === 'skipped'
                                                    ? 'bg-muted text-muted-foreground'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                            )}
                                        >
                                            {log.status}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {new Date(log.executed_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
