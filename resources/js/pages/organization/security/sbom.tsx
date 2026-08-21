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
    ShieldAlert,
    AlertTriangle,
    Flame,
    FileText,
    Download,
    RefreshCw,
    Search,
    Package,
    Box,
    Layers,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Info,
    ArrowUpRight,
    Lock,
    Unlock,
    Shield,
    Sparkles,
} from 'lucide-react';

interface VulnerabilityItem {
    id: string;
    cve_id: string;
    package_name?: string;
    ecosystem?: string;
    current_version?: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cvss_score: number;
    patched_version: string;
    remediation_advice: string;
    status: 'open' | 'mitigated' | 'false_positive' | 'ignored';
    created_at_formatted?: string;
}

interface PackageItem {
    id: string;
    ecosystem: 'composer' | 'npm' | 'docker' | 'pypi';
    name: string;
    version: string;
    license: string;
    license_risk: 'low_risk' | 'moderate_risk' | 'high_risk';
    has_vulnerabilities: boolean;
    vulnerabilities_count: number;
    highest_severity: string | null;
    latest_safe_version: string | null;
    is_direct_dependency: boolean;
    vulnerabilities: VulnerabilityItem[];
}

interface EcosystemStat {
    ecosystem: string;
    label: string;
    total: number;
    vulnerable: number;
    percentage: number;
}

interface LicenseStats {
    permissive: number;
    weak_copyleft: number;
    strong_copyleft: number;
}

interface Metrics {
    total_packages: number;
    vulnerable_packages: number;
    license_violations: number;
    critical_cves_count: number;
    supply_chain_health_score: number;
}

interface Props {
    organization: {
        id: string;
        name: string;
    };
    metrics: Metrics;
    ecosystemStats: EcosystemStat[];
    licenseStats: LicenseStats;
    packages: PackageItem[];
    vulnerabilities: VulnerabilityItem[];
    selectedEcosystem: string | null;
    selectedRiskLevel: string | null;
}

export default function SbomScannerPage({
    organization,
    metrics,
    ecosystemStats,
    licenseStats,
    packages,
    vulnerabilities,
    selectedEcosystem,
    selectedRiskLevel,
}: Props) {
    const [activeTab, setActiveTab] = useState<'inventory' | 'vulnerabilities'>('inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Triage Modal
    const [triageModalOpen, setTriageModalOpen] = useState(false);
    const [selectedVuln, setSelectedVuln] = useState<VulnerabilityItem | null>(null);
    const [triageStatus, setTriageStatus] = useState<'open' | 'mitigated' | 'false_positive' | 'ignored'>('mitigated');
    const [triageNotes, setTriageNotes] = useState('');
    const [isSubmittingTriage, setIsSubmittingTriage] = useState(false);

    const handleFilterChange = (eco?: string, risk?: string) => {
        const params = new URLSearchParams();
        const currentEco = eco !== undefined ? eco : selectedEcosystem;
        const currentRisk = risk !== undefined ? risk : selectedRiskLevel;

        if (currentEco && currentEco !== 'all') params.append('ecosystem', currentEco);
        if (currentRisk && currentRisk !== 'all') params.append('risk_level', currentRisk);

        router.get(`/organization/security/sbom?${params.toString()}`);
    };

    const handleTriggerScan = () => {
        setIsScanning(true);
        fetch('/organization/security/sbom/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then(() => {
                setIsScanning(false);
                router.reload();
            })
            .catch(() => setIsScanning(false));
    };

    const handleExportSbom = () => {
        window.location.href = '/organization/security/sbom/export?format=cyclonedx';
    };

    const openTriageModal = (vuln: VulnerabilityItem) => {
        setSelectedVuln(vuln);
        setTriageStatus('mitigated');
        setTriageNotes('Patch perbaikan telah diverifikasi pada deployment branch.');
        setTriageModalOpen(true);
    };

    const handleExecuteTriage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVuln) return;
        setIsSubmittingTriage(true);

        fetch(`/organization/security/sbom/vulnerabilities/${selectedVuln.id}/triage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                status: triageStatus,
                notes: triageNotes,
            }),
        })
            .then((res) => res.json())
            .then(() => {
                setIsSubmittingTriage(false);
                setTriageModalOpen(false);
                router.reload();
            })
            .catch(() => setIsSubmittingTriage(false));
    };

    const renderSeverityBadge = (severity: string, cvss?: number) => {
        switch (severity) {
            case 'critical':
                return (
                    <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <Flame className="h-3 w-3" />
                        <span>Kritis {cvss ? `(${cvss})` : ''}</span>
                    </Badge>
                );
            case 'high':
                return (
                    <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-mono uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Tinggi {cvss ? `(${cvss})` : ''}</span>
                    </Badge>
                );
            case 'medium':
                return (
                    <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-[10px] font-mono uppercase">
                        <span>Sedang {cvss ? `(${cvss})` : ''}</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-mono uppercase">
                        <span>Rendah {cvss ? `(${cvss})` : ''}</span>
                    </Badge>
                );
        }
    };

    const renderLicenseRiskBadge = (risk: string, license: string) => {
        switch (risk) {
            case 'high_risk':
                return (
                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] gap-1">
                        <Lock className="h-2.5 w-2.5" />
                        <span>{license} (Strong Copyleft / GPL)</span>
                    </Badge>
                );
            case 'moderate_risk':
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                        <Info className="h-2.5 w-2.5" />
                        <span>{license} (Weak Copyleft)</span>
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                        <Unlock className="h-2.5 w-2.5" />
                        <span>{license} (Permissive)</span>
                    </Badge>
                );
        }
    };

    const filteredPackages = packages.filter((pkg) => {
        return (
            pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pkg.license.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pkg.ecosystem.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const filteredVulnerabilities = vulnerabilities.filter((v) => {
        return (
            v.cve_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.package_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );
    });

    return (
        <AppLayout>
            <Head title="Enterprise License Compliance & Open-Source SBOM Vulnerability Scanner" />

            <div className="space-y-6 pb-16">
                {/* Header Banner */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold tracking-tight text-foreground">
                                    Software Bill of Materials (SBOM) & License Compliance
                                </h1>
                                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs font-mono">
                                    CycloneDX v1.5
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Audit otomatis lisensi open-source, deteksi kerentanan supply chain (CVE), dan generator SBOM standar industri
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportSbom}
                            className="h-9 text-xs gap-1.5"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Unduh SBOM (.json)</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleTriggerScan}
                            disabled={isScanning}
                            className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                            <span>{isScanning ? 'Memindai...' : 'Pindai Dependensi'}</span>
                        </Button>
                    </div>
                </div>

                {/* Bento KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Packages */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Total Dependensi SBOM</span>
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Package className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.total_packages}
                            </span>
                            <span className="text-xs text-muted-foreground">Komponen Aktif</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Terdiri dari library Direct dan Transitive
                        </div>
                    </div>

                    {/* Vulnerable Packages */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Paket Rentan (CVEs)</span>
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                                {metrics.vulnerable_packages}
                            </span>
                            <span className="text-xs text-muted-foreground">Perlu Upgrade</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            {metrics.critical_cves_count} kerentanan berisiko Kritis
                        </div>
                    </div>

                    {/* License Policy Violations */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Risiko Lisensi Copyleft</span>
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Lock className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                                {metrics.license_violations}
                            </span>
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px]">
                                Strong Copyleft
                            </Badge>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Berpotensi memicu kewajiban lisensi komersial
                        </div>
                    </div>

                    {/* Supply Chain Health Score */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Skor Keamanan Supply Chain</span>
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                                {metrics.supply_chain_health_score}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                            Kombinasi skor CVE & kepatuhan lisensi
                        </div>
                    </div>
                </div>

                {/* Ecosystem Breakdown & License Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Ecosystem distribution (7 cols) */}
                    <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <h3 className="font-bold text-sm text-foreground">
                            Distribusi Ekosistem Package Manager
                        </h3>
                        <div className="space-y-3">
                            {ecosystemStats.map((eco) => (
                                <div key={eco.ecosystem} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-foreground">{eco.label}</span>
                                        <span className="font-mono text-muted-foreground">
                                            {eco.total} paket ({eco.percentage}%) {eco.vulnerable > 0 && `• ${eco.vulnerable} rentan`}
                                        </span>
                                    </div>
                                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full rounded-full"
                                            style={{ width: `${eco.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* License distribution (5 cols) */}
                    <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                        <h3 className="font-bold text-sm text-foreground">
                            Klasifikasi Risiko Lisensi
                        </h3>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="text-xs text-emerald-600 font-semibold">Permissive</div>
                                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                                    {licenseStats.permissive}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">MIT, Apache, BSD</div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <div className="text-xs text-amber-600 font-semibold">Weak Copyleft</div>
                                <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
                                    {licenseStats.weak_copyleft}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">MPL, LGPL</div>
                            </div>

                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <div className="text-xs text-rose-600 font-semibold">Strong Copyleft</div>
                                <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 mt-1">
                                    {licenseStats.strong_copyleft}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">GPL, AGPL</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs & Filters */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                            <Button
                                size="sm"
                                variant={activeTab === 'inventory' ? 'default' : 'ghost'}
                                onClick={() => setActiveTab('inventory')}
                                className="h-7 text-xs font-semibold"
                            >
                                <Package className="h-3.5 w-3.5 mr-1" />
                                <span>Inventaris SBOM ({packages.length})</span>
                            </Button>

                            <Button
                                size="sm"
                                variant={activeTab === 'vulnerabilities' ? 'default' : 'ghost'}
                                onClick={() => setActiveTab('vulnerabilities')}
                                className="h-7 text-xs font-semibold"
                            >
                                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                <span>Penasihat Kerentanan CVE ({vulnerabilities.length})</span>
                            </Button>
                        </div>

                        {/* Search & Ecosystem Filter */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-60">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Cari paket, lisensi, atau CVE..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 text-xs"
                                />
                            </div>

                            <Select
                                value={selectedEcosystem || 'all'}
                                onValueChange={(val) => handleFilterChange(val, undefined)}
                            >
                                <SelectTrigger className="h-8 text-xs w-36 font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Ekosistem</SelectItem>
                                    <SelectItem value="composer">PHP (Composer)</SelectItem>
                                    <SelectItem value="npm">Node.js (NPM)</SelectItem>
                                    <SelectItem value="docker">Docker</SelectItem>
                                    <SelectItem value="pypi">PyPI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* TAB 1: SBOM Package Inventory Table */}
                    {activeTab === 'inventory' && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                                            <th className="p-3.5">Ekosistem</th>
                                            <th className="p-3.5">Nama Paket (Dependency)</th>
                                            <th className="p-3.5">Versi Aktif</th>
                                            <th className="p-3.5">Lisensi & Risiko</th>
                                            <th className="p-3.5">Status Kerentanan</th>
                                            <th className="p-3.5">Versi Aman Rekomendasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredPackages.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                    Tidak ada paket yang sesuai dengan kriteria filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPackages.map((pkg) => (
                                                <tr key={pkg.id} className="hover:bg-muted/10 transition-colors">
                                                    <td className="p-3.5 font-mono">
                                                        <Badge variant="outline" className="text-[10px] uppercase">
                                                            {pkg.ecosystem}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <div className="font-bold text-foreground">
                                                            {pkg.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {pkg.is_direct_dependency ? 'Direct Dependency' : 'Transitive Dependency'}
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 font-mono text-muted-foreground">
                                                        v{pkg.version}
                                                    </td>
                                                    <td className="p-3.5">
                                                        {renderLicenseRiskBadge(pkg.license_risk, pkg.license)}
                                                    </td>
                                                    <td className="p-3.5">
                                                        {pkg.has_vulnerabilities ? (
                                                            <div className="flex items-center gap-1.5">
                                                                {renderSeverityBadge(pkg.highest_severity || 'high')}
                                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                                    {pkg.vulnerabilities_count} CVE
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                <span>Aman</span>
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 font-mono">
                                                        {pkg.latest_safe_version ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                v{pkg.latest_safe_version}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CVE Vulnerability Advisories Feed */}
                    {activeTab === 'vulnerabilities' && (
                        <div className="space-y-3">
                            {filteredVulnerabilities.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                    <h4 className="text-xs font-bold text-foreground">Supply Chain Bebas Kerentanan</h4>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Tidak ada kerentanan CVE yang terdeteksi pada dependensi saat ini.
                                    </p>
                                </div>
                            ) : (
                                filteredVulnerabilities.map((v) => (
                                    <div
                                        key={v.id}
                                        className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded-lg border border-border">
                                                    {v.cve_id}
                                                </span>
                                                <span className="font-bold text-xs text-foreground">
                                                    {v.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {renderSeverityBadge(v.severity, v.cvss_score)}
                                                <Badge variant="outline" className="text-[10px] font-mono capitalize">
                                                    Status: {v.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {v.description}
                                        </p>

                                        <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-foreground">Paket Terdampak:</span>
                                                <span className="font-mono text-muted-foreground">
                                                    {v.package_name} ({v.current_version})
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-foreground">Rekomendasi Patch:</span>
                                                <span className="font-mono font-bold text-emerald-600">
                                                    Upgrade ke v{v.patched_version}+
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                                💡 {v.remediation_advice}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end pt-1">
                                            <Button
                                                size="sm"
                                                onClick={() => openTriageModal(v)}
                                                className="h-7 text-xs px-3 bg-primary text-primary-foreground font-semibold"
                                            >
                                                Triage Status CVE
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Triage Status CVE */}
            <Dialog open={triageModalOpen} onOpenChange={setTriageModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-amber-600" />
                            <span>Triage Status Kerentanan CVE</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedVuln?.cve_id} - {selectedVuln?.package_name}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExecuteTriage} className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Status Resolusi *
                            </label>
                            <Select
                                value={triageStatus}
                                onValueChange={(val: any) => setTriageStatus(val)}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">🔴 Open (Masih Rentan)</SelectItem>
                                    <SelectItem value="mitigated">🟢 Mitigated (Telah Diperbaiki / Dipatch)</SelectItem>
                                    <SelectItem value="false_positive">⚪ False Positive (Tidak Berlaku)</SelectItem>
                                    <SelectItem value="ignored">🟡 Ignored (Risiko Diterima)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Catatan Mitigasi / Alasan *
                            </label>
                            <Textarea
                                value={triageNotes}
                                onChange={(e) => setTriageNotes(e.target.value)}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTriageModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingTriage}
                                className="bg-primary text-primary-foreground text-xs font-semibold"
                            >
                                {isSubmittingTriage ? 'Menyimpan...' : 'Simpan Triage'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
