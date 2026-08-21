import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
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
    DollarSign,
    TrendingUp,
    TrendingDown,
    Building2,
    PieChart,
    Layers,
    Plus,
    Clock,
    Briefcase,
    Shield,
    Users,
    FolderKanban,
    Edit3,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Flame,
    ArrowUpRight,
    ArrowDownRight,
    Server,
    Laptop,
    FileCode,
    Sparkles,
    Search,
    CreditCard,
} from 'lucide-react';

interface ProjectProfitability {
    id: string;
    key: string;
    name: string;
    status: string;
    total_budget: number;
    labor_cost: number;
    total_hours: number;
    direct_expenses: number;
    total_incurred_cost: number;
    gross_margin: number;
    gross_margin_pct: number;
    profitability_status: 'highly_profitable' | 'healthy' | 'thin' | 'over_budget';
    currency: string;
    cost_centers: Array<{
        id: string;
        cost_center_id: string;
        code: string;
        name: string;
        allocation_percentage: number;
    }>;
}

interface CostCenterItem {
    id: string;
    code: string;
    name: string;
    department: string;
    allocated_budget: number;
    realized_spend: number;
    remaining_budget: number;
    utilization_pct: number;
    currency: string;
    description: string | null;
    manager: { id: number; name: string } | null;
    allocated_projects: Array<{
        allocation_id: string;
        project_id: string;
        project_key: string;
        project_name: string;
        allocation_percentage: number;
        portion_incurred: number;
    }>;
}

interface Metrics {
    total_org_budget: number;
    total_incurred_cost: number;
    total_labor_cost: number;
    total_direct_expenses: number;
    overall_gross_profit: number;
    overall_gross_margin_pct: number;
    total_cost_centers: number;
    total_cost_centers_budget: number;
    profitable_projects_count: number;
    at_risk_projects_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    projects: ProjectProfitability[];
    cost_centers: CostCenterItem[];
    category_breakdown: Record<string, number>;
    members: Array<{ id: number; name: string; email: string }>;
    raw_projects: Array<{ id: string; key: string; name: string }>;
}

export default function CostAllocationPage({
    organization,
    metrics,
    projects,
    cost_centers,
    category_breakdown,
    members,
    raw_projects,
}: Props) {
    const [activeTab, setActiveTab] = useState<'profitability' | 'cost_centers' | 'categories'>('profitability');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Cost Center Modal
    const [costCenterModalOpen, setCostCenterModalOpen] = useState(false);
    const [editingCostCenter, setEditingCostCenter] = useState<CostCenterItem | null>(null);
    const [ccCode, setCcCode] = useState('');
    const [ccName, setCcName] = useState('');
    const [ccDepartment, setCcDepartment] = useState('Engineering');
    const [ccBudget, setCcBudget] = useState('100000000');
    const [ccCurrency, setCcCurrency] = useState('IDR');
    const [ccManagerId, setCcManagerId] = useState('none');
    const [ccDescription, setCcDescription] = useState('');
    const [isSavingCostCenter, setIsSavingCostCenter] = useState(false);

    // Project Allocation Modal
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [selectedCostCenterForAllocation, setSelectedCostCenterForAllocation] = useState<CostCenterItem | null>(null);
    const [allocProjectId, setAllocProjectId] = useState('none');
    const [allocPercentage, setAllocPercentage] = useState('100');
    const [isSavingAllocation, setIsSavingAllocation] = useState(false);

    const formatCurrency = (amount: number, currency = 'IDR') => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: currency === 'IDR' ? 'IDR' : 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const openCreateCostCenter = () => {
        setEditingCostCenter(null);
        setCcCode(`CC-${Date.now().toString().slice(-4)}`);
        setCcName('');
        setCcDepartment('Engineering');
        setCcBudget('100000000');
        setCcCurrency('IDR');
        setCcManagerId(members[0]?.id ? members[0].id.toString() : 'none');
        setCcDescription('');
        setCostCenterModalOpen(true);
    };

    const openEditCostCenter = (cc: CostCenterItem) => {
        setEditingCostCenter(cc);
        setCcCode(cc.code);
        setCcName(cc.name);
        setCcDepartment(cc.department);
        setCcBudget(cc.allocated_budget.toString());
        setCcCurrency(cc.currency);
        setCcManagerId(cc.manager?.id ? cc.manager.id.toString() : 'none');
        setCcDescription(cc.description || '');
        setCostCenterModalOpen(true);
    };

    const handleSaveCostCenter = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingCostCenter(true);

        const payload = {
            code: ccCode,
            name: ccName,
            department: ccDepartment,
            allocated_budget: Number(ccBudget),
            currency: ccCurrency,
            manager_id: ccManagerId === 'none' ? null : Number(ccManagerId),
            description: ccDescription,
        };

        const url = editingCostCenter
            ? `/organization/financials/cost-centers/${editingCostCenter.id}`
            : '/organization/financials/cost-centers';
        const method = editingCostCenter ? 'PUT' : 'POST';

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
            .then(() => {
                setIsSavingCostCenter(false);
                setCostCenterModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingCostCenter(false));
    };

    const handleDeleteCostCenter = (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus Pusat Biaya (Cost Center) ini?')) return;
        fetch(`/organization/financials/cost-centers/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const openAllocateProjectModal = (cc: CostCenterItem) => {
        setSelectedCostCenterForAllocation(cc);
        setAllocProjectId(raw_projects[0]?.id || 'none');
        setAllocPercentage('100');
        setAllocationModalOpen(true);
    };

    const handleSaveAllocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCostCenterForAllocation || allocProjectId === 'none') return;
        setIsSavingAllocation(true);

        fetch(`/organization/financials/cost-centers/${selectedCostCenterForAllocation.id}/allocate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                project_id: allocProjectId,
                allocation_percentage: Number(allocPercentage),
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingAllocation(false);
                setAllocationModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingAllocation(false));
    };

    const handleRemoveAllocation = (allocationId: string) => {
        fetch(`/organization/financials/allocations/${allocationId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).then(() => router.reload());
    };

    const renderProfitabilityBadge = (status: string, marginPct: number) => {
        switch (status) {
            case 'highly_profitable':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono">
                        <ArrowUpRight className="h-3 w-3" />
                        <span>Sangat Menguntungkan ({marginPct}%)</span>
                    </Badge>
                );
            case 'healthy':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1 font-semibold font-mono">
                        <TrendingUp className="h-3 w-3" />
                        <span>Margin Sehat ({marginPct}%)</span>
                    </Badge>
                );
            case 'thin':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1 font-semibold font-mono">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Margin Tipis ({marginPct}%)</span>
                    </Badge>
                );
            case 'over_budget':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1 font-semibold font-mono">
                        <Flame className="h-3 w-3" />
                        <span>Defisit / Over Budget ({marginPct}%)</span>
                    </Badge>
                );
            default:
                return null;
        }
    };

    const filteredProjects = projects.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.key.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.profitability_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout>
            <Head title="Enterprise Cost Allocation & Project Profitability Analytics" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Enterprise Cost Allocation & Profitability Analytics
                                </h1>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-mono">
                                    Financials & Profit Margin
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Analisis alokasi beban biaya lintas departemen (*Cost Centers*), margin profitabilitas proyek, dan pengeluaran Capex/Opex
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={openCreateCostCenter}
                            className="bg-primary text-primary-foreground gap-1.5 text-xs font-semibold shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Tambah Pusat Biaya (Cost Center)</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Financial Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Budget */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Nilai Anggaran / Kontrak</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Briefcase className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tight text-foreground font-mono">
                                {formatCurrency(metrics.total_org_budget)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {projects.length} Proyek Aktif Organisasi
                        </div>
                    </div>

                    {/* Total Incurred Cost */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Realisasi Biaya</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <CreditCard className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tight text-foreground font-mono">
                                {formatCurrency(metrics.total_incurred_cost)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>Labor: {formatCurrency(metrics.total_labor_cost)}</span>
                            <span>Direct: {formatCurrency(metrics.total_direct_expenses)}</span>
                        </div>
                    </div>

                    {/* Overall Gross Profit */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Margin Keuntungan Kotor</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span
                                className={`text-xl font-bold tracking-tight font-mono ${
                                    metrics.overall_gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                            >
                                {formatCurrency(metrics.overall_gross_profit)}
                            </span>
                            <Badge
                                className={`text-[10px] font-mono ${
                                    metrics.overall_gross_margin_pct >= 20
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-amber-500/10 text-amber-600'
                                }`}
                            >
                                {metrics.overall_gross_margin_pct}% Margin
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.profitable_projects_count} proyek menghasilkan laba positif
                        </div>
                    </div>

                    {/* Cost Centers Count */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Pusat Biaya (Cost Centers)</span>
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Building2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_cost_centers}
                            </span>
                            <span className="text-xs text-muted-foreground">Pusat Biaya</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Total Anggaran CC: {formatCurrency(metrics.total_cost_centers_budget)}
                        </div>
                    </div>
                </div>

                {/* Subnav Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
                    <button
                        onClick={() => setActiveTab('profitability')}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === 'profitability'
                                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Matriks Profitabilitas Proyek ({projects.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('cost_centers')}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === 'cost_centers'
                                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Alokasi Pusat Biaya ({cost_centers.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeTab === 'categories'
                                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <PieChart className="h-3.5 w-3.5" />
                        <span>Distribusi Capex vs Opex</span>
                    </button>
                </div>

                {/* TAB 1: Matriks Profitabilitas Proyek */}
                {activeTab === 'profitability' && (
                    <div className="space-y-4">
                        {/* Search & Filter Bar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama atau kunci proyek..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 text-xs w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status Profitabilitas</SelectItem>
                                    <SelectItem value="highly_profitable">Sangat Menguntungkan (&ge;40%)</SelectItem>
                                    <SelectItem value="healthy">Margin Sehat (20-39%)</SelectItem>
                                    <SelectItem value="thin">Margin Tipis (0-19%)</SelectItem>
                                    <SelectItem value="over_budget">Defisit / Over Budget</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Profitability Leaderboard Table */}
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                                            <th className="py-3 px-4">Proyek</th>
                                            <th className="py-3 px-3 text-right">Nilai Anggaran (IDR)</th>
                                            <th className="py-3 px-3 text-right">Labor Cost (Jam)</th>
                                            <th className="py-3 px-3 text-right">Direct Expenses</th>
                                            <th className="py-3 px-3 text-right">Total Biaya Realisasi</th>
                                            <th className="py-3 px-3 text-right">Gross Profit (Laba Kotor)</th>
                                            <th className="py-3 px-4 text-center">Status & Margin %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredProjects.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                    Tidak ada data proyek yang sesuai filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredProjects.map((p) => (
                                                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-primary">
                                                                [{p.key}]
                                                            </span>
                                                            <span className="font-semibold text-foreground">
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                        {p.cost_centers.length > 0 && (
                                                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                {p.cost_centers.map((cc) => (
                                                                    <span
                                                                        key={cc.id}
                                                                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground"
                                                                    >
                                                                        {cc.code} ({cc.allocation_percentage}%)
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                                                        {formatCurrency(p.total_budget, p.currency)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                        <div>{formatCurrency(p.labor_cost, p.currency)}</div>
                                                        <div className="text-[10px] text-muted-foreground/80">
                                                            {p.total_hours} jam
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                        {formatCurrency(p.direct_expenses, p.currency)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                                        {formatCurrency(p.total_incurred_cost, p.currency)}
                                                    </td>
                                                    <td
                                                        className={`py-3 px-3 text-right font-mono font-bold ${
                                                            p.gross_margin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                                        }`}
                                                    >
                                                        {formatCurrency(p.gross_margin, p.currency)}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {renderProfitabilityBadge(
                                                            p.profitability_status,
                                                            p.gross_margin_pct
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Pusat Biaya & Alokasi Departemen */}
                {activeTab === 'cost_centers' && (
                    <div className="space-y-4">
                        {cost_centers.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
                                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
                                <h4 className="text-sm font-bold text-foreground">Belum Ada Pusat Biaya (Cost Center)</h4>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                    Buat pusat biaya per departemen (seperti Engineering, Infrastructure, Marketing) untuk membebankan biaya proyek secara transparan.
                                </p>
                                <Button
                                    onClick={openCreateCostCenter}
                                    className="bg-primary text-primary-foreground text-xs font-semibold"
                                >
                                    + Buat Pusat Biaya Pertama
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cost_centers.map((cc) => (
                                    <div
                                        key={cc.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-xs text-primary">
                                                            {cc.code}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {cc.department}
                                                        </Badge>
                                                    </div>
                                                    <h3 className="font-bold text-sm text-foreground mt-1">
                                                        {cc.name}
                                                    </h3>
                                                    {cc.manager && (
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            Manajer: {cc.manager.name}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditCostCenter(cc)}
                                                        className="p-1 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCostCenter(cc.id)}
                                                        className="p-1 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Utilization Progress Bar */}
                                            <div className="mt-4 space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Realisasi Beban:</span>
                                                    <span className="font-mono font-bold text-foreground">
                                                        {formatCurrency(cc.realized_spend, cc.currency)}
                                                    </span>
                                                </div>

                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            cc.utilization_pct > 100
                                                                ? 'bg-rose-500'
                                                                : cc.utilization_pct >= 85
                                                                ? 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, cc.utilization_pct)}%` }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                                    <span>Anggaran: {formatCurrency(cc.allocated_budget, cc.currency)}</span>
                                                    <span>{cc.utilization_pct}% Terpakai</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Allocated Projects List */}
                                        <div className="pt-3 border-t border-border/60 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-muted-foreground">
                                                    Proyek Teralokasi ({cc.allocated_projects.length}):
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openAllocateProjectModal(cc)}
                                                    className="h-6 text-[10px] px-1.5 gap-1 text-primary hover:bg-primary/10"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    <span>Alokasikan</span>
                                                </Button>
                                            </div>

                                            {cc.allocated_projects.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground italic">
                                                    Belum ada proyek yang dibebankan ke pusat biaya ini.
                                                </p>
                                            ) : (
                                                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                                    {cc.allocated_projects.map((ap) => (
                                                        <div
                                                            key={ap.allocation_id}
                                                            className="p-1.5 rounded-lg bg-muted/40 text-[11px] flex items-center justify-between gap-1"
                                                        >
                                                            <div className="flex items-center gap-1 truncate">
                                                                <span className="font-mono font-bold text-primary">
                                                                    [{ap.project_key}]
                                                                </span>
                                                                <span className="truncate">{ap.project_name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <span className="font-mono text-muted-foreground">
                                                                    {ap.allocation_percentage}%
                                                                </span>
                                                                <button
                                                                    onClick={() => handleRemoveAllocation(ap.allocation_id)}
                                                                    className="text-muted-foreground hover:text-destructive text-xs"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: Distribusi Biaya Capex vs Opex */}
                {activeTab === 'categories' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Engineering Labor */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Beban Tenaga Kerja (Labor)</span>
                                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                        <Users className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency(category_breakdown.engineering_labor || 0)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Dihitung dari log durasi kerja developer &times; hourly billing rate.
                                </p>
                            </div>

                            {/* Cloud Hosting */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Cloud Hosting & Server</span>
                                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                                        <Server className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency(category_breakdown.cloud_hosting || 0)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Biaya komputasi AWS, GCP, database, dan infrastruktur cloud.
                                </p>
                            </div>

                            {/* Software License */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Lisensi Perangkat Lunak</span>
                                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                        <FileCode className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency(category_breakdown.software_license || 0)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Langganan SaaS, API tokens pihak ketiga, dan toolkit pengembangan.
                                </p>
                            </div>

                            {/* Consulting */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Konsultan & Tenaga Ahli</span>
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency(category_breakdown.consulting || 0)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Jasa audit keamanan eksternal, desain UI/UX agensi, dan arsitek lepas.
                                </p>
                            </div>

                            {/* Hardware & Equipment */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Perangkat Keras (Capex)</span>
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                        <Laptop className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency(category_breakdown.hardware_equipment || 0)}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Pembelian laptop dev, test devices, dan workstation khusus.
                                </p>
                            </div>

                            {/* Travel & Meals */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Perjalanan & Operasional Lain</span>
                                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                                        <Briefcase className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="text-xl font-bold font-mono text-foreground">
                                    {formatCurrency((category_breakdown.travel_meals || 0) + (category_breakdown.other || 0))}
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Kunjungan klien, akomodasi workshop onsite, dan miscellaneous.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Tambah / Edit Cost Center */}
            <Dialog open={costCenterModalOpen} onOpenChange={setCostCenterModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                            <span>{editingCostCenter ? 'Edit Pusat Biaya' : 'Tambah Pusat Biaya (Cost Center)'}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Tentukan kode akuntansi, departemen, dan plafon anggaran pusat biaya.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveCostCenter} className="space-y-3.5 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Kode Pusat Biaya *
                                </label>
                                <Input
                                    placeholder="CC-ENG-01"
                                    value={ccCode}
                                    onChange={(e) => setCcCode(e.target.value)}
                                    className="h-9 text-xs font-mono uppercase"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Departemen
                                </label>
                                <Input
                                    placeholder="Engineering / Marketing"
                                    value={ccDepartment}
                                    onChange={(e) => setCcDepartment(e.target.value)}
                                    className="h-9 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Nama Pusat Biaya *
                            </label>
                            <Input
                                placeholder="Core Engineering & Infrastructure"
                                value={ccName}
                                onChange={(e) => setCcName(e.target.value)}
                                className="h-9 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Plafon Anggaran *
                                </label>
                                <Input
                                    type="number"
                                    step="100000"
                                    value={ccBudget}
                                    onChange={(e) => setCcBudget(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Mata Uang
                                </label>
                                <Select value={ccCurrency} onValueChange={setCcCurrency}>
                                    <SelectTrigger className="h-9 text-xs font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IDR">IDR (Rp)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                PIC Manajer Pusat Biaya
                            </label>
                            <Select value={ccManagerId} onValueChange={setCcManagerId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Belum Ditugaskan --</SelectItem>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Deskripsi Opsional
                            </label>
                            <Textarea
                                placeholder="Tujuan alokasi anggaran pusat biaya ini..."
                                value={ccDescription}
                                onChange={(e) => setCcDescription(e.target.value)}
                                className="text-xs min-h-[50px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCostCenterModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingCostCenter}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                            >
                                {isSavingCostCenter ? 'Menyimpan...' : 'Simpan Pusat Biaya'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Alokasikan Proyek ke Cost Center */}
            <Dialog open={allocationModalOpen} onOpenChange={setAllocationModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-primary" />
                            <span>Alokasikan Proyek ke {selectedCostCenterForAllocation?.code}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Bebankan realisasi biaya proyek ke pusat biaya ini dengan persentase alokasi tertentu.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAllocation} className="space-y-3.5 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Pilih Proyek *
                            </label>
                            <Select value={allocProjectId} onValueChange={setAllocProjectId}>
                                <SelectTrigger className="h-9 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {raw_projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            [{p.key}] {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Persentase Alokasi Biaya (1 - 100%) *
                            </label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={allocPercentage}
                                onChange={(e) => setAllocPercentage(e.target.value)}
                                className="h-9 text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAllocationModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingAllocation || allocProjectId === 'none'}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSavingAllocation ? 'Menyimpan...' : 'Simpan Alokasi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
