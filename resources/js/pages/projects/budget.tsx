import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    DollarSign,
    Plus,
    Clock,
    Receipt,
    Users,
    PieChart,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Check,
    X,
    Trash2,
    Edit,
    Building2,
    Server,
    Laptop,
    Briefcase,
    Plane,
    HelpCircle,
    TrendingUp,
    ShieldAlert,
    FileText,
    ListTodo,
    LayoutDashboard,
    Settings,
    Workflow,
    Columns3,
    Sparkles,
    PenTool,
} from 'lucide-react';

interface Project {
    id: string;
    name: string;
    key: string;
    slug: string;
    color: string;
    icon: string;
}

interface Member {
    id: number;
    name: string;
    email: string;
}

interface TaskItem {
    id: string;
    key: string;
    title: string;
}

interface MemberRate {
    id: string;
    user_id: number;
    user_name?: string;
    user_email?: string;
    hourly_rate: number;
    billing_role?: string | null;
}

interface WorklogItem {
    id: string;
    task_key?: string;
    task_title?: string;
    user_name?: string;
    duration_minutes: number;
    duration_hours: number;
    calculated_cost: number;
    work_date_formatted: string;
    description?: string | null;
}

interface ExpenseItem {
    id: string;
    category: string;
    title: string;
    amount: number;
    currency: string;
    expense_date_formatted: string;
    vendor?: string | null;
    receipt_url?: string | null;
    submitter_name?: string;
    approver_name?: string | null;
    status: string;
    rejection_reason?: string | null;
    notes?: string | null;
    created_at_formatted: string;
}

interface BudgetSummary {
    budget: {
        id?: string;
        total_budget: number;
        currency: string;
        budget_type: string;
        capex_amount: number;
        opex_amount: number;
        alert_threshold_percent: number;
    };
    financials: {
        total_labor_cost: number;
        total_approved_expenses: number;
        total_pending_expenses: number;
        total_incurred_cost: number;
        remaining_budget: number;
        burn_rate_percent: number;
        health_status: 'healthy' | 'warning' | 'exceeded' | 'unbudgeted';
    };
    categories: Record<string, number>;
    member_rates: MemberRate[];
    recent_worklogs: WorklogItem[];
    expenses: ExpenseItem[];
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    project: Project;
    summary: BudgetSummary;
    members: Member[];
    tasks: TaskItem[];
}

export default function ProjectBudgetPage({
    organization,
    project,
    summary,
    members,
    tasks,
}: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'rates' | 'worklogs'>('overview');

    // Currency Formatter Helper
    const formatMoney = (val: number, currency: string = summary.budget.currency || 'IDR') => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: currency === 'IDR' ? 'IDR' : currency,
            maximumFractionDigits: 0,
        }).format(val);
    };

    // Modal Budget Config
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [totalBudgetInput, setTotalBudgetInput] = useState(summary.budget.total_budget || 0);
    const [currencyInput, setCurrencyInput] = useState(summary.budget.currency || 'IDR');
    const [budgetTypeInput, setBudgetTypeInput] = useState(summary.budget.budget_type || 'fixed');
    const [capexInput, setCapexInput] = useState(summary.budget.capex_amount || 0);
    const [opexInput, setOpexInput] = useState(summary.budget.opex_amount || 0);
    const [alertThresholdInput, setAlertThresholdInput] = useState(summary.budget.alert_threshold_percent || 85);
    const [submittingBudget, setSubmittingBudget] = useState(false);

    // Modal Submit Expense
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState('software_license');
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState<number | string>('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenseVendor, setExpenseVendor] = useState('');
    const [expenseNotes, setExpenseNotes] = useState('');
    const [submittingExpense, setSubmittingExpense] = useState(false);

    // Modal Set Member Rate
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>(members[0]?.id?.toString() || '');
    const [hourlyRateInput, setHourlyRateInput] = useState<number | string>('');
    const [billingRoleInput, setBillingRoleInput] = useState('');
    const [submittingRate, setSubmittingRate] = useState(false);

    // Modal Log Work Time
    const [worklogModalOpen, setWorklogModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
    const [workDurationHours, setWorkDurationHours] = useState<number | string>(2);
    const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
    const [workDescription, setWorkDescription] = useState('');
    const [submittingWorklog, setSubmittingWorklog] = useState(false);

    // Modal Reject Expense Reason
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedExpenseForReject, setSelectedExpenseForReject] = useState<ExpenseItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Handle Budget Submit
    const handleSaveBudget = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingBudget(true);

        router.post(`/projects/${project.id}/budget`, {
            total_budget: Number(totalBudgetInput),
            currency: currencyInput,
            budget_type: budgetTypeInput,
            capex_amount: Number(capexInput),
            opex_amount: Number(opexInput),
            alert_threshold_percent: Number(alertThresholdInput),
        }, {
            onSuccess: () => setBudgetModalOpen(false),
            onFinish: () => setSubmittingBudget(false),
        });
    };

    // Handle Expense Submit
    const handleSaveExpense = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingExpense(true);

        router.post(`/projects/${project.id}/budget/expenses`, {
            category: expenseCategory,
            title: expenseTitle,
            amount: Number(expenseAmount),
            currency: summary.budget.currency,
            expense_date: expenseDate,
            vendor: expenseVendor,
            notes: expenseNotes,
        }, {
            onSuccess: () => {
                setExpenseModalOpen(false);
                setExpenseTitle('');
                setExpenseAmount('');
                setExpenseVendor('');
                setExpenseNotes('');
            },
            onFinish: () => setSubmittingExpense(false),
        });
    };

    // Handle Member Rate Submit
    const handleSaveRate = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingRate(true);

        router.post(`/projects/${project.id}/budget/rates`, {
            user_id: Number(selectedUserId),
            hourly_rate: Number(hourlyRateInput),
            billing_role: billingRoleInput,
        }, {
            onSuccess: () => setRateModalOpen(false),
            onFinish: () => setSubmittingRate(false),
        });
    };

    // Handle Worklog Submit
    const handleSaveWorklog = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingWorklog(true);

        router.post(`/projects/${project.id}/budget/worklogs`, {
            task_id: selectedTaskId,
            duration_minutes: Math.round(Number(workDurationHours) * 60),
            work_date: workDate,
            description: workDescription,
        }, {
            onSuccess: () => {
                setWorklogModalOpen(false);
                setWorkDescription('');
            },
            onFinish: () => setSubmittingWorklog(false),
        });
    };

    // Handle Approve Expense
    const handleApproveExpense = (expense: ExpenseItem) => {
        if (!confirm(`Setujui klaim pengeluaran "${expense.title}" sebesar ${formatMoney(expense.amount)}?`)) return;

        router.post(`/projects/${project.id}/budget/expenses/${expense.id}/approve`);
    };

    // Handle Reject Expense
    const handleRejectExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExpenseForReject) return;

        router.post(`/projects/${project.id}/budget/expenses/${selectedExpenseForReject.id}/reject`, {
            reason: rejectionReason,
        }, {
            onSuccess: () => {
                setRejectModalOpen(false);
                setSelectedExpenseForReject(null);
                setRejectionReason('');
            },
        });
    };

    // Delete Expense
    const handleDeleteExpense = (expense: ExpenseItem) => {
        if (!confirm(`Hapus catatan pengeluaran "${expense.title}"?`)) return;

        router.delete(`/projects/${project.id}/budget/expenses/${expense.id}`);
    };

    return (
        <AppLayout>
            <Head title={`Anggaran & Biaya - ${project.name}`} />

            <div className="space-y-6 pb-16">
                {/* Project Sub-Navigation Bar */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs text-sm"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                        >
                            {project.key}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {project.key}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Pusat Kontrol Finansial, Biaya Tenaga Kerja & Alokasi Anggaran
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                            href={`/projects/${project.id}/board`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Columns3 className="h-3.5 w-3.5" />
                            <span>Papan Kanban</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/tasks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <ListTodo className="h-3.5 w-3.5" />
                            <span>Daftar Tugas</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/dependencies`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            <span>Graf Dependensi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/budget`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                        >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Anggaran & Biaya</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/whiteboard`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Kanvas & Ideasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/risks`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Risiko & Mitigasi</span>
                        </Link>
                        <Link
                            href={`/projects/${project.id}/settings`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Pengaturan</span>
                        </Link>
                    </div>
                </div>

                {/* Financial Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Aksi Finansial Cepat:</span>
                        <Badge
                            className={`text-[10px] uppercase font-bold ${
                                summary.financials.health_status === 'healthy'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : summary.financials.health_status === 'warning'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : summary.financials.health_status === 'exceeded'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            Status: {summary.financials.health_status === 'healthy' ? 'Anggaran Sehat' : summary.financials.health_status === 'warning' ? 'Mendekati Batas' : summary.financials.health_status === 'exceeded' ? 'Melebihi Anggaran' : 'Belum Ditentukan'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWorklogModalOpen(true)}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <Clock className="h-3.5 w-3.5 text-blue-500" />
                            <span>+ Catat Jam Kerja</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpenseModalOpen(true)}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <Receipt className="h-3.5 w-3.5 text-purple-500" />
                            <span>+ Ajukan Pengeluaran</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRateModalOpen(true)}
                            className="text-xs h-8 gap-1.5 border-border"
                        >
                            <Users className="h-3.5 w-3.5 text-amber-500" />
                            <span>Tarif Anggota</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setBudgetModalOpen(true)}
                            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Atur Anggaran</span>
                        </Button>
                    </div>
                </div>

                {/* Bento Financial KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Alokasi Anggaran</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <DollarSign className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                {formatMoney(summary.financials.remaining_budget + summary.financials.total_incurred_cost)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground font-mono">
                            Tipe: {summary.budget.budget_type === 'fixed' ? 'Fixed Scope' : 'Time & Materials'}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Biaya Terpakai</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                {formatMoney(summary.financials.total_incurred_cost)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Tenaga Kerja: {formatMoney(summary.financials.total_labor_cost)}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Sisa Saldo Anggaran</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <PieChart className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className={`text-xl font-bold tracking-tight ${summary.financials.remaining_budget < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {formatMoney(summary.financials.remaining_budget)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Pengeluaran Pending: {formatMoney(summary.financials.total_pending_expenses)}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Tingkat Penyerapan (Burn Rate)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                {summary.financials.burn_rate_percent}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                (Batas: {summary.budget.alert_threshold_percent}%)
                            </span>
                        </div>
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    summary.financials.burn_rate_percent >= 100
                                        ? 'bg-red-500'
                                        : summary.financials.burn_rate_percent >= summary.budget.alert_threshold_percent
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(summary.financials.burn_rate_percent, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-2 border-b border-border pb-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'overview'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <PieChart className="h-4 w-4" />
                        <span>Analisis & Breakdown Biaya</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'expenses'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Receipt className="h-4 w-4" />
                        <span>Pengajuan Pengeluaran ({summary.expenses.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('rates')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'rates'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Tarif Anggota Tim ({summary.member_rates.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('worklogs')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'worklogs'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Clock className="h-4 w-4" />
                        <span>Log Waktu Kerja ({summary.recent_worklogs.length})</span>
                    </button>
                </div>

                {/* TAB 1: Breakdown & Overview */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Categories Breakdown */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-primary" />
                                <span>Distribusi Biaya per Kategori</span>
                            </h3>

                            <div className="space-y-3">
                                {[
                                    { key: 'labor', label: 'Tenaga Kerja & Engineer (Worklogs)', icon: Users, color: 'bg-blue-500' },
                                    { key: 'software_license', label: 'Lisensi Perangkat Lunak', icon: Laptop, color: 'bg-purple-500' },
                                    { key: 'cloud_hosting', label: 'Server & Cloud Hosting', icon: Server, color: 'bg-cyan-500' },
                                    { key: 'hardware_equipment', label: 'Perangkat Keras / Hardware', icon: Building2, color: 'bg-amber-500' },
                                    { key: 'consulting', label: 'Konsultan & Layanan Eksternal', icon: Briefcase, color: 'bg-indigo-500' },
                                    { key: 'travel_meals', label: 'Perjalanan Dinas & Konsumsi', icon: Plane, color: 'bg-rose-500' },
                                    { key: 'other', label: 'Lainnya', icon: HelpCircle, color: 'bg-slate-500' },
                                ].map((cat) => {
                                    const amount = summary.categories[cat.key] || 0;
                                    const total = summary.financials.total_incurred_cost || 1;
                                    const percent = summary.financials.total_incurred_cost > 0
                                        ? Math.round((amount / total) * 100)
                                        : 0;

                                    return (
                                        <div key={cat.key} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <cat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-foreground">{cat.label}</span>
                                                </div>
                                                <span className="font-mono font-semibold text-foreground">
                                                    {formatMoney(amount)} ({percent}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full ${cat.color}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CAPEX vs OPEX Card */}
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span>Alokasi CAPEX vs OPEX</span>
                                </h3>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                                        <span className="text-[11px] text-muted-foreground block font-medium">
                                            CAPEX (Capital Expenditure)
                                        </span>
                                        <span className="text-lg font-bold text-foreground font-mono mt-1 block">
                                            {formatMoney(summary.budget.capex_amount)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-1 block">
                                            Aset berwujud, lisensi permanen & perangkat
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                                        <span className="text-[11px] text-muted-foreground block font-medium">
                                            OPEX (Operational Expenditure)
                                        </span>
                                        <span className="text-lg font-bold text-foreground font-mono mt-1 block">
                                            {formatMoney(summary.budget.opex_amount)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-1 block">
                                            Tenaga kerja, cloud mingguan, langganan
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                        <ShieldAlert className="h-4 w-4 text-primary" />
                                        <span>Kebijakan Pengawasan Anggaran</span>
                                    </div>
                                    <p>
                                        Peringatan dini penyerapan dana disetel otomatis pada ambang batas{' '}
                                        <strong className="text-foreground">{summary.budget.alert_threshold_percent}%</strong>.
                                        Setiap klaim di atas limit akan memerlukan persetujuan Project Lead.
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setBudgetModalOpen(true)}
                                className="w-full mt-4 text-xs font-semibold"
                            >
                                Perbarui Alokasi Anggaran
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB 2: Expenses Table */}
                {activeTab === 'expenses' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-purple-500" />
                                <span>Daftar Pengajuan Pengeluaran Proyek</span>
                            </h3>
                            <Button
                                size="sm"
                                onClick={() => setExpenseModalOpen(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Ajukan Pengeluaran</span>
                            </Button>
                        </div>

                        {summary.expenses.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Belum ada klaim atau catatan pengeluaran pada proyek ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Kategori & Judul</th>
                                            <th className="py-3 px-4">Vendor</th>
                                            <th className="py-3 px-4">Jumlah</th>
                                            <th className="py-3 px-4">Tanggal</th>
                                            <th className="py-3 px-4">Diajukan Oleh</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {summary.expenses.map((exp) => (
                                            <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground">{exp.title}</div>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-mono mt-0.5">
                                                        {exp.category.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {exp.vendor || '—'}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-foreground">
                                                    {formatMoney(exp.amount, exp.currency)}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground font-mono">
                                                    {exp.expense_date_formatted}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-foreground font-medium block">{exp.submitter_name}</span>
                                                    {exp.approver_name && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Disetujui: {exp.approver_name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        className={`text-[10px] ${
                                                            exp.status === 'approved'
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                                                : exp.status === 'rejected'
                                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                        }`}
                                                    >
                                                        {exp.status === 'approved' ? 'Disetujui' : exp.status === 'rejected' ? 'Ditolak' : 'Menunggu Persetujuan'}
                                                    </Badge>
                                                    {exp.rejection_reason && (
                                                        <div className="text-[10px] text-red-500 mt-1 max-w-xs">
                                                            Alasan: {exp.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {exp.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                                                                    onClick={() => handleApproveExpense(exp)}
                                                                    title="Setujui Pengeluaran"
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-red-600 hover:bg-red-500/10"
                                                                    onClick={() => {
                                                                        setSelectedExpenseForReject(exp);
                                                                        setRejectModalOpen(true);
                                                                    }}
                                                                    title="Tolak Pengeluaran"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteExpense(exp)}
                                                            title="Hapus Catatan"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: Member Rates */}
                {activeTab === 'rates' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-amber-500" />
                                <span>Konfigurasi Tarif Biaya Kerja Anggota (Hourly Rates)</span>
                            </h3>
                            <Button
                                size="sm"
                                onClick={() => setRateModalOpen(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Atur Tarif Anggota</span>
                            </Button>
                        </div>

                        {summary.member_rates.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Belum ada tarif per jam yang dikonfigurasi untuk anggota proyek ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Anggota Tim</th>
                                            <th className="py-3 px-4">Role Billing</th>
                                            <th className="py-3 px-4">Tarif per Jam</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {summary.member_rates.map((rate) => (
                                            <tr key={rate.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground">{rate.user_name}</div>
                                                    <div className="text-muted-foreground text-[11px]">{rate.user_email}</div>
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {rate.billing_role || 'General Contributor'}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-foreground text-sm">
                                                    {formatMoney(rate.hourly_rate)} / jam
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-7 text-primary"
                                                        onClick={() => {
                                                            setSelectedUserId(rate.user_id.toString());
                                                            setHourlyRateInput(rate.hourly_rate);
                                                            setBillingRoleInput(rate.billing_role || '');
                                                            setRateModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        <span>Edit</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: Worklogs */}
                {activeTab === 'worklogs' && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span>Log Waktu Kerja & Kalkulasi Biaya Tugas</span>
                            </h3>
                            <Button
                                size="sm"
                                onClick={() => setWorklogModalOpen(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>+ Catat Jam Kerja</span>
                            </Button>
                        </div>

                        {summary.recent_worklogs.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Belum ada log waktu kerja yang dicatat pada tugas di proyek ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-3 px-4">Tugas</th>
                                            <th className="py-3 px-4">Anggota</th>
                                            <th className="py-3 px-4">Durasi</th>
                                            <th className="py-3 px-4">Kalkulasi Biaya</th>
                                            <th className="py-3 px-4">Tanggal Kerja</th>
                                            <th className="py-3 px-4">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {summary.recent_worklogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-foreground">{log.task_key}</div>
                                                    <div className="text-muted-foreground line-clamp-1">{log.task_title}</div>
                                                </td>
                                                <td className="py-3 px-4 text-foreground font-medium">
                                                    {log.user_name}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-semibold">
                                                    {log.duration_hours} Jam ({log.duration_minutes}m)
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatMoney(log.calculated_cost)}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground font-mono">
                                                    {log.work_date_formatted}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {log.description || '—'}
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

            {/* Modal: Atur Anggaran Proyek */}
            <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <span>Konfigurasi Anggaran Proyek</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan batas pagu anggaran dana dan pemisahan alokasi belanja modal vs operasional.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Total Pagu Anggaran
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={totalBudgetInput}
                                    onChange={(e) => setTotalBudgetInput(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Mata Uang
                                </label>
                                <Select value={currencyInput} onValueChange={setCurrencyInput}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                        <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Alokasi CAPEX
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={capexInput}
                                    onChange={(e) => setCapexInput(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Alokasi OPEX
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={opexInput}
                                    onChange={(e) => setOpexInput(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Model Kontrak
                                </label>
                                <Select value={budgetTypeInput} onValueChange={setBudgetTypeInput}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Fixed Price</SelectItem>
                                        <SelectItem value="time_and_materials">Time & Materials</SelectItem>
                                        <SelectItem value="monthly_recurring">Monthly Retainer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Batas Peringatan (%)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={alertThresholdInput}
                                    onChange={(e) => setAlertThresholdInput(Number(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setBudgetModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingBudget}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingBudget ? 'Menyimpan...' : 'Simpan Anggaran'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Ajukan Pengeluaran */}
            <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-purple-500" />
                            <span>Ajukan Klaim Pengeluaran</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Kirimkan rincian biaya operasional untuk disetujui pimpinan proyek.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Kategori Biaya
                            </label>
                            <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="software_license">Lisensi Perangkat Lunak</SelectItem>
                                    <SelectItem value="cloud_hosting">Server & Cloud Hosting</SelectItem>
                                    <SelectItem value="hardware_equipment">Perangkat Keras / Hardware</SelectItem>
                                    <SelectItem value="consulting">Konsultan & Jasa Pihak Ketiga</SelectItem>
                                    <SelectItem value="travel_meals">Perjalanan Dinas & Konsumsi</SelectItem>
                                    <SelectItem value="other">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Judul Pengeluaran
                            </label>
                            <Input
                                placeholder="misal: Langganan AWS Cloud Bulanan, Lisensi Figma"
                                value={expenseTitle}
                                onChange={(e) => setExpenseTitle(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Jumlah Biaya (Rp)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="500000"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Pengeluaran
                                </label>
                                <Input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Vendor / Penyedia Layanan (Opsional)
                            </label>
                            <Input
                                placeholder="misal: Amazon Web Services, Google Cloud, PT Telkom"
                                value={expenseVendor}
                                onChange={(e) => setExpenseVendor(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Catatan Tambahan (Opsional)
                            </label>
                            <Input
                                placeholder="Keterangan kebutuhan pengeluaran..."
                                value={expenseNotes}
                                onChange={(e) => setExpenseNotes(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setExpenseModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingExpense}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingExpense ? 'Mengirim...' : 'Kirim Pengajuan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Atur Tarif Anggota */}
            <Dialog open={rateModalOpen} onOpenChange={setRateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-500" />
                            <span>Atur Tarif Biaya Anggota Tim</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tarif ini digunakan untuk mengalkulasi biaya kerja secara otomatis dari worklog.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRate} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Anggota Tim
                            </label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name} ({m.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Role / Jabatan Penagihan (Billing Role)
                            </label>
                            <Input
                                placeholder="misal: Senior Backend Engineer, UI/UX Designer"
                                value={billingRoleInput}
                                onChange={(e) => setBillingRoleInput(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Tarif per Jam ({summary.budget.currency || 'IDR'})
                            </label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="150000"
                                value={hourlyRateInput}
                                onChange={(e) => setHourlyRateInput(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingRate}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingRate ? 'Menyimpan...' : 'Simpan Tarif'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Catat Waktu Kerja (Worklog) */}
            <Dialog open={worklogModalOpen} onOpenChange={setWorklogModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <span>Catat Waktu & Biaya Kerja</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Waktu kerja akan otomatis dihitung biayanya sesuai tarif per jam Anda.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveWorklog} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Pilih Tugas
                            </label>
                            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {tasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.key}: {t.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Durasi Kerja (Jam)
                                </label>
                                <Input
                                    type="number"
                                    min={0.25}
                                    step={0.25}
                                    max={24}
                                    value={workDurationHours}
                                    onChange={(e) => setWorkDurationHours(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1.5">
                                    Tanggal Kerja
                                </label>
                                <Input
                                    type="date"
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Keterangan Pekerjaan (Opsional)
                            </label>
                            <Input
                                placeholder="Aktivitas yang dikerjakan..."
                                value={workDescription}
                                onChange={(e) => setWorkDescription(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setWorklogModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={submittingWorklog}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {submittingWorklog ? 'Menyimpan...' : 'Simpan Log Waktu'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Tolak Pengeluaran */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-5 w-5" />
                            <span>Tolak Klaim Pengeluaran</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Berikan alasan penolakan pada pengajuan: <strong>{selectedExpenseForReject?.title}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRejectExpenseSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1.5">
                                Alasan Penolakan
                            </label>
                            <Input
                                placeholder="misal: Bukti invoice tidak valid, melebihi batas anggaran bulanan"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRejectModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-destructive text-destructive-foreground text-xs font-semibold"
                            >
                                Konfirmasi Tolak
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
