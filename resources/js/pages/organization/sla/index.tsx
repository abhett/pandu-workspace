import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Timer,
    Plus,
    Flame,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RotateCw,
    Edit,
    Trash2,
    ShieldAlert,
    Zap,
    Layers,
    ListTodo,
    ChevronRight,
    ArrowUpRight,
    AlertCircle,
    Calendar,
    Activity,
    Settings2,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
}

interface EscalationRule {
    id: string;
    trigger_type: string;
    trigger_offset_minutes: number;
    action_type: string;
    action_payload: any;
    position: number;
    active: boolean;
}

interface SlaPolicyItem {
    id: string;
    name: string;
    description?: string | null;
    priority: string;
    issue_type: string;
    response_time_hours: number;
    resolution_time_hours: number;
    operational_hours: string;
    active: boolean;
    project?: Project | null;
    task_trackers_count: number;
    escalation_rules: EscalationRule[];
    created_at_formatted: string;
}

interface AtRiskTask {
    id: string;
    task_id: string;
    task_key: string;
    task_title: string;
    task_priority: string;
    project_name?: string | null;
    policy_name?: string | null;
    status: string;
    is_overdue: boolean;
    time_text: string;
    response_due_at_formatted?: string | null;
    resolution_due_at_formatted?: string | null;
    escalation_level: number;
}

interface Metrics {
    total_policies: number;
    active_policies: number;
    total_trackers: number;
    achieved_count: number;
    breached_count: number;
    in_progress_count: number;
    compliance_rate: number;
    active_tasks: AtRiskTask[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    policies: SlaPolicyItem[];
    metrics: Metrics;
    projects: Project[];
}

export default function SlaManagementPage({
    organization,
    policies,
    metrics,
    projects,
}: Props) {
    const [activeTab, setActiveTab] = useState<'policies' | 'tasks'>('policies');

    // Modal Create / Edit Policy
    const [policyModalOpen, setPolicyModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<SlaPolicyItem | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState<string>('all');
    const [priority, setPriority] = useState('all');
    const [issueType, setIssueType] = useState('all');
    const [responseTimeHours, setResponseTimeHours] = useState(2);
    const [resolutionTimeHours, setResolutionTimeHours] = useState(8);
    const [operationalHours, setOperationalHours] = useState('24x7');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal Add Escalation Rule
    const [ruleModalOpen, setRuleModalOpen] = useState(false);
    const [selectedPolicyForRule, setSelectedPolicyForRule] = useState<SlaPolicyItem | null>(null);
    const [triggerType, setTriggerType] = useState('resolution_breached');
    const [triggerOffsetMinutes, setTriggerOffsetMinutes] = useState(0);
    const [actionType, setActionType] = useState('escalate_priority');
    const [newPriority, setNewPriority] = useState('urgent');

    // Scan execution
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    // Open create policy
    const openCreatePolicyModal = () => {
        setEditingPolicy(null);
        setName('');
        setDescription('');
        setProjectId('all');
        setPriority('urgent');
        setIssueType('all');
        setResponseTimeHours(2);
        setResolutionTimeHours(8);
        setOperationalHours('24x7');
        setIsActive(true);
        setErrorMessage(null);
        setPolicyModalOpen(true);
    };

    // Open edit policy
    const openEditPolicyModal = (policy: SlaPolicyItem) => {
        setEditingPolicy(policy);
        setName(policy.name);
        setDescription(policy.description || '');
        setProjectId(policy.project?.id || 'all');
        setPriority(policy.priority);
        setIssueType(policy.issue_type);
        setResponseTimeHours(policy.response_time_hours);
        setResolutionTimeHours(policy.resolution_time_hours);
        setOperationalHours(policy.operational_hours);
        setIsActive(policy.active);
        setErrorMessage(null);
        setPolicyModalOpen(true);
    };

    // Save Policy
    const handleSavePolicy = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!name) {
            setErrorMessage('Nama kebijakan SLA wajib diisi.');
            return;
        }

        setSubmitting(true);

        const payload = {
            name,
            description,
            project_id: projectId === 'all' ? null : projectId,
            priority,
            issue_type: issueType,
            response_time_hours: Number(responseTimeHours),
            resolution_time_hours: Number(resolutionTimeHours),
            operational_hours: operationalHours,
            active: isActive,
        };

        if (editingPolicy) {
            router.put(`/organization/sla/${editingPolicy.id}`, payload, {
                onSuccess: () => {
                    setPolicyModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err) => {
                    setErrorMessage(Object.values(err)[0] || 'Gagal memperbarui kebijakan SLA.');
                    setSubmitting(false);
                },
            });
        } else {
            router.post('/organization/sla', payload, {
                onSuccess: () => {
                    setPolicyModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err) => {
                    setErrorMessage(Object.values(err)[0] || 'Gagal membuat kebijakan SLA.');
                    setSubmitting(false);
                },
            });
        }
    };

    // Delete Policy
    const handleDeletePolicy = (policy: SlaPolicyItem) => {
        if (!confirm(`Hapus kebijakan SLA "${policy.name}"? Pelacakan aktif akan terputus.`)) return;

        router.delete(`/organization/sla/${policy.id}`);
    };

    // Open add rule modal
    const openAddRuleModal = (policy: SlaPolicyItem) => {
        setSelectedPolicyForRule(policy);
        setTriggerType('resolution_breached');
        setTriggerOffsetMinutes(0);
        setActionType('escalate_priority');
        setNewPriority('urgent');
        setRuleModalOpen(true);
    };

    // Save Escalation Rule
    const handleSaveRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPolicyForRule) return;

        setSubmitting(true);

        const payload = {
            trigger_type: triggerType,
            trigger_offset_minutes: Number(triggerOffsetMinutes),
            action_type: actionType,
            action_payload: { new_priority: newPriority },
        };

        router.post(`/organization/sla/${selectedPolicyForRule.id}/escalation-rules`, payload, {
            onSuccess: () => {
                setRuleModalOpen(false);
                setSubmitting(false);
            },
            onError: () => {
                setSubmitting(false);
            },
        });
    };

    // Delete Rule
    const handleDeleteRule = (ruleId: string) => {
        if (!confirm('Hapus aturan eskalasi ini?')) return;

        router.delete(`/organization/sla/escalation-rules/${ruleId}`);
    };

    // Run On-Demand Scan
    const handleRunScan = async () => {
        setScanning(true);
        setScanMessage(null);

        try {
            const response = await fetch('/organization/sla/run-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                setScanMessage(data.message);
                router.reload({ only: ['metrics', 'policies'] });
                setTimeout(() => setScanMessage(null), 5000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setScanning(false);
        }
    };

    return (
        <AppLayout>
            <Head title="SLA & Automated Escalation Engine" />

            <div className="space-y-6 pb-16">
                {/* Header Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-xl font-bold shadow-sm">
                                <Timer className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    SLA & Automated Escalation Engine
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pantau target respon pertama, batas waktu resolusi tiket, dan picu eskalasi bertingkat otomatis saat SLA berisiko terlampaui.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={scanning}
                                onClick={handleRunScan}
                                className="text-xs gap-1.5 border-border hover:bg-muted"
                            >
                                <Zap className={`h-3.5 w-3.5 text-amber-500 ${scanning ? 'animate-spin' : ''}`} />
                                <span>{scanning ? 'Memindai...' : 'Pindai & Eskalasi Sekarang'}</span>
                            </Button>

                            <Button
                                onClick={openCreatePolicyModal}
                                className="bg-primary text-primary-foreground font-semibold text-xs gap-1.5 shadow-md"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Buat Kebijakan SLA</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Scan Success Banner */}
                {scanMessage && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{scanMessage}</span>
                    </div>
                )}

                {/* Bento KPI Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kepatuhan SLA (Compliance Rate)</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {metrics.compliance_rate}%
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                ({metrics.achieved_count} tercapai)
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Target terselesaikan tepat waktu
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tugas Sedang Dilacak</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <ListTodo className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {metrics.in_progress_count}
                            </span>
                            <span className="text-xs text-muted-foreground">tugas aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Countdown timer SLA sedang berjalan
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Melampaui Batas (Breached)</span>
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                <Flame className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                {metrics.breached_count}
                            </span>
                            <span className="text-xs text-muted-foreground">tugas terlambat</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Melebihi target respon/resolusi
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Kebijakan SLA Aktif</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <ShieldAlert className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                {metrics.active_policies}
                            </span>
                            <span className="text-xs text-muted-foreground">dari {metrics.total_policies} aturan</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Matriks eskalasi aktif di organisasi
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-border pb-2">
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'policies'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Settings2 className="h-4 w-4" />
                        <span>Kebijakan SLA & Matriks Eskalasi ({policies.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'tasks'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Tugas Berisiko & Pelanggaran ({metrics.active_tasks.length})</span>
                    </button>
                </div>

                {/* TAB 1: Policies & Escalation Rules */}
                {activeTab === 'policies' && (
                    <div className="space-y-4">
                        {policies.length === 0 ? (
                            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
                                <div className="p-4 rounded-2xl bg-muted text-muted-foreground inline-block mb-3">
                                    <Timer className="h-8 w-8" />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground">Belum ada Kebijakan SLA</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Tentukan target waktu penyelesaian tugas kritis dan konfigurasi aturan eskalasi otomatis.
                                </p>
                                <Button onClick={openCreatePolicyModal} className="mt-4 text-xs font-semibold gap-1.5 shadow-sm">
                                    <Plus className="h-4 w-4" />
                                    <span>Buat Kebijakan SLA Pertama</span>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {policies.map((policy) => (
                                    <div
                                        key={policy.id}
                                        className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-foreground">
                                                            {policy.name}
                                                        </h3>
                                                        <Badge
                                                            variant={policy.active ? 'default' : 'secondary'}
                                                            className={`text-[10px] ${
                                                                policy.active
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                    : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {policy.active ? 'Aktif' : 'Nonaktif'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {policy.description || 'Tidak ada deskripsi.'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => openEditPolicyModal(policy)}
                                                        title="Edit Kebijakan"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeletePolicy(policy)}
                                                        title="Hapus Kebijakan"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Scope & Priority Badges */}
                                            <div className="flex flex-wrap items-center gap-2 my-3 text-[11px]">
                                                <Badge variant="outline" className="font-mono">
                                                    {policy.project ? `Proyek: ${policy.project.name}` : 'Cakupan: Semua Proyek (Global)'}
                                                </Badge>
                                                <Badge variant="secondary" className="font-semibold uppercase text-[10px]">
                                                    Prioritas: {policy.priority}
                                                </Badge>
                                                <Badge variant="secondary" className="font-semibold uppercase text-[10px]">
                                                    Tipe: {policy.issue_type}
                                                </Badge>
                                            </div>

                                            {/* Targets Bento Grid */}
                                            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/30 border border-border/60 text-center mb-4">
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block">Target Respon</span>
                                                    <span className="text-xs font-bold font-mono text-foreground">
                                                        {policy.response_time_hours} Jam
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block">Target Resolusi</span>
                                                    <span className="text-xs font-bold font-mono text-foreground">
                                                        {policy.resolution_time_hours} Jam
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-muted-foreground block">Jam Kerja</span>
                                                    <span className="text-xs font-bold font-mono text-foreground">
                                                        {policy.operational_hours === '24x7' ? '24x7' : '9-5 Kerja'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Escalation Rules List */}
                                            <div className="space-y-2 mb-3">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                                                    <span>Matriks Eskalasi Otomatis ({policy.escalation_rules.length})</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[10px] text-primary px-1.5"
                                                        onClick={() => openAddRuleModal(policy)}
                                                    >
                                                        + Tambah Aturan
                                                    </Button>
                                                </div>

                                                {policy.escalation_rules.length === 0 ? (
                                                    <div className="text-[11px] text-muted-foreground p-2 rounded-lg bg-muted/10 border border-dashed border-border text-center">
                                                        Belum ada aturan eskalasi otomatis.
                                                    </div>
                                                ) : (
                                                    policy.escalation_rules.map((rule) => (
                                                        <div
                                                            key={rule.id}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                                                                <div>
                                                                    <span className="font-semibold text-foreground">
                                                                        {rule.trigger_type === 'resolution_breached'
                                                                            ? 'Jika Resolusi Terlampaui'
                                                                            : rule.trigger_type === 'response_breached'
                                                                            ? 'Jika Respon Terlampaui'
                                                                            : 'Peringatan Mendekati Batas'}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground block">
                                                                        Aksi: Naikkan prioritas ke Urgent & flag peringatan
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDeleteRule(rule.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                                            <span>{policy.task_trackers_count} tugas terlacak dalam kebijakan ini</span>
                                            <span>{policy.created_at_formatted}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: At-Risk & Breached Tasks Table */}
                {activeTab === 'tasks' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Flame className="h-4 w-4 text-red-500" />
                                <span>Daftar Tugas Kritis & Terancam SLA</span>
                            </h3>
                            <Badge variant="outline" className="font-mono text-xs">
                                {metrics.active_tasks.length} Tugas
                            </Badge>
                        </div>

                        {metrics.active_tasks.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Tidak ada tugas aktif yang melampaui atau mendekati batas SLA saat ini. Seluruh tugas dalam kondisi aman!
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Tugas</th>
                                            <th className="py-3 px-4">Proyek & Kebijakan</th>
                                            <th className="py-3 px-4">Prioritas</th>
                                            <th className="py-3 px-4">Target Resolusi</th>
                                            <th className="py-3 px-4">Status SLA</th>
                                            <th className="py-3 px-4">Eskalasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {metrics.active_tasks.map((task) => (
                                            <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground">
                                                        {task.task_key}
                                                    </div>
                                                    <div className="text-muted-foreground line-clamp-1">
                                                        {task.task_title}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-semibold text-foreground block">
                                                        {task.project_name || '—'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {task.policy_name}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] uppercase font-semibold ${
                                                            task.task_priority === 'urgent'
                                                                ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                                                : task.task_priority === 'high'
                                                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                                                : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                                        }`}
                                                    >
                                                        {task.task_priority}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 font-mono">
                                                    <div>{task.resolution_due_at_formatted || '—'}</div>
                                                    <div
                                                        className={`text-[10px] font-bold ${
                                                            task.is_overdue
                                                                ? 'text-red-500'
                                                                : 'text-amber-500'
                                                        }`}
                                                    >
                                                        {task.time_text}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        className={`text-[10px] ${
                                                            task.is_overdue
                                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                        }`}
                                                    >
                                                        {task.is_overdue ? 'Breached' : 'In Progress'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {task.escalation_level > 0 ? (
                                                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">
                                                            Level {task.escalation_level} (Escalated)
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px]">Standar</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Buat / Edit Kebijakan SLA */}
            <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Timer className="h-5 w-5 text-primary" />
                            <span>{editingPolicy ? 'Edit Kebijakan SLA' : 'Buat Kebijakan SLA Baru'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan target waktu penyelesaian dan aturan jam operasional.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSavePolicy} className="space-y-4 pt-2">
                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Nama Kebijakan SLA
                            </label>
                            <Input
                                placeholder="misal: Critical Incident SLA, Standard Support SLA"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Deskripsi (Opsional)
                            </label>
                            <Input
                                placeholder="Tujuan dan cakupan kebijakan SLA ini..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Cakupan Proyek
                                </label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih cakupan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Proyek (Global)</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.key})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jam Operasional
                                </label>
                                <Select value={operationalHours} onValueChange={setOperationalHours}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24x7">24x7 (Sepanjang Waktu)</SelectItem>
                                        <SelectItem value="business_hours">Jam Kerja (Sen-Jum 09-18)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Prioritas
                                </label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Prioritas</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Tipe Tugas
                                </label>
                                <Select value={issueType} onValueChange={setIssueType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Tipe</SelectItem>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="task">Task</SelectItem>
                                        <SelectItem value="story">Story</SelectItem>
                                        <SelectItem value="epic">Epic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Waktu Respon (Jam)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={720}
                                    value={responseTimeHours}
                                    onChange={(e) => setResponseTimeHours(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Target Waktu Resolusi (Jam)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={720}
                                    value={resolutionTimeHours}
                                    onChange={(e) => setResolutionTimeHours(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                            <div>
                                <span className="text-xs font-semibold text-foreground block">Status Kebijakan</span>
                                <span className="text-[10px] text-muted-foreground">Aktifkan pelacakan SLA ini</span>
                            </div>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPolicyModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submitting ? 'Menyimpan...' : editingPolicy ? 'Simpan Perubahan' : 'Buat Kebijakan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tambah Aturan Eskalasi */}
            <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            <span>Tambah Aturan Matriks Eskalasi</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Picu eskalasi otomatis pada kebijakan: <strong>{selectedPolicyForRule?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Kondisi Pemicu (Trigger)
                            </label>
                            <Select value={triggerType} onValueChange={setTriggerType}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="resolution_breached">Waktu Resolusi Terlampaui (Breached)</SelectItem>
                                    <SelectItem value="response_breached">Waktu Respon Terlampaui (Breached)</SelectItem>
                                    <SelectItem value="approaching_breach">Mendekati Batas Waktu (Warning)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Aksi Eskalasi Otomatis
                            </label>
                            <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="escalate_priority">Naikkan Prioritas Tugas</SelectItem>
                                    <SelectItem value="add_tag">Tambahkan Flag Peringatan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {actionType === 'escalate_priority' && (
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Prioritas Baru
                                </label>
                                <Select value={newPriority} onValueChange={setNewPriority}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRuleModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Aturan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
