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
    ShieldCheck,
    EyeOff,
    Lock,
    Globe,
    UserCheck,
    Plus,
    Search,
    Trash2,
    Check,
    Copy,
    Sparkles,
    FileText,
    AlertTriangle,
    Key,
    Server,
    Shield,
    CheckCircle2,
    Clock,
    RefreshCw,
    SlidersHorizontal,
} from 'lucide-react';

interface ResidencyConfig {
    id: string;
    primary_region: string;
    compliance_framework: string;
    cross_border_transfer_allowed: boolean;
    encryption_at_rest_verified: boolean;
    encryption_key_management: string;
}

interface MaskingRuleItem {
    id: string;
    field_name: string;
    resource_model: string;
    masking_strategy: 'partial_mask' | 'full_redaction' | 'hashing_sha256' | 'pseudonymization';
    sample_input: string;
    sample_masked_output: string;
    is_active: boolean;
    exempt_roles: string[];
    created_at_formatted: string;
}

interface DsarItem {
    id: string;
    request_number: string;
    request_type: 'erasure' | 'export' | 'rectification';
    subject_identifier: string;
    status: 'pending_review' | 'processing' | 'completed' | 'rejected';
    reason: string | null;
    processed_by_name: string;
    completed_at_formatted: string | null;
    created_at_formatted: string;
}

interface Metrics {
    compliance_score_pct: number;
    active_masking_rules_count: number;
    pending_dsar_requests_count: number;
    encrypted_records_count: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    residencyConfig: ResidencyConfig | null;
    maskingRules: MaskingRuleItem[];
    dsarRequests: DsarItem[];
    selectedStatus: string | null;
}

export default function DataPrivacyPage({
    organization,
    metrics,
    residencyConfig,
    maskingRules,
    dsarRequests,
    selectedStatus,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Residency Form State
    const [primaryRegion, setPrimaryRegion] = useState(residencyConfig?.primary_region || 'ap-southeast-3');
    const [framework, setFramework] = useState(residencyConfig?.compliance_framework || 'id_pdp');
    const [crossBorder, setCrossBorder] = useState(residencyConfig?.cross_border_transfer_allowed || false);
    const [keyMgmt, setKeyMgmt] = useState(residencyConfig?.encryption_key_management || 'aws_kms_managed');
    const [isSavingResidency, setIsSavingResidency] = useState(false);

    // Masking Simulator State
    const [testInput, setTestInput] = useState('budi.santoso@perusahaan.co.id');
    const [testStrategy, setTestStrategy] = useState('partial_mask');
    const [testOutput, setTestOutput] = useState('b***@perusahaan.co.id');
    const [isTestingMask, setIsTestingMask] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Modal: Add Masking Rule
    const [createRuleModalOpen, setCreateRuleModalOpen] = useState(false);
    const [formFieldName, setFormFieldName] = useState('');
    const [formResourceModel, setFormResourceModel] = useState('User');
    const [formMaskingStrategy, setFormMaskingStrategy] = useState('partial_mask');
    const [formSampleInput, setFormSampleInput] = useState('john.doe@company.com');
    const [isSavingRule, setIsSavingRule] = useState(false);

    // Modal: Add DSAR Request
    const [createDsarModalOpen, setCreateDsarModalOpen] = useState(false);
    const [formDsarType, setFormDsarType] = useState('erasure');
    const [formDsarSubject, setFormDsarSubject] = useState('');
    const [formDsarReason, setFormDsarReason] = useState('');
    const [isSavingDsar, setIsSavingDsar] = useState(false);

    const handleSaveResidency = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingResidency(true);

        fetch('/organization/compliance/data-privacy/residency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                primary_region: primaryRegion,
                compliance_framework: framework,
                cross_border_transfer_allowed: crossBorder,
                encryption_key_management: keyMgmt,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingResidency(false);
                router.reload();
            })
            .catch(() => setIsSavingResidency(false));
    };

    const handleTestMask = (input: string, strategy: string) => {
        setTestInput(input);
        setTestStrategy(strategy);
        setIsTestingMask(true);

        fetch('/organization/compliance/data-privacy/test-mask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                input,
                strategy,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsTestingMask(false);
                setTestOutput(data.masked_output);
            })
            .catch(() => setIsTestingMask(false));
    };

    const handleToggleRule = (rule: MaskingRuleItem) => {
        setActionLoadingId(rule.id);
        fetch(`/organization/compliance/data-privacy/rules/${rule.id}/toggle`, {
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

    const handleDeleteRule = (rule: MaskingRuleItem) => {
        if (!confirm(`Hapus aturan masking "${rule.field_name}"?`)) return;

        fetch(`/organization/compliance/data-privacy/rules/${rule.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                router.reload();
            });
    };

    const handleSaveRule = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRule(true);

        fetch('/organization/compliance/data-privacy/rules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                field_name: formFieldName,
                resource_model: formResourceModel,
                masking_strategy: formMaskingStrategy,
                sample_input: formSampleInput,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingRule(false);
                setCreateRuleModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingRule(false));
    };

    const handleSaveDsar = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingDsar(true);

        fetch('/organization/compliance/data-privacy/dsar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                request_type: formDsarType,
                subject_identifier: formDsarSubject,
                reason: formDsarReason,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSavingDsar(false);
                setCreateDsarModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSavingDsar(false));
    };

    const handleProcessDsar = (dsar: DsarItem, newStatus: string) => {
        setActionLoadingId(dsar.id);
        fetch(`/organization/compliance/data-privacy/dsar/${dsar.id}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                status: newStatus,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setActionLoadingId(null);
                router.reload();
            })
            .catch(() => setActionLoadingId(null));
    };

    const renderStrategyBadge = (strat: string) => {
        switch (strat) {
            case 'full_redaction':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] font-mono">
                        Full Redaction
                    </Badge>
                );
            case 'hashing_sha256':
                return (
                    <Badge className="bg-purple-600 text-white text-[10px] font-mono">
                        SHA-256 Hash
                    </Badge>
                );
            case 'pseudonymization':
                return (
                    <Badge className="bg-indigo-600 text-white text-[10px] font-mono">
                        Pseudonymization
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] font-mono">
                        Partial Mask
                    </Badge>
                );
        }
    };

    const renderDsarStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Check className="h-3 w-3" />
                        <span>Completed</span>
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Clock className="h-3 w-3" />
                        <span>Processing</span>
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <span>Rejected</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Pending Review</span>
                    </Badge>
                );
        }
    };

    const filteredRules = maskingRules.filter((r) => {
        return (
            r.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.resource_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.masking_strategy.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <AppLayout>
            <Head title="Multi-Tenant Data Residency, PII Masking & Data Redaction Studio" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Data Residency, PII Masking &amp; Redaction Studio
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    Enterprise Compliance
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Kepatuhan wilayah penyimpanan data multi-region (ID PDP, GDPR), penyamaran PII otomatis, dan pipa permohonan DSAR
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCreateDsarModalOpen(true)}
                            className="h-9 text-xs gap-1.5 font-semibold"
                        >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Ajukan DSAR</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => setCreateRuleModalOpen(true)}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Tambah Aturan PII</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Compliance Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Kepatuhan Privasi</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.compliance_score_pct}%
                            </span>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Compliant
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Terverifikasi UU PDP &amp; GDPR Ready
                        </div>
                    </div>

                    {/* Active Masking Rules */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Aturan PII Masking Aktif</span>
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <EyeOff className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                                {metrics.active_masking_rules_count}
                            </span>
                            <span className="text-xs text-muted-foreground">kolom tersamarkan</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Email, No HP, NIK, Kartu Kredit
                        </div>
                    </div>

                    {/* Pending DSAR Requests */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Permintaan DSAR Pending</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <UserCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.pending_dsar_requests_count}
                            </span>
                            <span className="text-xs text-muted-foreground">menunggu review</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Hak Penghapusan Data Pengguna
                        </div>
                    </div>

                    {/* Encrypted Records */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Data Terenkripsi (At-Rest)</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Lock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.encrypted_records_count.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">baris</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            AES-256 AWS KMS Hardware Key
                        </div>
                    </div>
                </div>

                {/* Data Residency & Encryption Settings Card */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Globe className="h-4 w-4 text-indigo-600" />
                                <span>Multi-Tenant Data Residency &amp; Cross-Border Policy</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Penguncian lokasi pusat data fisik dan kebijakan transfer data lintas batas negara
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveResidency} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Wilayah Penyimpanan Utama *
                            </label>
                            <Select value={primaryRegion} onValueChange={setPrimaryRegion}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ap-southeast-3">🇮🇩 Jakarta (ap-southeast-3)</SelectItem>
                                    <SelectItem value="eu-central-1">🇩🇪 Frankfurt (eu-central-1)</SelectItem>
                                    <SelectItem value="us-east-1">🇺🇸 Virginia (us-east-1)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Kerangka Regulasi *
                            </label>
                            <Select value={framework} onValueChange={setFramework}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="id_pdp">🇮🇩 UU Perlindungan Data Pribadi (PDP)</SelectItem>
                                    <SelectItem value="eu_gdpr">🇪🇺 EU General Data Protection Regulation (GDPR)</SelectItem>
                                    <SelectItem value="us_hipaa_soc2">🇺🇸 US HIPAA &amp; SOC2 Type II</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Manajemen Kunci Enkripsi *
                            </label>
                            <Select value={keyMgmt} onValueChange={setKeyMgmt}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="aws_kms_managed">🔑 AWS KMS Hardware Managed</SelectItem>
                                    <SelectItem value="byok_customer_managed">🛡️ BYOK (Bring Your Own Key)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={isSavingResidency}
                                className="h-8 w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isSavingResidency ? 'Menyimpan...' : 'Simpan Kebijakan Residensi'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Interactive Live PII Masking Simulator */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <span>Interactive Live PII Masking Tester &amp; Simulator</span>
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Uji algoritma penyamaran data sensitif secara instan sebelum diterapkan pada produksi
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Teks Input Sampel (Email, No HP, NIK)
                            </label>
                            <Input
                                value={testInput}
                                onChange={(e) => handleTestMask(e.target.value, testStrategy)}
                                className="h-8 text-xs font-mono"
                                placeholder="cth: budi.santoso@perusahaan.co.id"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Strategi Penyamaran (Masking Strategy)
                            </label>
                            <Select
                                value={testStrategy}
                                onValueChange={(strat) => handleTestMask(testInput, strat)}
                            >
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="partial_mask">🔵 Partial Mask (a***@domain.com)</SelectItem>
                                    <SelectItem value="full_redaction">🔴 Full Redaction ([REDACTED])</SelectItem>
                                    <SelectItem value="hashing_sha256">🟣 SHA-256 Cryptographic Hash</SelectItem>
                                    <SelectItem value="pseudonymization">🟢 Pseudonymization (anon_usr_123)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Hasil Output Penyamaran
                            </label>
                            <div className="h-8 px-3 rounded-md bg-muted/60 border border-border flex items-center justify-between font-mono text-xs text-foreground">
                                <span className="truncate">{testOutput}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        navigator.clipboard.writeText(testOutput);
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }}
                                    className="h-5 w-5 p-0 ml-1 shrink-0"
                                >
                                    {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama kolom (cth: email, phone_number, nik) atau model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>
                </div>

                {/* PII Masking Rules Catalog Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3 p-5">
                    <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <EyeOff className="h-4 w-4 text-purple-600" />
                            <span>Katalog Aturan PII Field Masking</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Aturan masking yang aktif diterapkan pada respon API dan tampilan konsol pengguna
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3">Nama Kolom (Field)</th>
                                    <th className="p-3">Resource Model</th>
                                    <th className="p-3">Strategi Masking</th>
                                    <th className="p-3">Contoh Input &rarr; Output</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredRules.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Tidak ada aturan PII masking yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRules.map((rule) => (
                                        <tr key={rule.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3 font-mono font-bold text-foreground">
                                                {rule.field_name}
                                            </td>

                                            <td className="p-3 text-foreground font-mono">
                                                {rule.resource_model}
                                            </td>

                                            <td className="p-3">
                                                {renderStrategyBadge(rule.masking_strategy)}
                                            </td>

                                            <td className="p-3 font-mono text-[11px]">
                                                <span className="text-muted-foreground">{rule.sample_input}</span>
                                                <span className="mx-1.5 text-foreground">&rarr;</span>
                                                <strong className="text-purple-600 dark:text-purple-400">{rule.sample_masked_output}</strong>
                                            </td>

                                            <td className="p-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={actionLoadingId === rule.id}
                                                    onClick={() => handleToggleRule(rule)}
                                                    className="h-6 text-[10px] px-2"
                                                >
                                                    <Badge
                                                        className={`text-[9px] font-mono cursor-pointer ${
                                                            rule.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
                                                        }`}
                                                    >
                                                        {rule.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </Badge>
                                                </Button>
                                            </td>

                                            <td className="p-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteRule(rule)}
                                                    className="h-6 w-6 p-0 text-rose-500"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right to be Forgotten (DSAR Requests) Table */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-3 p-5">
                    <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <UserCheck className="h-4 w-4 text-amber-500" />
                            <span>Permohonan Subjek Data (DSAR &amp; Right to be Forgotten)</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Pipa pemrosesan hak penghapusan data, portabilitas, dan koreksi data subjek
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold">
                                    <th className="p-3">Nomor Permohonan</th>
                                    <th className="p-3">Tipe Permohonan</th>
                                    <th className="p-3">Identitas Subjek</th>
                                    <th className="p-3">Alasan Permohonan</th>
                                    <th className="p-3">Status Permohonan</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {dsarRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Belum ada permohonan DSAR yang diajukan.
                                        </td>
                                    </tr>
                                ) : (
                                    dsarRequests.map((dsar) => (
                                        <tr key={dsar.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3 font-mono font-bold text-foreground">
                                                {dsar.request_number}
                                            </td>

                                            <td className="p-3 capitalize font-semibold text-foreground">
                                                {dsar.request_type === 'erasure' ? '🗑️ Hak Penghapusan (Erasure)' : '📦 Portabilitas Data (Export)'}
                                            </td>

                                            <td className="p-3 font-mono text-foreground">
                                                {dsar.subject_identifier}
                                            </td>

                                            <td className="p-3 text-muted-foreground max-w-xs truncate">
                                                {dsar.reason ?? '-'}
                                            </td>

                                            <td className="p-3">
                                                {renderDsarStatusBadge(dsar.status)}
                                            </td>

                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {dsar.status !== 'completed' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionLoadingId === dsar.id}
                                                            onClick={() => handleProcessDsar(dsar, 'completed')}
                                                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                        >
                                                            <Check className="h-2.5 w-2.5" />
                                                            <span>Selesaikan</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Tambah Aturan PII Masking */}
            <Dialog open={createRuleModalOpen} onOpenChange={setCreateRuleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                            <EyeOff className="h-5 w-5" />
                            <span>Tambah Aturan PII Masking Baru</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Definisikan kolom sensitif dan strategi penyamaran otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveRule} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Nama Kolom (Field Name) *
                            </label>
                            <Input
                                placeholder="cth: tax_id_npwp, passport_number"
                                value={formFieldName}
                                onChange={(e) => setFormFieldName(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Resource Model Terkait *
                            </label>
                            <Input
                                placeholder="cth: User, TaxProfile, BillingAccount"
                                value={formResourceModel}
                                onChange={(e) => setFormResourceModel(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Strategi Penyamaran *
                            </label>
                            <Select value={formMaskingStrategy} onValueChange={setFormMaskingStrategy}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="partial_mask">🔵 Partial Mask</SelectItem>
                                    <SelectItem value="full_redaction">🔴 Full Redaction</SelectItem>
                                    <SelectItem value="hashing_sha256">🟣 SHA-256 Hashing</SelectItem>
                                    <SelectItem value="pseudonymization">🟢 Pseudonymization</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Contoh Data Masukan *
                            </label>
                            <Input
                                placeholder="cth: 01.234.567.8-901.000"
                                value={formSampleInput}
                                onChange={(e) => setFormSampleInput(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateRuleModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingRule}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                            >
                                {isSavingRule ? 'Menyimpan...' : 'Simpan Aturan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Ajukan Permintaan DSAR */}
            <Dialog open={createDsarModalOpen} onOpenChange={setCreateDsarModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <UserCheck className="h-5 w-5" />
                            <span>Ajukan Permohonan DSAR</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Pendaftaran permohonan hak penghapusan data atau portabilitas.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveDsar} className="space-y-3 pt-2 text-xs">
                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Tipe Permohonan *
                            </label>
                            <Select value={formDsarType} onValueChange={setFormDsarType}>
                                <SelectTrigger className="h-8 text-xs font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="erasure">🗑️ Hak Penghapusan (Erasure / Right to be Forgotten)</SelectItem>
                                    <SelectItem value="export">📦 Hak Portabilitas Data (Export Data)</SelectItem>
                                    <SelectItem value="rectification">✏️ Hak Koreksi Data (Rectification)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Identitas Subjek Data (Email / User ID) *
                            </label>
                            <Input
                                placeholder="cth: user@company.com"
                                value={formDsarSubject}
                                onChange={(e) => setFormDsarSubject(e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-foreground block mb-1">
                                Alasan &amp; Catatan Permohonan
                            </label>
                            <Textarea
                                placeholder="Tuliskan catatan kepatuhan atau rujukan pasal regulasi..."
                                value={formDsarReason}
                                onChange={(e) => setFormDsarReason(e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateDsarModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingDsar}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                            >
                                {isSavingDsar ? 'Mengajukan...' : 'Ajukan Permohonan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
