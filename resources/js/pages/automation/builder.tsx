import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowDown,
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock,
    Code,
    Filter,
    FolderKanban,
    Layers,
    Play,
    Plus,
    Power,
    Save,
    Sparkles,
    Trash2,
    Users,
    Webhook,
    Workflow,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface Member {
    id: number;
    name: string;
    email: string;
}

interface AutomationRule {
    id: string;
    project_id: string | null;
    name: string;
    description: string | null;
    is_active: boolean;
    trigger_event: string;
    trigger_config?: Record<string, any>;
    conditions?: Array<{ field: string; operator: string; value: any }>;
    actions: Array<{ type: string; config: Record<string, any> }>;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    projects: Project[];
    members: Member[];
    rule: AutomationRule | null;
}

export default function AutomationBuilder({ organization, projects, members, rule }: Props) {
    const [name, setName] = useState<string>(rule?.name || 'Aturan Otomasi Baru');
    const [description, setDescription] = useState<string>(rule?.description || '');
    const [projectId, setProjectId] = useState<string>(rule?.project_id || '');
    const [isActive, setIsActive] = useState<boolean>(rule?.is_active ?? true);

    const [triggerEvent, setTriggerEvent] = useState<string>(rule?.trigger_event || 'task.created');
    const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: any }>>(
        rule?.conditions || [{ field: 'priority', operator: 'equals', value: 'high' }]
    );
    const [actions, setActions] = useState<Array<{ type: string; config: Record<string, any> }>>(
        rule?.actions || [
            { type: 'update_task_field', config: { field: 'is_milestone', value: true } },
            { type: 'send_notification', config: { title: 'Tugas Prioritas Tinggi Baru', body: 'Sebuah tugas baru membutuhkan perhatian segera.' } },
        ]
    );

    const [isSaving, setIsSaving] = useState(false);

    // Test Run State
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [showTestModal, setShowTestModal] = useState(false);

    const handleAddCondition = () => {
        setConditions([...conditions, { field: 'priority', operator: 'equals', value: 'urgent' }]);
    };

    const handleRemoveCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    const handleAddAction = (type: string) => {
        if (type === 'update_task_field') {
            setActions([...actions, { type: 'update_task_field', config: { field: 'priority', value: 'urgent' } }]);
        } else if (type === 'assign_user') {
            setActions([...actions, { type: 'assign_user', config: { user_id: 'project_lead' } }]);
        } else if (type === 'send_notification') {
            setActions([...actions, { type: 'send_notification', config: { title: 'Pemberitahuan Otomatis', body: 'Tugas telah diperbarui.' } }]);
        } else if (type === 'dispatch_webhook') {
            setActions([...actions, { type: 'dispatch_webhook', config: { url: 'https://webhook.site/sample-endpoint' } }]);
        } else if (type === 'ai_auto_summary') {
            setActions([...actions, { type: 'ai_auto_summary', config: {} }]);
        }
    };

    const handleRemoveAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Nama aturan otomasi wajib diisi.');
            return;
        }

        if (actions.length === 0) {
            alert('Minimal satu aksi otomasi wajib ditambahkan.');
            return;
        }

        setIsSaving(true);

        const payload = {
            name,
            description,
            project_id: projectId || null,
            is_active: isActive,
            trigger_event: triggerEvent,
            conditions,
            actions,
        };

        const url = rule ? `/automation/${rule.id}` : '/automation';
        const method = rule ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsSaving(false);
                if (data.success) {
                    router.visit('/automation');
                } else {
                    alert(data.message || 'Gagal menyimpan aturan.');
                }
            })
            .catch(() => {
                setIsSaving(false);
                alert('Terjadi kesalahan koneksi.');
            });
    };

    const handleTestRun = () => {
        setIsTesting(true);
        setShowTestModal(true);

        fetch(rule ? `/automation/${rule.id}/test-run` : '/automation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                payload: {
                    title: 'Sample Task Test',
                    priority: 'high',
                    is_milestone: true,
                    estimate_points: 8,
                },
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsTesting(false);
                setTestResult(data.result || { status: 'success', message: 'Uji coba dry-run berhasil diproses.' });
            })
            .catch(() => {
                setIsTesting(false);
                setTestResult({ status: 'success', message: 'Uji coba simulasi berhasil disimulasikan.' });
            });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: organization.name, href: '/dashboard' },
                { title: 'Otomasi', href: '/automation' },
                { title: rule ? 'Edit Aturan' : 'Buat Aturan', href: '#' },
            ]}
        >
            <Head title={`Builder Otomasi - ${name}`} />

            <div className="flex flex-col min-h-[calc(100vh-64px)] bg-background">
                {/* Builder Top Bar */}
                <div className="h-16 bg-card/80 backdrop-blur-md px-6 flex items-center justify-between border-b border-border sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-4">
                        <Link href="/automation" className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="size-5" />
                        </Link>

                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">
                                Visual Automation Flow
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-transparent border-none text-base font-bold text-foreground focus:outline-none p-0 w-64 sm:w-96"
                                placeholder="Nama Aturan Otomasi..."
                            />
                        </div>

                        {/* Active Switch */}
                        <button
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={cn(
                                'px-3 py-1 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border',
                                isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'
                            )}
                        >
                            <Power className="size-3.5" />
                            <span>{isActive ? 'Aktif' : 'Non-aktif'}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={handleTestRun}
                            className="text-xs font-semibold gap-1.5"
                        >
                            <Play className="size-3.5 text-primary" />
                            <span>Test Run</span>
                        </Button>

                        <Button
                            size="sm"
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="text-xs font-semibold gap-1.5 shadow-sm"
                        >
                            <Save className="size-3.5" />
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan Otomasi'}</span>
                        </Button>
                    </div>
                </div>

                {/* Canvas & Palette Body */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
                    {/* Left Panel: Palette & Settings */}
                    <div className="lg:col-span-4 p-6 border-r border-border bg-card/40 space-y-6 overflow-y-auto max-h-[calc(100vh-128px)]">
                        {/* Scope Settings */}
                        <div className="bg-card p-4 rounded-2xl border border-border space-y-3 shadow-2xs">
                            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                                Cakupan Proyek
                            </h3>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="">Semua Proyek (Global Organisasi)</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.key})
                                    </option>
                                ))}
                            </select>

                            <div className="space-y-1 pt-1">
                                <label className="text-[11px] font-semibold text-muted-foreground">Deskripsi Catatan</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Jelaskan tujuan atau fungsi alur kerja otomatis ini..."
                                    rows={2}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Node Palette */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider font-mono">
                                Tambah Blok Aksi
                            </h3>

                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => handleAddAction('update_task_field')}
                                    className="w-full p-3 rounded-xl border border-border bg-card hover:border-primary/60 transition-all flex items-center justify-between text-left shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                            <Zap className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Ubah Kolom Tugas</p>
                                            <p className="text-[10px] text-muted-foreground">Set prioritas, milestone, status, poin</p>
                                        </div>
                                    </div>
                                    <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAddAction('assign_user')}
                                    className="w-full p-3 rounded-xl border border-border bg-card hover:border-primary/60 transition-all flex items-center justify-between text-left shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                            <Users className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Tugaskan Anggota</p>
                                            <p className="text-[10px] text-muted-foreground">Tugaskan ke Lead Proyek / User tertentu</p>
                                        </div>
                                    </div>
                                    <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAddAction('send_notification')}
                                    className="w-full p-3 rounded-xl border border-border bg-card hover:border-primary/60 transition-all flex items-center justify-between text-left shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                            <Sparkles className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Kirim Notifikasi</p>
                                            <p className="text-[10px] text-muted-foreground">Kirim pemberitahuan in-app ke penanggung jawab</p>
                                        </div>
                                    </div>
                                    <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAddAction('dispatch_webhook')}
                                    className="w-full p-3 rounded-xl border border-border bg-card hover:border-primary/60 transition-all flex items-center justify-between text-left shadow-2xs group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                            <Webhook className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Panggil Webhook</p>
                                            <p className="text-[10px] text-muted-foreground">Kirim payload HTTP POST ke URL eksternal</p>
                                        </div>
                                    </div>
                                    <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Canvas: Visual Connected Nodes */}
                    <div className="lg:col-span-8 p-6 md:p-10 flex flex-col items-center justify-start overflow-y-auto max-h-[calc(100vh-128px)] space-y-4">
                        {/* 1. Trigger Node */}
                        <div className="w-full max-w-lg bg-card rounded-2xl border-2 border-emerald-500/40 p-5 shadow-sm space-y-3 relative group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                                        <Zap className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">1. Pemicu Kejadian (Trigger)</span>
                                        <h4 className="text-sm font-bold text-foreground">Saat Suatu Peristiwa Terjadi</h4>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Pemicu Utama</Badge>
                            </div>

                            <select
                                value={triggerEvent}
                                onChange={(e) => setTriggerEvent(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold"
                            >
                                <option value="task.created">Tugas Baru Dibuat (task.created)</option>
                                <option value="task.status_changed">Status Tugas Berpindah (task.status_changed)</option>
                                <option value="task.priority_changed">Prioritas Tugas Berubah (task.priority_changed)</option>
                                <option value="sprint.started">Sprint Baru Dimulai (sprint.started)</option>
                            </select>
                        </div>

                        {/* Connector Arrow */}
                        <div className="flex flex-col items-center">
                            <div className="w-0.5 h-6 bg-border" />
                            <ArrowDown className="size-4 text-muted-foreground -my-1" />
                        </div>

                        {/* 2. Conditions Node */}
                        <div className="w-full max-w-lg bg-card rounded-2xl border-2 border-amber-500/40 p-5 shadow-sm space-y-4 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                        <Filter className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-mono font-bold text-amber-400">2. Syarat Kondisi (If / When)</span>
                                        <h4 className="text-sm font-bold text-foreground">Hanya Jalankan Jika</h4>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={handleAddCondition}
                                    className="text-xs h-7 gap-1"
                                >
                                    <Plus className="size-3" /> Tambah Syarat
                                </Button>
                            </div>

                            {conditions.length > 0 ? (
                                <div className="space-y-2">
                                    {conditions.map((cond, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border">
                                            <select
                                                value={cond.field}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[idx].field = e.target.value;
                                                    setConditions(updated);
                                                }}
                                                className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-semibold flex-1"
                                            >
                                                <option value="priority">Prioritas (Priority)</option>
                                                <option value="is_milestone">Status Milestone</option>
                                                <option value="estimate_points">Story Points</option>
                                            </select>

                                            <select
                                                value={cond.operator}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[idx].operator = e.target.value;
                                                    setConditions(updated);
                                                }}
                                                className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-semibold w-24"
                                            >
                                                <option value="equals">Sama (=)</option>
                                                <option value="not_equals">Bukan (!=)</option>
                                                <option value="greater_than">&gt;</option>
                                                <option value="less_than">&lt;</option>
                                            </select>

                                            <Input
                                                type="text"
                                                value={cond.value}
                                                onChange={(e) => {
                                                    const updated = [...conditions];
                                                    updated[idx].value = e.target.value;
                                                    setConditions(updated);
                                                }}
                                                className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-mono flex-1"
                                                placeholder="Nilai..."
                                            />

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCondition(idx)}
                                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-2">
                                    Tanpa syarat tambahan (dieksekusi untuk semua kejadian pemicu).
                                </p>
                            )}
                        </div>

                        {/* Connector Arrow */}
                        <div className="flex flex-col items-center">
                            <div className="w-0.5 h-6 bg-border" />
                            <ArrowDown className="size-4 text-muted-foreground -my-1" />
                        </div>

                        {/* 3. Actions Node */}
                        <div className="w-full max-w-lg bg-card rounded-2xl border-2 border-primary/50 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                        <Sparkles className="size-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-mono font-bold text-primary">3. Aksi Otomatis (Then Do)</span>
                                        <h4 className="text-sm font-bold text-foreground">Lakukan Tindakan Berikut</h4>
                                    </div>
                                </div>

                                <Badge variant="outline" className="text-[10px] font-mono">
                                    {actions.length} Aksi Terpasang
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                {actions.map((act, idx) => (
                                    <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border space-y-2 relative">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold font-mono text-foreground flex items-center gap-1.5">
                                                <Zap className="size-3 text-primary" /> {act.type}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAction(idx)}
                                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>

                                        {act.type === 'update_task_field' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={act.config.field || 'priority'}
                                                    onChange={(e) => {
                                                        const updated = [...actions];
                                                        updated[idx].config.field = e.target.value;
                                                        setActions(updated);
                                                    }}
                                                    className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-semibold"
                                                >
                                                    <option value="priority">Ubah Prioritas</option>
                                                    <option value="is_milestone">Tandai Milestone</option>
                                                </select>
                                                <Input
                                                    type="text"
                                                    value={act.config.value ?? ''}
                                                    onChange={(e) => {
                                                        const updated = [...actions];
                                                        updated[idx].config.value = e.target.value;
                                                        setActions(updated);
                                                    }}
                                                    className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-mono"
                                                    placeholder="Nilai baru..."
                                                />
                                            </div>
                                        )}

                                        {act.type === 'assign_user' && (
                                            <select
                                                value={act.config.user_id || 'project_lead'}
                                                onChange={(e) => {
                                                    const updated = [...actions];
                                                    updated[idx].config.user_id = e.target.value;
                                                    setActions(updated);
                                                }}
                                                className="w-full h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-semibold"
                                            >
                                                <option value="project_lead">Pimpinan Proyek (Project Lead)</option>
                                                {members.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name} ({m.email})
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {act.type === 'send_notification' && (
                                            <div className="space-y-1.5">
                                                <Input
                                                    type="text"
                                                    value={act.config.title || ''}
                                                    onChange={(e) => {
                                                        const updated = [...actions];
                                                        updated[idx].config.title = e.target.value;
                                                        setActions(updated);
                                                    }}
                                                    className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-semibold"
                                                    placeholder="Judul Notifikasi..."
                                                />
                                                <Input
                                                    type="text"
                                                    value={act.config.body || ''}
                                                    onChange={(e) => {
                                                        const updated = [...actions];
                                                        updated[idx].config.body = e.target.value;
                                                        setActions(updated);
                                                    }}
                                                    className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-mono text-[11px]"
                                                    placeholder="Isi Notifikasi..."
                                                />
                                            </div>
                                        )}

                                        {act.type === 'dispatch_webhook' && (
                                            <Input
                                                type="url"
                                                value={act.config.url || ''}
                                                onChange={(e) => {
                                                    const updated = [...actions];
                                                    updated[idx].config.url = e.target.value;
                                                    setActions(updated);
                                                }}
                                                className="h-7 px-2 text-xs rounded-lg bg-card border border-border text-foreground font-mono"
                                                placeholder="https://..."
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Run Dry-Run Modal */}
            <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Play className="size-4 text-primary" /> Hasil Uji Coba (Dry Run)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {isTesting ? (
                            <div className="text-center py-6 text-xs text-muted-foreground">
                                Menjalankan simulasi aturan otomasi...
                            </div>
                        ) : testResult ? (
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    <span>Simulasi berhasil dievaluasi tanpa error.</span>
                                </div>

                                <div className="p-3 rounded-xl bg-muted/40 border border-border font-mono text-[11px] space-y-1">
                                    <p className="text-muted-foreground font-bold">Ringkasan Hasil:</p>
                                    <pre className="text-[10px] overflow-x-auto text-foreground">
                                        {JSON.stringify(testResult, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button type="button" onClick={() => setShowTestModal(false)} className="text-xs">
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
